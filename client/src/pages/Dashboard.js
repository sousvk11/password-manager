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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
  InputAdornment,
  Divider,
  Link
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  Group as GroupIcon,
  VpnKey as VpnKeyIcon,
  VisibilityOff as VisibilityOffIcon,
  Close as CloseIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';
import AuthContext from '../context/AuthContext';
import CredentialVersionHistory from '../components/CredentialVersionHistory';
import GroupAccessManager from '../components/GroupAccessManager';

const Dashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State variables
  const [tabValue, setTabValue] = useState(0);
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [filteredCredentials, setFilteredCredentials] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [openCredentialDialog, setOpenCredentialDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewCredentialDialog, setOpenViewCredentialDialog] = useState(false);
  const [viewingCredential, setViewingCredential] = useState(null);
  const [openVersionHistoryDialog, setOpenVersionHistoryDialog] = useState(false);
  const [openGroupAccessManagerDialog, setOpenGroupAccessManagerDialog] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  
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
    groups: []
  });
  const [deleteItem, setDeleteItem] = useState({ id: '', type: '' });
  
  // Set tab based on URL parameter
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'groups') {
      setTabValue(0);
    } else if (view === 'my-groups') {
      setTabValue(1);
    } else if (view === 'credentials') {
      setTabValue(2);
    }
  }, [searchParams]);
  
  // Effect to run on component mount
  useEffect(() => {
    // Add global refresh function that components can call
    window.refreshDashboard = () => {
      console.log('Dashboard refresh requested');
      fetchData();
    };
    
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
        let allGroups = [];
        if (groupsResponse.data.data && groupsResponse.data.data.groups) {
          allGroups = groupsResponse.data.data.groups;
        } else if (Array.isArray(groupsResponse.data.data)) {
          allGroups = groupsResponse.data.data;
        }
        
        console.log('All groups before filtering:', allGroups);
        
        // Check if user is admin
        const isAdmin = currentUser && currentUser.role === 'admin';
        console.log('Current user is admin:', isAdmin);
        
        if (isAdmin) {
          // Admin users can see all groups
          console.log('Admin user - showing all groups');
          setGroups(allGroups);
        } else {
          // Regular users can only see groups they own or are members of
          const userMemberGroups = allGroups.filter(group => {
            // Check if user is owner
            const isOwner = group.UserId === currentUser?.id || group.ownerId === currentUser?.id;
            
            // Check if user is a member
            const isMember = group.members && Array.isArray(group.members) && 
              group.members.some(member => {
                const memberId = member.id || member.userId || (member.User && member.User.id);
                return memberId === currentUser?.id;
              });
              
            return isOwner || isMember;
          });
          
          console.log('Groups where user is owner or member:', userMemberGroups);
          setGroups(userMemberGroups);
        }
        
        // Filter groups created/owned by the current user only
        const userOwnedGroups = allGroups.filter(group => 
          group.UserId === currentUser?.id || group.ownerId === currentUser?.id
        );
        console.log('Groups owned by user:', userOwnedGroups);
        setMyGroups(userOwnedGroups);
        
        console.log('Fetching credentials...');
        // Fetch credentials
        try {
          // Add decrypted=true parameter to get decrypted passwords
          const credentialsResponse = await axios.get('/credentials?decrypted=true');
          
          if (credentialsResponse.data && credentialsResponse.data.data && credentialsResponse.data.data.credentials) {
            setCredentials(credentialsResponse.data.data.credentials);
            setFilteredCredentials(credentialsResponse.data.data.credentials);
          } else if (credentialsResponse.data && credentialsResponse.data.credentials) {
            setCredentials(credentialsResponse.data.credentials);
            setFilteredCredentials(credentialsResponse.data.credentials);
          } else {
            console.error('Unexpected credentials response format:', credentialsResponse.data);
            setCredentials([]);
            setFilteredCredentials([]);
          }
        } catch (error) {
          console.error('Error fetching credentials:', error);
          console.error('Error details:', error.response?.data);
          toast.error(error.response?.data?.message || 'Failed to load credentials. Please try again.');
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
    
    // Cleanup function to remove global refresh function
    return () => {
      delete window.refreshDashboard;
    };
  }, []);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    let view = 'groups';
    if (newValue === 1) {
      view = 'my-groups';
    } else if (newValue === 2) {
      view = 'credentials';
    }
    setSearchParams({ view });
  };
  
  // Filter credentials by group
  const filterCredentialsByGroup = (groupId) => {
    if (!groupId) {
      // If no group is selected, show all credentials
      setFilteredCredentials(credentials);
      setSelectedGroup(null);
      return;
    }
    
    // Find the selected group - handle both string and number IDs
    const group = groups.find(g => g.id === parseInt(groupId, 10) || g.id === groupId);
    setSelectedGroup(group);
    
    // Filter credentials that belong to the selected group
    const filtered = credentials.filter(credential => 
      credential.Groups && credential.Groups.some(g => 
        g.id === parseInt(groupId, 10) || g.id === groupId
      )
    );
    
    setFilteredCredentials(filtered);
  };
  
  // Group dialog handlers
  const handleOpenGroupDialog = (group = null) => {
    if (group) {
      setGroupForm({ 
        id: group.id,
        name: group.name, 
        description: group.description 
      });
    } else {
      setGroupForm({ name: '', description: '' });
    }
    setOpenGroupDialog(true);
  };
  
  const handleCloseGroupDialog = () => {
    setOpenGroupDialog(false);
    setGroupForm({ name: '', description: '' });
  };
  
  // Credential dialog handlers
  const handleOpenCredentialDialog = (credential = null) => {
    if (credential) {
      setCredentialForm({
        id: credential.id,
        websiteName: credential.websiteName,
        url: credential.url || '',
        email: credential.email || '',
        userId: credential.userId || '',
        password: credential.password || '',
        token: credential.token || '',
        description: credential.description || '',
        groups: credential.Groups ? credential.Groups.map(g => g.id) : []
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
        groups: []
      });
    }
    setOpenCredentialDialog(true);
  };

  const handleCloseCredentialDialog = () => {
    setOpenCredentialDialog(false);
    setCredentialForm({
      websiteName: '',
      url: '',
      email: '',
      userId: '',
      password: '',
      token: '',
      description: '',
      groups: []
    });
  };
  
  // Delete dialog handlers
  const handleOpenDeleteDialog = (id, type) => {
    setDeleteItem({ id, type });
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setDeleteItem({ id: '', type: '' });
  };
  
  // Form change handlers
  const handleGroupFormChange = (e) => {
    const { name, value } = e.target;
    setGroupForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCredentialFormChange = (e) => {
    const { name, value } = e.target;
    setCredentialForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Submit handlers
  const handleGroupSubmit = async () => {
    try {
      const isEditing = !!groupForm.id;
      const url = isEditing ? `/groups/${groupForm.id}` : '/groups';
      const method = isEditing ? 'put' : 'post';
      
      const response = await axios[method](url, groupForm);
      
      // Consider the operation successful if we get a valid response with data
      // or if the response has a success flag set to true
      const isSuccess = response.data && (response.data.success || response.data.data);
      
      if (isSuccess) {
        toast.success(isEditing ? 'Group updated successfully!' : 'Group created successfully!');
        
        try {
          // Refresh groups data to ensure we have the latest
          const refreshResponse = await axios.get('/groups');
          let allGroups = [];
          if (refreshResponse.data.data && refreshResponse.data.data.groups) {
            allGroups = refreshResponse.data.data.groups;
          } else if (Array.isArray(refreshResponse.data.data)) {
            allGroups = refreshResponse.data.data;
          }
          
          console.log('All groups before filtering:', allGroups);
          
          // Check if user is admin
          const isAdmin = currentUser && currentUser.role === 'admin';
          console.log('Current user is admin:', isAdmin);
          
          if (isAdmin) {
            // Admin users can see all groups
            console.log('Admin user - showing all groups');
            setGroups(allGroups);
          } else {
            // Regular users can only see groups they own or are members of
            const userMemberGroups = allGroups.filter(group => {
              // Check if user is owner
              const isOwner = group.UserId === currentUser?.id || group.ownerId === currentUser?.id;
              
              // Check if user is a member
              const isMember = group.members && Array.isArray(group.members) && 
                group.members.some(member => {
                  const memberId = member.id || member.userId || (member.User && member.User.id);
                  return memberId === currentUser?.id;
                });
                
              return isOwner || isMember;
            });
            
            console.log('Groups where user is owner or member:', userMemberGroups);
            setGroups(userMemberGroups);
          }
          
          // Filter groups created/owned by the current user only
          const userOwnedGroups = allGroups.filter(group => 
            group.UserId === currentUser?.id || group.ownerId === currentUser?.id
          );
          console.log('Groups owned by user:', userOwnedGroups);
          setMyGroups(userOwnedGroups);
        } catch (refreshError) {
          console.error('Error refreshing groups:', refreshError);
          // Even if refresh fails, we'll update with the data we have
          if (isEditing) {
            setGroups(prev => prev.map(g => g.id === groupForm.id ? { ...g, ...groupForm } : g));
            setMyGroups(prev => prev.map(g => g.id === groupForm.id ? { ...g, ...groupForm } : g));
          } else {
            // For new groups, add to both lists if created by current user
            const newGroup = response.data.data || { ...groupForm, id: Date.now(), UserId: currentUser?.id };
            setGroups(prev => [...prev, newGroup]);
            setMyGroups(prev => [...prev, newGroup]);
          }
        }
        
        handleCloseGroupDialog();
      } else {
        toast.error(response.data.message || 'Failed to save group. Please try again.');
      }
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error(error.response?.data?.message || 'Failed to save group. Please try again.');
    }
  };
  
  const handleCredentialSubmit = async () => {
    try {
      const isEditing = !!credentialForm.id;
      const url = isEditing ? `/credentials/${credentialForm.id}` : '/credentials';
      const method = isEditing ? 'put' : 'post';
      
      // Format the data for the API
      const formData = { ...credentialForm };
      // Format groups properly for the API
      if (formData.groups && formData.groups.length > 0) {
        formData.groupIds = formData.groups;
      }
      delete formData.groups;
      
      const response = await axios[method](url, formData);
      
      // Consider the operation successful if we get a valid response with data
      // or if the response has a success flag set to true
      const isSuccess = response.data && (response.data.success || response.data.data);
      
      if (isSuccess) {
        toast.success(isEditing ? 'Credential updated successfully!' : 'Credential created successfully!');
        
        try {
          // Refresh data after creating/updating
          // Add decrypted=true parameter to get decrypted passwords
          const refreshResponse = await axios.get('/credentials?decrypted=true');
          
          if (refreshResponse.data && refreshResponse.data.data && refreshResponse.data.data.credentials) {
            setCredentials(refreshResponse.data.data.credentials);
            setFilteredCredentials(refreshResponse.data.data.credentials);
          } else if (refreshResponse.data && refreshResponse.data.credentials) {
            setCredentials(refreshResponse.data.credentials);
            setFilteredCredentials(refreshResponse.data.credentials);
          }
        } catch (refreshError) {
          console.error('Error refreshing credentials after update:', refreshError);
          // Even if refresh fails, we consider the operation successful
          // We'll just close the dialog and let the user refresh manually if needed
        }
        
        handleCloseCredentialDialog();
      } else {
        toast.error(response.data.message || 'Failed to save credential. Please try again.');
      }
    } catch (error) {
      console.error('Error saving credential:', error);
      toast.error(error.response?.data?.message || 'Failed to save credential. Please try again.');
    }
  };
  
  const handleDelete = async () => {
    try {
      const { id, type } = deleteItem;
      
      // Only allow credential deletion or group deletion by admin
      if (type === 'group' && currentUser?.role !== 'admin') {
        toast.error('Only administrators can delete groups.');
        handleCloseDeleteDialog();
        return;
      }
      
      const url = type === 'group' ? `/groups/${id}` : `/credentials/${id}`;
      const response = await axios.delete(url);
      
      if (response.data.success) {
        toast.success(`${type === 'group' ? 'Group' : 'Credential'} deleted successfully!`);
        
        // Update local state
        if (type === 'group') {
          // Refresh groups after deletion
          try {
            const refreshResponse = await axios.get('/groups');
            if (refreshResponse.data.data && refreshResponse.data.data.groups) {
              setGroups(refreshResponse.data.data.groups);
              // Filter groups created/owned by the current user only
              const userOwnedGroups = refreshResponse.data.data.groups.filter(group => 
                group.UserId === currentUser?.id || group.ownerId === currentUser?.id
              );
              setMyGroups(userOwnedGroups);
            } else if (refreshResponse.data && refreshResponse.data.groups) {
              setGroups(refreshResponse.data.groups);
              // Filter groups created/owned by the current user only
              const userOwnedGroups = refreshResponse.data.groups.filter(group => 
                group.UserId === currentUser?.id || group.ownerId === currentUser?.id
              );
              setMyGroups(userOwnedGroups);
            }
          } catch (refreshError) {
            console.error('Error refreshing groups after deletion:', refreshError);
            // Fallback to filtering locally
            setGroups(prev => prev.filter(g => g.id !== id));
            setMyGroups(prev => prev.filter(g => g.id !== id));
          }
        } else {
          // Update credentials
          const updatedCredentials = credentials.filter(c => c.id !== id);
          setCredentials(updatedCredentials);
          
          // If a group filter is active, apply it
          if (selectedGroup) {
            filterCredentialsByGroup(selectedGroup.id);
          } else {
            setFilteredCredentials(updatedCredentials);
          }
        }
        
        handleCloseDeleteDialog();
      } else {
        toast.error(response.data.message || 'Failed to delete. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(error.response?.data?.message || 'Failed to delete. Please try again.');
    }
  };
  
  // Function to fetch credentials
  const fetchCredentials = async () => {
    setLoading(true);
    try {
      // Get decrypted credentials
      const response = await axios.get('/credentials?decrypted=true');
      
      if (response.data && response.data.data && response.data.data.credentials) {
        setCredentials(response.data.data.credentials);
        setFilteredCredentials(response.data.data.credentials);
      } else if (response.data && response.data.credentials) {
        setCredentials(response.data.credentials);
        setFilteredCredentials(response.data.credentials);
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Failed to load credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Set initial filtered credentials
  useEffect(() => {
    if (selectedGroup) {
      // If a group is selected, apply the filter
      filterCredentialsByGroup(selectedGroup);
    } else {
      // Otherwise show all credentials
      setFilteredCredentials(credentials);
    }
  }, [selectedGroup, credentials]);
  
  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    }).catch(err => {
      console.error('Could not copy text: ', err);
      toast.error('Failed to copy to clipboard');
    });
  };
  
  // Toggle password visibility
  const [showPassword, setShowPassword] = useState({});
  
  const togglePasswordVisibility = (id) => {
    setShowPassword(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // View credential dialog handlers
  const handleOpenViewCredentialDialog = (credential) => {
    setViewingCredential(credential);
    // Show password by default in view dialog
    setShowPassword(prev => ({
      ...prev,
      [credential.id]: true
    }));
    setOpenViewCredentialDialog(true);
  };

  const handleCloseViewCredentialDialog = () => {
    setOpenViewCredentialDialog(false);
    setViewingCredential(null);
  };
  
  // Version history dialog handlers
  const handleOpenVersionHistoryDialog = (credentialId) => {
    setSelectedCredentialId(credentialId);
    setOpenVersionHistoryDialog(true);
  };
  
  const handleCloseVersionHistoryDialog = () => {
    setOpenVersionHistoryDialog(false);
    setSelectedCredentialId(null);
  };
  
  // Group access manager dialog handlers
  const handleOpenGroupAccessManagerDialog = (groupId) => {
    setSelectedGroupId(groupId);
    setOpenGroupAccessManagerDialog(true);
  };
  
  const handleCloseGroupAccessManagerDialog = () => {
    setOpenGroupAccessManagerDialog(false);
    setSelectedGroupId(null);
  };
  
  // Handle restoring a previous version
  const handleRestoreVersion = async (credential) => {
    try {
      const response = await axios.put(`/credentials/${credential.id}`, credential);
      
      if (response.data && (response.data.success || response.data.status === 'success')) {
        toast.success('Credential version restored successfully!');
        
        // Refresh credentials
        try {
          const refreshResponse = await axios.get('/credentials?decrypted=true');
          
          if (refreshResponse.data && refreshResponse.data.data && refreshResponse.data.data.credentials) {
            setCredentials(refreshResponse.data.data.credentials);
            setFilteredCredentials(refreshResponse.data.data.credentials);
          } else if (refreshResponse.data && refreshResponse.data.credentials) {
            setCredentials(refreshResponse.data.credentials);
            setFilteredCredentials(refreshResponse.data.credentials);
          }
        } catch (refreshError) {
          console.error('Error refreshing credentials after restore:', refreshError);
        }
      } else {
        toast.error(response.data.message || 'Failed to restore credential version.');
      }
    } catch (error) {
      console.error('Error restoring credential version:', error);
      toast.error(error.response?.data?.message || 'Failed to restore credential version.');
    }
  };
  
  // Render my groups tab
  const renderMyGroupsTab = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (myGroups.length === 0) {
      return (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            You haven't created any groups yet. Create your first group to get started.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            sx={{ mt: 2 }}
            onClick={() => handleOpenGroupDialog()}
          >
            Create Group
          </Button>
        </Box>
      );
    }
    
    return (
      <Grid container spacing={3}>
        {myGroups.map(group => (
          <Grid item xs={12} sm={6} md={4} key={group.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'all 0.3s',
                bgcolor: group.ownerId === currentUser.id ? 'rgba(255, 0, 102, 0.15)' : 'rgba(255, 182, 193, 0.3)',
                borderLeft: group.ownerId === currentUser.id ? '4px solid #ff0066' : '4px solid #ffb6c1',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {group.name}
                  </Typography>
                </Box>
                
                {group.owner && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Owner: {group.owner.name}
                  </Typography>
                )}
                
                {group.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {group.description}
                  </Typography>
                )}
                
                {group.members && group.members.length > 0 && (
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                      Members: {group.members.length}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {group.members.slice(0, 3).map((member) => (
                        <Tooltip 
                          key={member.id} 
                          title={`${member.name} (${member.email}) - ${member.GroupMember?.role || 'member'}`}
                        >
                          <Box
                            sx={{
                              bgcolor: 'primary.light',
                              color: 'primary.contrastText',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </Box>
                        </Tooltip>
                      ))}
                      {group.members.length > 3 && (
                        <Tooltip title={`${group.members.length - 3} more members`}>
                          <Box
                            sx={{
                              bgcolor: 'grey.400',
                              color: 'grey.900',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}
                          >
                            +{group.members.length - 3}
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Tooltip title="Edit Group">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleOpenGroupDialog(group)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Manage Members">
                    <IconButton 
                      size="small" 
                      color="info"
                      onClick={() => handleOpenGroupAccessManagerDialog(group.id)}
                    >
                      <GroupIcon />
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
  
  // Render all groups tab
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
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No groups found. Create your first group to get started.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            sx={{ mt: 2 }}
            onClick={() => handleOpenGroupDialog()}
          >
            Create Group
          </Button>
        </Box>
      );
    }
    
    return (
      <Grid container spacing={3}>
        {groups.map(group => (
          <Grid item xs={12} sm={6} md={4} key={group.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'all 0.3s',
                bgcolor: group.ownerId === currentUser.id ? 'rgba(255, 0, 102, 0.15)' : 'rgba(255, 182, 193, 0.3)',
                borderLeft: group.ownerId === currentUser.id ? '4px solid #ff0066' : '4px solid #ffb6c1',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {group.name}
                  </Typography>
                </Box>
                
                {group.owner && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Owner: {group.owner.name}
                  </Typography>
                )}
                
                {group.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {group.description}
                  </Typography>
                )}
                
                {group.members && group.members.length > 0 && (
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                      Members: {group.members.length}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {group.members.slice(0, 3).map((member) => (
                        <Tooltip 
                          key={member.id} 
                          title={`${member.name} (${member.email}) - ${member.GroupMember?.role || 'member'}`}
                        >
                          <Box
                            sx={{
                              bgcolor: 'primary.light',
                              color: 'primary.contrastText',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </Box>
                        </Tooltip>
                      ))}
                      {group.members.length > 3 && (
                        <Tooltip title={`${group.members.length - 3} more members`}>
                          <Box
                            sx={{
                              bgcolor: 'grey.400',
                              color: 'grey.900',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}
                          >
                            +{group.members.length - 3}
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Tooltip title="Edit Group">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleOpenGroupDialog(group)}
                      disabled={group.UserId !== currentUser?.id}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Manage Members">
                    <IconButton 
                      size="small" 
                      color="info"
                      onClick={() => handleOpenGroupAccessManagerDialog(group.id)}
                    >
                      <GroupIcon />
                    </IconButton>
                  </Tooltip>
                  {/* Only superusers (admin role) can delete groups */}
                  {currentUser?.role === 'admin' && (
                    <Tooltip title="Delete Group">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleOpenDeleteDialog(group.id, 'group')}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  )}
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
    
    // Group filter dropdown
    const renderGroupFilter = () => (
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, mt: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-start',
          border: '1px solid #c4c4c4',
          borderRadius: '4px',
          width: 200,
          mr: 2,
          position: 'relative',
          '&:hover': {
            borderColor: '#000'
          }
        }}>
          <Typography 
            variant="caption" 
            sx={{ 
              position: 'absolute',
              top: -10,
              left: 10,
              backgroundColor: 'white',
              px: 0.5,
              color: 'text.secondary',
              fontSize: '0.75rem'
            }}
          >
            Filter by Group
          </Typography>
          <Select
            id="group-filter"
            value={selectedGroup ? selectedGroup.id : ''}
            onChange={(e) => filterCredentialsByGroup(e.target.value)}
            displayEmpty
            variant="standard"
            sx={{
              width: '100%',
              '& .MuiSelect-select': {
                py: 1,
                pl: 1.5,
                pr: 4,
                border: 'none'
              },
              '&:before, &:after': {
                display: 'none'
              },
              '& .MuiSelect-icon': {
                right: 8
              }
            }}
            disableUnderline
          >
            <MenuItem value="">
              <em>All Credentials</em>
            </MenuItem>
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenCredentialDialog()}
          disabled={groups.length === 0}
        >
          Add New Credential
        </Button>
      </Box>
    );
    
    if (filteredCredentials.length === 0) {
      return (
        <Box>
          {renderGroupFilter()}
          
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No credentials found
            </Typography>
            {selectedGroup && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  No credentials in the selected group: <strong>{selectedGroup.name}</strong>
                </Typography>
                <Button 
                  variant="text" 
                  color="primary" 
                  onClick={() => filterCredentialsByGroup('')}
                  sx={{ mt: 2 }}
                >
                  Show All Credentials
                </Button>
              </>
            )}
          </Box>
        </Box>
      );
    }
    
    return (
      <Box>
        {renderGroupFilter()}
        
        <Grid container spacing={3}>
          {filteredCredentials.map(credential => (
            <Grid item xs={12} sm={6} md={4} key={credential.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'all 0.3s',
                  bgcolor: credential.ownerId === currentUser.id ? 'rgba(0, 0, 139, 0.15)' : 'rgba(173, 216, 230, 0.4)',
                  borderLeft: credential.ownerId === currentUser.id ? '4px solid #00008b' : '4px solid #add8e6',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {credential.websiteName}
                    </Typography>
                    <VpnKeyIcon color="primary" />
                  </Box>
                  
                  {credential.owner && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Owner: {credential.owner.name}
                    </Typography>
                  )}
                  
                  {credential.url && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      URL: {credential.url}
                    </Typography>
                  )}
                  
                  {credential.email && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Email: {credential.email}
                    </Typography>
                  )}
                  
                  {credential.userId && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Username: {credential.userId}
                    </Typography>
                  )}
                  
                  {credential.password && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                        Password: {showPassword[credential.id] ? credential.password : '••••••••'}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => togglePasswordVisibility(credential.id)}
                      >
                        {showPassword[credential.id] ? <VisibilityOffIcon fontSize="small" /> : <ViewIcon fontSize="small" />}
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => copyToClipboard(credential.password)}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  
                  {credential.token && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                        Token/API Key
                      </Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                        {credential.token}
                      </Typography>
                    </Box>
                  )}
                  
                  {credential.Groups && credential.Groups.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Groups: {credential.Groups.map(g => g.name).join(', ')}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Tooltip title="View Credential">
                      <IconButton 
                        size="small" 
                        color="info"
                        onClick={() => handleOpenViewCredentialDialog(credential)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    {/* Version History button - only visible to credential owner and group owners */}
                    {(credential.ownerId === currentUser.id || 
                      (credential.Groups && credential.Groups.some(g => g.ownerId === currentUser.id)) ||
                      currentUser.role === 'admin') && (
                      <Tooltip title="View Version History">
                        <IconButton 
                          size="small" 
                          color="secondary"
                          onClick={() => handleOpenVersionHistoryDialog(credential.id)}
                        >
                          <HistoryIcon />
                        </IconButton>
                      </Tooltip>
                    )}
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
      </Box>
    );
  };
  
  return (
    <>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
          <Box>
            {(tabValue === 0 || tabValue === 1) && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenGroupDialog()}
              >
                New Group
              </Button>
            )}
          </Box>
        </Box>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
            <Tab 
              icon={<GroupIcon />} 
              iconPosition="start" 
              label="All Groups" 
              id="tab-0" 
              aria-controls="tabpanel-0" 
            />
            <Tab 
              icon={<GroupIcon />} 
              iconPosition="start" 
              label="My Groups" 
              id="tab-1" 
              aria-controls="tabpanel-1" 
            />
            <Tab 
              icon={<VpnKeyIcon />} 
              iconPosition="start" 
              label="Credentials" 
              id="tab-2" 
              aria-controls="tabpanel-2" 
            />
          </Tabs>
        </Box>
        
        <Box role="tabpanel" hidden={tabValue !== 0} id="tabpanel-0" aria-labelledby="tab-0" sx={{ py: 3 }}>
          {tabValue === 0 && renderGroupsTab()}
        </Box>
        
        <Box role="tabpanel" hidden={tabValue !== 1} id="tabpanel-1" aria-labelledby="tab-1" sx={{ py: 3 }}>
          {tabValue === 1 && renderMyGroupsTab()}
        </Box>
        
        <Box role="tabpanel" hidden={tabValue !== 2} id="tabpanel-2" aria-labelledby="tab-2" sx={{ py: 3 }}>
          {tabValue === 2 && renderCredentialsTab()}
        </Box>
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
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="description"
            name="description"
            label="Description (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={groupForm.description}
            onChange={handleGroupFormChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroupDialog}>Cancel</Button>
          <Button 
            onClick={handleGroupSubmit} 
            variant="contained"
            disabled={!groupForm.name}
          >
            {groupForm.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Credential Dialog */}
      <Dialog open={openCredentialDialog} onClose={handleCloseCredentialDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {credentialForm.id ? 'Edit Credential' : 'Add New Credential'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="websiteName"
            name="websiteName"
            label="Website/App Name"
            type="text"
            fullWidth
            variant="outlined"
            value={credentialForm.websiteName}
            onChange={handleCredentialFormChange}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            id="url"
            name="url"
            label="URL (Optional)"
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
            label="Email (Optional)"
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
            label="Username (Optional)"
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
            type={showPassword.form ? "text" : "password"}
            fullWidth
            variant="outlined"
            value={credentialForm.password}
            onChange={handleCredentialFormChange}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(prev => ({ ...prev, form: !prev.form }))}
                    edge="end"
                  >
                    {showPassword.form ? <VisibilityOffIcon /> : <ViewIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            margin="dense"
            id="token"
            name="token"
            label="Token/API Key (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={credentialForm.token}
            onChange={handleCredentialFormChange}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel id="groups-label">Groups</InputLabel>
            <Select
              labelId="groups-label"
              id="groups"
              name="groups"
              multiple
              value={credentialForm.groups}
              label="Groups"
              onChange={handleCredentialFormChange}
            >
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            id="description"
            name="description"
            label="Description (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={credentialForm.description}
            onChange={handleCredentialFormChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCredentialDialog}>Cancel</Button>
          <Button 
            onClick={handleCredentialSubmit} 
            variant="contained"
            disabled={!credentialForm.websiteName || !credentialForm.password}
          >
            {credentialForm.id ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
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
      
      {/* View Credential Dialog */}
      <Dialog
        open={openViewCredentialDialog}
        onClose={handleCloseViewCredentialDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {viewingCredential?.websiteName || 'Credential Details'}
          <IconButton
            aria-label="close"
            onClick={handleCloseViewCredentialDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewingCredential && (
            <Box sx={{ mt: 2 }}>
              {viewingCredential.url && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" component="div" gutterBottom>
                    URL
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ mr: 1, wordBreak: 'break-all' }}>
                      {viewingCredential.url}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard(viewingCredential.url)}
                      color="primary"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}
              
              {viewingCredential.email && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" component="div" gutterBottom>
                    Email
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ mr: 1, wordBreak: 'break-all' }}>
                      {viewingCredential.email}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard(viewingCredential.email)}
                      color="primary"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}
              
              {viewingCredential.userId && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" component="div" gutterBottom>
                    Username
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ mr: 1, wordBreak: 'break-all' }}>
                      {viewingCredential.userId}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard(viewingCredential.userId)}
                      color="primary"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}
              
              {viewingCredential.password && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" component="div" gutterBottom>
                    Password
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ mr: 1, wordBreak: 'break-all' }}>
                      {viewingCredential.password}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard(viewingCredential.password)}
                      color="primary"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}
              
              {viewingCredential.token && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" component="div" gutterBottom>
                    Token/API Key
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ mr: 1, wordBreak: 'break-all' }}>
                      {viewingCredential.token}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard(viewingCredential.token)}
                      color="primary"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}
              
              {viewingCredential.Groups && viewingCredential.Groups.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" component="div" gutterBottom>
                    Groups
                  </Typography>
                  <Typography variant="body1">
                    {viewingCredential.Groups.map(g => g.name).join(', ')}
                  </Typography>
                </Box>
              )}
              
              {viewingCredential.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" component="div" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {viewingCredential.description}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained" 
            onClick={handleCloseViewCredentialDialog}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Credential Version History Dialog */}
      <CredentialVersionHistory
        open={openVersionHistoryDialog}
        handleClose={handleCloseVersionHistoryDialog}
        credentialId={selectedCredentialId}
        onRestore={handleRestoreVersion}
      />
      
      {/* Group Access Manager Dialog */}
      <GroupAccessManager
        open={openGroupAccessManagerDialog}
        handleClose={handleCloseGroupAccessManagerDialog}
        groupId={selectedGroupId}
        onUpdate={() => {
          // Refresh groups after member changes
          const fetchGroups = async () => {
            try {
              const response = await axios.get('/groups');
              if (response.data.data && response.data.data.groups) {
                setGroups(response.data.data.groups);
                // Filter groups created/owned by the current user only
                const userOwnedGroups = response.data.data.groups.filter(group => 
                  group.UserId === currentUser?.id || group.ownerId === currentUser?.id
                );
                setMyGroups(userOwnedGroups);
              } else if (response.data && response.data.groups) {
                setGroups(response.data.groups);
                // Filter groups created/owned by the current user only
                const userOwnedGroups = response.data.groups.filter(group => 
                  group.UserId === currentUser?.id || group.ownerId === currentUser?.id
                );
                setMyGroups(userOwnedGroups);
              }
            } catch (error) {
              console.error('Error refreshing groups:', error);
              toast.error('Failed to refresh groups');
            }
          };
          fetchGroups();
        }}
      />
    </>
  );
};

export default Dashboard;
