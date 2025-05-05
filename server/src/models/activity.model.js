const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

class Activity extends Model {
  // Enhanced create method to log activities for all users
  static async create(data) {
    // Store the isAdminActivity flag for filtering purposes
    const isAdminActivity = data.isAdminActivity || false;
    
    // Add isAdminActivity to the data object if not already present
    if (!('isAdminActivity' in data)) {
      data.isAdminActivity = isAdminActivity;
    }
    
    // Log that we're creating an activity
    console.log(`Creating activity log: ${data.action} for user ${data.userId}`);
    
    // Proceed with normal creation for all activities
    return super.create(data);
  }
}

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
      // Authentication activities
      'login', 
      'logout', 
      'login_attempt_failed',
      'password_reset_initiated',
      'password_reset_completed',
      'signup_initiated',
      'signup_completed',
      'pin_created',
      'pin_updated',
      'pin_verified',
      'pin_verification_failed',
      
      // Credential activities
      'create_credential', 
      'view_credential', 
      'view_all_credentials',
      'edit_credential', 
      'delete_credential',
      'view_credential_history',
      'restore_credential_version',
      'export_credentials',
      'import_credentials',
      'copy_credential_field',
      'search_credentials',
      
      // Group activities
      'create_group',
      'view_group',
      'view_all_groups',
      'edit_group',
      'delete_group',
      'add_user_to_group',
      'remove_user_from_group',
      'remove_group_member',
      'update_group_member_role',
      
      // Sharing activities
      'change_user_permission',
      'share_credential',
      'revoke_credential_access',
      
      // User management activities
      'create_user',
      'edit_user',
      'delete_user',
      'update_user',
      'update_password',
      'change_role',
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
