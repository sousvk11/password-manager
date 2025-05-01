const sequelize = require('../database/connection');
const { QueryTypes } = require('sequelize');

/**
 * Migration script to add otpEnabled column to users table
 */
async function addOtpEnabledColumn() {
  try {
    console.log('Starting migration: Add otpEnabled column to users table');
    
    // Check if the column already exists
    const columns = await sequelize.query(
      "SHOW COLUMNS FROM users LIKE 'otpEnabled'",
      { type: QueryTypes.SELECT }
    );
    
    if (columns.length === 0) {
      // Column doesn't exist, add it
      await sequelize.query(
        "ALTER TABLE users ADD COLUMN otpEnabled BOOLEAN DEFAULT TRUE COMMENT 'Whether OTP verification is required for login'"
      );
      console.log('Successfully added otpEnabled column to users table');
    } else {
      console.log('otpEnabled column already exists in users table');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

module.exports = addOtpEnabledColumn;
