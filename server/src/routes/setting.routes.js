const express = require('express');
const settingController = require('../controllers/setting.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Restrict all routes to admin only
router.use(authController.restrictTo('admin'));

// Settings routes
router.route('/')
  .get(settingController.getAllSettings);

router.route('/:key')
  .get(settingController.getSettingByKey)
  .put(settingController.updateSetting)
  .delete(settingController.deleteSetting);

// SMTP settings routes
router.route('/smtp')
  .get(settingController.getSmtpSettings)
  .put(settingController.updateSmtpSettings);

// SMTP test route
router.post('/smtp/test', settingController.testSMTP);

// Domain settings routes
router.route('/domain/settings')
  .get(settingController.getDomainSettings)
  .put(settingController.updateDomainSettings);

module.exports = router;
