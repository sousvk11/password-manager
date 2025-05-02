const sequelize = require('../database/connection');
const { QueryTypes } = require('sequelize');

/**
 * Migration script to update the action ENUM in activities table
 * to include actions related to deleted items
 */
async function updateActivityEnumForDeletedItems() {
  try {
    console.log('Starting migration: Update activity ENUM for deleted items');
    
    // Get current ENUM values
    const [results] = await sequelize.query(`
      SHOW COLUMNS FROM activities WHERE Field = 'action'
    `);
    
    if (results.length === 0) {
      console.log('Column action not found in activities table');
      return;
    }
    
    const typeInfo = results[0].Type;
    const enumValues = typeInfo
      .substring(typeInfo.indexOf('(') + 1, typeInfo.lastIndexOf(')'))
      .split(',')
      .map(value => value.trim().replace(/'/g, ''));
    
    // New values to add
    const newValues = [
      'restore_credential',
      'restore_group',
      'permanent_delete_credential',
      'permanent_delete_group',
      'view_deleted_items'
    ];
    
    // Check if values already exist
    const valuesToAdd = newValues.filter(value => !enumValues.includes(value));
    
    if (valuesToAdd.length === 0) {
      console.log('All required ENUM values already exist in activities table');
      return;
    }
    
    // Create combined list of values
    const combinedValues = [...enumValues, ...valuesToAdd]
      .map(value => `'${value}'`)
      .join(', ');
    
    // Alter the table to update the ENUM
    await sequelize.query(`
      ALTER TABLE activities 
      MODIFY COLUMN action ENUM(${combinedValues}) NOT NULL
    `);
    
    console.log('Successfully updated action ENUM in activities table');
    console.log('Added values:', valuesToAdd.join(', '));
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

module.exports = updateActivityEnumForDeletedItems;
