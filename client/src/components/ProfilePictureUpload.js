import React, { useState, useRef, useContext, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Avatar, 
  Typography, 
  CircularProgress, 
  Snackbar, 
  Alert,
  IconButton
} from '@mui/material';
import { PhotoCamera, Delete } from '@mui/icons-material';

import axiosInstance from '../utils/axiosConfig';
import AuthContext from '../context/AuthContext';

const ProfilePictureUpload = ({ onPictureUpdate }) => {
  const { currentUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [refreshKey, setRefreshKey] = useState(new Date().getTime());

  // Get profile picture URL with cache-busting parameter and user ID
  const profilePictureUrl = currentUser ? `/api/v1/profile/picture/${currentUser.id}?t=${refreshKey}` : `/api/v1/profile/picture?t=${refreshKey}`;
  
  // Refresh the profile picture when the component mounts
  useEffect(() => {
    // Initial refresh
    setRefreshKey(new Date().getTime());
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      setRefreshKey(new Date().getTime());
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

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
    formData.append('profilePicture', file);

    try {
      const response = await axiosInstance.post('/profile/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 200) {
        console.log('Profile picture uploaded successfully');
        
        // Wait a moment for the server to process the image
        setTimeout(() => {
          // Force refresh the image by updating the refresh key
          setRefreshKey(new Date().getTime());
          setSuccess('Profile picture updated successfully');
          if (onPictureUpdate) onPictureUpdate();
          setLoading(false);
        }, 1000);
        return;
      }
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      setError(err.response?.data?.message || 'Failed to upload profile picture');
    }
    
    setLoading(false);
  };

  const handleDeletePicture = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Send a request to delete the profile picture
      const response = await axiosInstance.delete('/profile/picture');
      
      if (response.status === 200) {
        setPreviewUrl(null);
        // Force refresh the image by updating the refresh key
        setRefreshKey(new Date().getTime());
        setSuccess('Profile picture removed successfully');
        if (onPictureUpdate) onPictureUpdate();
      }
    } catch (err) {
      console.error('Error deleting profile picture:', err);
      setError(err.response?.data?.message || 'Failed to delete profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setError('');
    setSuccess('');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Avatar 
        src={profilePictureUrl}
        alt={currentUser?.name || 'User'}
        sx={{ 
          width: 120, 
          height: 120,
          border: '2px solid #f0f0f0'
        }}
      >
        {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
      </Avatar>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<PhotoCamera />}
          disabled={loading}
        >
          Upload
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
          onClick={handleDeletePicture}
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
        Your profile picture will be visible to other users and displayed in the application header.
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

export default ProfilePictureUpload;
