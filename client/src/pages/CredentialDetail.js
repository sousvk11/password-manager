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
  Group as GroupIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';
import AuthContext from '../context/AuthContext';
import PinVerificationDialog from '../components/PinVerificationDialog';

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
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    websiteName: '',
    url: '',
    username: '',
    email: '',
    password: '',
    token: '',
    description: '',
    groupId: ''
  });
  const [groups, setGroups] = useState([]);
  
  // PIN verification state
  const [pinVerificationOpen, setPinVerificationOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  
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
          username: response.data.data.credential.username || '',
          email: response.data.data.credential.email || '',
          password: '********', // Placeholder for password
          token: response.data.data.credential.token ? '********' : '',
          description: response.data.data.credential.description || '',
          groupId: response.data.data.credential.group._id
        });
        
        // Fetch groups for edit form
        const groupsResponse = await axios.get('/groups');
        setGroups(groupsResponse.data.data.groups);
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
      return true;
    } catch (error) {
      console.error('Error fetching decrypted password:', error);
      
      // Check if PIN verification is required
      if (error.response?.status === 403 && error.response?.data?.data?.requirePin) {
        setPinVerificationOpen(true);
        setPendingAction('fetchPassword');
        return false;
      }
      
      toast.error('Failed to decrypt password. Please try again.');
      return false;
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
  
  // Form handlers
  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
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
  
  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.info('Copied to clipboard!');
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = async () => {
    if (!showPassword && !decryptedPassword) {
      const success = await fetchDecryptedPassword();
      if (!success) return; // Don't toggle if fetch failed or PIN verification is needed
    }
    setShowPassword(!showPassword);
  };
  
  // Toggle token visibility
  const toggleTokenVisibility = async () => {
    if (!showToken && !decryptedToken && credential.token) {
      const success = await fetchDecryptedPassword();
      if (!success) return; // Don't toggle if fetch failed or PIN verification is needed
    }
    setShowToken(!showToken);
  };
  
  // Handle PIN verification success
  const handlePinVerificationSuccess = async () => {
    setPinVerificationOpen(false);
    
    if (pendingAction === 'fetchPassword') {
      const success = await fetchDecryptedPassword();
      if (success) {
        setShowPassword(true);
      }
    }
    
    setPendingAction(null);
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
                
                {credential.username && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Username
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Typography variant="body1" sx={{ mr: 1 }}>
                        {credential.username}
                      </Typography>
                      <Tooltip title="Copy Username">
                        <IconButton 
                          size="small" 
                          onClick={() => copyToClipboard(credential.username)}
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
                    <Typography variant="body1">
                      ••••••••••••
                    </Typography>
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
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Group Information
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Group
              </Typography>
              <Typography variant="body2">
                {credential.group ? credential.group.name : 'Not assigned to any group'}
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Access to this credential is managed through group membership.
              Users who are members of this credential's group can access it
              based on their role in the group.
            </Typography>
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
            id="username"
            name="username"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={editForm.username}
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
              name="groupId"
              value={editForm.groupId}
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
            disabled={!editForm.websiteName || !editForm.groupId}
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
      
      {/* PIN Verification Dialog */}
      <PinVerificationDialog
        open={pinVerificationOpen}
        onClose={() => {
          setPinVerificationOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handlePinVerificationSuccess}
        credentialId={credentialId}
      />
    </Box>
  );
};

export default CredentialDetail;
