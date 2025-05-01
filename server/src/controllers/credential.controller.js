const Credential = require('../models/credential.model');
const Group = require('../models/group.model');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const CredentialVersion = require('../models/credentialVersion.model');
const { Op } = require('sequelize');
const GroupMember = require('../models/groupMember.model');
const CredentialShare = require('../models/credentialShare.model');
const CredentialGroup = require('../models/credentialGroup.model');
const CredentialAccess = require('../models/credentialAccess.model');
const crypto = require('crypto');

// Helper function to decrypt a field
const decryptField = async (encryptedValue) => {
  try {
    if (!encryptedValue) return '';
    
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not found');
    }
    
    // Extract the initialization vector and encrypted data
    const parts = encryptedValue.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = Buffer.from(parts[1], 'hex');
    
    // Create a decipher using AES-256-CBC
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey),
      iv
    );
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Error decrypting field:', error);
    return '[Decryption Error]';
  }
};

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
    console.log('Creating credential, user role:', req.user.role);
    
    // Validate required fields
    if (!req.body.websiteName) {
      return res.status(400).json({
        status: 'fail',
        message: 'Website name is required'
      });
    }
    
    // Check if user is admin
    const isAdmin = req.user.role === 'admin';
    
    // Get group IDs from request
    let groupIds = [];
    
    if (req.body.groupIds && Array.isArray(req.body.groupIds)) {
      groupIds = req.body.groupIds;
    } else if (req.body.groupId) {
      groupIds = [req.body.groupId];
    }
    
    // Verify that all groups exist and user has access
    if (groupIds.length > 0) {
      for (const groupId of groupIds) {
        const group = await Group.findByPk(groupId);
        
        if (!group) {
          return res.status(404).json({
            status: 'fail',
            message: `Group with ID ${groupId} not found`
          });
        }
        
        // Check if user is admin, group owner, or member with edit permission
        if (!isAdmin) {
          const isOwner = group.ownerId === req.user.id;
          
          if (!isOwner) {
            // Check if user is a member with edit permission
            const membership = await group.getMembers({
              where: { id: req.user.id },
              through: { where: { permission: 'edit' } }
            });
            
            if (membership.length === 0) {
              return res.status(403).json({
                status: 'fail',
                message: `You do not have permission to add credentials to group with ID ${groupId}`
              });
            }
          }
        }
      }
    } else {
      return res.status(400).json({
        status: 'fail',
        message: 'At least one group must be specified'
      });
    }
    
    if (isAdmin) {
      console.log('Admin user creating credential');
    }

    // Create the credential
    const { websiteName, url, email, userId, password, token, description } = req.body;
    const newCredential = await Credential.create({
      websiteName,
      url,
      email,
      userId,
      password: password || '', 
      token,
      description,
      ownerId: req.user.id
    });

    // Create initial version record with unencrypted values for better readability
    await CredentialVersion.create({
      credentialId: newCredential.id,
      websiteName: websiteName,
      url: url,
      email: email,
      userId: userId,
      // Store the encrypted password that was just created
      password: newCredential.password,
      token: newCredential.token,
      description: description,
      versionNumber: 1,
      changedBy: req.user.id,
      changeType: 'create',
      changedFields: ['websiteName', 'url', 'email', 'userId', 'password', 'token', 'description'],
      fieldChanges: {
        websiteName: { oldValue: null, newValue: websiteName },
        url: { oldValue: null, newValue: url },
        email: { oldValue: null, newValue: email },
        userId: { oldValue: null, newValue: userId },
        password: { oldValue: null, newValue: password },
        token: { oldValue: null, newValue: token },
        description: { oldValue: null, newValue: description }
      }
    });

    // Create credential-group associations
    const credentialGroups = [];
    for (let i = 0; i < groupIds.length; i++) {
      credentialGroups.push({
        credentialId: newCredential.id,
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
      resourceId: newCredential.id,
      details: { 
        websiteName: newCredential.websiteName,
        groupIds: groupIds
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Fetch the credential with its groups to return in the response
    const credentialWithGroups = await Credential.findByPk(newCredential.id, {
      include: [
        { model: Group },
        { 
          model: User, 
          as: 'owner',
          attributes: ['id', 'name', 'email'] 
        }
      ]
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
    
    // Include owner information in all credential queries
    const ownerInclude = {
      model: User,
      as: 'owner',
      attributes: ['id', 'name', 'email']
    };
    
    // Super admin can access all credentials
    if (req.user.role === 'admin') {
      console.log('User is admin, fetching all credentials');
      
      try {
        const allCredentials = await Credential.findAll({
          include: [
            {
              model: Group,
              attributes: ['id', 'name'],
              through: { attributes: [] },
              required: false
            },
            ownerInclude
          ]
        });
        
        console.log('Found', allCredentials.length, 'credentials for admin');
        
        // Decrypt passwords if requested
        let credentialsToReturn = allCredentials;
        if (req.query.decrypted === 'true') {
          console.log('Decrypting passwords for admin credentials');
          credentialsToReturn = allCredentials.map(credential => {
            const credentialJSON = credential.toJSON();
            credentialJSON.password = credential.decryptPassword();
            if (credential.token) {
              credentialJSON.token = credential.decryptToken();
            }
            return credentialJSON;
          });
        }

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
          results: credentialsToReturn.length,
          data: {
            credentials: credentialsToReturn
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
      include: [
        {
          model: Group,
          attributes: ['id', 'name'],
          through: { attributes: [] }, // Exclude join table attributes
          where: groupFilter,
          required: Object.keys(groupFilter).length > 0
        },
        ownerInclude
      ]
    });

    // Find credentials shared directly with the user
    const sharedCredentials = await Credential.findAll({
      include: [
        {
          model: CredentialShare,
          where: { userId: req.user.id },
          required: true
        }, 
        {
          model: Group,
          attributes: ['id', 'name'],
          through: { attributes: [] }, // Exclude join table attributes
          where: groupFilter,
          required: Object.keys(groupFilter).length > 0
        },
        ownerInclude
      ]
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
      include: [
        {
          model: Group,
          attributes: ['id', 'name'],
          through: { attributes: [] }, // Exclude join table attributes
          where: {
            ...groupFilter,
            id: { [Op.in]: groupIds }
          },
          required: true
        },
        ownerInclude
      ]
    });

    // Also find credentials where user has access through CredentialAccess
    const accessCredentials = await Credential.findAll({
      include: [
        {
          model: CredentialAccess,
          where: { userId: req.user.id },
          required: true
        },
        {
          model: Group,
          attributes: ['id', 'name'],
          through: { attributes: [] },
          where: groupFilter,
          required: Object.keys(groupFilter).length > 0
        },
        ownerInclude
      ]
    });
    
    // Combine all credentials and remove duplicates
    const allCredentialsMap = new Map();
    
    [...ownedCredentials, ...sharedCredentials, ...groupCredentials, ...accessCredentials].forEach(credential => {
      if (!allCredentialsMap.has(credential.id)) {
        allCredentialsMap.set(credential.id, credential);
      }
    });

    let credentials = Array.from(allCredentialsMap.values());
    
    // Decrypt passwords if requested
    if (req.query.decrypted === 'true') {
      console.log('Decrypting passwords for all credentials');
      credentials = credentials.map(credential => {
        const credentialJSON = credential.toJSON();
        credentialJSON.password = credential.decryptPassword();
        if (credential.token) {
          credentialJSON.token = credential.decryptToken();
        }
        return credentialJSON;
      });
    }

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
    const credentialId = req.params.id;
    const userId = req.user.id;
    const shouldDecrypt = req.query.decrypted === 'true';
    
    console.log(`Getting credential ${credentialId} for user ${userId}, decrypt: ${shouldDecrypt}`);
    
    // Check if PIN verification is required
    if (req.pinVerificationRequired) {
      console.log(`PIN verification required for credential ${credentialId}`);
      return res.status(403).json({
        status: 'fail',
        message: 'PIN verification required',
        data: {
          requirePin: true,
          credentialId
        }
      });
    }
    
    // Check if user has permission to view this credential
    const { hasPermission, message, credential } = await checkCredentialPermission(credentialId, userId);
    
    if (!hasPermission) {
      return res.status(403).json({
        status: 'fail',
        message
      });
    }
    
    // Log activity
    await Activity.create({
      userId,
      action: 'view_credential',
      resourceType: 'credential',
      resourceId: credentialId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // If decryption is requested, decrypt sensitive fields
    let responseCredential = { ...credential.toJSON() };
    
    if (shouldDecrypt) {
      try {
        // Decrypt password and token if they exist
        if (responseCredential.password) {
          responseCredential.password = await decryptField(responseCredential.password);
        }
        
        if (responseCredential.token) {
          responseCredential.token = await decryptField(responseCredential.token);
        }
      } catch (decryptError) {
        console.error('Error decrypting credential fields:', decryptError);
        return res.status(500).json({
          status: 'fail',
          message: 'Failed to decrypt credential data'
        });
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        credential: responseCredential
      }
    });
  } catch (err) {
    console.error('Error fetching credential:', err);
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
    
    // Check if PIN verification is required
    if (req.pinVerificationRequired) {
      return res.status(403).json({
        status: 'fail',
        message: 'PIN verification required',
        data: {
          requirePin: true,
          credentialId: req.params.id
        }
      });
    }
    
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

    // Get previous version number
    const latestVersion = await CredentialVersion.findOne({
      where: { credentialId: credential.id },
      order: [['versionNumber', 'DESC']]
    });
    
    const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
    
    // Determine which fields changed with their old and new values
    const changedFields = [];
    const fieldChanges = {};
    
    // Check for changes in groupIds if present in the request
    if (req.body.groupIds) {
      // Get current groupIds
      const currentGroups = await credential.getGroups();
      const currentGroupIds = currentGroups.map(group => group.id);
      
      // Sort both arrays for proper comparison
      const sortedCurrentGroupIds = [...currentGroupIds].sort();
      const sortedNewGroupIds = [...req.body.groupIds].sort();
      
      // Check if arrays are different
      const groupsChanged = JSON.stringify(sortedCurrentGroupIds) !== JSON.stringify(sortedNewGroupIds);
      
      if (groupsChanged) {
        changedFields.push('groupIds');
        fieldChanges.groupIds = {
          oldValue: currentGroupIds,
          newValue: req.body.groupIds
        };
      }
    }
    
    // Check for changes in other fields
    const trackableFields = ['websiteName', 'url', 'email', 'userId', 'password', 'token', 'description'];
    
    for (const field of trackableFields) {
      if (req.body[field] !== undefined && credential[field] !== req.body[field]) {
        changedFields.push(field);
        fieldChanges[field] = {
          oldValue: credential[field],
          newValue: req.body[field]
        };
      }
    }
    
    // Only create a version if something actually changed
    if (changedFields.length > 0) {
      try {
        // For password and token fields, we need to get the actual values
        // We'll use the decrypted values for better readability in the version history
        const encryptionKey = process.env.ENCRYPTION_KEY;
        
        // Process password field if it changed
        if (fieldChanges.password) {
          try {
            // Get the old decrypted password - use the credential's own method
            const oldDecrypted = credential.decryptPassword();
            
            // Get the new password (it's not encrypted in req.body yet)
            const newDecrypted = req.body.password;
            
            // Update fieldChanges with decrypted values
            fieldChanges.password = {
              oldValue: oldDecrypted,
              newValue: newDecrypted
            };
          } catch (error) {
            console.error('Error processing password for version history:', error);
            // If decryption fails, just store the encrypted values
            fieldChanges.password = {
              oldValue: '(encrypted)',
              newValue: '(new password)'
            };
          }
        }
        
        // Process token field if it changed
        if (fieldChanges.token) {
          try {
            if (credential.token) {
              // Get the old decrypted token - use the credential's own method
              const oldDecrypted = credential.decryptToken();
              
              // Create a new object for token changes
              fieldChanges.token = {
                oldValue: oldDecrypted,
                newValue: req.body.token
              };
            } else {
              // If there was no previous token, just set the new value
              fieldChanges.token = {
                oldValue: null,
                newValue: req.body.token
              };
            }
          } catch (error) {
            console.error('Error processing token for version history:', error);
            // If decryption fails, just store placeholders
            fieldChanges.token = {
              oldValue: credential.token ? '(encrypted)' : null,
              newValue: '(new token)'
            };
          }
        }
        
        // Create new version record with all values
        const versionData = {
          credentialId: credential.id,
          websiteName: credential.websiteName,
          url: credential.url,
          email: credential.email,
          userId: credential.userId,
          password: credential.password,
          token: credential.token,
          description: credential.description,
          versionNumber: versionNumber,
          changedBy: req.user.id,
          changeType: 'update',
          changedFields: changedFields,
          fieldChanges: fieldChanges
        };
        
        await CredentialVersion.create(versionData);
        
        console.log('Created version with changes:', changedFields);
      } catch (versionError) {
        // If there's an error creating the version, log it but continue with the update
        console.error('Error creating credential version:', versionError);
      }
    }
    
    // Update the credential
    await credential.update(req.body);
    
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
    
    // Check if PIN verification is required
    if (req.pinVerificationRequired) {
      return res.status(403).json({
        status: 'fail',
        message: 'PIN verification required',
        data: {
          requirePin: true,
          credentialId: req.params.id
        }
      });
    }
    
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
          message: 'Only the owner can delete this credential'
        });
      }
    }

    // Get previous version number
    const latestVersion = await CredentialVersion.findOne({
      where: { credentialId: credential.id },
      order: [['versionNumber', 'DESC']]
    });
    
    const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Create a final version record before deletion
    await CredentialVersion.create({
      credentialId: credential.id,
      websiteName: credential.websiteName,
      url: credential.url,
      email: credential.email,
      userId: credential.userId,
      password: credential.password,
      token: credential.token,
      description: credential.description,
      versionNumber: versionNumber,
      changedBy: req.user.id,
      changeType: 'delete',
      changedFields: [],
      fieldChanges: {}
    });

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

    // Return a success response with status 200 instead of 204
    // This ensures the frontend receives the success property
    res.status(200).json({
      success: true,
      message: 'Credential deleted successfully',
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
    const { userId, accessType = 'view' } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required'
      });
    }
    
    if (!['view', 'edit'].includes(accessType)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Access type must be either "view" or "edit"'
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
      if (existingShare.permission !== accessType) {
        await existingShare.update({ permission: accessType });
      }
    } else {
      // Create a new share
      await CredentialAccess.create({
        credentialId: credential.id,
        userId,
        accessType,
        grantedBy: req.user.id
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
        accessType
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      message: `Credential shared with user successfully with ${accessType} permission`
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
    const share = await CredentialAccess.findOne({
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

// Get credential version history
exports.getCredentialVersionHistory = async (req, res) => {
  try {
    // Get the credential
    const credential = await Credential.findByPk(req.params.id);
    
    if (!credential) {
      return res.status(404).json({
        status: 'fail',
        message: 'Credential not found'
      });
    }
    
    // Allow access if user is the owner or admin
    const isOwner = credential.ownerId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      // If not owner or admin, check other permissions
      const { hasPermission, message } = await checkCredentialPermission(
        req.params.id, 
        req.user.id,
        'view'
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          status: 'fail',
          message: message || 'You do not have permission to view this credential history'
        });
      }
    }
    
    // Check if PIN verification is required
    if (req.pinVerificationRequired) {
      return res.status(403).json({
        status: 'fail',
        message: 'PIN verification required',
        data: {
          requirePin: true,
          credentialId: req.params.id
        }
      });
    }
    
    // Fetch all versions of this credential
    const versions = await CredentialVersion.findAll({
      where: { credentialId: req.params.id },
      order: [['versionNumber', 'DESC']],
      include: [{
        model: User,
        as: 'editor',
        attributes: ['id', 'name', 'email']
      }]
    });
    
    // Check if decryption is requested
    const shouldDecrypt = req.query.decrypted === 'true';
    
    // Decrypt passwords if requested
    if (shouldDecrypt) {
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        return res.status(500).json({
          status: 'fail',
          message: 'Server configuration error: Missing encryption key'
        });
      }
      
      // Get the credential model for decryption methods
      const CredentialModel = credential.constructor;
      
      // Decrypt passwords for all versions
      for (const version of versions) {
        try {
          // Create a temporary credential object for decryption
          const tempCredential = Object.create(CredentialModel.prototype);
          
          // Decrypt main password field
          if (version.password) {
            tempCredential.password = version.password;
            try {
              version.password = tempCredential.decryptPassword(encryptionKey);
            } catch (error) {
              console.error('Error decrypting version password:', error);
              version.password = '(decryption error)';
            }
          }
          
          // Decrypt main token field
          if (version.token) {
            tempCredential.token = version.token;
            try {
              version.token = tempCredential.decryptToken(encryptionKey);
            } catch (error) {
              console.error('Error decrypting version token:', error);
              version.token = '(decryption error)';
            }
          }
          
          // Now handle the fieldChanges object
          if (version.fieldChanges) {
            // For each field that might have changed
            for (const field of ['password', 'token']) {
              if (version.fieldChanges[field]) {
                const changes = version.fieldChanges[field];
                
                // The oldValue might already be decrypted or might be encrypted
                if (changes.oldValue && typeof changes.oldValue === 'string' && changes.oldValue.startsWith('U2')) {
                  // This is an encrypted value, decrypt it
                  tempCredential[field] = changes.oldValue;
                  try {
                    changes.oldValue = field === 'password' 
                      ? tempCredential.decryptPassword(encryptionKey)
                      : tempCredential.decryptToken(encryptionKey);
                  } catch (error) {
                    console.error(`Error decrypting old ${field}:`, error);
                    changes.oldValue = '(decryption error)';
                  }
                }
                
                // The newValue might already be decrypted or might be encrypted
                if (changes.newValue && typeof changes.newValue === 'string' && changes.newValue.startsWith('U2')) {
                  // This is an encrypted value, decrypt it
                  tempCredential[field] = changes.newValue;
                  try {
                    changes.newValue = field === 'password'
                      ? tempCredential.decryptPassword(encryptionKey)
                      : tempCredential.decryptToken(encryptionKey);
                  } catch (error) {
                    console.error(`Error decrypting new ${field}:`, error);
                    changes.newValue = '(decryption error)';
                  }
                }
              }
            }
          }
          
          // Log the decrypted values for debugging
          console.log('Decrypted version:', {
            id: version.id,
            versionNumber: version.versionNumber,
            changedFields: version.changedFields,
            hasFieldChanges: !!version.fieldChanges
          });
        } catch (decryptError) {
          console.error('Error processing credential version:', decryptError);
          // Continue with other versions even if one fails
        }
      }
    }

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'view_credential',
      resourceType: 'credential',
      resourceId: req.params.id,
      details: { 
        action: 'view_version_history',
        count: versions.length
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      results: versions.length,
      data: {
        versions
      }
    });
  } catch (err) {
    console.error('Error getting credential version history:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Add new endpoints for credential access management
exports.getCredentialAccesses = async (req, res) => {
  try {
    // Get the credential
    const credential = await Credential.findByPk(req.params.id);
    
    if (!credential) {
      return res.status(404).json({
        status: 'fail',
        message: 'Credential not found'
      });
    }
    
    // Allow access if user is the owner or admin
    const isOwner = credential.ownerId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      // If not owner or admin, check other permissions
      const { hasPermission, message } = await checkCredentialPermission(
        req.params.id, 
        req.user.id,
        'edit'
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          status: 'fail',
          message: message || 'You do not have permission to view this credential\'s access list'
        });
      }
    }
    
    // Fetch all accesses for this credential
    const accesses = await CredentialAccess.findAll({
      where: { credentialId: req.params.id },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'grantor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(200).json({
      status: 'success',
      results: accesses.length,
      data: {
        accesses
      }
    });
  } catch (err) {
    console.error('Error getting credential accesses:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.updateCredentialAccess = async (req, res) => {
  try {
    const { accessType } = req.body;
    
    if (!['view', 'edit'].includes(accessType)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Access type must be either "view" or "edit"'
      });
    }

    // Check if user has permission to update the credential access
    const credential = await Credential.findByPk(req.params.id);
    
    if (!credential) {
      return res.status(404).json({
        status: 'fail',
        message: 'Credential not found'
      });
    }
    
    // Only the owner or admin can update access
    if (credential.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the credential owner or admin can update access'
      });
    }

    // Find the access record
    const access = await CredentialAccess.findOne({
      where: { 
        credentialId: req.params.id,
        userId: req.params.userId
      }
    });
    
    if (!access) {
      return res.status(404).json({
        status: 'fail',
        message: 'Access record not found'
      });
    }

    // Update the access type
    await access.update({ 
      accessType,
      grantedBy: req.user.id
    });

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'change_user_permission',
      resourceType: 'credential',
      resourceId: req.params.id,
      details: { 
        userId: req.params.userId,
        accessType
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      data: {
        access
      }
    });
  } catch (err) {
    console.error('Error updating credential access:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.revokeCredentialAccess = async (req, res) => {
  try {
    // Check if user has permission to revoke the credential access
    const credential = await Credential.findByPk(req.params.id);
    
    if (!credential) {
      return res.status(404).json({
        status: 'fail',
        message: 'Credential not found'
      });
    }
    
    // Only the owner or admin can revoke access
    if (credential.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the credential owner or admin can revoke access'
      });
    }

    // Find the access record
    const access = await CredentialAccess.findOne({
      where: { 
        credentialId: req.params.id,
        userId: req.params.userId
      }
    });
    
    if (!access) {
      return res.status(404).json({
        status: 'fail',
        message: 'Access record not found'
      });
    }

    // Delete the access record
    await access.destroy();

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: 'revoke_credential_access',
      resourceType: 'credential',
      resourceId: req.params.id,
      details: { userId: req.params.userId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'Access revoked successfully'
    });
  } catch (err) {
    console.error('Error revoking credential access:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

module.exports = exports;
