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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  VpnKey as CredentialIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  
  // State
  const [group, setGroup] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [openEditMemberDialog, setOpenEditMemberDialog] = useState(false);
  const [openRemoveMemberDialog, setOpenRemoveMemberDialog] = useState(false);
  
  // Form states
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  });
  
  const [memberForm, setMemberForm] = useState({
    email: '',
    role: 'viewer'
  });
  
  const [selectedMember, setSelectedMember] = useState(null);
  
  const [users, setUsers] = useState([]);
  
  // Fetch group data
  useEffect(() => {
    const fetchGroup = async () => {
      setLoading(true);
      try {
        // Fetch group details with members
        const response = await axios.get(`/groups/${groupId}?includeCredentials=true`);
        setGroup(response.data.data.group);
        
        // Set credentials if available
        if (response.data.data.group.credentials) {
          setCredentials(response.data.data.group.credentials);
        }
        
        // Initialize edit form
        setEditForm({
          name: response.data.data.group.name,
          description: response.data.data.group.description || ''
        });
        
        // Fetch users for member dialog
        const usersResponse = await axios.get('/users');
        setUsers(usersResponse.data.data.users);
      } catch (error) {
        console.error('Error fetching group:', error);
        toast.error('Failed to load group details. Please try again.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroup();
  }, [groupId, navigate]);
  
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
  
  const handleOpenAddMemberDialog = () => {
    setMemberForm({ email: '', role: 'viewer' });
    setOpenAddMemberDialog(true);
  };
  
  const handleCloseAddMemberDialog = () => {
    setOpenAddMemberDialog(false);
  };
  
  const handleOpenEditMemberDialog = (member) => {
    setSelectedMember(member);
    setMemberForm({
      email: member.user.email,
      role: member.role
    });
    setOpenEditMemberDialog(true);
  };
  
  const handleCloseEditMemberDialog = () => {
    setOpenEditMemberDialog(false);
    setSelectedMember(null);
  };
  
  const handleOpenRemoveMemberDialog = (member) => {
    setSelectedMember(member);
    setOpenRemoveMemberDialog(true);
  };
  
  const handleCloseRemoveMemberDialog = () => {
    setOpenRemoveMemberDialog(false);
    setSelectedMember(null);
  };
  
  // Form handlers
  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  
  const handleMemberFormChange = (e) => {
    setMemberForm({ ...memberForm, [e.target.name]: e.target.value });
  };
  
  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Submit handlers
  const handleSubmitEdit = async () => {
    try {
      const response = await axios.patch(`/groups/${groupId}`, editForm);
      setGroup(response.data.data.group);
      toast.success('Group updated successfully!');
      handleCloseEditDialog();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(error.response?.data?.message || 'Failed to update group. Please try again.');
    }
  };
  
  const handleDelete = async () => {
    try {
      await axios.delete(`/groups/${groupId}`);
      toast.success('Group deleted successfully!');
      navigate('/dashboard?view=groups');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(error.response?.data?.message || 'Failed to delete group. Please try again.');
    }
  };
  
  const handleAddMember = async () => {
    try {
      // Find user by email
      const user = users.find(u => u.email === memberForm.email);
      
      if (!user) {
        toast.error('User not found with this email.');
        return;
      }
      
      await axios.post(`/groups/${groupId}/members`, {
        userId: user._id,
        role: memberForm.role
      });
      
      toast.success(`User ${memberForm.email} added to group successfully!`);
      handleCloseAddMemberDialog();
      
      // Refresh group data
      const response = await axios.get(`/groups/${groupId}?includeCredentials=true`);
      setGroup(response.data.data.group);
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error(error.response?.data?.message || 'Failed to add member. Please try again.');
    }
  };
  
  const handleUpdateMember = async () => {
    try {
      if (!selectedMember) return;
      
      await axios.post(`/groups/${groupId}/members`, {
        userId: selectedMember.user._id,
        role: memberForm.role
      });
      
      toast.success(`Member role updated successfully!`);
      handleCloseEditMemberDialog();
      
      // Refresh group data
      const response = await axios.get(`/groups/${groupId}?includeCredentials=true`);
      setGroup(response.data.data.group);
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error(error.response?.data?.message || 'Failed to update member. Please try again.');
    }
  };
  
  const handleRemoveMember = async () => {
    try {
      if (!selectedMember) return;
      
      await axios.delete(`/groups/${groupId}/members/${selectedMember.user._id}`);
      
      toast.success(`Member removed from group successfully!`);
      handleCloseRemoveMemberDialog();
      
      // Refresh group data
      const response = await axios.get(`/groups/${groupId}?includeCredentials=true`);
      setGroup(response.data.data.group);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error.response?.data?.message || 'Failed to remove member. Please try again.');
    }
  };
  
  // Navigate to credential detail
  const viewCredential = (id) => {
    navigate(`/credentials/${id}`);
  };
  
  // Create new credential in this group
  const createCredential = () => {
    navigate(`/dashboard?view=credentials&newCredential=true&groupId=${groupId}`);
  };
  
  // Check if current user is owner or admin
  const isOwnerOrAdmin = () => {
    if (!group || !currentUser) return false;
    
    if (group.owner._id === currentUser._id) return true;
    
    const userMember = group.members.find(member => 
      member.user._id === currentUser._id
    );
    
    return userMember && userMember.role === 'admin';
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!group) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Group not found
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
        <IconButton onClick={() => navigate('/dashboard?view=groups')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Group Details
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h2">
                  {group.name}
                </Typography>
                <Box>
                  <Tooltip title="Edit Group">
                    <IconButton onClick={handleOpenEditDialog} color="primary">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Group">
                    <IconButton onClick={handleOpenDeleteDialog} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {group.description && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {group.description}
                </Typography>
              )}
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mr: 1 }}>
                  Owner:
                </Typography>
                <Chip 
                  icon={<PersonIcon />} 
                  label={group.owner.name} 
                  variant="outlined" 
                  color="primary"
                />
              </Box>
            </CardContent>
          </Card>
          
          <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="group tabs">
                <Tab 
                  icon={<PersonIcon />} 
                  iconPosition="start" 
                  label="Members" 
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
              {tabValue === 0 && (
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Group Members
                      </Typography>
                      {isOwnerOrAdmin() && (
                        <Button
                          variant="outlined"
                          startIcon={<PersonAddIcon />}
                          onClick={handleOpenAddMemberDialog}
                        >
                          Add Member
                        </Button>
                      )}
                    </Box>
                    
                    <List>
                      {/* Owner */}
                      <ListItem sx={{ bgcolor: 'background.default', borderRadius: 1, mb: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={`${group.owner.name} (Owner)`}
                          secondary={group.owner.email}
                        />
                      </ListItem>
                      
                      {/* Members */}
                      {group.members.length > 0 ? (
                        group.members.map((member) => (
                          <ListItem key={member.user._id} sx={{ bgcolor: 'background.default', borderRadius: 1, mb: 1 }}>
                            <ListItemAvatar>
                              <Avatar>
                                {member.user.name.charAt(0).toUpperCase()}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText 
                              primary={member.user.name}
                              secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                                    {member.user.email}
                                  </Typography>
                                  <Chip 
                                    label={member.role} 
                                    size="small" 
                                    color={
                                      member.role === 'admin' 
                                        ? 'secondary' 
                                        : member.role === 'editor' 
                                          ? 'primary' 
                                          : 'default'
                                    }
                                    variant="outlined"
                                  />
                                </Box>
                              }
                            />
                            {isOwnerOrAdmin() && (
                              <ListItemSecondaryAction>
                                <Tooltip title="Edit Role">
                                  <IconButton 
                                    edge="end" 
                                    aria-label="edit" 
                                    onClick={() => handleOpenEditMemberDialog(member)}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remove Member">
                                  <IconButton 
                                    edge="end" 
                                    aria-label="delete" 
                                    onClick={() => handleOpenRemoveMemberDialog(member)}
                                    color="error"
                                    sx={{ ml: 1 }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </ListItemSecondaryAction>
                            )}
                          </ListItem>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                          No additional members in this group.
                        </Typography>
                      )}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Box>
            
            <Box role="tabpanel" hidden={tabValue !== 1} id="tabpanel-1" aria-labelledby="tab-1" sx={{ py: 3 }}>
              {tabValue === 1 && (
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Group Credentials
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={createCredential}
                      >
                        Add Credential
                      </Button>
                    </Box>
                    
                    {credentials.length > 0 ? (
                      <Grid container spacing={2}>
                        {credentials.map((credential) => (
                          <Grid item xs={12} sm={6} key={credential._id}>
                            <Paper 
                              sx={{ 
                                p: 2, 
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: 3
                                }
                              }}
                              onClick={() => viewCredential(credential._id)}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1" component="div">
                                  {credential.websiteName}
                                </Typography>
                                <CredentialIcon color="primary" />
                              </Box>
                              
                              {credential.url && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                  {credential.url}
                                </Typography>
                              )}
                              
                              {credential.email && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {credential.email}
                                </Typography>
                              )}
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body1" color="text.secondary">
                          No credentials in this group yet.
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={createCredential}
                          sx={{ mt: 2 }}
                        >
                          Add Your First Credential
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Group Info
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body2">
                {new Date(group.createdAt).toLocaleString()}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Members
              </Typography>
              <Typography variant="body2">
                {group.members.length + 1} {/* +1 for owner */}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Total Credentials
              </Typography>
              <Typography variant="body2">
                {credentials.length}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Member Roles:
            </Typography>
            
            <Box sx={{ ml: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Owner:</strong> Full control over the group
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Admin:</strong> Can manage members and credentials
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Editor:</strong> Can add and edit credentials
              </Typography>
              <Typography variant="body2">
                <strong>Viewer:</strong> Can only view credentials
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Group</DialogTitle>
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
            value={editForm.name}
            onChange={handleEditFormChange}
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
            value={editForm.description}
            onChange={handleEditFormChange}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitEdit} 
            variant="contained"
            disabled={!editForm.name}
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
            Are you sure you want to delete this group? All credentials in this group will also be deleted. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Member Dialog */}
      <Dialog open={openAddMemberDialog} onClose={handleCloseAddMemberDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Member to Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="email"
            name="email"
            label="User Email"
            type="email"
            fullWidth
            variant="outlined"
            value={memberForm.email}
            onChange={handleMemberFormChange}
            required
            sx={{ mb: 2, mt: 1 }}
          />
          
          <FormControl fullWidth required>
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              id="role"
              name="role"
              value={memberForm.role}
              label="Role"
              onChange={handleMemberFormChange}
            >
              <MenuItem value="viewer">Viewer</MenuItem>
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Viewer:</strong> Can only view credentials
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Editor:</strong> Can add and edit credentials
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Admin:</strong> Can manage members and credentials
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddMemberDialog}>Cancel</Button>
          <Button 
            onClick={handleAddMember} 
            variant="contained"
            disabled={!memberForm.email}
          >
            Add Member
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Member Dialog */}
      <Dialog open={openEditMemberDialog} onClose={handleCloseEditMemberDialog}>
        <DialogTitle>Edit Member Role</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <Typography variant="subtitle1">
              {selectedMember?.user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedMember?.user.email}
            </Typography>
          </Box>
          
          <FormControl fullWidth required>
            <InputLabel id="edit-role-label">Role</InputLabel>
            <Select
              labelId="edit-role-label"
              id="role"
              name="role"
              value={memberForm.role}
              label="Role"
              onChange={handleMemberFormChange}
            >
              <MenuItem value="viewer">Viewer</MenuItem>
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditMemberDialog}>Cancel</Button>
          <Button onClick={handleUpdateMember} variant="contained">
            Update Role
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Remove Member Dialog */}
      <Dialog open={openRemoveMemberDialog} onClose={handleCloseRemoveMemberDialog}>
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove {selectedMember?.user.name} from this group?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemoveMemberDialog}>Cancel</Button>
          <Button onClick={handleRemoveMember} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupDetail;
