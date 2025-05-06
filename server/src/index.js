const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config/.env') });

// Database connection
const sequelize = require('./database/connection');

// Import models
const User = require('./models/user.model');
const Group = require('./models/group.model');
const GroupMember = require('./models/groupMember.model');
const Credential = require('./models/credential.model');
const CredentialShare = require('./models/credentialShare.model');
const CredentialGroup = require('./models/credentialGroup.model');
const Activity = require('./models/activity.model');
const CredentialVersion = require('./models/credentialVersion.model');
const CredentialAccess = require('./models/credentialAccess.model');
const Setting = require('./models/setting.model');
const OTP = require('./models/otp.model');
const TrustedDevice = require('./models/trustedDevice.model');
const PendingRegistration = require('./models/pendingRegistration.model');
const UserPin = require('./models/userPin.model');
const DeletedItem = require('./models/deletedItem.model');
const Company = require('./models/company.model');

// Import migrations
const addOtpEnabledColumn = require('./migrations/add-otp-enabled-column');
const updateActivityEnum = require('./migrations/update-activity-enum');
const addDeletedItemsTable = require('./migrations/add-deleted-items-table');
const updateActivityEnumForDeletedItems = require('./migrations/update-activity-enum-for-deleted-items');
// Profile picture and company logo migration will be run through sequelize-cli

// Define model associations
const setupAssociations = () => {
  // User and Group associations
  User.hasMany(Group, { foreignKey: 'ownerId', as: 'ownedGroups' });
  Group.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

  // Group and User many-to-many association through GroupMember
  Group.belongsToMany(User, { through: GroupMember, foreignKey: 'groupId', as: 'members' });
  User.belongsToMany(Group, { through: GroupMember, foreignKey: 'userId', as: 'memberOf' });

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

  // User and CredentialShare associations
  User.hasMany(CredentialShare, { foreignKey: 'userId' });
  CredentialShare.belongsTo(User, { foreignKey: 'userId' });

  // Credential and CredentialShare associations
  Credential.hasMany(CredentialShare, { foreignKey: 'credentialId' });
  CredentialShare.belongsTo(Credential, { foreignKey: 'credentialId' });

  // User and Activity associations
  User.hasMany(Activity, { foreignKey: 'userId' });
  Activity.belongsTo(User, { foreignKey: 'userId' });
  
  // Credential and CredentialVersion associations
  Credential.hasMany(CredentialVersion, { foreignKey: 'credentialId' });
  CredentialVersion.belongsTo(Credential, { foreignKey: 'credentialId' });
  
  // User and CredentialVersion associations (for changedBy)
  User.hasMany(CredentialVersion, { foreignKey: 'changedBy' });
  CredentialVersion.belongsTo(User, { foreignKey: 'changedBy', as: 'editor' });
  
  // Credential and CredentialAccess associations
  Credential.hasMany(CredentialAccess, { foreignKey: 'credentialId' });
  CredentialAccess.belongsTo(Credential, { foreignKey: 'credentialId' });
  
  // User and CredentialAccess associations
  User.hasMany(CredentialAccess, { foreignKey: 'userId' });
  CredentialAccess.belongsTo(User, { foreignKey: 'userId' });
  
  // User and CredentialAccess associations (for grantedBy)
  User.hasMany(CredentialAccess, { foreignKey: 'grantedBy', as: 'grantedAccesses' });
  CredentialAccess.belongsTo(User, { foreignKey: 'grantedBy', as: 'grantor' });
  
  // DeletedItem associations
  User.hasMany(DeletedItem, { foreignKey: 'deletedBy', as: 'deletedItems' });
  DeletedItem.belongsTo(User, { foreignKey: 'deletedBy', as: 'deletedByUser' });
  
  User.hasMany(DeletedItem, { foreignKey: 'ownerId', as: 'originalItems' });
  DeletedItem.belongsTo(User, { foreignKey: 'ownerId', as: 'originalOwner' });
};

// Set up associations
setupAssociations();

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const groupRoutes = require('./routes/group.routes');
const credentialRoutes = require('./routes/credential.routes');
const activityRoutes = require('./routes/activity.routes');
const settingRoutes = require('./routes/setting.routes');
const pinRoutes = require('./routes/pin.routes');
const otpSettingsRoutes = require('./routes/otpSettings.routes');
const deletedItemRoutes = require('./routes/deletedItem.routes');
const profileRoutes = require('./routes/profile.routes');

// Initialize Express app
const app = express();

// Trust proxy for rate limiting to work correctly with proxies
app.set('trust proxy', 1);

// Set security HTTP headers
app.use(helmet());

// Rate limiting - General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// More lenient rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit each IP to 50 login attempts per 5 minutes
  message: 'Too many login attempts, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters to specific routes
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/login/initiate', authLimiter);
app.use('/api/v1/auth/login/complete', authLimiter);
app.use('/api/v1', apiLimiter); // Apply general limiter to all other API routes

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// CORS
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/credentials', credentialRoutes);
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/settings', settingRoutes);
app.use('/api/v1/pins', pinRoutes);
app.use('/api/v1/otp-settings', otpSettingsRoutes);
app.use('/api/v1/deleted-items', deletedItemRoutes);
app.use('/api/v1/profile', profileRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/build', 'index.html'));
  });
}

// Connect to MySQL and start server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('MySQL database connection established successfully');
    
    // Run migrations
    await addOtpEnabledColumn();
    await updateActivityEnum();
    await addDeletedItemsTable();
    await updateActivityEnumForDeletedItems();
    
    // Sync database models (in development only)
    if (process.env.NODE_ENV === 'development') {
      // Use sync without alter to avoid the 'Too many keys' error
      await sequelize.sync({ alter: false });
      console.log('Database models synchronized');
    }
    
    // Start server
    const PORT = process.env.PORT || 5002;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
