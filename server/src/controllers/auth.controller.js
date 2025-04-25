const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');

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

// Register a new user
exports.signup = async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role === 'admin' ? 'admin' : 'user' // Only allow admin if explicitly set
    });

    // Log activity
    await Activity.create({
      userId: newUser.id,
      action: 'login',
      resourceType: 'user',
      resourceId: newUser.id,
      details: { method: 'signup' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    createSendToken(newUser, 201, req, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Login user
exports.login = async (req, res, next) => {
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
            role
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
    // Check if user exists
    const user = await User.findOne({
      where: { email, active: true }
    });

    if (!user) {
      console.log('User not found:', email);
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
    
    console.log('Password correct, creating token for user:', user.id);
    
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
        details: { method: 'standard_login' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (activityError) {
      console.error('Error logging activity:', activityError);
      // Continue even if activity logging fails
    }

    // Send token to client
    createSendToken(user, 200, req, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({
      status: 'fail',
      message: 'An error occurred during login. Please try again.'
    });
  }
};

// Logout user
exports.logout = async (req, res, next) => {
  try {
    // Log activity if user is authenticated
    if (req.user) {
      await Activity.create({
        userId: req.user.id,
        action: 'logout',
        resourceType: 'user',
        resourceId: req.user.id,
        details: {},
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    res.status(200).json({ status: 'success' });
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
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token from authorization header:', token ? token.substring(0, 10) + '...' : 'none');
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
      console.log('Token from cookies:', token ? token.substring(0, 10) + '...' : 'none');
    }

    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // Get JWT secret
    const secret = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
    console.log('Using JWT secret:', secret.substring(0, 3) + '...');

    // Verify token
    console.log('Verifying token...');
    const decoded = jwt.verify(token, secret);
    console.log('Token verified, user ID:', decoded.id);

    // Check if user still exists
    console.log('Finding user with ID:', decoded.id);
    const currentUser = await User.findOne({
      where: { id: decoded.id, active: true }
    });
    
    if (!currentUser) {
      console.log('User not found or not active');
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }
    
    console.log('User authenticated:', currentUser.email);

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token. Please log in again.'
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Your token has expired! Please log in again.'
      });
    }
    res.status(400).json({
      status: 'fail',
      message: err.message
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
