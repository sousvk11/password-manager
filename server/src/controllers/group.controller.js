const Group = require('../models/group.model');
const User = require('../models/user.model');
const GroupMember = require('../models/groupMember.model');
const Activity = require('../models/activity.model');
const Credential = require('../models/credential.model');

// Create a new group
exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Create the group with current user as owner
    const group = await Group.create({
      name,
      description,
      ownerId: req.user.id
    });

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'create_group',
      resourceType: 'group',
      resourceId: group.id,
      details: { name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      status: 'success',
      data: {
        group
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get all groups (all users can view all groups)
exports.getAllGroups = async (req, res) => {
  try {
    console.log('Getting all groups for user:', req.user.id, 'Role:', req.user.role);
    
    // Fetch all groups
    const allGroups = await Group.findAll();
    console.log('Found', allGroups.length, 'total groups');
    
    // Mark which groups are owned by the current user
    const enhancedGroups = allGroups.map(group => {
      const groupData = group.toJSON();
      groupData.isOwner = group.ownerId === req.user.id;
      return groupData;
    });
    
    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'view_all_groups',
      resourceType: 'group',
      resourceId: req.user.id,
      details: { count: allGroups.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(200).json({
      status: 'success',
      results: enhancedGroups.length,
      data: {
        groups: enhancedGroups
      }
    });
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a single group
exports.getGroup = async (req, res) => {
  try {
    // Find the group with its members
    const group = await Group.findByPk(req.params.id, {
      include: [{
        model: GroupMember,
        include: [{
          model: User,
          attributes: ['id', 'name', 'email']
        }]
      }, {
        // Include credentials directly using the many-to-many relationship
        model: Credential,
        attributes: ['id', 'websiteName', 'url', 'email', 'ownerId', 'lastModified'],
        through: { attributes: [] } // Don't include the join table attributes
      }]
    });
    
    if (!group) {
      return res.status(404).json({
        status: 'fail',
        message: 'Group not found'
      });
    }

    // Check if user is a super admin
    const isAdmin = req.user.role === 'admin';
    
    // Check if user has access to the group
    const isOwner = group.ownerId === req.user.id;
    const isMember = group.GroupMembers && 
      group.GroupMembers.some(member => member.userId === req.user.id);

    // Super admin or owner or member can access the group
    if (!isAdmin && !isOwner && !isMember) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this group'
      });
    }

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'view_group',
      resourceType: 'group',
      resourceId: group.id,
      details: { groupName: group.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Return the group with its members and credentials
    res.status(200).json({
      status: 'success',
      data: {
        group
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a group
exports.updateGroup = async (req, res) => {
  try {
    console.log('Updating group, user role:', req.user.role);
    
    // Get the group
    const group = await Group.findByPk(req.params.id);

    if (!group) {
      return res.status(404).json({
        status: 'fail',
        message: 'Group not found'
      });
    }

    // Check if user is admin or the owner of the group
    const isAdmin = req.user.role === 'admin';
    const isOwner = group.ownerId === req.user.id;
    
    console.log('Is admin:', isAdmin, 'Is owner:', isOwner);
    
    // Only allow group owners or admins to update groups
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the group owner can update the group'
      });
    }

    // Update fields
    const { name, description } = req.body;
    
    if (name) group.name = name;
    if (description) group.description = description;
    
    await group.save();

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'edit_group',
      resourceType: 'group',
      resourceId: group.id,
      details: { 
        name: group.name,
        fields: Object.keys(req.body)
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      data: {
        group
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete a group
exports.deleteGroup = async (req, res) => {
  try {
    console.log('Deleting group, user role:', req.user.role);
    
    const group = await Group.findByPk(req.params.id);

    if (!group) {
      return res.status(404).json({
        status: 'fail',
        message: 'Group not found'
      });
    }

    // Check if user is an admin (admins can delete any group)
    const isAdmin = req.user.role === 'admin';
    console.log('Is admin:', isAdmin, 'Group owner ID:', group.ownerId, 'User ID:', req.user.id);
    
    // For non-admin users, check if they are the owner
    if (!isAdmin && group.ownerId !== req.user.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the group owner can delete the group'
      });
    }
    
    if (isAdmin) {
      console.log('Admin user - bypassing ownership checks for group deletion');
    }

    // Delete the group
    await group.destroy();

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'delete_group',
      resourceType: 'group',
      resourceId: req.params.id,
      details: { name: group.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Return a success response with status 200 instead of 204
    // This ensures the frontend receives the success property
    res.status(200).json({
      success: true,
      message: 'Group deleted successfully',
      data: null
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Add a user to a group
exports.addUserToGroup = async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    if (!userId || !['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a valid userId and role (viewer, editor, or admin)'
      });
    }

    // Check if group exists
    const group = await Group.findByPk(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        status: 'fail',
        message: 'Group not found'
      });
    }

    // Check if user is the owner or an admin
    const GroupMember = require('../models/groupMember.model');
    const isOwner = group.ownerId === req.user.id;
    
    // Check if current user is an admin of the group
    const adminMember = await GroupMember.findOne({
      where: {
        groupId: group.id,
        userId: req.user.id,
        role: 'admin'
      }
    });
    
    const isAdmin = !!adminMember;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the group owner or admin can add users'
      });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check if user is already a member
    const existingMember = await GroupMember.findOne({
      where: {
        groupId: group.id,
        userId: userId
      }
    });

    if (existingMember) {
      // Update role if already a member
      existingMember.role = role;
      await existingMember.save();
    } else {
      // Add user to group
      await GroupMember.create({
        groupId: group.id,
        userId: userId,
        role: role
      });
    }

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'add_user_to_group',
      resourceType: 'group',
      resourceId: group.id,
      details: { 
        groupName: group.name,
        addedUser: userId,
        role
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Get updated group with members
    const updatedGroup = await Group.findByPk(group.id, {
      include: [{
        model: GroupMember,
        include: [{
          model: User,
          attributes: ['id', 'name', 'email']
        }]
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        group: updatedGroup
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Remove a user from a group
exports.removeUserFromGroup = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a valid userId'
      });
    }

    // Check if group exists
    const group = await Group.findByPk(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        status: 'fail',
        message: 'Group not found'
      });
    }

    // Check if user is the owner or an admin
    const GroupMember = require('../models/groupMember.model');
    const isOwner = group.ownerId === req.user.id;
    
    // Check if current user is an admin of the group
    const adminMember = await GroupMember.findOne({
      where: {
        groupId: group.id,
        userId: req.user.id,
        role: 'admin'
      }
    });
    
    const isAdmin = !!adminMember;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the group owner or admin can remove users'
      });
    }

    // Cannot remove the owner
    if (group.ownerId === parseInt(userId)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot remove the group owner'
      });
    }

    // Check if user is a member
    const memberToRemove = await GroupMember.findOne({
      where: {
        groupId: group.id,
        userId: userId
      }
    });

    if (!memberToRemove) {
      return res.status(404).json({
        status: 'fail',
        message: 'User is not a member of this group'
      });
    }

    // Remove user from group
    await memberToRemove.destroy();

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'remove_user_from_group',
      resourceType: 'group',
      resourceId: group.id,
      details: { 
        groupName: group.name,
        removedUser: userId
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Get updated group with members
    const updatedGroup = await Group.findByPk(group.id, {
      include: [{
        model: GroupMember,
        include: [{
          model: User,
          attributes: ['id', 'name', 'email']
        }]
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        group: updatedGroup
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
