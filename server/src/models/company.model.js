const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class Company extends Model {}

Company.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  logo: {
    type: DataTypes.BLOB('long'),
    allowNull: true,
    comment: 'Company logo stored as binary data'
  },
  favicon: {
    type: DataTypes.BLOB('long'),
    allowNull: true,
    comment: 'Website favicon stored as binary data'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  appTitle: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Password Manager',
    comment: 'Application title displayed in the header'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'Company',
  tableName: 'companies',
  timestamps: true
});

module.exports = Company;
