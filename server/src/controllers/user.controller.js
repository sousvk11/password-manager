const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const sequelize = require('../database/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const activityController = require('./activity.controller');

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
    const { name, email, password, role } = req.body;

    // Create new user
    const newUser = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: role || 'user',
      active: true,
      lastLogin: null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Log activity with enhanced details
    await activityController.createActivityLog(
      req,
      'create_user',
      'user',
      newUser.id,
      {
        targetUser: newUser.name,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        context: `Admin created a new user with role: ${newUser.role}`,
        actionType: 'create'
      }
    );

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
    // Prepare update data
    const updateData = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      active: req.body.active
    };
    
    // If password is provided and not empty, hash it and include in update
    if (req.body.password && req.body.password.trim() !== '') {
      // Hash the password
      updateData.password = await bcrypt.hash(req.body.password, 12);
    }

    const user = await User.update(
      updateData,
      {
        where: { id: req.params.id },
        returning: true,
        plain: true
      }
    );

    if (!user[1]) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Log activity with enhanced details
    await activityController.createActivityLog(
      req,
      'update_user',
      'user',
      req.params.id,
      {
        targetUser: user[1].name,
        name: user[1].name,
        email: user[1].email,
        role: user[1].role,
        active: user[1].active,
        fields: Object.keys(req.body),
        hasPasswordChange: !!req.body.password,
        context: `Admin updated user: ${Object.keys(req.body).join(', ')}`,
        actionType: 'update'
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: user[1]
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
    console.log('Attempting to delete user with ID:', req.params.id);
    
    // Use Sequelize's findByPk instead of Mongoose's findById
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Store user info for activity log
    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    // Begin a transaction to ensure all operations succeed or fail together
    const transaction = await sequelize.transaction();

    try {
      // Delete all related records in trusted_devices table
      await sequelize.models.TrustedDevice.destroy({
        where: { userId: user.id },
        transaction
      });

      // Delete all related records in activities table
      await sequelize.models.Activity.destroy({
        where: { userId: user.id },
        transaction
      });

      // Delete all related records in group_members table
      await sequelize.models.GroupMember.destroy({
        where: { userId: user.id },
        transaction
      });

      // Delete all related records in credentials table
      await sequelize.models.Credential.destroy({
        where: { userId: user.id },
        transaction
      });

      // Delete all OTP records for this user
      await sequelize.models.OTP.destroy({
        where: { email: user.email },
        transaction
      });

      // Finally, delete the user
      await user.destroy({ transaction });

      // Commit the transaction
      await transaction.commit();

      // Log activity with enhanced details
      await activityController.createActivityLog(
        req,
        'delete_user',
        'user',
        userInfo.id,
        {
          targetUser: userInfo.name,
          name: userInfo.name,
          email: userInfo.email,
          context: `Admin deleted user: ${userInfo.name} (${userInfo.email})`,
          actionType: 'delete'
        }
      );

      res.status(200).json({
        status: 'success',
        message: 'User deleted successfully'
      });
    } catch (error) {
      // If any operation fails, roll back the transaction
      await transaction.rollback();
      throw error;
    }
  } catch (err) {
    console.error('Error deleting user:', err);
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
    const updatedUser = await User.update(
      {
        name: req.body.name,
        email: req.body.email
      },
      {
        where: { id: req.user.id },
        returning: true,
        plain: true
      }
    );

    // Log activity with enhanced details
    await activityController.createActivityLog(
      req,
      'edit_user',
      'user',
      req.user.id,
      {
        targetUser: updatedUser[1].name,
        name: updatedUser[1].name,
        email: updatedUser[1].email,
        fields: Object.keys(req.body),
        context: `User updated their profile: ${Object.keys(req.body).join(', ')}`,
        actionType: 'update'
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser[1]
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
    const user = await User.findByPk(req.user.id);

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

    // Log activity with enhanced details
    await activityController.createActivityLog(
      req,
      'update_password',
      'user',
      req.user.id,
      {
        targetUser: user.name,
        name: user.name,
        email: user.email,
        context: 'User updated their password',
        actionType: 'update',
        securityAction: 'password_change'
      }
    );

    // Log user in, send JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
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
