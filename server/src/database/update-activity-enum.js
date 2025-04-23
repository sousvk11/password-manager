const sequelize = require('./connection');

const updateActivityEnum = async () => {
  try {
    console.log('Updating activity action enum values...');
    
    // Alter the activities table to modify the action enum
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
        'change_user_permission',
        'share_credential',
        'revoke_credential_access'
      ) NOT NULL;
    `);

    console.log('Activity enum values updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to update activity enum values:', error);
    process.exit(1);
  }
};

// Run the update
updateActivityEnum();
