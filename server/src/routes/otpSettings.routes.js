const express = require('express');
const otpSettingsController = require('../controllers/otpSettings.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Protect all routes after this middleware - requires authentication
router.use(authController.protect);

// OTP settings routes
router.get('/', otpSettingsController.getOtpSettings);
router.post('/toggle', otpSettingsController.toggleOtpSettings);

module.exports = router;
