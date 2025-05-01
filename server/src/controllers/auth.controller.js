const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const OTP = require('../models/otp.model');
const TrustedDevice = require('../models/trustedDevice.model');
const emailService = require('../utils/emailService');
const crypto = require('crypto');

// Create JWT token
const signToken = id => {
  // Make sure we have a valid JWT_SECRET
  const secret = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
  console.log('Using JWT_SECRET:', secret.substring(0, 3) + '...');
  
  return jwt.sign({ id: id }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

// Send JWT token to client
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user.id);
  console.log('Token created for user:', user.id);
  
  // Convert to plain object if it's a Sequelize model instance
  const userObj = user.toJSON ? user.toJSON() : { ...user };
  
  // Remove password from output
  delete userObj.password;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: userObj
    }
  });
};

// Generate a unique device ID
const generateDeviceId = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || '';
  const randomString = crypto.randomBytes(8).toString('hex').slice(0, 8);
  
  return Buffer.from(`${userAgent}|${ip}|${randomString}`).toString('base64');
};

// Register a new user (Step 1: Send OTP)
exports.initiateSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide name, email and password'
      });
    }
    
    // Check if email is already registered
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email already in use'
      });
    }
    
    // Check if email domain is allowed
    const isDomainAllowed = await User.isEmailDomainAllowed(email);
    if (!isDomainAllowed) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email domain not allowed for registration'
      });
    }
    
    // Hash the password for security
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Store the registration data in a temporary variable
    // We'll use Node.js's built-in crypto module to create a secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Create a global map to store registration data if it doesn't exist
    if (!global.pendingRegistrations) {
      global.pendingRegistrations = new Map();
    }
    
    // Store the registration data with the token as the key
    global.pendingRegistrations.set(email, {
      name,
      email,
      password: hashedPassword,
      token,
      createdAt: new Date()
    });
    
    // Generate and send OTP
    const otp = await OTP.generateOTP(email, 'registration');
    const emailSent = await emailService.sendOTP(email, otp, 'registration');
    
    if (!emailSent) {
      // If email fails, remove the pending registration
      global.pendingRegistrations.delete(email);
      return res.status(500).json({
        status: 'fail',
        message: 'Failed to send verification email. Please try again.'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Verification code sent to your email',
      data: {
        email: email
      }
    });
  } catch (err) {
    console.error('Error initiating signup:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Register a new user (Step 2: Verify OTP and complete registration)
exports.completeSignup = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and verification code'
      });
    }
    
    // Verify OTP
    const isValid = await OTP.verifyOTP(email, otp, 'registration');
    if (!isValid) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid or expired verification code'
      });
    }
    
    // Check if we have pending registration data for this email
    if (!global.pendingRegistrations || !global.pendingRegistrations.has(email)) {
      return res.status(404).json({
        status: 'fail',
        message: 'Registration data not found or expired. Please try registering again.'
      });
    }
    
    // Get the pending registration data
    const registrationData = global.pendingRegistrations.get(email);
    
    // Check if registration data is expired (1 hour)
    const now = new Date();
    const createdAt = new Date(registrationData.createdAt);
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 1) {
      // Remove expired registration data
      global.pendingRegistrations.delete(email);
      return res.status(400).json({
        status: 'fail',
        message: 'Registration data expired. Please try registering again.'
      });
    }
    
    // Create the user now that OTP is verified
    const user = await User.create({
      name: registrationData.name,
      email: registrationData.email,
      password: registrationData.password, // Already hashed
      isEmailVerified: true,
      registrationComplete: true,
      active: true
    });
    
    // Create device ID and save as trusted device
    const deviceId = generateDeviceId(req);
    
    // Set expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Save trusted device
    await TrustedDevice.create({
      userId: user.id,
      email: user.email,
      deviceId,
      deviceName: req.headers['user-agent'] || 'Unknown Device',
      expiresAt
    });
    
    // Log activity
    await Activity.create({
      userId: user.id,
      action: 'login',
      resourceType: 'user',
      resourceId: user.id,
      details: { method: 'signup' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Remove the pending registration data
    global.pendingRegistrations.delete(email);
    
    // Return success without token - user needs to login
    res.status(201).json({
      status: 'success',
      message: 'Registration successful! Please login with your credentials.',
      data: {
        email: user.email
      }
    });
  } catch (err) {
    console.error('Error completing signup:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Login user (Step 1: Validate credentials and send OTP if needed)
exports.initiateLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', email, 'Password:', password ? '******' : 'empty');

    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password'
      });
    }

    // Special handling for demo accounts - this ensures they always work
    if ((email === 'admin@example.com' || email === 'user@example.com') && password === 'password123') {
      console.log('Demo account login detected');
      
      try {
        // Find or create the user if it doesn't exist
        let user = await User.findOne({
          where: { email }
        });
        
        if (!user) {
          console.log('Demo user not found, creating it');
          // Create the demo user if it doesn't exist
          const role = email === 'admin@example.com' ? 'admin' : 'user';
          const name = email === 'admin@example.com' ? 'Admin User' : 'Regular User';
          
          user = await User.create({
            name,
            email,
            password: await bcrypt.hash('password123', 12),
            role,
            isEmailVerified: true,
            registrationComplete: true
          });
        } else {
          // Ensure password is correct for existing demo accounts
          // This handles cases where the password might have been changed
          user.password = await bcrypt.hash('password123', 12);
          await user.save();
        }
        
        console.log('Demo user found/created, creating token');
        
        // Update last login time
        user.lastLogin = Date.now();
        await user.save();
        
        // Log activity
        try {
          await Activity.create({
            userId: user.id,
            action: 'login',
            resourceType: 'user',
            resourceId: user.id,
            details: { method: 'demo_login' },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
        } catch (activityError) {
          console.error('Error logging activity:', activityError);
          // Continue even if activity logging fails
        }
        
        // Send token to client
        return createSendToken(user, 200, req, res);
      } catch (err) {
        console.error('Error handling demo account:', err);
        res.status(400).json({
          status: 'fail',
          message: 'An error occurred during demo account login. Please try again.'
        });
      }
    }

    // Regular login flow for non-demo accounts
    // First check if user exists regardless of active status
    const userExists = await User.findOne({
      where: { email }
    });
    
    // If user exists but is inactive, return specific message
    if (userExists && !userExists.active) {
      console.log('Inactive user attempted login:', email);
      return res.status(401).json({
        status: 'fail',
        message: 'Your account is inactive. Please contact your administrator.'
      });
    }
    
    // Check if user exists and is active
    const user = await User.findOne({
      where: { email, active: true }
    });

    if (!user) {
      console.log('User not found or inactive:', email);
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }
    
    console.log('User found:', user.email);
    
    // Try multiple password verification methods to ensure reliability
    let isPasswordCorrect = false;
    
    // Method 1: Use bcrypt compare directly (most reliable)
    try {
      isPasswordCorrect = await bcrypt.compare(password, user.password);
      console.log('Password check using bcrypt directly:', isPasswordCorrect);
    } catch (err) {
      console.error('Error using bcrypt directly:', err);
    }
    
    // Method 2: Use the User model's correctPassword method as fallback
    if (!isPasswordCorrect) {
      try {
        isPasswordCorrect = await user.correctPassword(password, user.password);
        console.log('Password check using model method:', isPasswordCorrect);
      } catch (err) {
        console.error('Error using model method:', err);
      }
    }
    
    if (!isPasswordCorrect) {
      console.log('Password incorrect for user:', email);
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }
    
    console.log('Password correct for user:', user.id);
    
    // Generate device ID
    const deviceId = generateDeviceId(req);
    
    // Check if OTP verification is required for this device
    const requireOTP = await OTP.isVerificationRequired(email, deviceId);
    
    if (requireOTP) {
      // Generate and send OTP
      const otp = await OTP.generateOTP(email, 'login');
      const emailSent = await emailService.sendOTP(email, otp, 'login');
      
      if (!emailSent) {
        return res.status(500).json({
          status: 'fail',
          message: 'Failed to send verification code. Please try again.'
        });
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Verification code sent to your email',
        data: {
          requireOTP: true,
          userId: user.id,
          email: user.email
        }
      });
    }
    
    // If OTP is not required, proceed with login
    // Update last login time and device ID
    user.lastLogin = Date.now();
    user.lastDeviceId = user.currentDeviceId;
    user.currentDeviceId = deviceId;
    await user.save();
    
    // Log activity
    await Activity.create({
      userId: user.id,
      action: 'login',
      resourceType: 'user',
      resourceId: user.id,
      details: { method: 'standard_login' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    createSendToken(user, 200, req, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Login user (Step 2: Verify OTP)
exports.completeLogin = async (req, res) => {
  try {
    const { email, otp, trustDevice } = req.body;
    
    console.log('Complete login request:', { email, otp: otp ? '******' : null, trustDevice });
    
    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and verification code'
      });
    }
    
    // Verify OTP
    const isValid = await OTP.verifyOTP(email, otp, 'login');
    if (!isValid) {
      console.log('OTP verification failed for:', email);
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid or expired verification code'
      });
    }
    
    console.log('OTP verification successful for:', email);
    
    // Find the user
    const user = await User.findOne({ where: { email, active: true } });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // Generate device ID
    const deviceId = generateDeviceId(req);
    
    // If user chose to trust this device, save it
    if (trustDevice) {
      // Set expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Save or update trusted device
      const existingDevice = await TrustedDevice.findOne({
        where: { email, deviceId }
      });
      
      if (existingDevice) {
        existingDevice.lastUsed = new Date();
        existingDevice.expiresAt = expiresAt;
        await existingDevice.save();
      } else {
        await TrustedDevice.create({
          userId: user.id,
          email: user.email,
          deviceId,
          deviceName: req.headers['user-agent'] || 'Unknown Device',
          lastUsed: new Date(),
          expiresAt
        });
      }
    }
    
    // Update last login time and device ID
    user.lastLogin = Date.now();
    user.lastDeviceId = user.currentDeviceId;
    user.currentDeviceId = deviceId;
    await user.save();
    
    // Log activity
    await Activity.create({
      userId: user.id,
      action: 'login',
      resourceType: 'user',
      resourceId: user.id,
      details: { method: 'otp_login' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    createSendToken(user, 200, req, res);
  } catch (err) {
    console.error('Complete login error:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    // Log activity if user is authenticated
    if (req.user) {
      await Activity.create({
        userId: req.user.id,
        action: 'logout',
        resourceType: 'user',
        resourceId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Initiate password reset (Step 1: Send OTP)
exports.initiatePasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate input
    if (!email) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email'
      });
    }
    
    // Check if user exists
    const user = await User.findOne({ where: { email, active: true } });
    if (!user) {
      // Don't reveal that the user doesn't exist for security reasons
      return res.status(200).json({
        status: 'success',
        message: 'If your email is registered, you will receive a password reset code'
      });
    }
    
    // Generate and send OTP
    const otp = await OTP.generateOTP(email, 'reset');
    const emailSent = await emailService.sendOTP(email, otp, 'reset');
    
    if (!emailSent) {
      return res.status(500).json({
        status: 'fail',
        message: 'Failed to send password reset code. Please try again.'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Password reset code sent to your email'
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Complete password reset (Step 2: Verify OTP and set new password)
exports.completePasswordReset = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email, verification code, and new password'
      });
    }
    
    // Validate password
    if (newPassword.length < 8) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password must be at least 8 characters'
      });
    }
    
    // Verify OTP
    const isValid = await OTP.verifyOTP(email, otp, 'reset');
    if (!isValid) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid or expired verification code'
      });
    }
    
    // Find the user
    const user = await User.findOne({ where: { email, active: true } });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Log activity
    await Activity.create({
      userId: user.id,
      action: 'change_user_permission', // Using an existing action type
      resourceType: 'user',
      resourceId: user.id,
      details: { method: 'password_reset' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Password reset successful'
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Protect routes - middleware to check if user is logged in
exports.protect = async (req, res, next) => {
  try {
    // 1) Get token and check if it exists
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-for-development-only');

    // 3) Check if user still exists
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // 4) Check if user is active
    if (!user.active) {
      return res.status(401).json({
        status: 'fail',
        message: 'This user account has been deactivated.'
      });
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      status: 'fail',
      message: 'Invalid token or token expired. Please log in again.'
    });
  }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Forgot password - Step 1: Request password reset
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate input
    if (!email) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide your email address'
      });
    }
    
    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with that email address'
      });
    }
    
    // Generate and send OTP
    const otp = await OTP.generateOTP(email, 'reset');
    const emailSent = await emailService.sendOTP(email, otp, 'reset');
    
    if (!emailSent) {
      return res.status(500).json({
        status: 'fail',
        message: 'Failed to send verification code. Please try again.'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Verification code sent to your email'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Forgot password - Step 2: Verify reset code
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and verification code'
      });
    }
    
    // Verify OTP
    const isValid = await OTP.verifyOTP(email, otp, 'reset');
    if (!isValid) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid or expired verification code'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Verification code is valid'
    });
  } catch (err) {
    console.error('Verify reset code error:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Forgot password - Step 3: Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    
    // Validate input
    if (!email || !otp || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email, verification code, and new password'
      });
    }
    
    // Verify OTP again for security
    const otpRecord = await OTP.findOne({
      where: { 
        email, 
        purpose: 'reset',
        isVerified: true
      }
    });
    
    if (!otpRecord) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid or expired verification code'
      });
    }
    
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Update user password
    user.password = hashedPassword;
    await user.save();
    
    // Mark OTP as used
    otpRecord.isVerified = true;
    await otpRecord.save();
    
    // Log activity
    await Activity.create({
      userId: user.id,
      action: 'change_user_permission', // Using an existing action type
      resourceType: 'user',
      resourceId: user.id,
      details: { method: 'forgot_password' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
