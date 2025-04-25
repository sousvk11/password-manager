const express = require('express');
const authController = require('../controllers/auth.controller');
const credentialController = require('../controllers/credential.controller');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Credential routes
router.route('/')
  .get(credentialController.getAllCredentials)
  .post(credentialController.createCredential);

router.route('/:id')
  .get(credentialController.getCredential)
  .put(credentialController.updateCredential)
  .delete(credentialController.deleteCredential);

router.route('/:id/versions')
  .get(credentialController.getCredentialVersionHistory);

// Credential sharing
router.post('/:id/share', credentialController.shareCredential);
router.delete('/:id/share/:userId', credentialController.revokeAccess);

// Credential access management
router.get('/:id/access', credentialController.getCredentialAccesses);
router.put('/:id/access/:userId', credentialController.updateCredentialAccess);
router.delete('/:id/access/:userId', credentialController.revokeCredentialAccess);

module.exports = router;
