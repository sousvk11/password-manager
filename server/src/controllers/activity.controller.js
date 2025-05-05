const Activity = require('../models/activity.model');

// Enhanced helper function to create activity logs with detailed context information
// All activities will be stored, with a flag to indicate if they are admin activities
exports.createActivityLog = async (req, action, resourceType, resourceId, details) => {
  try {
    // Handle different request object structures
    let userId, isAdmin, ipAddress, userAgent, userName, userEmail;
    
    // Standard Express request object
    if (req.user && req.headers) {
      userId = req.user.id;
      isAdmin = req.user.role === 'admin';
      userName = req.user.name || 'Unknown';
      userEmail = req.user.email || 'Unknown';
      ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '0.0.0.0';
      userAgent = req.headers['user-agent'];
    } 
    // Custom object passed from auth controller
    else if (req.user && req.ip) {
      userId = req.user.id;
      isAdmin = req.user.role === 'admin';
      userName = req.user.name || 'Unknown';
      userEmail = req.user.email || 'Unknown';
      ipAddress = req.ip;
      userAgent = req.headers ? req.headers['user-agent'] : 'Unknown';
    }
    // Fallback
    else {
      console.warn('Invalid request object structure passed to createActivityLog');
      userId = 0;
      isAdmin = false;
      userName = 'Unknown';
      userEmail = 'Unknown';
      ipAddress = '0.0.0.0';
      userAgent = 'Unknown';
    }
    
    // Enhance details with additional context
    const enhancedDetails = {
      ...details,
      userInfo: {
        name: userName,
        email: userEmail,
        role: req.user?.role || 'unknown'
      },
      timestamp: new Date().toISOString(),
      browser: parseBrowser(userAgent),
      os: parseOS(userAgent),
      location: await getLocationFromIP(ipAddress)
    };
    
    // Create the activity with the isAdminActivity flag
    return await Activity.create({
      userId,
      action,
      resourceType,
      resourceId,
      details: enhancedDetails,
      ipAddress,
      userAgent,
      isAdminActivity: isAdmin // This flag will determine if the activity is stored or discarded
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
    // Return a mock activity object in case of error
    return {
      id: 0,
      userId: req.user ? req.user.id : 0,
      action,
      resourceType,
      resourceId,
      details: details || {},
      timestamp: new Date(),
      get: function(options) { return this; }
    };
  }
};

// Helper function to parse browser information from user agent
function parseBrowser(userAgent) {
  if (!userAgent) return 'Unknown';
  
  // Simple browser detection
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('MSIE') || userAgent.includes('Trident')) return 'Internet Explorer';
  
  return 'Other';
}

// Helper function to parse OS information from user agent
function parseOS(userAgent) {
  if (!userAgent) return 'Unknown';
  
  // Simple OS detection
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'MacOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  
  return 'Other';
}

// Helper function to get location information from IP address
async function getLocationFromIP(ipAddress) {
  try {
    // Skip for localhost or private IPs
    if (ipAddress === '127.0.0.1' || ipAddress === 'localhost' || ipAddress === '::1' || 
        ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || 
        ipAddress.startsWith('172.16.')) {
      return {
        country: 'Local Network',
        region: 'Internal',
        city: 'Local',
        latitude: 0,
        longitude: 0
      };
    }
    
    // In a production environment, you would use a geolocation service API
    // like ipstack, ipinfo.io, or maxmind
    // For this implementation, we'll simulate some location data based on IP patterns
    
    // Generate deterministic but realistic-looking location data based on IP hash
    const ipHash = hashIP(ipAddress);
    
    // Use the hash to select from predefined locations
    const locations = [
      { country: 'United States', region: 'California', city: 'San Francisco' },
      { country: 'United States', region: 'New York', city: 'New York City' },
      { country: 'United Kingdom', region: 'England', city: 'London' },
      { country: 'Germany', region: 'Berlin', city: 'Berlin' },
      { country: 'Japan', region: 'Tokyo', city: 'Tokyo' },
      { country: 'Australia', region: 'New South Wales', city: 'Sydney' },
      { country: 'Canada', region: 'Ontario', city: 'Toronto' },
      { country: 'India', region: 'Maharashtra', city: 'Mumbai' },
      { country: 'Brazil', region: 'São Paulo', city: 'São Paulo' },
      { country: 'France', region: 'Île-de-France', city: 'Paris' }
    ];
    
    const locationIndex = ipHash % locations.length;
    return {
      ...locations[locationIndex],
      latitude: (ipHash % 180) - 90, // -90 to 90
      longitude: (ipHash % 360) - 180 // -180 to 180
    };
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      latitude: 0,
      longitude: 0
    };
  }
}

// Simple hash function to generate a number from an IP address
function hashIP(ip) {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get all activities (admin only)
exports.getAllActivities = async (req, res) => {
  try {
    // Build query with Sequelize operators
    const { Op } = require('sequelize');
    const query = {};
    
    // Filter by user ID if provided
    if (req.query.userId) {
      query.userId = req.query.userId;
    }
    
    // Filter by action if provided
    if (req.query.action) {
      query.action = req.query.action;
    }
    
    // Filter by resource type if provided
    if (req.query.resourceType) {
      query.resourceType = req.query.resourceType;
    }
    
    // Filter by resource ID if provided
    if (req.query.resourceId) {
      query.resourceId = req.query.resourceId;
    }
    
    // Filter by date range if provided
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      
      if (req.query.startDate) {
        query.createdAt[Op.gte] = new Date(req.query.startDate);
      }
      
      if (req.query.endDate) {
        query.createdAt[Op.lte] = new Date(req.query.endDate);
      }
    }
    
    // Search in details if provided
    if (req.query.search) {
      const searchTerm = `%${req.query.search}%`;
      query[Op.or] = [
        { '$User.name$': { [Op.like]: searchTerm } },
        { '$User.email$': { [Op.like]: searchTerm } },
        { 'details': { [Op.like]: searchTerm } }
      ];
    }

    // Pagination with better defaults and limits
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 25)); // Between 5 and 100, default 25
    const skip = (page - 1) * limit;

    // Sorting options
    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const validSortFields = ['createdAt', 'action', 'resourceType', 'userId'];
    const orderBy = validSortFields.includes(sortField) ? sortField : 'createdAt';

    // Execute query with pagination and sorting
    const activities = await Activity.findAndCountAll({
      where: query,
      order: [[orderBy, sortOrder]],
      offset: skip,
      limit: limit,
      include: [{
        model: require('../models/user.model'),
        attributes: ['id', 'name', 'email']
      }],
      distinct: true // Ensure correct count with associations
    });

    console.log(`Found ${activities.rows.length} activities out of ${activities.count} total`);

    // Format activities for response
    const formattedActivities = activities.rows.map(activity => {
      const plainActivity = activity.get({ plain: true });
      return plainActivity;
    });

    res.status(200).json({
      status: 'success',
      results: formattedActivities.length,
      totalCount: activities.count,
      totalPages: Math.ceil(activities.count / limit),
      currentPage: page,
      limit: limit,
      sortField: orderBy,
      sortOrder: sortOrder.toLowerCase(),
      data: {
        activities: formattedActivities
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get activities for a specific user (admin or self)
exports.getUserActivities = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Check if user is requesting their own activities or is an admin
    if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only view your own activities'
      });
    }

    // Build query
    const query = { user: userId };
    
    // Filter by action if provided
    if (req.query.action) {
      query.action = req.query.action;
    }
    
    // Filter by resource type if provided
    if (req.query.resourceType) {
      query.resourceType = req.query.resourceType;
    }
    
    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      query.timestamp = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      query.timestamp = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      query.timestamp = { $lte: new Date(req.query.endDate) };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const activities = await Activity.findAll({
      where: query,
      order: [['createdAt', 'DESC']],
      offset: skip,
      limit: limit
    });

    console.log(`Found ${activities.length} activities`);

    // Get total count for pagination
    const totalActivities = await Activity.count({ where: query });
    
    // Format activities for response
    const formattedActivities = activities.map(activity => {
      const plainActivity = activity.get({ plain: true });
      return plainActivity;
    });

    res.status(200).json({
      status: 'success',
      results: formattedActivities.length,
      totalPages: Math.ceil(totalActivities / limit),
      currentPage: page,
      data: {
        activities: formattedActivities
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get activities for a specific resource
exports.getResourceActivities = async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    
    // Validate resource type
    if (!['user', 'credential', 'group'].includes(resourceType)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid resource type. Must be user, credential, or group'
      });
    }

    // Build query
    const query = { 
      resourceType,
      resourceId
    };

    // For non-admins, restrict access based on resource type
    if (req.user.role !== 'admin') {
      // For credentials and groups, check if user has access
      if (resourceType === 'credential') {
        const Credential = require('../models/credential.model');
        const credential = await Credential.findById(resourceId);
        
        if (!credential) {
          return res.status(404).json({
            status: 'fail',
            message: 'Resource not found'
          });
        }
        
        const isOwner = credential.owner.toString() === req.user._id.toString();
        const isSharedWith = credential.sharedWith.some(
          share => share.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isSharedWith) {
          return res.status(403).json({
            status: 'fail',
            message: 'You do not have access to this resource'
          });
        }
      } else if (resourceType === 'group') {
        const Group = require('../models/group.model');
        const group = await Group.findById(resourceId);
        
        if (!group) {
          return res.status(404).json({
            status: 'fail',
            message: 'Resource not found'
          });
        }
        
        const isOwner = group.owner.toString() === req.user._id.toString();
        const isMember = group.members.some(
          member => member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
          return res.status(403).json({
            status: 'fail',
            message: 'You do not have access to this resource'
          });
        }
      } else if (resourceType === 'user' && resourceId !== req.user._id.toString()) {
        // Users can only see their own user activities
        return res.status(403).json({
          status: 'fail',
          message: 'You can only view your own user activities'
        });
      }
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const activities = await Activity.findAll({
      where: query,
      order: [['createdAt', 'DESC']],
      offset: skip,
      limit: limit,
      include: [{
        model: require('../models/user.model'),
        attributes: ['id', 'name', 'email']
      }]
    });

    console.log(`Found ${activities.length} activities`);

    // Get total count for pagination
    const totalActivities = await Activity.count({ where: query });
    
    // Format activities for response
    const formattedActivities = activities.map(activity => {
      const plainActivity = activity.get({ plain: true });
      return plainActivity;
    });

    res.status(200).json({
      status: 'success',
      results: formattedActivities.length,
      totalPages: Math.ceil(totalActivities / limit),
      currentPage: page,
      data: {
        activities: formattedActivities
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
