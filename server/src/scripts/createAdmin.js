const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../config/.env') });

// Database connection
const sequelize = require('../database/connection');
const User = require('../models/user.model');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Create admin user with custom or default credentials
 */
const createAdminUser = async (customEmail = null, customPassword = null) => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully');

    // Check if an admin user already exists
    const adminExists = await User.findOne({
      where: {
        role: 'admin'
      }
    });

    if (adminExists) {
      console.log('Admin user already exists:');
      console.log(`Email: ${adminExists.email}`);
      
      const updatePrompt = await new Promise(resolve => {
        rl.question('Do you want to create another admin user? (y/n): ', answer => {
          resolve(answer.toLowerCase());
        });
      });
      
      if (updatePrompt !== 'y') {
        console.log('Operation cancelled.');
        rl.close();
        process.exit(0);
      }
    }

    // Use provided credentials or prompt for them
    let email = customEmail;
    let password = customPassword;

    if (!email) {
      email = await new Promise(resolve => {
        rl.question('Enter admin email (default: admin@passwordmanager.com): ', answer => {
          resolve(answer || 'admin@passwordmanager.com');
        });
      });
    }

    if (!password) {
      password = await new Promise(resolve => {
        rl.question('Enter admin password (default: admin123): ', answer => {
          resolve(answer || 'admin123');
        });
      });
    }

    // Create admin user
    const newAdmin = await User.create({
      name: 'System Administrator',
      email: email,
      password: password, // Will be hashed by User model hooks
      role: 'admin',
      active: true,
      isEmailVerified: true,
      registrationComplete: true,
      otpEnabled: false // Disable OTP for easy access
    });

    console.log('=======================================================');
    console.log('ADMIN USER CREATED SUCCESSFULLY');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('Please change these credentials after first login!');
    console.log('=======================================================');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    rl.close();
    process.exit(1);
  }
};

// If script is run directly with arguments
if (process.argv.length > 2) {
  const email = process.argv[2];
  const password = process.argv[3] || 'admin123';
  createAdminUser(email, password);
} else {
  // Interactive mode
  createAdminUser();
}
