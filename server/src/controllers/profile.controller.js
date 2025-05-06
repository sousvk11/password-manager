const User = require('../models/user.model');
const Company = require('../models/company.model');
const sequelize = require('../database/connection');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const readFile = promisify(fs.readFile);

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'No file uploaded'
      });
    }

    // Read file as buffer
    const imageBuffer = req.file.buffer;
    
    console.log(`Uploading profile picture for user ID: ${req.user.id}, buffer size: ${imageBuffer.length} bytes`);

    // Update user's profile picture
    const [updatedRows] = await User.update(
      { profilePicture: imageBuffer },
      { where: { id: req.user.id } }
    );
    
    if (updatedRows === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found or no changes made'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile picture updated successfully'
    });
  } catch (err) {
    console.error('Error uploading profile picture:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Delete profile picture
exports.deleteProfilePicture = async (req, res) => {
  try {
    // Update user's profile picture to null
    await User.update(
      { profilePicture: null },
      { where: { id: req.user.id } }
    );

    res.status(200).json({
      status: 'success',
      message: 'Profile picture removed successfully'
    });
  } catch (err) {
    console.error('Error deleting profile picture:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get profile picture
exports.getProfilePicture = async (req, res) => {
  try {
    let userId;
    
    // If there's a specific user ID in the params, use that
    if (req.params.id) {
      userId = req.params.id;
    } 
    // If there's an authenticated user, use their ID
    else if (req.user) {
      userId = req.user.id;
    } 
    // If no specific user and no authenticated user, return default image
    else {
      console.log('No user ID provided, serving default profile picture');
      return res.sendFile(process.cwd() + '/public/default-profile.png');
    }
    
    console.log(`Getting profile picture for user ID: ${userId}`);
    
    const user = await User.findByPk(userId, {
      attributes: ['profilePicture']
    });

    if (!user) {
      console.log(`User with ID ${userId} not found, serving default profile picture`);
      return res.sendFile(process.cwd() + '/public/default-profile.png');
    }
    
    if (!user.profilePicture) {
      console.log(`No profile picture found for user ID ${userId}, serving default profile picture`);
      return res.sendFile(process.cwd() + '/public/default-profile.png');
    }
    
    console.log(`Serving profile picture for user ID ${userId}, size: ${user.profilePicture.length} bytes`);

    // Set content type and send the image
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(user.profilePicture);
  } catch (err) {
    console.error('Error getting profile picture:', err);
    return res.sendFile(process.cwd() + '/public/default-profile.png');
  }
};

// Upload company logo
exports.uploadCompanyLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'No file uploaded'
      });
    }

    // Read file as buffer
    const imageBuffer = req.file.buffer;

    // Update user's company logo
    await User.update(
      { companyLogo: imageBuffer },
      { where: { id: req.user.id } }
    );

    res.status(200).json({
      status: 'success',
      message: 'Company logo updated successfully'
    });
  } catch (err) {
    console.error('Error uploading company logo:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Delete company logo
exports.deleteCompanyLogo = async (req, res) => {
  try {
    // Update user's company logo to null
    await User.update(
      { companyLogo: null },
      { where: { id: req.user.id } }
    );

    res.status(200).json({
      status: 'success',
      message: 'Company logo removed successfully'
    });
  } catch (err) {
    console.error('Error deleting company logo:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get company logo
exports.getCompanyLogo = async (req, res) => {
  try {
    let userId;
    
    // If there's a specific user ID in the params, use that
    if (req.params.id) {
      userId = req.params.id;
    } 
    // If there's an authenticated user, use their ID
    else if (req.user) {
      userId = req.user.id;
    } 
    // If no specific user and no authenticated user, return default image
    else {
      return res.sendFile(process.cwd() + '/public/default-logo.png');
    }
    
    const user = await User.findByPk(userId, {
      attributes: ['companyLogo']
    });

    if (!user || !user.companyLogo) {
      return res.sendFile(process.cwd() + '/public/default-logo.png');
    }

    // Set content type and send the image
    res.set('Content-Type', 'image/png');
    res.send(user.companyLogo);
  } catch (err) {
    console.error('Error getting company logo:', err);
    return res.sendFile(process.cwd() + '/public/default-logo.png');
  }
};

// Get company information
exports.getCompanyInfo = async (req, res) => {
  try {
    const company = await Company.findOne({
      where: { active: true },
      attributes: ['id', 'name', 'description', 'website']
    });

    if (!company) {
      return res.status(404).json({
        status: 'fail',
        message: 'Company information not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        company
      }
    });
  } catch (err) {
    console.error('Error getting company information:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Update company information
exports.updateCompanyInfo = async (req, res) => {
  try {
    const { name, description, website, appTitle } = req.body;
    
    // Validate input
    if (!name) {
      return res.status(400).json({
        status: 'fail',
        message: 'Company name is required'
      });
    }

    // Find or create company record (assuming ID 1 is the default)
    const [company, created] = await Company.findOrCreate({
      where: { id: 1 },
      defaults: {
        name,
        description: description || null,
        website: website || null,
        appTitle: appTitle || 'Password Manager'
      }
    });

    if (!created) {
      // Update existing company
      await company.update({
        name,
        description: description || company.description,
        website: website || company.website,
        appTitle: appTitle || company.appTitle
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        company: {
          id: company.id,
          name: company.name,
          description: company.description,
          website: company.website,
          appTitle: company.appTitle,
          updatedAt: company.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Error updating company info:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update company information'
    });
  }
};

// Get app title
exports.getAppTitle = async (req, res) => {
  try {
    // Find company record (assuming ID 1 is the default)
    const company = await Company.findByPk(1, {
      attributes: ['appTitle']
    });

    if (!company) {
      return res.status(200).json({
        status: 'success',
        data: {
          appTitle: 'Password Manager' // Default title if no company record exists
        }
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        appTitle: company.appTitle || 'Password Manager'
      }
    });
  } catch (error) {
    console.error('Error getting app title:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get app title'
    });
  }
};

// Upload favicon
exports.uploadFavicon = async (req, res) => {
  try {
    if (!req.file) {
      console.error('No file provided in the request');
      return res.status(400).json({
        status: 'fail',
        message: 'No file uploaded'
      });
    }

    // Read file as buffer and validate
    const imageBuffer = req.file.buffer;
    
    if (!imageBuffer || imageBuffer.length === 0) {
      console.error('Empty image buffer received');
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid image data received'
      });
    }
    
    console.log(`Uploading favicon, file: ${req.file.originalname}, type: ${req.file.mimetype}, size: ${imageBuffer.length} bytes`);
    
    // Validate file type
    const validTypes = ['image/x-icon', 'image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(req.file.mimetype)) {
      console.error(`Invalid file type: ${req.file.mimetype}`);
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid file type. Please upload an ICO, PNG, JPG, or SVG file.'
      });
    }

    try {
      // Convert buffer to base64 string
      const base64Data = imageBuffer.toString('base64');
      const faviconData = {
        data: base64Data,
        contentType: req.file.mimetype
      };
      
      // Save as JSON string to ensure proper storage
      const faviconJSON = JSON.stringify(faviconData);
      
      // Find or create company record (assuming ID 1 is the default)
      const [company] = await Company.findOrCreate({
        where: { id: 1 },
        defaults: {
          name: 'Default Company'
        }
      });
      
      console.log(`Found/created company with ID: ${company.id}`);
      
      // Save the favicon data to the database
      await company.update({ 
        favicon: faviconJSON 
      });
      
      console.log(`Updated company ID ${company.id} with favicon as JSON string`);
      
      // Verify the update was successful
      const updatedCompany = await Company.findByPk(company.id);
      
      if (!updatedCompany || !updatedCompany.favicon) {
        console.error('Favicon not saved to database');
        return res.status(500).json({
          status: 'error',
          message: 'Failed to save favicon to database'
        });
      }
      
      console.log(`Successfully saved favicon for company ID ${company.id}`);

      return res.status(200).json({
        status: 'success',
        message: 'Favicon uploaded successfully'
      });
    } catch (dbError) {
      console.error('Database error while uploading favicon:', dbError);
      return res.status(500).json({
        status: 'error',
        message: 'Database error while saving favicon'
      });
    }
  } catch (error) {
    console.error('Error uploading favicon:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to upload favicon'
    });
  }
};

// Delete favicon
exports.deleteFavicon = async (req, res) => {
  try {
    // Find company
    const company = await Company.findByPk(1);
    
    if (!company) {
      return res.status(404).json({
        status: 'fail',
        message: 'Company not found'
      });
    }
    
    console.log('Deleting favicon for company ID 1');
    
    // Set favicon to NULL
    await company.update({ favicon: null });
    
    console.log('Favicon deleted successfully');
    
    return res.status(200).json({
      status: 'success',
      message: 'Favicon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting favicon:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete favicon'
    });
  }
};

// Get favicon
exports.getFavicon = async (req, res) => {
  try {
    const companyId = req.params.id || 1; // Default to ID 1 if not specified
    
    console.log(`Getting favicon for company ID: ${companyId}`);
    
    // Find company record
    const company = await Company.findByPk(companyId, {
      attributes: ['id', 'favicon']
    });
    
    // Check if company exists and has a favicon
    if (!company || !company.favicon) {
      console.log('Company or favicon not found, serving default favicon');
      return serveDefaultFavicon(res);
    }
    
    try {
      // Try to parse the favicon JSON
      const faviconData = JSON.parse(company.favicon);
      
      if (!faviconData || !faviconData.data || !faviconData.contentType) {
        console.log('Invalid favicon data format, serving default');
        return serveDefaultFavicon(res);
      }
      
      // Convert base64 back to buffer
      const buffer = Buffer.from(faviconData.data, 'base64');
      
      if (buffer.length === 0) {
        console.log('Empty favicon buffer, serving default');
        return serveDefaultFavicon(res);
      }
      
      console.log(`Serving favicon for company ID ${companyId}, content type: ${faviconData.contentType}, size: ${buffer.length} bytes`);
      
      // Set appropriate headers
      res.set('Content-Type', faviconData.contentType);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // Send the favicon
      return res.send(buffer);
    } catch (parseError) {
      console.error('Error parsing favicon JSON:', parseError);
      return serveDefaultFavicon(res);
    }
  } catch (error) {
    console.error('Error retrieving favicon:', error);
    return serveDefaultFavicon(res);
  }
};

// Helper function to serve the default favicon
async function serveDefaultFavicon(res) {
  try {
    const defaultFaviconPath = path.join(__dirname, '../../public/default-favicon.ico');
    const defaultFavicon = await readFile(defaultFaviconPath);
    
    res.set('Content-Type', 'image/x-icon');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    return res.send(defaultFavicon);
  } catch (error) {
    console.error('Error serving default favicon:', error);
    return res.status(404).send('Favicon not found');
  }
};

// Update app title
exports.updateAppTitle = async (req, res) => {
  try {
    const { appTitle } = req.body;
    
    if (!appTitle) {
      return res.status(400).json({
        status: 'fail',
        message: 'App title is required'
      });
    }

    // Find or create company record (assuming ID 1 is the default)
    const [company, created] = await Company.findOrCreate({
      where: { id: 1 },
      defaults: {
        name: 'Default Company',
        appTitle
      }
    });

    if (!created) {
      // Update existing company
      await company.update({ appTitle });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        appTitle: company.appTitle
      }
    });
  } catch (error) {
    console.error('Error updating app title:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update app title'
    });
  }
};
