import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  Group as GroupIcon,
  VpnKey as CredentialIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const Dashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Data states
  const [groups, setGroups] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [openCredentialDialog, setOpenCredentialDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  // Form states
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [credentialForm, setCredentialForm] = useState({
    websiteName: '',
    url: '',
    email: '',
    userId: '',
    password: '',
    token: '',
    description: '',
    group: ''
  });
  const [deleteItem, setDeleteItem] = useState({ id: '', type: '' });
  
  // Set tab based on URL parameter
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'groups') {
      setTabValue(0);
    } else if (view === 'credentials') {
      setTabValue(1);
    }
  }, [searchParams]);
  
  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Check if token exists
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          toast.error('Authentication error. Please log in again.');
          return;
        }

        // Set authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('Fetching groups...');
        // Fetch groups
        const groupsResponse = await axios.get('/groups');
        console.log('Groups response:', groupsResponse.data);
        // Handle different response formats
        if (groupsResponse.data.data && groupsResponse.data.data.groups) {
          setGroups(groupsResponse.data.data.groups);
        } else if (Array.isArray(groupsResponse.data.data)) {
          setGroups(groupsResponse.data.data);
        } else {
          setGroups([]);
        }
        
        console.log('Fetching credentials...');
        // Fetch credentials
        const credentialsResponse = await axios.get('/credentials');
        console.log('Credentials response:', credentialsResponse.data);
        
        // Handle different response formats
        if (credentialsResponse.data.data && credentialsResponse.data.data.credentials) {
          setCredentials(credentialsResponse.data.data.credentials);
        } else if (Array.isArray(credentialsResponse.data.data)) {
          setCredentials(credentialsResponse.data.data);
        } else {
          setCredentials([]);
        }
        
        toast.success('Data loaded successfully!');
      } catch (error) {
        console.error('Error fetching data:', error);
        console.error('Error details:', error.response?.data);
        toast.error(error.response?.data?.message || 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSearchParams({ view: newValue === 0 ? 'groups' : 'credentials' });
  };
  
  // Group dialog handlers
  const handleOpenGroupDialog = (group = null) => {
    if (group) {
      setGroupForm({ name: group.name, description: group.description });
    } else {
      setGroupForm({ name: '', description: '' });
    }
    setOpenGroupDialog(true);
  };
  
  const handleCloseGroupDialog = () => {
    setOpenGroupDialog(false);
  };
  
  const handleGroupFormChange = (e) => {
    setGroupForm({ ...groupForm, [e.target.name]: e.target.value });
  };
  
  const handleSubmitGroup = async () => {
    try {
      const response = await axios.post('/groups', groupForm);
      setGroups([...groups, response.data.data.group]);
      toast.success('Group created successfully!');
      handleCloseGroupDialog();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(error.response?.data?.message || 'Failed to create group. Please try again.');
    }
  };
  
  // Credential dialog handlers
  const handleOpenCredentialDialog = (credential = null) => {
    if (credential) {
      // Get all groups associated with this credential
      const groupIds = credential.Groups ? credential.Groups.map(group => group.id) : [];
      
      setCredentialForm({
        websiteName: credential.websiteName,
        url: credential.url || '',
        email: credential.email || '',
        userId: credential.userId || '',
        password: credential.password || '',
        token: credential.token || '',
        description: credential.description || '',
        groupIds: groupIds,
        // Keep groupId for backward compatibility
        groupId: groupIds.length > 0 ? groupIds[0] : ''
      });
    } else {
      setCredentialForm({
        websiteName: '',
        url: '',
        email: '',
        userId: '',
        password: '',
        token: '',
        description: '',
        groupIds: groups.length > 0 ? [groups[0].id] : [],
        groupId: groups.length > 0 ? groups[0].id : ''
      });
    }
    setOpenCredentialDialog(true);
  };
  
  const handleCloseCredentialDialog = () => {
    setOpenCredentialDialog(false);
  };
  
  const handleCredentialFormChange = (e) => {
    setCredentialForm({ ...credentialForm, [e.target.name]: e.target.value });
  };
  
  const handleSubmitCredential = async () => {
    try {
      // Prepare data with groupIds array
      const credentialData = {
        ...credentialForm,
        // Make sure we're sending the groupIds array
        groupIds: credentialForm.groupIds || [credentialForm.groupId]
      };
      
      if (credentialForm.id) {
        // Update existing credential
        await axios.patch(`/credentials/${credentialForm.id}`, credentialData);
        // Refresh credentials to get updated groups
        const response = await axios.get('/credentials');
        setCredentials(response.data.data.credentials);
        toast.success('Credential updated successfully!');
      } else {
        // Create new credential
        const response = await axios.post('/credentials', credentialData);
        setCredentials([...credentials, response.data.data.credential]);
        toast.success('Credential created successfully!');
      }
      handleCloseCredentialDialog();
    } catch (err) {
      toast.error(err.response?.data?.message || 'An error occurred');
    }
  };
  
  // Delete dialog handlers
  const handleOpenDeleteDialog = (id, type) => {
    setDeleteItem({ id, type });
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };
  
  const handleDelete = async () => {
    try {
      if (deleteItem.type === 'group') {
        await axios.delete(`/groups/${deleteItem.id}`);
        setGroups(groups.filter(group => group.id !== deleteItem.id));
        toast.success('Group deleted successfully!');
      } else if (deleteItem.type === 'credential') {
        await axios.delete(`/credentials/${deleteItem.id}`);
        setCredentials(credentials.filter(credential => credential.id !== deleteItem.id));
        toast.success('Credential deleted successfully!');
      }
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(error.response?.data?.message || 'Failed to delete. Please try again.');
    }
  };
  
  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.info('Copied to clipboard!');
  };
  
  // View credential details in popup
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const viewCredential = async (id) => {
    try {
      const response = await axios.get(`/credentials/${id}?decrypted=true`);
      setSelectedCredential(response.data.data.credential);
      setDetailsDialogOpen(true);
      setShowPassword(false);
    } catch (error) {
      console.error('Error fetching credential details:', error);
      toast.error('Failed to load credential details. Please try again.');
    }
  };

  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedCredential(null);
    setShowPassword(false);
  };
  
  // View group details
  const viewGroup = (id) => {
    navigate(`/groups/${id}`);
  };
  
  // Render groups tab
  const renderGroupsTab = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (groups.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No groups found
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenGroupDialog()}
            sx={{ mt: 2 }}
          >
            Create Group
          </Button>
        </Box>
      );
    }
    
    return (
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {groups.map((group) => (
          <Grid item xs={12} sm={6} md={4} key={group.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {group.name}
                  </Typography>
                  <GroupIcon color="primary" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {group.description || 'No description'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Tooltip title="View Group">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => viewGroup(group.id)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Group">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleOpenGroupDialog(group)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Group">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleOpenDeleteDialog(group.id, 'group')}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };
  
  // Render credentials tab
  const renderCredentialsTab = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (credentials.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No credentials found
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenCredentialDialog()}
            sx={{ mt: 2 }}
            disabled={groups.length === 0}
          >
            Add Credential
          </Button>
          {groups.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              You need to create a group first
            </Typography>
          )}
        </Box>
      );
    }
    
    return (
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {credentials.map((credential) => (
          <Grid item xs={12} sm={6} md={4} key={credential.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {credential.websiteName}
                  </Typography>
                  <CredentialIcon color="primary" />
                </Box>
                
                {credential.url && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    URL: {credential.url}
                  </Typography>
                )}
                
                {credential.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      Email: {credential.email}
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
                )}
                
                {credential.userId && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      User ID: {credential.userId}
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
                )}
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
                  {credential.Groups && credential.Groups.length > 0 ? (
                    credential.Groups.map(group => (
                      <Chip 
                        key={group.id}
                        label={group.name} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        icon={<GroupIcon />}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))
                  ) : (
                    <Chip 
                      label="No Group" 
                      size="small" 
                      color="default" 
                      variant="outlined"
                      icon={<GroupIcon />}
                      sx={{ mr: 1 }}
                    />
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Tooltip title="View Details">
                    <IconButton onClick={() => viewCredential(credential.id)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Credential">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleOpenCredentialDialog(credential)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Credential">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleOpenDeleteDialog(credential.id, 'credential')}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Box>
          {tabValue === 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenGroupDialog()}
            >
              New Group
            </Button>
          )}
          {tabValue === 1 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenCredentialDialog()}
              disabled={groups.length === 0}
            >
              New Credential
            </Button>
          )}
        </Box>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab 
            icon={<GroupIcon />} 
            iconPosition="start" 
            label="Groups" 
            id="tab-0" 
            aria-controls="tabpanel-0" 
          />
          <Tab 
            icon={<CredentialIcon />} 
            iconPosition="start" 
            label="Credentials" 
            id="tab-1" 
            aria-controls="tabpanel-1" 
          />
        </Tabs>
      </Box>
      
      <Box role="tabpanel" hidden={tabValue !== 0} id="tabpanel-0" aria-labelledby="tab-0" sx={{ py: 3 }}>
        {tabValue === 0 && renderGroupsTab()}
      </Box>
      
      <Box role="tabpanel" hidden={tabValue !== 1} id="tabpanel-1" aria-labelledby="tab-1" sx={{ py: 3 }}>
        {tabValue === 1 && renderCredentialsTab()}
      </Box>
      
      {/* Group Dialog */}
      <Dialog open={openGroupDialog} onClose={handleCloseGroupDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {groupForm.id ? 'Edit Group' : 'Create New Group'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="Group Name"
            type="text"
            fullWidth
            variant="outlined"
            value={groupForm.name}
            onChange={handleGroupFormChange}
            required
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            id="description"
            name="description"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            value={groupForm.description}
            onChange={handleGroupFormChange}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroupDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitGroup} 
            variant="contained"
            disabled={!groupForm.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Credential Dialog */}
      <Dialog open={openCredentialDialog} onClose={handleCloseCredentialDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {credentialForm.id ? 'Edit Credential' : 'Create New Credential'}
        </DialogTitle>
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
            value={credentialForm.websiteName}
            onChange={handleCredentialFormChange}
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
            value={credentialForm.url}
            onChange={handleCredentialFormChange}
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
            value={credentialForm.email}
            onChange={handleCredentialFormChange}
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
            value={credentialForm.userId}
            onChange={handleCredentialFormChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="password"
            name="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={credentialForm.password}
            onChange={handleCredentialFormChange}
            required
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
            value={credentialForm.token}
            onChange={handleCredentialFormChange}
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
            value={credentialForm.description}
            onChange={handleCredentialFormChange}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="group-label">Groups</InputLabel>
            <Select
              labelId="group-label"
              id="groupIds"
              name="groupIds"
              multiple
              value={credentialForm.groupIds || []}
              onChange={handleCredentialFormChange}
              required
              disabled={groups.length === 0}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((groupId) => {
                    const group = groups.find(g => g.id === groupId);
                    return group ? (
                      <Chip key={groupId} label={group.name} size="small" />
                    ) : null;
                  })}
                </Box>
              )}
            >
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCredentialDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitCredential} 
            variant="contained"
            disabled={!credentialForm.websiteName || !credentialForm.password || !credentialForm.groupIds || credentialForm.groupIds.length === 0}
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
            Are you sure you want to delete this {deleteItem.type}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credential Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={handleCloseDetailsDialog} maxWidth="sm" fullWidth>
        {selectedCredential && (
          <>
            <DialogTitle>
              {selectedCredential.websiteName} Details
              <IconButton
                aria-label="close"
                onClick={handleCloseDetailsDialog}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Website</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body1" sx={{ flexGrow: 1 }}>
                    {selectedCredential.websiteName}
                  </Typography>
                  <Tooltip title="Copy Website Name">
                    <IconButton onClick={() => copyToClipboard(selectedCredential.websiteName)}>
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {selectedCredential.url && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>URL</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ flexGrow: 1 }}>
                      {selectedCredential.url}
                    </Typography>
                    <Tooltip title="Copy URL">
                      <IconButton onClick={() => copyToClipboard(selectedCredential.url)}>
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open URL">
                      <IconButton onClick={() => window.open(selectedCredential.url, '_blank')}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )}

              {selectedCredential.email && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>Email</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ flexGrow: 1 }}>
                      {selectedCredential.email}
                    </Typography>
                    <Tooltip title="Copy Email">
                      <IconButton onClick={() => copyToClipboard(selectedCredential.email)}>
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )}

              {selectedCredential.userId && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>User ID</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ flexGrow: 1 }}>
                      {selectedCredential.userId}
                    </Typography>
                    <Tooltip title="Copy User ID">
                      <IconButton onClick={() => copyToClipboard(selectedCredential.userId)}>
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )}

              {selectedCredential.password && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>Password</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ flexGrow: 1 }}>
                      {showPassword ? selectedCredential.password : '••••••••••••••••'}
                    </Typography>
                    <Tooltip title={showPassword ? "Hide Password" : "Show Password"}>
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Copy Password">
                      <IconButton onClick={() => copyToClipboard(selectedCredential.password)}>
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )}

              {selectedCredential.token && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>Token</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ flexGrow: 1 }}>
                      {showPassword ? selectedCredential.token : '••••••••••••••••'}
                    </Typography>
                    <Tooltip title={showPassword ? "Hide Token" : "Show Token"}>
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Copy Token">
                      <IconButton onClick={() => copyToClipboard(selectedCredential.token)}>
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )}

              {selectedCredential.notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>Notes</Typography>
                  <Typography variant="body1">{selectedCredential.notes}</Typography>
                </Box>
              )}

              {selectedCredential.Groups && selectedCredential.Groups.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>Groups</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedCredential.Groups.map(group => (
                      <Chip key={group.id} label={group.name} color="primary" size="small" />
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Last Modified</Typography>
                <Typography variant="body2">
                  {new Date(selectedCredential.lastModified).toLocaleString()}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetailsDialog}>Close</Button>
              <Button 
                color="primary" 
                startIcon={<EditIcon />} 
                onClick={() => {
                  handleCloseDetailsDialog();
                  handleOpenCredentialDialog(selectedCredential);
                }}
              >
                Edit
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Dashboard;
