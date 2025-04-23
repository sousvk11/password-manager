const express = require('express');
const authController = require('../controllers/auth.controller');
const activityController = require('../controllers/activity.controller');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// User activities route
router.get('/user/:userId', activityController.getUserActivities);

// Resource activities route
router.get('/resource/:resourceType/:resourceId', activityController.getResourceActivities);

// Admin only routes
router.use(authController.restrictTo('admin'));

// All activities route (admin only)
router.get('/', activityController.getAllActivities);

module.exports = router;
