const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../database/connection');

class User extends Model {
  // Method to check if password is correct
  async correctPassword(candidatePassword, userPassword) {
    try {
      // Use bcrypt to compare passwords
      const result = await bcrypt.compare(candidatePassword, userPassword);
      console.log('Password comparison result:', result);
      return result;
    } catch (error) {
      console.error('Password comparison error:', error);
      return false;
    }
  }
  
  // Method to check if email domain is allowed
  static async isEmailDomainAllowed(email) {
    try {
      // Get allowed domains setting
      const allowedDomainsSetting = await sequelize.models.Setting.findOne({
        where: { key: 'allowed_domains' }
      });
      
      // If no setting exists, allow all domains by default
      if (!allowedDomainsSetting || !allowedDomainsSetting.value) {
        return true;
      }
      
      const settings = JSON.parse(allowedDomainsSetting.value);
      
      // If domain restriction is not enabled, allow all domains
      if (!settings.enabled) {
        return true;
      }
      
      // If guest users are allowed, check if this is a guest user
      if (settings.allowGuests) {
        const guestUsersSetting = await sequelize.models.Setting.findOne({
          where: { key: 'guest_users' }
        });
        
        if (guestUsersSetting && guestUsersSetting.value) {
          const guestUsers = JSON.parse(guestUsersSetting.value);
          if (guestUsers.emails && guestUsers.emails.includes(email)) {
            return true;
          }
        }
      }
      
      // Check if email domain is in allowed domains
      if (settings.domains && settings.domains.length > 0) {
        const domain = email.split('@')[1];
        return settings.domains.includes(domain);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking email domain:', error);
      return false;
    }
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8]
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isGuest: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  registrationComplete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  currentDeviceId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastDeviceId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        // Skip hashing if password is already hashed
        if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
          console.log('Hashing password for user:', user.email);
          user.password = await bcrypt.hash(user.password, 12);
        }
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        // Skip hashing if password is already hashed
        if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      }
    }
  }
});

module.exports = User;
