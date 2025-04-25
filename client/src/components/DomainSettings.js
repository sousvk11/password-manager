import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Paper,
  Grid,
  Divider,
  Alert,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';

const DomainSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [allowedDomains, setAllowedDomains] = useState({
    enabled: false,
    domains: [],
    allowGuests: false
  });
  
  const [guestUsers, setGuestUsers] = useState({
    emails: []
  });
  
  const [newDomain, setNewDomain] = useState('');
  const [newGuestEmail, setNewGuestEmail] = useState('');
  
  const [openAddGuestDialog, setOpenAddGuestDialog] = useState(false);
  
  // Fetch domain settings
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/settings/domain/settings');
        
        if (response.data.data) {
          const { allowedDomains: domains, guestUsers: guests } = response.data.data;
          if (domains) setAllowedDomains(domains);
          if (guests) setGuestUsers(guests);
        }
      } catch (error) {
        console.error('Error fetching domain settings:', error);
        toast.error('Failed to load domain settings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Handle domain restriction toggle
  const handleDomainRestrictionToggle = () => {
    setAllowedDomains({
      ...allowedDomains,
      enabled: !allowedDomains.enabled
    });
  };
  
  // Handle guest users toggle
  const handleGuestUsersToggle = () => {
    setAllowedDomains({
      ...allowedDomains,
      allowGuests: !allowedDomains.allowGuests
    });
  };
  
  // Add domain
  const handleAddDomain = () => {
    if (!newDomain) return;
    
    // Basic domain validation
    if (!newDomain.includes('.')) {
      toast.error('Please enter a valid domain');
      return;
    }
    
    // Check if domain already exists
    if (allowedDomains.domains.includes(newDomain)) {
      toast.error('Domain already exists');
      return;
    }
    
    setAllowedDomains({
      ...allowedDomains,
      domains: [...allowedDomains.domains, newDomain]
    });
    
    setNewDomain('');
  };
  
  // Remove domain
  const handleRemoveDomain = (domain) => {
    setAllowedDomains({
      ...allowedDomains,
      domains: allowedDomains.domains.filter(d => d !== domain)
    });
  };
  
  // Add guest user
  const handleAddGuestUser = () => {
    if (!newGuestEmail) return;
    
    // Basic email validation
    if (!newGuestEmail.includes('@') || !newGuestEmail.includes('.')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    // Check if email already exists
    if (guestUsers.emails.includes(newGuestEmail)) {
      toast.error('Email already exists');
      return;
    }
    
    setGuestUsers({
      ...guestUsers,
      emails: [...guestUsers.emails, newGuestEmail]
    });
    
    setNewGuestEmail('');
    setOpenAddGuestDialog(false);
  };
  
  // Remove guest user
  const handleRemoveGuestUser = (email) => {
    setGuestUsers({
      ...guestUsers,
      emails: guestUsers.emails.filter(e => e !== email)
    });
  };
  
  // Save settings
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put('/settings/domain/settings', {
        allowedDomains,
        guestUsers
      });
      
      toast.success('Domain settings saved successfully');
      
      // Refresh the settings
      const response = await axios.get('/settings/domain/settings');
      if (response.data.data) {
        const { allowedDomains: domains, guestUsers: guests } = response.data.data;
        if (domains) setAllowedDomains(domains);
        if (guests) setGuestUsers(guests);
      }
    } catch (error) {
      console.error('Error saving domain settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save domain settings');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Domain Restriction Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Control which email domains are allowed to register and access the system.
      </Typography>
      
      <FormControlLabel
        control={
          <Switch
            checked={allowedDomains.enabled}
            onChange={handleDomainRestrictionToggle}
            color="primary"
          />
        }
        label="Enable Domain Restriction"
      />
      
      {allowedDomains.enabled && (
        <>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Allowed Domains
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Only users with email addresses from these domains will be allowed to register.
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Domain"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  fullWidth
                  placeholder="example.com"
                  helperText="Enter domain without @ symbol"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddDomain}
                  fullWidth
                >
                  Add Domain
                </Button>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {allowedDomains.domains.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No domains added yet. Add domains to restrict registration.
                </Typography>
              ) : (
                allowedDomains.domains.map((domain) => (
                  <Chip
                    key={domain}
                    label={domain}
                    onDelete={() => handleRemoveDomain(domain)}
                    color="primary"
                    variant="outlined"
                  />
                ))
              )}
            </Box>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              If no domains are added, no users will be able to register when domain restriction is enabled.
            </Alert>
          </Box>
          
          <Divider sx={{ my: 4 }} />
          
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={allowedDomains.allowGuests}
                  onChange={handleGuestUsersToggle}
                  color="primary"
                />
              }
              label="Allow Guest Users"
            />
            
            {allowedDomains.allowGuests && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Guest Users
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  These specific email addresses will be allowed to register regardless of domain restrictions.
                </Typography>
                
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenAddGuestDialog(true)}
                  sx={{ mb: 2 }}
                >
                  Add Guest User
                </Button>
                
                <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                  {guestUsers.emails.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="No guest users added yet" />
                    </ListItem>
                  ) : (
                    guestUsers.emails.map((email) => (
                      <ListItem
                        key={email}
                        secondaryAction={
                          <IconButton edge="end" onClick={() => handleRemoveGuestUser(email)}>
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText primary={email} />
                      </ListItem>
                    ))
                  )}
                </List>
              </Box>
            )}
          </Box>
        </>
      )}
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
      
      {/* Add Guest User Dialog */}
      <Dialog open={openAddGuestDialog} onClose={() => setOpenAddGuestDialog(false)}>
        <DialogTitle>Add Guest User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={newGuestEmail}
            onChange={(e) => setNewGuestEmail(e.target.value)}
            placeholder="guest@example.com"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddGuestDialog(false)}>Cancel</Button>
          <Button onClick={handleAddGuestUser} color="primary">Add</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default DomainSettings;
