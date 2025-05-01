const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');
const bcrypt = require('bcryptjs');

class UserPin extends Model {
  /**
   * Check if PIN is correct
   * @param {string} candidatePin - PIN to check
   * @param {string} userPin - Stored hashed PIN
   * @returns {Promise<boolean>} - True if PIN is correct
   */
  static async correctPin(candidatePin, userPin) {
    try {
      return await bcrypt.compare(candidatePin, userPin);
    } catch (error) {
      console.error('PIN comparison error:', error);
      return false;
    }
  }

  /**
   * Check if PIN is expired
   * @returns {boolean} - True if PIN is expired
   */
  isExpired() {
    // PIN expires after 6 months
    const expiryDate = new Date(this.updatedAt);
    expiryDate.setMonth(expiryDate.getMonth() + 6);
    return new Date() > expiryDate;
  }

  /**
   * Generate a new PIN for user
   * @param {number} userId - User ID
   * @param {boolean} enabled - Whether PIN is enabled
   * @returns {Promise<{pin: string, record: UserPin}>} - Generated PIN and record
   */
  static async generatePin(userId, enabled = true) {
    try {
      // Generate a random 4-digit PIN
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Hash the PIN
      const hashedPin = await bcrypt.hash(pin, 12);
      
      // Check if user already has a PIN
      const existingPin = await this.findOne({ where: { userId } });
      
      if (existingPin) {
        // Update existing PIN
        existingPin.pin = hashedPin;
        existingPin.enabled = enabled;
        await existingPin.save();
        return { pin, record: existingPin };
      }
      
      // Create new PIN record
      const pinRecord = await this.create({
        userId,
        pin: hashedPin,
        enabled
      });
      
      return { pin, record: pinRecord };
    } catch (error) {
      console.error('Error generating PIN:', error);
      throw error;
    }
  }

  /**
   * Set a custom PIN for user
   * @param {number} userId - User ID
   * @param {string} customPin - Custom 4-digit PIN
   * @param {boolean} enabled - Whether PIN is enabled
   * @returns {Promise<{pin: string, record: UserPin}>} - Set PIN and record
   */
  static async setCustomPin(userId, customPin, enabled = true) {
    try {
      // Validate PIN format
      if (!/^\d{4}$/.test(customPin)) {
        throw new Error('PIN must be exactly 4 digits');
      }
      
      // Hash the PIN
      const hashedPin = await bcrypt.hash(customPin, 12);
      
      // Check if user already has a PIN
      const existingPin = await this.findOne({ where: { userId } });
      
      if (existingPin) {
        // Update existing PIN
        existingPin.pin = hashedPin;
        existingPin.enabled = enabled;
        await existingPin.save();
        return { pin: customPin, record: existingPin };
      }
      
      // Create new PIN record
      const pinRecord = await this.create({
        userId,
        pin: hashedPin,
        enabled
      });
      
      return { pin: customPin, record: pinRecord };
    } catch (error) {
      console.error('Error setting custom PIN:', error);
      throw error;
    }
  }
}

UserPin.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  pin: {
    type: DataTypes.STRING,
    allowNull: false
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastVerified: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'UserPin',
  tableName: 'user_pins',
  timestamps: true
});

module.exports = UserPin;
