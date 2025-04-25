const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class Setting extends Model {}

Setting.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Setting',
  tableName: 'settings',
  timestamps: true
});

module.exports = Setting;
