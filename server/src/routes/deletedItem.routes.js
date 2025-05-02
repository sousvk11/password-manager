const express = require('express');
const deletedItemController = require('../controllers/deletedItem.controller');
const authController = require('../controllers/auth.controller');
const pinController = require('../controllers/pin.controller');

const router = express.Router();

// Protect all routes - require authentication
router.use(authController.protect);

// Restrict to admin only
router.use(authController.restrictTo('admin'));

// Check PIN verification for sensitive operations
router.use('/:id/restore', pinController.checkPinRequired);
router.use('/:id/permanent-delete', pinController.checkPinRequired);

// Routes for deleted items (admin only)
router.get('/', deletedItemController.getAllDeletedItems);
router.get('/:id', deletedItemController.getDeletedItem);
router.post('/:id/restore', deletedItemController.restoreDeletedItem);
router.delete('/:id/permanent-delete', deletedItemController.permanentlyDeleteItem);

module.exports = router;
