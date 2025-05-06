const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const authController = require('../controllers/auth.controller');
const multer = require('multer');

// Configure multer for memory storage (store as buffer)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Public routes for retrieving images and app info
router.get('/picture', profileController.getProfilePicture);
router.get('/picture/:id', profileController.getProfilePicture);
router.get('/company/logo', profileController.getCompanyLogo);
router.get('/company/logo/:id', profileController.getCompanyLogo);
router.get('/company/favicon', profileController.getFavicon);
router.get('/company/favicon/:id', profileController.getFavicon);
router.get('/company/app-title', profileController.getAppTitle);

// Protect all routes after this middleware
router.use(authController.protect);

// Protected profile picture routes
router.post('/picture', upload.single('profilePicture'), profileController.uploadProfilePicture);
router.delete('/picture', profileController.deleteProfilePicture);

// Protected company logo routes (admin only)
router.post('/company/logo', upload.single('companyLogo'), profileController.uploadCompanyLogo);
router.delete('/company/logo', profileController.deleteCompanyLogo);

// Protected favicon routes (admin only)
router.post('/company/favicon', upload.single('favicon'), profileController.uploadFavicon);
router.delete('/company/favicon', profileController.deleteFavicon);

// Company information routes
router.get('/company', profileController.getCompanyInfo);
router.patch('/company', profileController.updateCompanyInfo);

// App title routes (admin only)
router.patch('/company/app-title', authController.restrictTo('admin'), profileController.updateAppTitle);

module.exports = router;
