import React, { useState, useContext } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Container
} from '@mui/material';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';
import AuthContext from '../context/AuthContext';
import PinManagement from '../components/PinManagement';
import OtpManagement from '../components/OtpManagement';

const Profile = () => {
  const { currentUser, updateProfile, updatePassword } = useContext(AuthContext);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Loading states
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Error states
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // Handle profile form change
  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };
  
  // Handle password form change
  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };
  
  // Validate profile form
  const validateProfileForm = () => {
    const errors = {};
    
    if (!profileForm.name) {
      errors.name = 'Name is required';
    }
    
    if (!profileForm.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileForm.email)) {
      errors.email = 'Email address is invalid';
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Validate password form
  const validatePasswordForm = () => {
    const errors = {};
    
    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    if (!validateProfileForm()) return;
    
    setProfileLoading(true);
    
    try {
      await updateProfile(profileForm);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };
  
  // Handle password update
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;
    
    setPasswordLoading(true);
    
    try {
      await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success('Password updated successfully!');
      
      // Reset password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };
  
  // Get user activity stats
  const [activityStats, setActivityStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  React.useEffect(() => {
    const fetchActivityStats = async () => {
      try {
        const response = await axios.get(`/activities/user/${currentUser._id}`);
        
        // Calculate stats
        const activities = response.data.data.activities;
        
        const stats = {
          totalActivities: activities.length,
          loginCount: activities.filter(a => a.action === 'login').length,
          credentialCount: activities.filter(a => a.action.includes('credential')).length,
          groupCount: activities.filter(a => a.action.includes('group')).length,
          lastActivity: activities.length > 0 ? new Date(activities[0].timestamp).toLocaleString() : 'Never'
        };
        
        setActivityStats(stats);
      } catch (error) {
        console.error('Error fetching activity stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchActivityStats();
  }, [currentUser._id]);
  
  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        Profile Settings
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <PinManagement />
        </Grid>
        
        <Grid item xs={12}>
          <OtpManagement />
        </Grid>
        
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box component="form" onSubmit={handleProfileUpdate}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="name"
                    name="name"
                    label="Full Name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    error={!!profileErrors.name}
                    helperText={profileErrors.name}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="email"
                    name="email"
                    label="Email Address"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    error={!!profileErrors.email}
                    helperText={profileErrors.email}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={profileLoading}
                    sx={{ mt: 1 }}
                  >
                    {profileLoading ? <CircularProgress size={24} /> : 'Update Profile'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box component="form" onSubmit={handlePasswordUpdate}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="currentPassword"
                    name="currentPassword"
                    label="Current Password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    error={!!passwordErrors.currentPassword}
                    helperText={passwordErrors.currentPassword}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="newPassword"
                    name="newPassword"
                    label="New Password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    error={!!passwordErrors.newPassword}
                    helperText={passwordErrors.newPassword}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirm New Password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    error={!!passwordErrors.confirmPassword}
                    helperText={passwordErrors.confirmPassword}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={passwordLoading}
                    sx={{ mt: 1 }}
                  >
                    {passwordLoading ? <CircularProgress size={24} /> : 'Change Password'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Activity Summary
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {statsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={30} />
              </Box>
            ) : activityStats ? (
              <Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Activities
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {activityStats.totalActivities}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Login Count
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {activityStats.loginCount}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Credential Activities
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {activityStats.credentialCount}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Group Activities
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {activityStats.groupCount}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Last Activity
                  </Typography>
                  <Typography variant="body1">
                    {activityStats.lastActivity}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Alert severity="info">
                No activity data available.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile;
