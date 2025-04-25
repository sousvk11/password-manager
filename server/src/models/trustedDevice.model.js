const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class TrustedDevice extends Model {}

TrustedDevice.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deviceName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastUsed: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'TrustedDevice',
  tableName: 'trusted_devices',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email', 'deviceId']
    }
  ]
});

module.exports = TrustedDevice;
