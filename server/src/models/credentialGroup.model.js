const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class CredentialGroup extends Model {}

CredentialGroup.init({
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
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'groups',
      key: 'id'
    }
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'CredentialGroup',
  tableName: 'credential_groups',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['credentialId', 'groupId']
    }
  ]
});

module.exports = CredentialGroup;
