const nodemailer = require('nodemailer');
const Setting = require('../models/setting.model');

/**
 * Email service for sending OTP and other notifications
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.settings = null;
  }

  /**
   * Initialize the email service with SMTP settings from the database
   */
  async init() {
    try {
      // Get SMTP settings from database
      this.settings = await Setting.findOne({ where: { key: 'smtp' } });
      
      if (!this.settings || !this.settings.value) {
        console.log('SMTP settings not found or not configured');
        return false;
      }

      const smtpConfig = JSON.parse(this.settings.value);
      
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.username,
          pass: smtpConfig.password
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error initializing email service:', error);
      return false;
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @returns {Promise<boolean>} - True if email was sent successfully
   */
  async sendEmail(options) {
    try {
      let transporter = this.transporter;
      let senderInfo;
      
      // If custom SMTP config is provided (for testing), use it instead
      if (options.smtpConfig) {
        console.log('Using custom SMTP config for sending email');
        
        // Create a temporary transporter with the provided config
        transporter = nodemailer.createTransport({
          host: options.smtpConfig.host,
          port: options.smtpConfig.port,
          secure: options.smtpConfig.secure,
          auth: {
            user: options.smtpConfig.auth.user,
            pass: options.smtpConfig.auth.pass
          },
          // Add TLS options to handle SSL issues
          tls: options.smtpConfig.tls || {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
          },
          // Set a longer timeout for slow connections
          connectionTimeout: 10000,
          // Debug mode for more information
          debug: true,
          logger: true
        });
        
        // Use the sender info from the custom config
        senderInfo = {
          senderName: options.smtpConfig.from ? options.smtpConfig.from.split('<')[0].trim().replace(/"/g, '') : 'Password Manager',
          senderEmail: options.smtpConfig.from ? options.smtpConfig.from.split('<')[1].replace('>', '') : options.smtpConfig.auth.user
        };
      } else {
        // Use the default transporter
        if (!transporter) {
          const initialized = await this.init();
          if (!initialized) {
            console.error('Failed to initialize email service');
            return false;
          }
          transporter = this.transporter;
        }
        
        // Use the sender info from the settings
        const smtpConfig = JSON.parse(this.settings.value);
        senderInfo = {
          senderName: smtpConfig.senderName || 'Password Manager',
          senderEmail: smtpConfig.senderEmail
        };
      }
      
      // Prepare mail options
      const mailOptions = {
        from: `"${senderInfo.senderName}" <${senderInfo.senderEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };
      
      console.log('Sending email with options:', {
        to: options.to,
        subject: options.subject,
        from: mailOptions.from
      });

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  /**
   * Send OTP email
   * @param {string} email - Recipient email
   * @param {string} otp - One-time password
   * @param {string} purpose - Purpose of OTP (login, registration, reset)
   * @param {string} customPurpose - Optional custom purpose for display in email
   * @returns {Promise<boolean>} - True if email was sent successfully
   */
  async sendOTP(email, otp, purpose, customPurpose = null) {
    let subject, text, html;

    // Handle custom purpose for PIN generation
    if (purpose === 'reset' && customPurpose === 'pin_generation') {
      subject = 'PIN Generation Verification';
      text = `Your PIN generation verification code is: ${otp}. This code will expire in 10 minutes.`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>PIN Generation Verification</h2>
          <p>You have requested to generate a PIN for your Password Manager account.</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request to generate a PIN, please ignore this email or contact support.</p>
        </div>
      `;
    } else {
      switch (purpose) {
        case 'login':
          subject = 'Login Verification Code';
          text = `Your login verification code is: ${otp}. This code will expire in 10 minutes.`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Login Verification Code</h2>
              <p>You are attempting to log in to your Password Manager account from a new device or location.</p>
              <p>Your verification code is:</p>
              <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
              </div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you did not attempt to log in, please change your password immediately.</p>
            </div>
          `;
          break;
        
        case 'registration':
          subject = 'Complete Your Registration';
          text = `Your registration verification code is: ${otp}. This code will expire in 10 minutes.`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Complete Your Registration</h2>
              <p>Thank you for registering with Password Manager.</p>
              <p>Your verification code is:</p>
              <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
              </div>
              <p>This code will expire in 10 minutes.</p>
            </div>
          `;
          break;
        
        case 'reset':
          subject = 'Password Reset Request';
          text = `Your password reset code is: ${otp}. This code will expire in 10 minutes.`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Password Reset Request</h2>
              <p>We received a request to reset your password.</p>
              <p>Your password reset code is:</p>
              <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
              </div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you did not request a password reset, please ignore this email or contact support.</p>
            </div>
          `;
          break;
        
        default:
          subject = 'Verification Code';
          text = `Your verification code is: ${otp}. This code will expire in 10 minutes.`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Verification Code</h2>
              <p>Your verification code is:</p>
              <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
              </div>
              <p>This code will expire in 10 minutes.</p>
            </div>
          `;
      }
    }

    return this.sendEmail({
      to: email,
      subject,
      text,
      html
    });
  }

  /**
   * Test SMTP connection
   * @param {Object} smtpConfig - SMTP configuration
   * @returns {Promise<Object>} - Result of test
   */
  async testConnection(smtpConfig) {
    try {
      console.log('Testing SMTP connection with config:', {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure
      });
      
      // Create transporter with additional options for better SSL/TLS handling
      const testTransporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.username,
          pass: smtpConfig.password
        },
        // Add TLS options to handle SSL issues
        tls: {
          // Do not fail on invalid certificates
          rejectUnauthorized: false,
          // Use the most compatible ciphers
          ciphers: 'SSLv3'
        },
        // Set a longer timeout for slow connections
        connectionTimeout: 10000,
        // Debug mode for more information
        debug: true,
        logger: true
      });

      // Verify connection
      await testTransporter.verify();
      
      return { success: true, message: 'SMTP connection successful' };
    } catch (error) {
      console.error('SMTP test failed:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'SMTP connection failed';
      
      if (error.code === 'ESOCKET' && error.command === 'CONN') {
        if (error.reason && error.reason.includes('wrong version number')) {
          errorMessage = 'SSL/TLS configuration error. Try changing the "Use SSL/TLS" setting or port number.';
        } else {
          errorMessage = 'Connection error. Please check your SMTP server address and port.';
        }
      } else if (error.code === 'EAUTH') {
        errorMessage = 'Authentication failed. Please check your username and password.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timed out. Please check your SMTP server address and port.';
      }
      
      return { 
        success: false, 
        message: errorMessage, 
        error: error.message,
        code: error.code,
        command: error.command
      };
    }
  }
}

module.exports = new EmailService();
