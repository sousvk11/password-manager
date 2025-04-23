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

// Define model associations
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

// Set up associations
setupAssociations();

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const groupRoutes = require('./routes/group.routes');
const credentialRoutes = require('./routes/credential.routes');
const activityRoutes = require('./routes/activity.routes');

// Initialize Express app
const app = express();

// Set security HTTP headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// CORS
app.use(cors());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/activities', activityRoutes);

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
    
    // Sync database models (in development only)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized');
    }
    
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
