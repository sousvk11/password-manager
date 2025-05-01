const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');
const crypto = require('crypto');

class OTP extends Model {
  /**
   * Generate a new OTP
   * @param {string} email - User email
   * @param {string} purpose - Purpose of OTP (login, registration, reset)
   * @returns {Promise<string>} - Generated OTP
   */
  static async generateOTP(email, purpose) {
    try {
      // Generate a 6-digit OTP using crypto
      const otp = crypto.randomInt(100000, 999999).toString();
      
      // Set expiration time (10 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      
      // Check if an OTP already exists for this email and purpose
      const existingOTP = await this.findOne({
        where: { email, purpose }
      });
      
      if (existingOTP) {
        // Update existing OTP
        existingOTP.otp = otp;
        existingOTP.expiresAt = expiresAt;
        existingOTP.isVerified = false;
        existingOTP.attempts = 0;
        await existingOTP.save();
      } else {
        // Create new OTP
        await this.create({
          email,
          otp,
          purpose,
          expiresAt,
          isVerified: false,
          attempts: 0
        });
      }
      
      return otp;
    } catch (error) {
      console.error('Error generating OTP:', error);
      throw error;
    }
  }
  
  /**
   * Verify an OTP
   * @param {string} email - User email
   * @param {string} otp - OTP to verify
   * @param {string} purpose - Purpose of OTP
   * @returns {Promise<boolean>} - True if OTP is valid
   */
  static async verifyOTP(email, otp, purpose) {
    try {
      console.log(`Verifying OTP: email=${email}, otp=${otp}, purpose=${purpose}`);
      
      const otpRecord = await this.findOne({
        where: { email, purpose }
      });
      
      if (!otpRecord) {
        console.log('OTP record not found');
        return false;
      }
      
      console.log(`Found OTP record: ${JSON.stringify({
        id: otpRecord.id,
        email: otpRecord.email,
        otp: otpRecord.otp,
        purpose: otpRecord.purpose,
        expiresAt: otpRecord.expiresAt,
        isVerified: otpRecord.isVerified,
        attempts: otpRecord.attempts
      })}`);
      
      // Check if OTP is expired
      if (new Date() > otpRecord.expiresAt) {
        console.log('OTP is expired');
        return false;
      }
      
      // Check if OTP is already verified
      if (otpRecord.isVerified) {
        console.log('OTP is already verified');
        return false;
      }
      
      // Check if max attempts reached (5 attempts)
      if (otpRecord.attempts >= 5) {
        console.log('Max attempts reached');
        return false;
      }
      
      // Increment attempts
      otpRecord.attempts += 1;
      
      // Ensure both values are strings and trim any whitespace
      const storedOTP = String(otpRecord.otp).trim();
      const inputOTP = String(otp).trim();
      
      console.log(`Comparing OTPs: stored=${storedOTP}, input=${inputOTP}`);
      
      // Check if OTP matches
      if (storedOTP === inputOTP) {
        console.log('OTP matched successfully');
        otpRecord.isVerified = true;
        await otpRecord.save();
        return true;
      }
      
      console.log('OTP did not match');
      await otpRecord.save();
      return false;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return false;
    }
  }
  
  /**
   * Check if verification is required
   * @param {string} email - User email
   * @param {string} deviceId - Device identifier
   * @returns {Promise<boolean>} - True if verification is required
   */
  static async isVerificationRequired(email, deviceId) {
    try {
      // Get trusted devices setting
      const trustedDevices = await sequelize.models.Setting.findOne({
        where: { key: 'trusted_devices' }
      });
      
      // If trusted devices is not enabled, always require OTP
      if (!trustedDevices || !trustedDevices.value || JSON.parse(trustedDevices.value).enabled === false) {
        return true;
      }
      
      // Check if device is trusted
      const device = await sequelize.models.TrustedDevice.findOne({
        where: { email, deviceId }
      });
      
      // If device is not found or trust has expired, require OTP
      if (!device || new Date() > device.expiresAt) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if verification is required:', error);
      return true; // Default to requiring OTP for safety
    }
  }
}

OTP.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  otp: {
    type: DataTypes.STRING,
    allowNull: false
  },
  purpose: {
    type: DataTypes.ENUM('login', 'registration', 'reset', 'pin_generation'),
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  sequelize,
  modelName: 'OTP',
  tableName: 'otps',
  timestamps: true
});

module.exports = OTP;
