const DeletedItem = require('../models/deletedItem.model');
const User = require('../models/user.model');
const Credential = require('../models/credential.model');
const Group = require('../models/group.model');
const Activity = require('../models/activity.model');
const { Op } = require('sequelize');
const crypto = require('crypto-js');

// Helper function to decrypt a field using crypto-js (same as in Credential model)
const decryptField = async (encryptedValue) => {
  try {
    if (!encryptedValue) return '';
    
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not found');
    }
    
    // Use crypto-js AES decryption (same as in Credential model)
    const bytes = crypto.AES.decrypt(encryptedValue, encryptionKey);
    return bytes.toString(crypto.enc.Utf8);
  } catch (error) {
    console.error('Error decrypting field:', error);
    return '[Decryption Error]';
  }
};

/**
 * Get all deleted items (admin only)
 */
exports.getAllDeletedItems = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied. Only administrators can view deleted items.'
      });
    }

    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const itemType = req.query.type || null; // 'credential' or 'group' or null for all
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'deletedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const showRestored = req.query.showRestored === 'true';

    // Build query conditions
    const whereConditions = {};
    
    // Filter by item type if specified
    if (itemType) {
      whereConditions.itemType = itemType;
    }
    
    // Filter by search term if provided
    if (search) {
      whereConditions.name = {
        [Op.like]: `%${search}%`
      };
    }
    
    // Filter by restoration status
    if (!showRestored) {
      whereConditions.isRestored = false;
    }

    // Get deleted items with pagination
    const { count, rows: deletedItems } = await DeletedItem.findAndCountAll({
      where: whereConditions,
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'deletedByUser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'originalOwner',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Decrypt passwords and tokens for all credential items
    for (const item of deletedItems) {
      if (item.itemType === 'credential') {
        try {
          // Parse the content
          const content = JSON.parse(item.content);
          
          // Decrypt password and token if they exist
          if (content.password) {
            content.password = await decryptField(content.password);
          }
          
          if (content.token) {
            content.token = await decryptField(content.token);
          }
          
          // Update the content with decrypted values
          item.content = JSON.stringify(content);
        } catch (decryptError) {
          console.error('Error decrypting credential fields:', decryptError);
        }
      }
    }

    return res.status(200).json({
      status: 'success',
      data: {
        deletedItems,
        pagination: {
          total: count,
          totalPages,
          currentPage: page,
          hasNextPage,
          hasPrevPage
        }
      }
    });
  } catch (err) {
    console.error('Error getting deleted items:', err);
    console.error('Error details:', JSON.stringify(err, null, 2));
    console.error('Error stack:', err.stack);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while getting deleted items',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Get a specific deleted item by ID (admin only)
 */
exports.getDeletedItem = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied. Only administrators can view deleted items.'
      });
    }

    const deletedItem = await DeletedItem.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'deletedByUser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'originalOwner',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!deletedItem) {
      return res.status(404).json({
        status: 'fail',
        message: 'Deleted item not found'
      });
    }

    // If it's a credential, decrypt password and token
    if (deletedItem.itemType === 'credential') {
      try {
        // Parse the content
        const content = JSON.parse(deletedItem.content);
        
        // Decrypt password and token if they exist
        if (content.password) {
          content.password = await decryptField(content.password);
        }
        
        if (content.token) {
          content.token = await decryptField(content.token);
        }
        
        // Update the content with decrypted values
        deletedItem.content = JSON.stringify(content);
      } catch (decryptError) {
        console.error('Error decrypting credential fields:', decryptError);
      }
    }

    return res.status(200).json({
      status: 'success',
      data: {
        deletedItem
      }
    });
  } catch (err) {
    console.error('Error getting deleted item:', err);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while getting the deleted item'
    });
  }
};

/**
 * Restore a deleted item (admin only)
 */
exports.restoreDeletedItem = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied. Only administrators can restore deleted items.'
      });
    }

    const deletedItem = await DeletedItem.findByPk(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({
        status: 'fail',
        message: 'Deleted item not found'
      });
    }

    if (deletedItem.isRestored) {
      return res.status(400).json({
        status: 'fail',
        message: 'This item has already been restored'
      });
    }

    // Parse the content JSON
    const itemContent = JSON.parse(deletedItem.content);

    // Restore the item based on its type
    if (deletedItem.itemType === 'credential') {
      // Check if a credential with the same name already exists
      const existingCredential = await Credential.findOne({
        where: { websiteName: itemContent.websiteName, ownerId: deletedItem.ownerId }
      });

      if (existingCredential) {
        return res.status(400).json({
          status: 'fail',
          message: 'A credential with the same name already exists'
        });
      }

      // Create a new credential with the original data
      await Credential.create({
        id: itemContent.id, // Use the original ID if possible
        websiteName: itemContent.websiteName,
        url: itemContent.url,
        email: itemContent.email,
        userId: itemContent.userId,
        password: itemContent.password,
        token: itemContent.token,
        description: itemContent.description,
        ownerId: itemContent.ownerId,
        createdAt: itemContent.createdAt,
        updatedAt: new Date()
      });
    } else if (deletedItem.itemType === 'group') {
      // Check if a group with the same name already exists
      const existingGroup = await Group.findOne({
        where: { name: itemContent.name, ownerId: deletedItem.ownerId }
      });

      if (existingGroup) {
        return res.status(400).json({
          status: 'fail',
          message: 'A group with the same name already exists'
        });
      }

      // Create a new group with the original data
      await Group.create({
        id: itemContent.id, // Use the original ID if possible
        name: itemContent.name,
        description: itemContent.description,
        ownerId: itemContent.ownerId,
        createdAt: itemContent.createdAt,
        updatedAt: new Date()
      });
    } else {
      return res.status(400).json({
        status: 'fail',
        message: 'Unknown item type'
      });
    }

    // Mark the deleted item as restored
    deletedItem.isRestored = true;
    deletedItem.restoredAt = new Date();
    await deletedItem.save();

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: `restore_${deletedItem.itemType}`,
      resourceType: deletedItem.itemType,
      resourceId: deletedItem.originalId,
      details: { name: deletedItem.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({
      status: 'success',
      message: `${deletedItem.itemType.charAt(0).toUpperCase() + deletedItem.itemType.slice(1)} restored successfully`,
      data: {
        deletedItem
      }
    });
  } catch (err) {
    console.error('Error restoring deleted item:', err);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while restoring the deleted item'
    });
  }
};

/**
 * Permanently delete an item from the deleted items table (admin only)
 */
exports.permanentlyDeleteItem = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied. Only administrators can permanently delete items.'
      });
    }

    const deletedItem = await DeletedItem.findByPk(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({
        status: 'fail',
        message: 'Deleted item not found'
      });
    }

    // Store item details for activity log
    const itemType = deletedItem.itemType;
    const itemName = deletedItem.name;
    const originalId = deletedItem.originalId;

    // Permanently delete the item
    await deletedItem.destroy();

    // Log activity
    await Activity.create({
      userId: req.user.id,
      action: `permanent_delete_${itemType}`,
      resourceType: itemType,
      resourceId: originalId,
      details: { name: itemName },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({
      status: 'success',
      message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} permanently deleted`
    });
  } catch (err) {
    console.error('Error permanently deleting item:', err);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while permanently deleting the item'
    });
  }
};
