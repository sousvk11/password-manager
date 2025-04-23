const bcrypt = require('bcryptjs');
const sequelize = require('./connection');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const GroupMember = require('../models/groupMember.model');
const Credential = require('../models/credential.model');
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

  // Group and Credential associations (many-to-many)
  Group.belongsToMany(Credential, { through: CredentialGroup, foreignKey: 'groupId' });
  Credential.belongsToMany(Group, { through: CredentialGroup, foreignKey: 'credentialId' });
  
  // CredentialGroup associations
  CredentialGroup.belongsTo(Credential, { foreignKey: 'credentialId' });
  CredentialGroup.belongsTo(Group, { foreignKey: 'groupId' });

  // User and Activity associations
  User.hasMany(Activity, { foreignKey: 'userId' });
  Activity.belongsTo(User, { foreignKey: 'userId' });
};

// Seed data
const seedDatabase = async () => {
  try {
    console.log('Setting up database associations...');
    setupAssociations();

    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('password123', 12);
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('Creating regular user...');
    const regularUser = await User.create({
      name: 'Regular User',
      email: 'user@example.com',
      password: hashedPassword, // Use the same hashed password
      role: 'user'
    });

    console.log('Creating sample groups...');
    const pscGroup = await Group.create({
      name: 'PSC',
      description: 'PSC Group for password management',
      ownerId: adminUser.id
    });

    const ptkGroup = await Group.create({
      name: 'PTK',
      description: 'PTK Group for password management',
      ownerId: adminUser.id
    });
    
    const personalGroup = await Group.create({
      name: 'Personal',
      description: 'Personal Group for password management',
      ownerId: regularUser.id
    });

    console.log('Adding users to groups...');
    await GroupMember.create({
      groupId: pscGroup.id,
      userId: regularUser.id,
      role: 'editor'
    });

    console.log('Creating sample credentials...');
    // Create sample credentials for admin user
    const googleCred = await Credential.create({
      websiteName: 'Google',
      url: 'https://google.com',
      email: 'admin@example.com',
      password: 'google-password',
      description: 'Google account',
      ownerId: adminUser.id
    });
    
    // Associate credential with group
    await CredentialGroup.create({
      credentialId: googleCred.id,
      groupId: pscGroup.id,
      isPrimary: true
    });

    const githubCred = await Credential.create({
      websiteName: 'GitHub',
      url: 'https://github.com',
      email: 'admin@example.com',
      password: 'github-password',
      description: 'GitHub account',
      ownerId: adminUser.id
    });
    
    // Associate credential with group
    await CredentialGroup.create({
      credentialId: githubCred.id,
      groupId: ptkGroup.id,
      isPrimary: true
    });

    // Create sample credentials for regular user
    const fbCred = await Credential.create({
      websiteName: 'Facebook',
      url: 'https://facebook.com',
      email: 'user@example.com',
      password: 'facebook-password',
      description: 'Facebook account',
      ownerId: regularUser.id
    });
    
    // Associate credential with group
    await CredentialGroup.create({
      credentialId: fbCred.id,
      groupId: personalGroup.id,
      isPrimary: true
    });

    const twitterCred = await Credential.create({
      websiteName: 'Twitter',
      url: 'https://twitter.com',
      email: 'user@example.com',
      password: 'twitter-password',
      description: 'Twitter account',
      ownerId: regularUser.id
    });
    
    // Associate credential with group
    await CredentialGroup.create({
      credentialId: twitterCred.id,
      groupId: personalGroup.id,
      isPrimary: true
    });

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seed
seedDatabase();
