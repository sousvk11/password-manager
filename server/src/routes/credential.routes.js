const express = require('express');
const authController = require('../controllers/auth.controller');
const credentialController = require('../controllers/credential.controller');
const pinController = require('../controllers/pin.controller');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Get all credentials for current user
router.get('/', credentialController.getAllCredentials);

// Get credential by ID (with PIN verification if required)
router.get('/:id', pinController.isPinVerificationRequired('read'), credentialController.getCredential);

// Create new credential
router.post('/', credentialController.createCredential);

// Update credential - PIN verification not required
router.patch('/:id', credentialController.updateCredential);

// Delete credential
router.delete('/:id', pinController.isPinVerificationRequired('delete'), credentialController.deleteCredential);

// Credential sharing
router.post('/:id/share', credentialController.shareCredential);
router.delete('/:id/share/:userId', credentialController.revokeAccess);

// Credential access management
router.get('/:id/access', credentialController.getCredentialAccesses);
router.put('/:id/access/:userId', credentialController.updateCredentialAccess);
router.delete('/:id/access/:userId', credentialController.revokeCredentialAccess);

// Credential version history
router.get('/:id/versions', pinController.isPinVerificationRequired('read'), credentialController.getCredentialVersionHistory);

module.exports = router;
