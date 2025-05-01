const UserPin = require('../models/userPin.model');
const Activity = require('../models/activity.model');
const OTP = require('../models/otp.model');
const emailService = require('../utils/emailService');

// Initiate PIN generation with OTP verification
exports.initiateGeneratePin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email } = req.user;
    
    // Generate and send OTP
    // Using 'reset' as the purpose since it's already defined in the OTP model
    const otp = await OTP.generateOTP(email, 'reset');
    const emailSent = await emailService.sendOTP(email, otp, 'reset', 'pin_generation');
    
    if (!emailSent) {
      return res.status(500).json({
        status: 'fail',
        message: 'Failed to send verification code. Please try again.'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Verification code sent to your email',
      data: {
        email
      }
    });
  } catch (err) {
    console.error('Error initiating PIN generation:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Complete PIN generation after OTP verification
exports.completeGeneratePin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email } = req.user;
    const { otp, enabled = true, customPin } = req.body;
    
    // Validate input
    if (!otp) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide verification code'
      });
    }
    
    // Verify OTP using 'reset' as the purpose
    const isValid = await OTP.verifyOTP(email, otp, 'reset');
    if (!isValid) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid or expired verification code'
      });
    }
    
    // Generate PIN or use custom PIN if provided
    let pinResult;
    if (customPin) {
      // Validate custom PIN format (4 digits)
      if (!/^\d{4}$/.test(customPin)) {
        return res.status(400).json({
          status: 'fail',
          message: 'PIN must be exactly 4 digits'
        });
      }
      
      // Use the custom PIN
      pinResult = await UserPin.setCustomPin(userId, customPin, enabled);
    } else {
      // Generate a random PIN
      pinResult = await UserPin.generatePin(userId, enabled);
    }
    
    // Log activity
    await Activity.create({
      userId,
      action: 'change_user_permission',
      resourceType: 'user',
      resourceId: userId,
      details: { operation: 'generate_pin' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      status: 'success',
      message: 'PIN generated successfully',
      data: {
        pin: pinResult.pin,
        enabled: pinResult.record.enabled,
        expiresAt: new Date(pinResult.record.updatedAt.getTime() + (6 * 30 * 24 * 60 * 60 * 1000)) // 6 months from now
      }
    });
  } catch (err) {
    console.error('Error generating PIN:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Original generatePin function is now deprecated
exports.generatePin = async (req, res) => {
  return res.status(400).json({
    status: 'fail',
    message: 'This endpoint is deprecated. Please use the two-step PIN generation with OTP verification.'
  });
};

// Toggle PIN enabled/disabled
exports.togglePin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled } = req.body;
    
    // Find user's PIN
    const userPin = await UserPin.findOne({ where: { userId } });
    
    if (!userPin) {
      return res.status(404).json({
        status: 'fail',
        message: 'PIN not found. Please generate a PIN first.'
      });
    }
    
    // Update PIN status
    userPin.enabled = enabled;
    await userPin.save();
    
    // Log activity
    await Activity.create({
      userId,
      action: 'change_user_permission',
      resourceType: 'user',
      resourceId: userId,
      details: { operation: enabled ? 'enable_pin' : 'disable_pin' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      status: 'success',
      message: `PIN ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        enabled: userPin.enabled,
        expiresAt: new Date(userPin.updatedAt.getTime() + (6 * 30 * 24 * 60 * 60 * 1000)) // 6 months from now
      }
    });
  } catch (err) {
    console.error('Error toggling PIN:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get PIN status
exports.getPinStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find user's PIN
    const userPin = await UserPin.findOne({ where: { userId } });
    
    if (!userPin) {
      return res.status(200).json({
        status: 'success',
        data: {
          hasPin: false,
          enabled: false,
          expired: false
        }
      });
    }
    
    // Check if PIN is expired
    const isExpired = userPin.isExpired();
    
    res.status(200).json({
      status: 'success',
      data: {
        hasPin: true,
        enabled: userPin.enabled,
        expired: isExpired,
        expiresAt: new Date(userPin.updatedAt.getTime() + (6 * 30 * 24 * 60 * 60 * 1000)) // 6 months from now
      }
    });
  } catch (err) {
    console.error('Error getting PIN status:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Verify PIN
exports.verifyPin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pin } = req.body;
    
    // Validate input
    if (!pin) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide PIN'
      });
    }
    
    // Find user's PIN
    const userPin = await UserPin.findOne({ where: { userId } });
    
    if (!userPin) {
      return res.status(404).json({
        status: 'fail',
        message: 'PIN not found. Please generate a PIN first.'
      });
    }
    
    // Check if PIN is enabled
    if (!userPin.enabled) {
      return res.status(400).json({
        status: 'fail',
        message: 'PIN verification is disabled'
      });
    }
    
    // Check if PIN is expired
    if (userPin.isExpired()) {
      return res.status(400).json({
        status: 'fail',
        message: 'PIN has expired. Please generate a new PIN.'
      });
    }
    
    // Verify PIN
    const isValid = await UserPin.correctPin(pin, userPin.pin);
    
    if (!isValid) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid PIN'
      });
    }
    
    // Update last verified time
    userPin.lastVerified = new Date();
    await userPin.save();
    
    // Generate a session token for this PIN verification
    const pinSessionToken = require('crypto').randomBytes(32).toString('hex');
    
    // Set the PIN session token in a cookie
    res.cookie('pin_session', pinSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1 * 60 * 1000 // 1 minute
    });
    
    // Store the PIN session token in memory (in production, this should be in Redis)
    if (!global.pinSessions) {
      global.pinSessions = new Map();
    }
    
    // Get the action from the request (default to 'view' if not specified)
    const action = req.body.action || 'view';
    
    // Set session expiration time based on action
    // For view actions, session expires in 1 minute
    // For other actions (edit, delete), session is valid only for that specific action
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000); // 1 minute from now
    
    // Store additional information in the session
    global.pinSessions.set(userId.toString(), {
      token: pinSessionToken,
      expiresAt: expiresAt,
      lastUsed: new Date(),
      action: action, // Store the action for which this session was created
      browserTab: req.headers['x-browser-tab-id'] || 'default' // Store browser tab ID if available
    });
    
    // Log the PIN session creation
    console.log(`Created PIN session for user ${userId}, action: ${action}, expires at ${expiresAt.toISOString()}`);
    
    console.log(`PIN verified successfully for user ${userId}, session expires at ${expiresAt}`);
    
    res.status(200).json({
      status: 'success',
      message: 'PIN verified successfully',
      data: {
        verified: true,
        sessionExpiresAt: expiresAt
      }
    });
  } catch (err) {
    console.error('Error verifying PIN:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Check if PIN verification is required
exports.isPinVerificationRequired = (defaultAction) => async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Get the action type from query parameters or use the default action
    const action = req.query.action || defaultAction || 'view';
    
    console.log(`PIN verification check for user ${userId}, action: ${action}`);
    
    // Find user's PIN
    const userPin = await UserPin.findOne({ where: { userId } });
    
    // If user doesn't have a PIN or PIN is disabled, no verification required
    if (!userPin || !userPin.enabled) {
      console.log(`PIN verification not required - PIN is disabled or not set for user ${userId}`);
      req.pinVerificationRequired = false;
      return next();
    }
    
    // Check if PIN is expired
    if (userPin.isExpired()) {
      return res.status(400).json({
        status: 'fail',
        message: 'PIN has expired. Please generate a new PIN.',
        data: {
          pinExpired: true
        }
      });
    }
    
    // Check if there's an active PIN session
    if (global.pinSessions && global.pinSessions.has(userId.toString())) {
      const session = global.pinSessions.get(userId.toString());
      
      // Check if session is valid and not expired
      if (session && session.token && new Date() < new Date(session.expiresAt)) {
        console.log(`Valid PIN session found for user ${userId}, action: ${action}`);
        
        // For view actions, we can use the existing session
        if (action === 'view' || action === 'viewCredential' || action === 'read') {
          // PIN already verified in this session
          req.pinVerificationRequired = false;
          return next();
        }
        
        // For delete actions, check if the PIN was just verified (within the last 5 seconds)
        // This ensures the PIN verification is still valid for the current operation
        if (action === 'delete' && session.lastUsed) {
          const fiveSecondsAgo = new Date(Date.now() - 5 * 1000);
          if (new Date(session.lastUsed) > fiveSecondsAgo) {
            console.log(`Recent PIN verification found for delete action, allowing operation`);
            req.pinVerificationRequired = false;
            // Update the lastUsed timestamp
            session.lastUsed = new Date();
            global.pinSessions.set(userId.toString(), session);
            return next();
          } else {
            console.log(`PIN session exists but not recently used for delete action`);
          }
        }
      } else {
        console.log(`PIN session expired or invalid for user ${userId}`);
        // Remove expired session
        if (session) {
          global.pinSessions.delete(userId.toString());
        }
      }
    } else {
      console.log(`No PIN session found for user ${userId}`);
    }
    
    // For non-view actions that didn't pass the checks above, clear any existing PIN session to force verification
    if (action !== 'view' && action !== 'viewCredential' && action !== 'read') {
      if (global.pinSessions && global.pinSessions.has(userId.toString())) {
        console.log(`Clearing PIN session for non-view action: ${action}`);
        global.pinSessions.delete(userId.toString());
      }
    }
    
    // PIN verification required
    console.log(`PIN verification required for user ${userId}, action: ${action}`);
    req.pinVerificationRequired = true;
    next();
  } catch (err) {
    console.error('Error checking PIN verification:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Check if PIN verification is required (lightweight endpoint)
exports.checkPinRequired = async (req, res) => {
  try {
    const userId = req.user.id;
    const action = req.query.action || 'view';
    
    console.log(`Checking if PIN verification is required for user ${userId}, action: ${action}`);
    
    // Find user's PIN
    const userPin = await UserPin.findOne({ where: { userId } });
    
    // If user doesn't have a PIN or PIN is disabled, no verification required
    if (!userPin || !userPin.enabled) {
      console.log(`PIN verification not required - PIN is disabled or not set for user ${userId}`);
      return res.status(200).json({
        status: 'success',
        message: 'PIN verification not required',
        data: {
          requirePin: false
        }
      });
    }
    
    // Check if there's an active PIN session
    if (global.pinSessions && global.pinSessions.has(userId.toString())) {
      const session = global.pinSessions.get(userId.toString());
      
      // Check if session is valid and not expired
      if (session && session.token && new Date() < new Date(session.expiresAt)) {
        // For view actions, we can use the existing session
        if (action === 'view' || action === 'viewCredential' || action === 'viewVersionHistory' || action === 'read') {
          // Get browser tab ID if available
          const browserTabId = req.headers['x-browser-tab-id'] || 'default';
          
          // Check if this is the same browser tab that created the session
          // If no tab ID was stored or provided, default to allowing the session
          const isSameTab = !session.browserTab || !browserTabId || session.browserTab === browserTabId;
          
          if (isSameTab) {
            // Update the last used timestamp for the session
            session.lastUsed = new Date();
            global.pinSessions.set(userId.toString(), session);
            
            // Calculate remaining time in seconds
            const remainingTime = Math.round((new Date(session.expiresAt) - new Date()) / 1000);
            console.log(`Using existing PIN session for user ${userId}, action: ${action}, expires in ${remainingTime} seconds`);
            
            // Return success response with session info
            return res.status(200).json({
              status: 'success',
              message: 'PIN verification not required - active session exists',
              data: {
                requirePin: false,
                sessionExpiresIn: remainingTime
              }
            });
          }
        }
      } else {
        // Session is expired, remove it
        global.pinSessions.delete(userId.toString());
        console.log(`Removed expired PIN session for user ${userId}`);
      }
    }
    
    // Check if PIN is expired
    if (userPin.isExpired()) {
      return res.status(400).json({
        status: 'fail',
        message: 'PIN has expired. Please generate a new PIN.',
        data: {
          pinExpired: true,
          requirePin: true
        }
      });
    }
    
    // Check if there's an active PIN session
    if (global.pinSessions && global.pinSessions.has(userId.toString())) {
      const session = global.pinSessions.get(userId.toString());
      
      // Check if session is valid and not expired
      if (session && session.token && new Date() < new Date(session.expiresAt)) {
        // For view actions, we can use the existing session
        if (action === 'view' || action === 'viewCredential' || action === 'read') {
          // Get browser tab ID if available
          const browserTabId = req.headers['x-browser-tab-id'] || 'default';
          
          // Check if this is the same browser tab that created the session
          // If no tab ID was stored or provided, default to allowing the session
          const isSameTab = !session.browserTab || !browserTabId || session.browserTab === browserTabId;
          
          // Update the last used timestamp for the session
          session.lastUsed = new Date();
          global.pinSessions.set(userId.toString(), session);
          
          // Log session usage
          const remainingTime = Math.round((new Date(session.expiresAt) - new Date()) / 1000);
          console.log(`Using existing PIN session for user ${userId}, action: ${action}, expires in ${remainingTime} seconds`);
          
          // Return success response with session info
          return res.status(200).json({
            status: 'success',
            message: 'PIN verification not required - active session exists',
            data: {
              requirePin: false,
              sessionExpiresIn: remainingTime,
              isSameTab: isSameTab
            }
          });
        }
      } else {
        // Session is expired, remove it
        global.pinSessions.delete(userId.toString());
        console.log(`Removed expired PIN session for user ${userId}`);
      }
    }
    
    // PIN verification required
    return res.status(403).json({
      status: 'fail',
      message: 'PIN verification required',
      data: {
        requirePin: true
      }
    });
  } catch (err) {
    console.error('Error checking PIN requirement:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get the current PIN status (enabled/disabled) for the authenticated user
exports.getPinStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find user's PIN
    const userPin = await UserPin.findOne({ where: { userId } });
    
    // If user doesn't have a PIN, it's considered disabled
    if (!userPin) {
      return res.status(200).json({
        status: 'success',
        message: 'PIN status retrieved',
        data: {
          hasPin: false,
          enabled: false,
          expired: false,
          expiresAt: null,
          email: req.user.email
        }
      });
    }
    
    // Check if PIN is expired
    const isExpired = userPin.isExpired ? userPin.isExpired() : false;
    
    // Return the complete PIN status
    return res.status(200).json({
      status: 'success',
      message: 'PIN status retrieved',
      data: {
        hasPin: true,
        enabled: userPin.enabled,
        expired: isExpired,
        expiresAt: userPin.expiresAt,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Error getting PIN status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get PIN status',
      error: error.message
    });
  }
};

module.exports = exports;
