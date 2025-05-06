import React, { useState, useRef, useContext } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress, 
  Snackbar, 
  Alert,
  IconButton,
  Card,
  CardMedia
} from '@mui/material';
import { PhotoCamera, Delete } from '@mui/icons-material';

import axiosInstance from '../utils/axiosConfig';
import AuthContext from '../context/AuthContext';

const CompanyLogoUpload = ({ onLogoUpdate }) => {
  const { currentUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Get user's company logo URL with cache-busting parameter if preview exists
  // Direct URL to the image endpoint (not using axios instance)
  const companyLogoUrl = `/api/v1/profile/company/logo${currentUser?.id ? `/${currentUser.id}` : ''}${previewUrl ? '?t=' + new Date().getTime() : ''}`;

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    // Create a preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload the file
    uploadFile(file);
  };

  const uploadFile = async (file) => {
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('companyLogo', file);

    try {
      await axiosInstance.post('/profile/company/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Company logo updated successfully');
      if (onLogoUpdate) onLogoUpdate();
    } catch (err) {
      console.error('Error uploading company logo:', err);
      setError(err.response?.data?.message || 'Failed to upload company logo');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLogo = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Send a request to delete the company logo
      // This endpoint would need to be implemented on the backend
      await axiosInstance.delete('/profile/company/logo');
      
      setPreviewUrl(null);
      setSuccess('Company logo removed successfully');
      if (onLogoUpdate) onLogoUpdate();
    } catch (err) {
      console.error('Error deleting company logo:', err);
      setError(err.response?.data?.message || 'Failed to delete company logo');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setError('');
    setSuccess('');
  };

  // Now all users can upload their own company logo

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Card sx={{ width: 250, height: 120, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CardMedia
          component="img"
          image={companyLogoUrl}
          alt="Company Logo"
          sx={{ 
            objectFit: 'contain',
            maxHeight: '100%',
            maxWidth: '100%',
            p: 2
          }}
        />
      </Card>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<PhotoCamera />}
          disabled={loading}
        >
          Upload Logo
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*"
            onChange={handleFileChange}
          />
        </Button>

        <IconButton 
          color="error" 
          onClick={handleDeleteLogo}
          disabled={loading}
        >
          <Delete />
        </IconButton>
      </Box>

      {loading && (
        <CircularProgress size={24} sx={{ mt: 1 }} />
      )}

      <Typography variant="caption" color="text.secondary">
        Maximum file size: 5MB. Supported formats: JPG, PNG, GIF.
      </Typography>
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
        Your company logo will be displayed in the application header when you are logged in.
      </Typography>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CompanyLogoUpload;
