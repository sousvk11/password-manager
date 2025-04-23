const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class GroupMember extends Model {}

GroupMember.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'groups',
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
  role: {
    type: DataTypes.ENUM('viewer', 'editor', 'admin'),
    defaultValue: 'viewer'
  }
}, {
  sequelize,
  modelName: 'GroupMember',
  tableName: 'group_members',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['groupId', 'userId']
    }
  ]
});

module.exports = GroupMember;
