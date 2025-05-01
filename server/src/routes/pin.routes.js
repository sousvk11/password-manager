const express = require('express');
const pinController = require('../controllers/pin.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// PIN management routes with OTP verification
router.post('/generate/initiate', pinController.initiateGeneratePin);
router.post('/generate/complete', pinController.completeGeneratePin);

// Legacy route - now deprecated
router.post('/generate', pinController.generatePin);

// Other PIN management routes
router.patch('/toggle', pinController.togglePin);
router.get('/status', pinController.getPinStatus);
router.post('/verify', pinController.verifyPin);

// Check if PIN verification is required
router.head('/check-required', pinController.checkPinRequired);
router.get('/check-required', pinController.checkPinRequired);

module.exports = router;
