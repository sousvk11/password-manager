const sequelize = require('../database/connection');
const { QueryTypes } = require('sequelize');

/**
 * Migration script to update the action ENUM in activities table
 * to include enable_otp and disable_otp values
 */
async function updateActivityEnum() {
  try {
    console.log('Starting migration: Update activities action ENUM');
    
    // Alter the action column to add the new ENUM values
    await sequelize.query(`
      ALTER TABLE activities 
      MODIFY COLUMN action ENUM(
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
        'disable_otp'
      ) NOT NULL
    `);
    
    console.log('Successfully updated activities action ENUM');
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

module.exports = updateActivityEnum;
