const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class Activity extends Model {}

Activity.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.ENUM(
      'login', 
      'logout', 
      'create_credential', 
      'view_credential', 
      'view_all_credentials',
      'edit_credential', 
      'delete_credential',
      'create_group',
      'view_group',
      'view_all_groups',
      'edit_group',
      'delete_group',
      'add_user_to_group',
      'remove_user_from_group',
      'remove_group_member',
      'update_group_member_role',
      'change_user_permission',
      'share_credential',
      'revoke_credential_access',
      'create_user',
      'edit_user',
      'delete_user',
      'enable_otp',
      'disable_otp',
      'restore_credential',
      'restore_group',
      'permanent_delete_credential',
      'permanent_delete_group',
      'view_deleted_items'
    ),
    allowNull: false
  },
  resourceType: {
    type: DataTypes.ENUM('user', 'credential', 'group'),
    allowNull: false
  },
  resourceId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  details: {
    type: DataTypes.JSON
  },
  ipAddress: {
    type: DataTypes.STRING
  },
  userAgent: {
    type: DataTypes.STRING
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Activity',
  tableName: 'activities',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'timestamp']
    },
    {
      fields: ['resourceType', 'resourceId']
    }
  ]
});

module.exports = Activity;
