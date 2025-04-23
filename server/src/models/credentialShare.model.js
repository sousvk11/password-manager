const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class CredentialShare extends Model {}

CredentialShare.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  credentialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'credentials',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  permission: {
    type: DataTypes.ENUM('view', 'edit'),
    defaultValue: 'view'
  }
}, {
  sequelize,
  modelName: 'CredentialShare',
  tableName: 'credential_shares',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['credentialId', 'userId']
    }
  ]
});

module.exports = CredentialShare;
