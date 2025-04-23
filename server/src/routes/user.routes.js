const express = require('express');
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// User profile routes
router.get('/me', userController.getMe);
router.patch('/updateMe', userController.updateMe);
router.patch('/updatePassword', userController.updatePassword);

// Admin only routes
router.use(authController.restrictTo('admin'));
router.route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
