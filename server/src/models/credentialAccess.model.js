const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class CredentialAccess extends Model {}

CredentialAccess.init({
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
  accessType: {
    type: DataTypes.ENUM('view', 'edit'),
    allowNull: false,
    defaultValue: 'view'
  },
  grantedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'CredentialAccess',
  tableName: 'credential_accesses',
  timestamps: true,
  indexes: [
    {
      fields: ['credentialId', 'userId'],
      unique: true
    }
  ]
});

module.exports = CredentialAccess;
