const sequelize = require('./connection');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const GroupMember = require('../models/groupMember.model');
const Credential = require('../models/credential.model');
const CredentialShare = require('../models/credentialShare.model');
const CredentialGroup = require('../models/credentialGroup.model');
const Activity = require('../models/activity.model');

// Define associations
const setupAssociations = () => {
  // User and Group associations
  User.hasMany(Group, { foreignKey: 'ownerId', as: 'ownedGroups' });
  Group.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

  // User and GroupMember associations
  User.hasMany(GroupMember, { foreignKey: 'userId' });
  GroupMember.belongsTo(User, { foreignKey: 'userId' });

  // Group and GroupMember associations
  Group.hasMany(GroupMember, { foreignKey: 'groupId' });
  GroupMember.belongsTo(Group, { foreignKey: 'groupId' });

  // User and Credential associations
  User.hasMany(Credential, { foreignKey: 'ownerId', as: 'ownedCredentials' });
  Credential.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

  // Credential and CredentialGroup associations
  Credential.hasMany(CredentialGroup, { foreignKey: 'credentialId' });
  CredentialGroup.belongsTo(Credential, { foreignKey: 'credentialId' });

  // Group and CredentialGroup associations
  Group.hasMany(CredentialGroup, { foreignKey: 'groupId' });
  CredentialGroup.belongsTo(Group, { foreignKey: 'groupId' });

  // User and CredentialShare associations
  User.hasMany(CredentialShare, { foreignKey: 'userId' });
  CredentialShare.belongsTo(User, { foreignKey: 'userId' });

  // Credential and CredentialShare associations
  Credential.hasMany(CredentialShare, { foreignKey: 'credentialId' });
  CredentialShare.belongsTo(Credential, { foreignKey: 'credentialId' });

  // User and Activity associations
  User.hasMany(Activity, { foreignKey: 'userId' });
  Activity.belongsTo(User, { foreignKey: 'userId' });
};

// Run migrations
const migrate = async () => {
  try {
    console.log('Setting up database associations...');
    setupAssociations();

    console.log('Creating tables...');
    
    // First create the users table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        active BOOLEAN DEFAULT TRUE,
        lastLogin DATETIME,
        isEmailVerified BOOLEAN DEFAULT FALSE,
        isGuest BOOLEAN DEFAULT FALSE,
        registrationComplete BOOLEAN DEFAULT FALSE,
        currentDeviceId VARCHAR(255),
        lastDeviceId VARCHAR(255),
        otpEnabled BOOLEAN DEFAULT TRUE,
        profilePicture LONGBLOB,
        companyLogo LONGBLOB,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      );
    `);
    
    // Then create the groups table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`groups\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        ownerId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    // Create group_members table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        groupId INT NOT NULL,
        userId INT NOT NULL,
        role ENUM('member', 'admin') DEFAULT 'member',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (groupId) REFERENCES \`groups\`(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_group_user (groupId, userId)
      );
    `);
    
    // Now create the credentials table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        websiteName VARCHAR(255) NOT NULL,
        url VARCHAR(255),
        email VARCHAR(255),
        userId VARCHAR(255),
        password TEXT NOT NULL,
        token TEXT,
        description TEXT,
        ownerId INT NOT NULL,
        lastModified DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create credential_shares table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS credential_shares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        credentialId INT NOT NULL,
        userId INT NOT NULL,
        permission ENUM('view', 'edit', 'admin') DEFAULT 'view',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (credentialId) REFERENCES credentials(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_credential_user (credentialId, userId)
      );
    `);

    // Create credential_groups table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS credential_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        credentialId INT NOT NULL,
        groupId INT NOT NULL,
        isPrimary BOOLEAN DEFAULT FALSE,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (credentialId) REFERENCES credentials(id) ON DELETE CASCADE,
        FOREIGN KEY (groupId) REFERENCES \`groups\`(id) ON DELETE CASCADE,
        UNIQUE KEY unique_credential_group (credentialId, groupId)
      );
    `);
    
    // Create activities table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        action ENUM('login', 'logout', 'create', 'update', 'delete', 'share', 'unshare', 'view') NOT NULL,
        entityType VARCHAR(50) NOT NULL,
        entityId INT,
        details TEXT,
        ipAddress VARCHAR(45),
        userAgent TEXT,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    console.log('Syncing database...');
    await sequelize.sync({ alter: true });

    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database migration failed:', error);
    process.exit(1);
  }
};

// Run migrations
migrate();
