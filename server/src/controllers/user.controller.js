const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const bcrypt = require('bcryptjs');

// Get current user
exports.getMe = async (req, res) => {
  try {
    // User is already available in req.user from the protect middleware
    const userObj = req.user.toJSON();
    delete userObj.password;
    
    res.status(200).json({
      status: 'success',
      data: {
        user: userObj
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get all users (accessible to all authenticated users)
exports.getAllUsers = async (req, res) => {
  try {
    // All authenticated users can see other users
    // This is needed for group management functionality
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        users
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a single user (admin only)
exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Remove password from output
    const userObj = user.toJSON();
    delete userObj.password;

    res.status(200).json({
      status: 'success',
      data: {
        user: userObj
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Create a new user (admin only)
exports.createUser = async (req, res) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role
    });

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'create_user',
      resourceType: 'user',
      resourceId: newUser.id,
      details: { 
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Remove password from output
    const userObj = newUser.toJSON();
    delete userObj.password;

    res.status(201).json({
      status: 'success',
      data: {
        user: userObj
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a user (admin only)
exports.updateUser = async (req, res) => {
  try {
    // Don't allow password updates with this route
    if (req.body.password) {
      return res.status(400).json({
        status: 'fail',
        message: 'This route is not for password updates. Please use /updatePassword.'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        active: req.body.active
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Log activity
    await Activity.create({
      user: req.user._id,
      action: 'edit_user',
      resourceType: 'user',
      resourceId: user._id,
      details: { 
        name: user.name,
        email: user.email,
        role: user.role,
        fields: Object.keys(req.body)
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete a user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Store user info for activity log
    const userInfo = {
      id: user._id,
      name: user.name,
      email: user.email
    };

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    // Log activity
    await Activity.create({
      user: req.user._id,
      action: 'delete_user',
      resourceType: 'user',
      resourceId: userInfo.id,
      details: { 
        name: userInfo.name,
        email: userInfo.email
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update current user's profile
exports.updateMe = async (req, res) => {
  try {
    // Don't allow password updates with this route
    if (req.body.password) {
      return res.status(400).json({
        status: 'fail',
        message: 'This route is not for password updates. Please use /updatePassword.'
      });
    }

    // Don't allow role updates
    if (req.body.role) {
      return res.status(400).json({
        status: 'fail',
        message: 'You cannot update your role'
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        name: req.body.name,
        email: req.body.email
      },
      {
        new: true,
        runValidators: true
      }
    );

    // Log activity
    await Activity.create({
      user: req.user._id,
      action: 'edit_user',
      resourceType: 'user',
      resourceId: req.user._id,
      details: { 
        name: updatedUser.name,
        email: updatedUser.email,
        fields: Object.keys(req.body)
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update current user's password
exports.updatePassword = async (req, res) => {
  try {
    // Get user from collection
    const user = await User.findById(req.user._id).select('+password');

    // Check if current password is correct
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your current password is incorrect'
      });
    }

    // Update password
    user.password = req.body.newPassword;
    await user.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      action: 'edit_user',
      resourceType: 'user',
      resourceId: req.user._id,
      details: { 
        action: 'password_update'
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Log user in, send JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    // Remove password from output
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
