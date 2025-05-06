import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';

const AppTitleSettings = () => {
  const [appTitle, setAppTitle] = useState('Password Manager');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAppTitle();
  }, []);

  const fetchAppTitle = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/profile/company/app-title');
      if (response.data.status === 'success') {
        setAppTitle(response.data.data.appTitle || 'Password Manager');
      }
    } catch (error) {
      console.error('Error fetching app title:', error);
      setError('Failed to load application title. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAppTitle = async () => {
    if (!appTitle.trim()) {
      toast.error('Application title cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await axios.patch('/profile/company/app-title', {
        appTitle: appTitle.trim()
      });
      
      if (response.data.status === 'success') {
        toast.success('Application title updated successfully');
        // Force a page refresh to update the header
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating app title:', error);
      setError('Failed to update application title. Please try again.');
      toast.error('Failed to update application title');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Application Title Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Customize the application title displayed in the header
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
        <TextField
          label="Application Title"
          variant="outlined"
          fullWidth
          value={appTitle}
          onChange={(e) => setAppTitle(e.target.value)}
          disabled={loading || saving}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          onClick={handleSaveAppTitle}
          disabled={loading || saving}
          sx={{ mb: 2, height: 56 }}
        >
          {saving ? <CircularProgress size={24} /> : 'Save'}
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        This will change the application title displayed in the header for all users
      </Typography>
    </Paper>
  );
};

export default AppTitleSettings;
