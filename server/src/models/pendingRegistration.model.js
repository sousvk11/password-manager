const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');
const bcrypt = require('bcryptjs');

class PendingRegistration extends Model {
  /**
   * Store registration data
   * @param {Object} data - Registration data
   * @returns {Promise<PendingRegistration>} - Created pending registration
   */
  static async storeRegistrationData(data) {
    try {
      const { name, email, password } = data;
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Check if there's an existing pending registration
      const existingRegistration = await this.findOne({ where: { email } });
      
      if (existingRegistration) {
        // Update existing registration
        existingRegistration.name = name;
        existingRegistration.password = hashedPassword;
        existingRegistration.isVerified = false;
        await existingRegistration.save();
        return existingRegistration;
      }
      
      // Create new pending registration
      return await this.create({
        name,
        email,
        password: hashedPassword,
        isVerified: false
      });
    } catch (error) {
      console.error('Error storing registration data:', error);
      throw error;
    }
  }
  
  /**
   * Get verified registration data
   * @param {string} email - User email
   * @returns {Promise<Object|null>} - Registration data if verified, null otherwise
   */
  static async getVerifiedRegistrationData(email) {
    try {
      const registration = await this.findOne({ 
        where: { 
          email,
          isVerified: true
        } 
      });
      
      if (!registration) {
        return null;
      }
      
      return {
        name: registration.name,
        email: registration.email,
        password: registration.password
      };
    } catch (error) {
      console.error('Error getting verified registration data:', error);
      return null;
    }
  }
  
  /**
   * Mark registration as verified
   * @param {string} email - User email
   * @returns {Promise<boolean>} - True if successful
   */
  static async markAsVerified(email) {
    try {
      const registration = await this.findOne({ where: { email } });
      
      if (!registration) {
        return false;
      }
      
      registration.isVerified = true;
      await registration.save();
      return true;
    } catch (error) {
      console.error('Error marking registration as verified:', error);
      return false;
    }
  }
  
  /**
   * Delete registration data
   * @param {string} email - User email
   * @returns {Promise<boolean>} - True if successful
   */
  static async deleteRegistrationData(email) {
    try {
      const registration = await this.findOne({ where: { email } });
      
      if (!registration) {
        return false;
      }
      
      await registration.destroy();
      return true;
    } catch (error) {
      console.error('Error deleting registration data:', error);
      return false;
    }
  }
}

PendingRegistration.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'PendingRegistration',
  tableName: 'pending_registrations',
  timestamps: true
});

module.exports = PendingRegistration;
