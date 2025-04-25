const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class CredentialVersion extends Model {}

CredentialVersion.init({
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
  websiteName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  url: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING
  },
  userId: {
    type: DataTypes.STRING
  },
  password: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  token: {
    type: DataTypes.TEXT
  },
  description: {
    type: DataTypes.TEXT
  },
  versionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  changedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  changeType: {
    type: DataTypes.ENUM('create', 'update', 'delete'),
    allowNull: false
  },
  changedFields: {
    type: DataTypes.JSON
  }
}, {
  sequelize,
  modelName: 'CredentialVersion',
  tableName: 'credential_versions',
  timestamps: true,
  indexes: [
    {
      fields: ['credentialId', 'versionNumber']
    }
  ]
});

module.exports = CredentialVersion;
