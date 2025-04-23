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
  .patch(credentialController.updateCredential)
  .delete(credentialController.deleteCredential);

// Credential sharing
router.post('/:id/share', credentialController.shareCredential);
router.delete('/:id/share/:userId', credentialController.revokeAccess);

module.exports = router;
