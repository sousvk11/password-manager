const sequelize = require('../database/connection');
const { QueryTypes } = require('sequelize');

/**
 * Migration script to create the deleted_items table
 */
async function addDeletedItemsTable() {
  try {
    console.log('Starting migration: Create deleted_items table');
    
    // Check if the table already exists
    const tables = await sequelize.query(
      "SHOW TABLES LIKE 'deleted_items'",
      { type: QueryTypes.SELECT }
    );
    
    if (tables.length === 0) {
      // Table doesn't exist, create it
      await sequelize.query(`
        CREATE TABLE deleted_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          originalId INT NOT NULL,
          itemType ENUM('credential', 'group') NOT NULL,
          name VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          deletedBy INT NOT NULL,
          ownerId INT NOT NULL,
          deletedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          restoredAt DATETIME NULL,
          isRestored BOOLEAN NOT NULL DEFAULT FALSE,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          FOREIGN KEY (deletedBy) REFERENCES users(id),
          FOREIGN KEY (ownerId) REFERENCES users(id),
          INDEX (itemType),
          INDEX (isRestored),
          INDEX (deletedAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('Successfully created deleted_items table');
    } else {
      console.log('deleted_items table already exists');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

module.exports = addDeletedItemsTable;
