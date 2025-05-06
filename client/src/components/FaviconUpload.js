import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  CircularProgress,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import { toast } from 'react-toastify';
import axios from 'axios';

const FaviconUpload = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [timestamp, setTimestamp] = useState(Date.now());
  const [hasFavicon, setHasFavicon] = useState(false);
  
  // Check for favicon on component mount
  useEffect(() => {
    checkFaviconExists();
  }, []);
  
  // Function to check if favicon exists
  const checkFaviconExists = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/profile/company/favicon?t=${Date.now()}`, {
        method: 'HEAD'
      });
      
      if (response.ok) {
        setHasFavicon(true);
        console.log('Favicon exists');
      } else {
        setHasFavicon(false);
        console.log('No favicon found');
      }
    } catch (error) {
      console.error('Error checking favicon:', error);
      setHasFavicon(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to reload the favicon preview
  const reloadFaviconPreview = () => {
    const newTimestamp = Date.now();
    setTimestamp(newTimestamp);
    
    // Force reload the image by clearing and setting previewUrl
    const previewImg = document.getElementById('favicon-preview');
    if (previewImg) {
      previewImg.src = `/api/v1/profile/company/favicon?t=${newTimestamp}&nocache=${Math.random()}`;
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    // Validate file type and size
    const validTypes = ['image/x-icon', 'image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Invalid file type. Please upload an ICO, PNG, JPG, or SVG file.');
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 5MB.');
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.append('favicon', selectedFile);
    
    try {
      console.log(`Uploading favicon: ${selectedFile.name}, size: ${selectedFile.size} bytes, type: ${selectedFile.type}`);
      
      const response = await axios.post('/profile/company/favicon', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.status === 'success') {
        console.log('Server response:', response.data);
        toast.success('Favicon uploaded successfully');
        
        // Force a delay to ensure the server has processed the favicon
        await new Promise(resolve => setTimeout(resolve, 1000)); // Increased to 1 second
        
        // Update favicon in browser tab with cache-busting
        const faviconLink = document.querySelector("link[rel='icon']");
        if (faviconLink) {
          const newTs = Date.now();
          faviconLink.href = `/api/v1/profile/company/favicon?t=${newTs}`;
          console.log(`Updated favicon link: ${faviconLink.href}`);
        }
        
        // Clear the selected file and preview
        setSelectedFile(null);
        setPreviewUrl('');
        
        // Set that we have a favicon
        setHasFavicon(true);
        
        // Force reload the preview
        reloadFaviconPreview();
        
        // Don't reload the page - no longer needed
        // Instead just manually update everything
      } else {
        console.error('Unexpected server response:', response);
        toast.error(response.data?.message || 'Failed to upload favicon. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading favicon:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload favicon. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const response = await axios.delete('/profile/company/favicon');
      
      if (response.data.status === 'success') {
        toast.success('Favicon deleted successfully');
        
        // Update the browser tab favicon to default
        const faviconLink = document.querySelector("link[rel='icon']");
        if (faviconLink) {
          faviconLink.href = `/api/v1/profile/company/favicon?t=${Date.now()}`;
        }
        
        // Set that we no longer have a custom favicon
        setHasFavicon(false);
        
        // Force reload the preview
        reloadFaviconPreview();
      }
    } catch (error) {
      console.error('Error deleting favicon:', error);
      toast.error('Failed to delete favicon. Please try again.');
    } finally {
      setDeleting(false);
      setOpenDeleteDialog(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0' }}>
      <Typography variant="h6" gutterBottom>
        Favicon Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Customize the favicon displayed in browser tabs. Recommended format is ICO, PNG, or SVG (32x32 pixels).
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            border: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mr: 2,
            p: 1,
            backgroundColor: '#f5f5f5'
          }}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <img
              id="favicon-preview"
              src={previewUrl || `/api/v1/profile/company/favicon?t=${timestamp}&nocache=${Math.random()}`}
              alt="Favicon"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              onError={(e) => {
                console.log('Error loading favicon image, falling back to default');
                e.target.onerror = null;
                e.target.src = '/api/v1/profile/company/favicon';
              }}
            />
          )}
        </Box>
        <Box>
          <Typography variant="body2" gutterBottom>
            Current Favicon
          </Typography>
          <IconButton 
            color="error" 
            onClick={handleDeleteClick}
            disabled={deleting}
            size="small"
          >
            {deleting ? <CircularProgress size={24} /> : <DeleteIcon />}
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadIcon />}
          sx={{ mr: 2 }}
          disabled={saving}
        >
          SELECT FILE
          <input
            type="file"
            hidden
            accept=".ico,.png,.jpg,.jpeg,.svg"
            onChange={handleFileChange}
          />
        </Button>
        {selectedFile && (
          <>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {selectedFile.name}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {saving ? 'Uploading...' : 'Upload'}
            </Button>
          </>
        )}
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Delete Favicon
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the current favicon? This will revert to the default favicon.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            autoFocus
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default FaviconUpload;
