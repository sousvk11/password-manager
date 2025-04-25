const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Authentication routes
// Registration with OTP verification
router.post('/signup/initiate', authController.initiateSignup);
router.post('/signup/complete', authController.completeSignup);

// Login with OTP verification
router.post('/login/initiate', authController.initiateLogin);
router.post('/login/complete', authController.completeLogin);

// Password reset with OTP verification
router.post('/password-reset/initiate', authController.initiatePasswordReset);
router.post('/password-reset/complete', authController.completePasswordReset);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

// Logout
router.get('/logout', authController.protect, authController.logout);

module.exports = router;
