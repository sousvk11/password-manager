const Setting = require('../models/setting.model');
const emailService = require('../utils/emailService');

/**
 * Get all settings
 */
exports.getAllSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    
    // Filter out sensitive information for non-admin users
    const filteredSettings = settings.map(setting => {
      const data = {
        id: setting.id,
        key: setting.key,
        description: setting.description,
        updatedAt: setting.updatedAt
      };
      
      // Only include values for non-sensitive settings or for admin users
      if (req.user.role === 'admin' || !['smtp'].includes(setting.key)) {
        data.value = setting.value;
      }
      
      return data;
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        settings: filteredSettings
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

/**
 * Get setting by key
 */
exports.getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ where: { key } });
    
    // If setting doesn't exist, return an empty setting object
    if (!setting) {
      return res.status(200).json({
        status: 'success',
        data: {
          setting: {
            key,
            value: null,
            description: null
          }
        }
      });
    }
    
    // Don't return sensitive values to non-admin users
    const data = {
      id: setting.id,
      key: setting.key,
      description: setting.description,
      updatedAt: setting.updatedAt
    };
    
    // Only include values for non-sensitive settings or for admin users
    if (req.user.role === 'admin' || !['smtp'].includes(setting.key)) {
      data.value = setting.value;
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        setting: data
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

/**
 * Create or update setting
 */
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    // Find existing setting
    let setting = await Setting.findOne({ where: { key } });
    
    if (setting) {
      // Update existing setting
      setting.value = value;
      if (description) setting.description = description;
      await setting.save();
    } else {
      // Create new setting
      setting = await Setting.create({
        key,
        value,
        description
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        setting
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

/**
 * Delete setting
 */
exports.deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ where: { key } });
    
    if (!setting) {
      return res.status(404).json({
        status: 'fail',
        message: `Setting with key ${key} not found`
      });
    }
    
    await setting.destroy();
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

/**
 * Test SMTP connection
 */
exports.testSMTP = async (req, res) => {
  try {
    const { config, testEmail } = req.body;
    
    // Test SMTP connection
    const result = await emailService.testConnection(config);
    
    if (!result.success) {
      return res.status(400).json({
        status: 'fail',
        message: result.message,
        error: result.error
      });
    }
    
    // If test email is provided, send a test email
    if (testEmail) {
      try {
        // Send test email using the same config that was verified
        await emailService.sendEmail({
          to: testEmail,
          subject: 'SMTP Test Email',
          text: 'This is a test email to verify your SMTP configuration.',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>SMTP Test Email</h2>
              <p>This is a test email to verify your SMTP configuration.</p>
              <p>If you received this email, your SMTP settings are working correctly.</p>
            </div>
          `,
          // Pass the custom SMTP config
          smtpConfig: {
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
              user: config.username,
              pass: config.password
            },
            from: `"${config.senderName}" <${config.senderEmail}>`,
            // Add TLS options to handle SSL issues
            tls: {
              rejectUnauthorized: false,
              ciphers: 'SSLv3'
            }
          }
        });
        
        return res.status(200).json({
          status: 'success',
          message: 'SMTP connection successful and test email sent'
        });
      } catch (error) {
        console.error('Error sending test email:', error);
        
        // Return a 400 status to indicate the error
        return res.status(400).json({
          status: 'fail',
          message: 'SMTP connection successful but failed to send test email: ' + error.message,
          error: error.message
        });
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: 'SMTP connection successful'
    });
  } catch (err) {
    console.error('Error in SMTP test:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

/**
 * Get SMTP settings
 */
exports.getSmtpSettings = async (req, res) => {
  try {
    const setting = await Setting.findOne({ where: { key: 'smtp' } });
    
    if (!setting) {
      return res.status(200).json({
        status: 'success',
        data: {
          setting: {
            key: 'smtp',
            value: null,
            description: 'SMTP server settings for email notifications'
          }
        }
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        setting
      }
    });
  } catch (err) {
    console.error('Error getting SMTP settings:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

/**
 * Update SMTP settings
 */
exports.updateSmtpSettings = async (req, res) => {
  try {
    const { value, description } = req.body;
    
    // Validate the value
    if (!value) {
      return res.status(400).json({
        status: 'fail',
        message: 'SMTP settings value is required'
      });
    }
    
    // Find existing setting
    let setting = await Setting.findOne({ where: { key: 'smtp' } });
    
    if (setting) {
      // Update existing setting
      setting.value = value;
      if (description) setting.description = description;
      await setting.save();
    } else {
      // Create new setting
      setting = await Setting.create({
        key: 'smtp',
        value,
        description: description || 'SMTP server settings for email notifications'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        setting
      }
    });
  } catch (err) {
    console.error('Error updating SMTP settings:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

/**
 * Get domain settings
 */
exports.getDomainSettings = async (req, res) => {
  try {
    // Get allowed domains setting
    const allowedDomains = await Setting.findOne({ 
      where: { key: 'allowed_domains' } 
    });
    
    // Get guest users setting
    const guestUsers = await Setting.findOne({ 
      where: { key: 'guest_users' } 
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        allowedDomains: allowedDomains ? JSON.parse(allowedDomains.value || '{}') : { enabled: false, domains: [] },
        guestUsers: guestUsers ? JSON.parse(guestUsers.value || '{}') : { emails: [] }
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

/**
 * Update domain settings
 */
exports.updateDomainSettings = async (req, res) => {
  try {
    const { allowedDomains, guestUsers } = req.body;
    
    // Update allowed domains setting
    let allowedDomainsSetting = await Setting.findOne({ 
      where: { key: 'allowed_domains' } 
    });
    
    if (allowedDomainsSetting) {
      allowedDomainsSetting.value = JSON.stringify(allowedDomains);
      await allowedDomainsSetting.save();
    } else {
      allowedDomainsSetting = await Setting.create({
        key: 'allowed_domains',
        value: JSON.stringify(allowedDomains),
        description: 'Allowed email domains for registration'
      });
    }
    
    // Update guest users setting
    let guestUsersSetting = await Setting.findOne({ 
      where: { key: 'guest_users' } 
    });
    
    if (guestUsersSetting) {
      guestUsersSetting.value = JSON.stringify(guestUsers);
      await guestUsersSetting.save();
    } else {
      guestUsersSetting = await Setting.create({
        key: 'guest_users',
        value: JSON.stringify(guestUsers),
        description: 'Guest user email addresses'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        allowedDomains,
        guestUsers
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
