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

router.route('/:id')
  .get(groupController.getGroup)
  .patch(groupController.updateGroup)
  .delete(groupController.deleteGroup);

// Group member management
router.post('/:id/members', groupController.addUserToGroup);
router.delete('/:id/members/:userId', groupController.removeUserFromGroup);

module.exports = router;
