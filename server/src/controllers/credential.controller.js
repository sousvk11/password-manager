const Credential = require('../models/credential.model');
const Group = require('../models/group.model');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const { Op } = require('sequelize');
const GroupMember = require('../models/groupMember.model');
const CredentialShare = require('../models/credentialShare.model');
const CredentialGroup = require('../models/credentialGroup.model');

// Helper function to check if a user has permission to access a credential
const checkCredentialPermission = async (credentialId, userId, requiredPermission = 'view') => {
  try {
    console.log(`Checking ${requiredPermission} permission for credential ${credentialId} and user ${userId}`);
    
    // Check if user is admin (admins have access to all credentials)
    const user = await User.findByPk(userId);
    if (user && user.role === 'admin') {
      console.log('User is admin, granting access');
      const credential = await Credential.findByPk(credentialId, {
        include: [{
          model: Group,
          through: { attributes: [] }
        }]
      });
      return {
        hasPermission: true,
        message: 'Admin access granted',
        credential
      };
    }
    
    // For regular users, find the credential
    const credential = await Credential.findByPk(credentialId, {
      include: [{
        model: Group,
        through: { attributes: [] }
      }]
    });
    
    if (!credential) {
      return { hasPermission: false, message: 'Credential not found', credential: null };
    }
    
    // Check if user is the owner
    if (credential.ownerId === userId) {
      return { hasPermission: true, message: 'User is the owner', credential };
    }

    // Check if credential is shared directly with the user
    const credentialShare = await CredentialShare.findOne({
      where: {
        credentialId,
        userId
      }
    });
    
    if (credentialShare) {
      // Check permission level if required
      if (requiredPermission === 'edit' && credentialShare.permission === 'view') {
        return {
          hasPermission: false,
          message: 'You have view-only access to this credential',
          credential
        };
      }
      
      return {
        hasPermission: true,
        message: 'Credential is shared with user',
        credential
      };
    }
    
    // Check if user is a member of any group that the credential belongs to
    const credentialGroups = await CredentialGroup.findAll({
      where: { credentialId }
    });
    
    const groupIds = credentialGroups.map(cg => cg.groupId);
    
    if (groupIds.length === 0) {
      return {
        hasPermission: false,
        message: 'You do not have access to this credential',
        credential: null
      };
    }
    
    // Check if user is a member of any of these groups
    const groupMemberships = await GroupMember.findAll({
      where: {
        groupId: { [Op.in]: groupIds },
        userId
      }
    });
    
    if (groupMemberships.length > 0) {
      // For edit permission, check if user has appropriate role
      if (requiredPermission === 'edit') {
        const hasEditRole = groupMemberships.some(membership => 
          ['admin', 'editor'].includes(membership.role)
        );
        
        if (!hasEditRole) {
          return {
            hasPermission: false,
            message: 'You have view-only access to this credential',
            credential
          };
        }
      }
      
      return {
        hasPermission: true,
        message: 'User has access through group membership',
        credential
      };
    }
    
    return {
      hasPermission: false,
      message: 'You do not have access to this credential',
      credential: null
    };
  } catch (error) {
    console.error('Error checking credential permission:', error);
    return {
      hasPermission: false,
      message: 'An error occurred while checking permissions',
      credential: null
    };
  }
};

// Create a new credential
exports.createCredential = async (req, res) => {
  try {
    // Get the groups from the request
    const groupIds = Array.isArray(req.body.groupIds) ? req.body.groupIds : [req.body.groupId];
    
    if (groupIds.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'At least one group must be specified'
      });
    }
    
    // Check if user is an admin (admins can add credentials to any group)
    const isAdmin = req.user.role === 'admin';
    console.log('User role:', req.user.role, 'Is admin:', isAdmin);
    
    if (!isAdmin) {
      // For non-admin users, check if user has permission to add credential to all groups
      for (const groupId of groupIds) {
        const group = await Group.findByPk(groupId);
        
        if (!group) {
          return res.status(404).json({
            status: 'fail',
            message: `Group with ID ${groupId} not found`
          });
        }
        
        console.log(`Checking permission for group ${group.name} (ID: ${groupId})`);
        
        // Check if user is owner or has admin/editor role in the group
        const isOwner = group.ownerId === req.user.id;
        console.log('Is owner:', isOwner, 'User ID:', req.user.id, 'Group owner ID:', group.ownerId);
        
        if (!isOwner) {
          const membership = await GroupMember.findOne({
            where: {
              groupId: group.id,
              userId: req.user.id,
              role: { [Op.in]: ['admin', 'editor'] }
            }
          });
          
          console.log('Membership found:', !!membership);
          
          if (!membership) {
            return res.status(403).json({
              status: 'fail',
              message: `You do not have permission to add credentials to group ${group.name}`
            });
          }
        }
      }
    } else {
      console.log('Admin user - bypassing permission checks for credential creation');
    }

    // Create the credential without groupId
    const { groupId, groupIds: groupIdsFromBody, ...credentialData } = req.body;
    
    const credential = await Credential.create({
      ...credentialData,
      ownerId: req.user.id
    });
    
    // Create credential-group associations
    const credentialGroups = [];
    for (let i = 0; i < groupIds.length; i++) {
      credentialGroups.push({
        credentialId: credential.id,
        groupId: groupIds[i],
        isPrimary: i === 0 // First group is primary
      });
    }
    
    await CredentialGroup.bulkCreate(credentialGroups);

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'create_credential',
      resourceType: 'credential',
      resourceId: credential.id,
      details: { 
        websiteName: credential.websiteName,
        groupIds: groupIds
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Fetch the credential with its groups to return in the response
    const credentialWithGroups = await Credential.findByPk(credential.id, {
      include: [{ model: Group }]
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        credential: credentialWithGroups
      }
    });
  } catch (err) {
    console.error('Error creating credential:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get all credentials the user has access to
exports.getAllCredentials = async (req, res) => {
  try {
    // Filter by group if provided
    let groupFilter = {};
    if (req.query.groupId) {
      groupFilter = { id: req.query.groupId };
    }
    
    // Super admin can access all credentials
    if (req.user.role === 'admin') {
      console.log('User is admin, fetching all credentials');
      
      try {
        const allCredentials = await Credential.findAll({
          include: [{
            model: Group,
            attributes: ['id', 'name'],
            through: { attributes: [] },
            required: false
          }]
        });
        
        console.log('Found', allCredentials.length, 'credentials for admin');
        
        // Log activity
        await Activity.create({
          userId: req.user.id,
          action: 'view_all_credentials',
          resourceType: 'credential',
          resourceId: req.user.id,
          details: { count: allCredentials.length, asAdmin: true },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });

        return res.status(200).json({
          status: 'success',
          results: allCredentials.length,
          data: {
            credentials: allCredentials
          }
        });
      } catch (error) {
        console.error('Error fetching admin credentials:', error);
        throw error;
      }
    }

    // Find credentials owned by the user
    const ownedCredentials = await Credential.findAll({
      where: {
        ownerId: req.user.id
      },
      include: [{
        model: Group,
        attributes: ['id', 'name'],
        through: { attributes: [] }, // Exclude join table attributes
        where: groupFilter,
        required: Object.keys(groupFilter).length > 0
      }]
    });

    // Find credentials shared directly with the user
    const sharedCredentials = await Credential.findAll({
      include: [{
        model: CredentialShare,
        where: { userId: req.user.id },
        required: true
      }, {
        model: Group,
        attributes: ['id', 'name'],
        through: { attributes: [] }, // Exclude join table attributes
        where: groupFilter,
        required: Object.keys(groupFilter).length > 0
      }]
    });

    // Find credentials in groups where user is a member
    // First get all groups where user is a member
    const userGroups = await Group.findAll({
      where: {
        [Op.or]: [
          { ownerId: req.user.id },
          { '$GroupMembers.userId$': req.user.id }
        ]
      },
      include: [{
        model: GroupMember,
        attributes: ['userId', 'role'],
        required: false
      }]
    });

    const groupIds = userGroups.map(group => group.id);
    
    // Find credentials in those groups that aren't already included
    const groupCredentials = await Credential.findAll({
      where: {
        ownerId: { [Op.ne]: req.user.id } // Exclude owned credentials to avoid duplicates
      },
      include: [{
        model: Group,
        attributes: ['id', 'name'],
        through: { attributes: [] }, // Exclude join table attributes
        where: {
          ...groupFilter,
          id: { [Op.in]: groupIds }
        },
        required: true
      }]
    });

    // Combine all credentials and remove duplicates
    const allCredentialsMap = new Map();
    
    [...ownedCredentials, ...sharedCredentials, ...groupCredentials].forEach(credential => {
      if (!allCredentialsMap.has(credential.id)) {
        allCredentialsMap.set(credential.id, credential);
      }
    });

    const credentials = Array.from(allCredentialsMap.values());

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'view_credential',
      resourceType: 'credential',
      resourceId: req.user.id, // User's own ID as resource since we're viewing multiple credentials
      details: { count: credentials.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      results: credentials.length,
      data: {
        credentials
      }
    });
  } catch (err) {
    console.error('Error getting credentials:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a single credential
exports.getCredential = async (req, res) => {
  try {
    // Check if user has permission to view the credential
    const { hasPermission, message, credential: permissionCredential } = await checkCredentialPermission(
      req.params.id, 
      req.user.id,
      'view'
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: message || 'You do not have permission to view this credential'
      });
    }

    // Use the credential from permission check or fetch it again if needed
    const credential = permissionCredential || await Credential.findByPk(req.params.id, {
      include: [{
        model: Group,
        through: { attributes: [] } // Exclude join table attributes
      }]
    });
    
    if (!credential) {
      return res.status(404).json({
        status: 'fail',
        message: 'Credential not found'
      });
    }
    
    // Decrypt sensitive information if needed
    let responseCredential = credential.toJSON();
    
    if (req.query.decrypted === 'true') {
      responseCredential.password = credential.decryptPassword();
      if (credential.token) {
        responseCredential.token = credential.decryptToken();
      }
    }

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'view_credential',
      resourceType: 'credential',
      resourceId: credential.id,
      details: { 
        websiteName: credential.websiteName,
        decrypted: req.query.decrypted === 'true'
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      data: {
        credential: responseCredential
      }
    });
  } catch (err) {
    console.error('Error getting credential:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a credential
exports.updateCredential = async (req, res) => {
  try {
    console.log('Updating credential, user role:', req.user.role);
    
    // Check if user is admin (admins can update any credential)
    const isAdmin = req.user.role === 'admin';
    let credential;
    
    if (isAdmin) {
      console.log('Admin user - bypassing permission checks for credential update');
      credential = await Credential.findByPk(req.params.id, {
        include: [{
          model: Group,
          through: { attributes: [] }
        }]
      });
      
      if (!credential) {
        return res.status(404).json({
          status: 'fail',
          message: 'Credential not found'
        });
      }
    } else {
      // For non-admin users, check permission
      const { hasPermission, message, credential: permissionCredential } = await checkCredentialPermission(
        req.params.id, 
        req.user.id,
        'edit'
      );

      if (!hasPermission) {
        return res.status(403).json({
          status: 'fail',
          message: message || 'You do not have permission to edit this credential'
        });
      }

      credential = permissionCredential;
    }

    // Update the credential
    await credential.update({ 
      ...req.body, 
      lastModified: Date.now() 
    });

    // Update group associations if groupIds is provided
    if (req.body.groupIds) {
      const groupIds = Array.isArray(req.body.groupIds) ? req.body.groupIds : [req.body.groupIds];
      
      // Delete existing associations
      await CredentialGroup.destroy({
        where: { credentialId: credential.id }
      });
      
      // Create new associations
      const credentialGroups = [];
      for (let i = 0; i < groupIds.length; i++) {
        credentialGroups.push({
          credentialId: credential.id,
          groupId: groupIds[i],
          isPrimary: i === 0 // First group is primary
        });
      }
      
      await CredentialGroup.bulkCreate(credentialGroups);
    }

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'edit_credential',
      resourceType: 'credential',
      resourceId: credential.id,
      details: { 
        websiteName: credential.websiteName,
        fields: Object.keys(req.body)
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Fetch updated credential with groups
    const updatedCredential = await Credential.findByPk(credential.id, {
      include: [{ model: Group }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        credential: updatedCredential
      }
    });
  } catch (err) {
    console.error('Error updating credential:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete a credential
exports.deleteCredential = async (req, res) => {
  try {
    console.log('Deleting credential, user role:', req.user.role);
    
    // Check if user is admin (admins can delete any credential)
    const isAdmin = req.user.role === 'admin';
    let credential;
    
    if (isAdmin) {
      console.log('Admin user - bypassing ownership checks for credential deletion');
      credential = await Credential.findByPk(req.params.id);
      
      if (!credential) {
        return res.status(404).json({
          status: 'fail',
          message: 'Credential not found'
        });
      }
    } else {
      // For non-admin users, check permission
      const { hasPermission, message, credential: permissionCredential } = await checkCredentialPermission(
        req.params.id, 
        req.user.id,
        'edit'
      );

      if (!hasPermission) {
        return res.status(403).json({
          status: 'fail',
          message: message || 'You do not have permission to delete this credential'
        });
      }
      
      credential = permissionCredential;
      
      // Only the owner can delete the credential (for non-admin users)
      if (credential.ownerId !== req.user.id) {
        return res.status(403).json({
          status: 'fail',
          message: 'Only the credential owner can delete it'
        });
      }
    }

    // Log activity before deletion
    await Activity.create({
      userId: req.user.id,
      action: 'delete_credential',
      resourceType: 'credential',
      resourceId: credential.id,
      details: { websiteName: credential.websiteName },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Delete the credential
    await credential.destroy();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    console.error('Error deleting credential:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Share a credential with a user
exports.shareCredential = async (req, res) => {
  try {
    const { userId, permission = 'view' } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required'
      });
    }

    // Check if user has permission to share the credential
    const { hasPermission, message, credential } = await checkCredentialPermission(
      req.params.id, 
      req.user.id,
      'edit'
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: message || 'You do not have permission to share this credential'
      });
    }

    // Only the owner can share the credential
    if (credential.ownerId !== req.user.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the credential owner can share it'
      });
    }

    // Check if the user exists
    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Check if the credential is already shared with the user
    const existingShare = await CredentialShare.findOne({
      where: {
        credentialId: credential.id,
        userId
      }
    });

    if (existingShare) {
      // Update the permission if it's different
      if (existingShare.permission !== permission) {
        await existingShare.update({ permission });
      }
    } else {
      // Create a new share
      await CredentialShare.create({
        credentialId: credential.id,
        userId,
        permission
      });
    }

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'share_credential',
      resourceType: 'credential',
      resourceId: credential.id,
      details: { 
        websiteName: credential.websiteName,
        sharedWith: userId,
        permission
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      message: `Credential shared with user successfully with ${permission} permission`
    });
  } catch (err) {
    console.error('Error sharing credential:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Revoke credential access
exports.revokeAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required'
      });
    }

    // Check if user has permission to revoke access to the credential
    const { hasPermission, message, credential } = await checkCredentialPermission(
      req.params.id, 
      req.user.id,
      'edit'
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message: message || 'You do not have permission to revoke access to this credential'
      });
    }

    // Only the owner can revoke access
    if (credential.ownerId !== req.user.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the credential owner can revoke access'
      });
    }

    // Check if the credential is shared with the user
    const share = await CredentialShare.findOne({
      where: {
        credentialId: credential.id,
        userId
      }
    });

    if (!share) {
      return res.status(404).json({
        status: 'fail',
        message: 'This credential is not shared with the specified user'
      });
    }

    // Delete the share
    await share.destroy();

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'revoke_credential_access',
      resourceType: 'credential',
      resourceId: credential.id,
      details: { 
        websiteName: credential.websiteName,
        revokedFrom: userId
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      message: 'Access to credential revoked successfully'
    });
  } catch (err) {
    console.error('Error revoking credential access:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
