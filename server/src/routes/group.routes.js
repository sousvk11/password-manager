const express = require('express');
const authController = require('../controllers/auth.controller');
const groupController = require('../controllers/group.controller');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Group routes
router.route('/')
  .get(groupController.getAllGroups)
  .post(groupController.createGroup);

// Get a single group
router.get('/:id', groupController.getGroup);

// Update a group
router.put('/:id', groupController.updateGroup);

// Delete a group
router.delete('/:id', groupController.deleteGroup);

// Group members management
router.get('/:id/members', groupController.getGroupMembers);
router.post('/:id/members', groupController.addUserToGroup);
router.put('/:id/members/:userId', groupController.updateGroupMember);
router.delete('/:id/members/:userId', groupController.removeGroupMember);

module.exports = router;
