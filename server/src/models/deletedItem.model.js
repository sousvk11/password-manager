const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

/**
 * DeletedItem model for storing deleted credentials and groups
 * Only accessible by admin users
 */
class DeletedItem extends Model {}

DeletedItem.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  originalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the original item before deletion'
  },
  itemType: {
    type: DataTypes.ENUM('credential', 'group'),
    allowNull: false,
    comment: 'Type of the deleted item'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Name of the deleted item'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'JSON string of the full item content'
  },
  deletedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User ID who deleted the item'
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Original owner of the item'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the item was deleted'
  },
  restoredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the item was restored (if applicable)'
  },
  isRestored: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the item has been restored'
  }
}, {
  sequelize,
  modelName: 'DeletedItem',
  tableName: 'deleted_items',
  timestamps: true,
  paranoid: false // We don't want soft deletes for this table
});

module.exports = DeletedItem;
