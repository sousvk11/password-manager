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
