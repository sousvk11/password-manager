import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Grid,
  Paper,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Group as GroupIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const CredentialDetail = () => {
  const { credentialId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  
  // State
  const [credential, setCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [decryptedPassword, setDecryptedPassword] = useState('');
  const [decryptedToken, setDecryptedToken] = useState('');
  
  // Dialog states
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  
  // Form states
  const [editForm, setEditForm] = useState({
    websiteName: '',
    url: '',
    email: '',
    userId: '',
    password: '',
    token: '',
    description: '',
    group: ''
  });
  
  const [shareForm, setShareForm] = useState({
    email: '',
    permission: 'view'
  });
  
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Fetch credential data
  useEffect(() => {
    const fetchCredential = async () => {
      setLoading(true);
      try {
        // Fetch credential details
        const response = await axios.get(`/credentials/${credentialId}`);
        setCredential(response.data.data.credential);
        
        // Initialize edit form
        setEditForm({
          websiteName: response.data.data.credential.websiteName,
          url: response.data.data.credential.url || '',
          email: response.data.data.credential.email || '',
          userId: response.data.data.credential.userId || '',
          password: '********', // Placeholder for password
          token: response.data.data.credential.token ? '********' : '',
          description: response.data.data.credential.description || '',
          group: response.data.data.credential.group._id
        });
        
        // Fetch groups for edit form
        const groupsResponse = await axios.get('/groups');
        setGroups(groupsResponse.data.data.groups);
        
        // Fetch users for share dialog
        const usersResponse = await axios.get('/users');
        setUsers(usersResponse.data.data.users);
      } catch (error) {
        console.error('Error fetching credential:', error);
        toast.error('Failed to load credential details. Please try again.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCredential();
  }, [credentialId, navigate]);
  
  // Fetch decrypted password
  const fetchDecryptedPassword = async () => {
    try {
      const response = await axios.get(`/credentials/${credentialId}?decrypted=true`);
      setDecryptedPassword(response.data.data.credential.password);
      if (response.data.data.credential.token) {
        setDecryptedToken(response.data.data.credential.token);
      }
    } catch (error) {
      console.error('Error fetching decrypted password:', error);
      toast.error('Failed to decrypt password. Please try again.');
    }
  };
  
  // Dialog handlers
  const handleOpenEditDialog = () => {
    setOpenEditDialog(true);
  };
  
  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
  };
  
  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };
  
  const handleOpenShareDialog = () => {
    setOpenShareDialog(true);
  };
  
  const handleCloseShareDialog = () => {
    setOpenShareDialog(false);
    setShareForm({ email: '', permission: 'view' });
  };
  
  // Form handlers
  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  
  const handleShareFormChange = (e) => {
    setShareForm({ ...shareForm, [e.target.name]: e.target.value });
  };
  
  // Submit handlers
  const handleSubmitEdit = async () => {
    try {
      // Don't send password if it's still the placeholder
      const formData = { ...editForm };
      if (formData.password === '********') {
        delete formData.password;
      }
      if (formData.token === '********') {
        delete formData.token;
      }
      
      const response = await axios.patch(`/credentials/${credentialId}`, formData);
      setCredential(response.data.data.credential);
      toast.success('Credential updated successfully!');
      handleCloseEditDialog();
    } catch (error) {
      console.error('Error updating credential:', error);
      toast.error(error.response?.data?.message || 'Failed to update credential. Please try again.');
    }
  };
  
  const handleDelete = async () => {
    try {
      await axios.delete(`/credentials/${credentialId}`);
      toast.success('Credential deleted successfully!');
      navigate('/dashboard?view=credentials');
    } catch (error) {
      console.error('Error deleting credential:', error);
      toast.error(error.response?.data?.message || 'Failed to delete credential. Please try again.');
    }
  };
  
  const handleShareCredential = async () => {
    try {
      // Find user by email
      const user = users.find(u => u.email === shareForm.email);
      
      if (!user) {
        toast.error('User not found with this email.');
        return;
      }
      
      await axios.post(`/credentials/${credentialId}/share`, {
        userId: user._id,
        permission: shareForm.permission
      });
      
      toast.success(`Credential shared with ${shareForm.email} successfully!`);
      handleCloseShareDialog();
      
      // Refresh credential data
      const response = await axios.get(`/credentials/${credentialId}`);
      setCredential(response.data.data.credential);
    } catch (error) {
      console.error('Error sharing credential:', error);
      toast.error(error.response?.data?.message || 'Failed to share credential. Please try again.');
    }
  };
  
  const handleRevokeAccess = async (userId) => {
    try {
      await axios.delete(`/credentials/${credentialId}/share/${userId}`);
      toast.success('Access revoked successfully!');
      
      // Refresh credential data
      const response = await axios.get(`/credentials/${credentialId}`);
      setCredential(response.data.data.credential);
    } catch (error) {
      console.error('Error revoking access:', error);
      toast.error(error.response?.data?.message || 'Failed to revoke access. Please try again.');
    }
  };
  
  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.info('Copied to clipboard!');
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = async () => {
    if (!showPassword && !decryptedPassword) {
      await fetchDecryptedPassword();
    }
    setShowPassword(!showPassword);
  };
  
  // Toggle token visibility
  const toggleTokenVisibility = async () => {
    if (!showToken && !decryptedToken && credential.token) {
      await fetchDecryptedPassword();
    }
    setShowToken(!showToken);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!credential) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Credential not found
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/dashboard?view=credentials')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Credential Details
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h2">
                  {credential.websiteName}
                </Typography>
                <Box>
                  <Tooltip title="Edit Credential">
                    <IconButton onClick={handleOpenEditDialog} color="primary">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Share Credential">
                    <IconButton onClick={handleOpenShareDialog} color="primary">
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Credential">
                    <IconButton onClick={handleOpenDeleteDialog} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Group
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Chip 
                      icon={<GroupIcon />} 
                      label={credential.group.name} 
                      color="primary" 
                      variant="outlined" 
                    />
                  </Box>
                </Grid>
                
                {credential.url && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      URL
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Typography variant="body1" sx={{ mr: 1 }}>
                        {credential.url}
                      </Typography>
                      <Tooltip title="Copy URL">
                        <IconButton 
                          size="small" 
                          onClick={() => copyToClipboard(credential.url)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                )}
                
                {credential.email && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Email
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Typography variant="body1" sx={{ mr: 1 }}>
                        {credential.email}
                      </Typography>
                      <Tooltip title="Copy Email">
                        <IconButton 
                          size="small" 
                          onClick={() => copyToClipboard(credential.email)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                )}
                
                {credential.userId && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      User ID
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Typography variant="body1" sx={{ mr: 1 }}>
                        {credential.userId}
                      </Typography>
                      <Tooltip title="Copy User ID">
                        <IconButton 
                          size="small" 
                          onClick={() => copyToClipboard(credential.userId)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                )}
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Password
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Typography variant="body1" sx={{ mr: 1 }}>
                      {showPassword ? decryptedPassword : '••••••••••••'}
                    </Typography>
                    <Tooltip title={showPassword ? "Hide Password" : "Show Password"}>
                      <IconButton 
                        size="small" 
                        onClick={togglePasswordVisibility}
                        color={showPassword ? "secondary" : "default"}
                      >
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    {showPassword && (
                      <Tooltip title="Copy Password">
                        <IconButton 
                          size="small" 
                          onClick={() => copyToClipboard(decryptedPassword)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Grid>
                
                {credential.token && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Token
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Typography variant="body1" sx={{ mr: 1 }}>
                        {showToken ? decryptedToken : '••••••••••••'}
                      </Typography>
                      <Tooltip title={showToken ? "Hide Token" : "Show Token"}>
                        <IconButton 
                          size="small" 
                          onClick={toggleTokenVisibility}
                          color={showToken ? "secondary" : "default"}
                        >
                          {showToken ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      {showToken && (
                        <Tooltip title="Copy Token">
                          <IconButton 
                            size="small" 
                            onClick={() => copyToClipboard(decryptedToken)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Grid>
                )}
                
                {credential.description && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {credential.description}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Shared With
            </Typography>
            
            {credential.sharedWith && credential.sharedWith.length > 0 ? (
              credential.sharedWith.map((share) => (
                <Box 
                  key={share.user._id} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 1,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'background.default'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body1">
                        {share.user.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {share.user.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Chip 
                      label={share.permission} 
                      size="small" 
                      color={share.permission === 'edit' ? 'primary' : 'default'} 
                      sx={{ mr: 1 }}
                    />
                    <Tooltip title="Revoke Access">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRevokeAccess(share.user._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                This credential is not shared with anyone.
              </Typography>
            )}
            
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={handleOpenShareDialog}
              sx={{ mt: 2 }}
              fullWidth
            >
              Share Credential
            </Button>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Credential Info
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body2">
                {new Date(credential.createdAt).toLocaleString()}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Last Modified
              </Typography>
              <Typography variant="body2">
                {new Date(credential.lastModified).toLocaleString()}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Owner
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <PersonIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                <Typography variant="body2">
                  {credential.owner === currentUser._id ? 'You' : 'Another User'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Credential</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="websiteName"
            name="websiteName"
            label="Website Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editForm.websiteName}
            onChange={handleEditFormChange}
            required
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            id="url"
            name="url"
            label="URL"
            type="text"
            fullWidth
            variant="outlined"
            value={editForm.url}
            onChange={handleEditFormChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="email"
            name="email"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={editForm.email}
            onChange={handleEditFormChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="userId"
            name="userId"
            label="User ID"
            type="text"
            fullWidth
            variant="outlined"
            value={editForm.userId}
            onChange={handleEditFormChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="password"
            name="password"
            label="Password (leave unchanged or enter new)"
            type="password"
            fullWidth
            variant="outlined"
            value={editForm.password}
            onChange={handleEditFormChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="token"
            name="token"
            label="Token (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={editForm.token}
            onChange={handleEditFormChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="description"
            name="description"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            value={editForm.description}
            onChange={handleEditFormChange}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth required>
            <InputLabel id="group-label">Group</InputLabel>
            <Select
              labelId="group-label"
              id="group"
              name="group"
              value={editForm.group}
              label="Group"
              onChange={handleEditFormChange}
            >
              {groups.map((group) => (
                <MenuItem key={group._id} value={group._id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitEdit} 
            variant="contained"
            disabled={!editForm.websiteName || !editForm.group}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this credential? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Share Dialog */}
      <Dialog open={openShareDialog} onClose={handleCloseShareDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Share Credential</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Share this credential with another user by entering their email address.
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            id="email"
            name="email"
            label="User Email"
            type="email"
            fullWidth
            variant="outlined"
            value={shareForm.email}
            onChange={handleShareFormChange}
            required
            sx={{ mb: 2, mt: 1 }}
          />
          
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel id="permission-label">Permission</InputLabel>
            <Select
              labelId="permission-label"
              id="permission"
              name="permission"
              value={shareForm.permission}
              label="Permission"
              onChange={handleShareFormChange}
            >
              <MenuItem value="view">View Only</MenuItem>
              <MenuItem value="edit">Edit</MenuItem>
            </Select>
          </FormControl>
          
          {credential.sharedWith && credential.sharedWith.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Currently shared with:
              </Typography>
              {credential.sharedWith.map((share) => (
                <Chip
                  key={share.user._id}
                  icon={<PersonIcon />}
                  label={`${share.user.email} (${share.permission})`}
                  variant="outlined"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareDialog}>Cancel</Button>
          <Button 
            onClick={handleShareCredential} 
            variant="contained"
            disabled={!shareForm.email}
          >
            Share
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CredentialDetail;
