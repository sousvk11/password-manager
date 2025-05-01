const User = require('../models/user.model');
const UserPin = require('../models/userPin.model');
const Activity = require('../models/activity.model');

/**
 * Get the current OTP settings for the authenticated user
 */
exports.getOtpSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the user's OTP settings
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        otpEnabled: user.otpEnabled
      }
    });
  } catch (err) {
    console.error('Error getting OTP settings:', err);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while getting OTP settings'
    });
  }
};

/**
 * Toggle OTP settings (enable/disable)
 * Requires PIN verification to disable OTP
 */
exports.toggleOtpSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enable, pin } = req.body;
    
    console.log('Toggle OTP settings request:', { userId, enable, pinProvided: !!pin });
    
    // Get the user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // If trying to disable OTP, PIN verification is required only if PIN is enabled
    if (enable === false && user.otpEnabled === true) {
      // Check if user has a PIN and if it's enabled
      const userPin = await UserPin.findOne({ where: { userId } });
      
      console.log('User PIN status:', { exists: !!userPin, enabled: userPin ? userPin.enabled : false });
      
      // Only require PIN verification if PIN is enabled
      if (userPin && userPin.enabled) {
        // Verify PIN
        if (!pin) {
          return res.status(400).json({
            status: 'fail',
            message: 'PIN is required to disable OTP verification'
          });
        }
        
        const isPinValid = await userPin.verifyPin(pin);
        
        if (!isPinValid) {
          return res.status(401).json({
            status: 'fail',
            message: 'Invalid PIN'
          });
        }
      } else {
        console.log('PIN verification is disabled, skipping PIN check for OTP disable');
      }
    }
    
    // Update the user's OTP settings
    user.otpEnabled = enable;
    await user.save();
    
    // Log the activity
    await Activity.create({
      userId,
      action: enable ? 'enable_otp' : 'disable_otp',
      resourceType: 'user',
      resourceId: userId,
      details: { otpEnabled: enable },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(200).json({
      status: 'success',
      message: enable ? 'OTP verification enabled' : 'OTP verification disabled',
      data: {
        otpEnabled: user.otpEnabled
      }
    });
  } catch (err) {
    console.error('Error updating OTP settings:', err);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating OTP settings'
    });
  }
};
