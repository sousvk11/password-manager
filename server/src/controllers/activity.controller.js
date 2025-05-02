const Activity = require('../models/activity.model');

// Helper function to create activity logs with admin check
// Only admin activities will be stored, regular user activities will be silently discarded
exports.createActivityLog = async (req, action, resourceType, resourceId, details) => {
  try {
    // Handle different request object structures
    let userId, isAdmin, ipAddress, userAgent;
    
    // Standard Express request object
    if (req.user && req.headers) {
      userId = req.user.id;
      isAdmin = req.user.role === 'admin';
      ipAddress = req.ip;
      userAgent = req.headers['user-agent'];
    } 
    // Custom object passed from auth controller
    else if (req.user && req.ip) {
      userId = req.user.id;
      isAdmin = req.user.role === 'admin';
      ipAddress = req.ip;
      userAgent = req.headers ? req.headers['user-agent'] : 'Unknown';
    }
    // Fallback
    else {
      console.warn('Invalid request object structure passed to createActivityLog');
      userId = 0;
      isAdmin = false;
      ipAddress = '0.0.0.0';
      userAgent = 'Unknown';
    }
    
    // Create the activity with the isAdminActivity flag
    return await Activity.create({
      userId,
      action,
      resourceType,
      resourceId,
      details,
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

// Get all activities (admin only)
exports.getAllActivities = async (req, res) => {
  try {
    // Build query
    const query = {};
    
    // Filter by user if provided
    if (req.query.user) {
      query.user = req.query.user;
    }
    
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
    const limit = parseInt(req.query.limit, 10) || 100;
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
