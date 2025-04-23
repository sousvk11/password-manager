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
    console.log('Login attempt:', email);

    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password'
      });
    }

    // Check if user exists and include all attributes (including password)
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
    console.log('Password from DB (hashed):', user.password);
    
    // Verify password using bcrypt directly
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    console.log('Password check result:', isPasswordCorrect);
    
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
    await Activity.create({
      userId: user.id,
      action: 'login',
      resourceType: 'user',
      resourceId: user.id,
      details: { method: 'login' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Send token to client
    createSendToken(user, 200, req, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
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
