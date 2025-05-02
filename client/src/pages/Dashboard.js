import React, { useState, useEffect, useContext } from 'react';
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
  FormHelperText,
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
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon,
  Group as GroupIcon,
  VpnKey as VpnKeyIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';
import AuthContext from '../context/AuthContext';
import CredentialVersionHistory from '../components/CredentialVersionHistory';
import GroupAccessManager from '../components/GroupAccessManager';
import PinVerificationDialog from '../components/PinVerificationDialog';
import { useNavigate, useSearchParams } from 'react-router-dom';
import deletedItemsManager from '../utils/deleteHelper';
import { isPinVerificationRequired } from '../utils/pinUtils';

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
  const [selectedGroupId, setSelectedGroupId] = useState('');
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
  const [pinVerificationOpen, setPinVerificationOpen] = useState(false);
  const [pendingCredentialId, setPendingCredentialId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [pinVerificationAttempts, setPinVerificationAttempts] = useState(0);
  const [pendingDeleteItem, setPendingDeleteItem] = useState({ id: '', type: '' });
  const [isPinEnabled, setIsPinEnabled] = useState(true); // Default to true for security
  
  // Fetch data function
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
      const allGroups = groupsResponse.data.data.groups;
      
      // Filter groups to only show those the user owns or is a member of
      const userVisibleGroups = allGroups.filter(group => {
        // Check if user is the owner
        const isOwner = group.ownerId === currentUser.id;
        
        // Check if user is a member
        const isMember = group.members && Array.isArray(group.members) && 
          group.members.some(member => {
            const memberId = member.id || member.userId || (member.User && member.User.id);
            return memberId === currentUser.id;
          });
        
        // Admin users can see all groups
        const isAdmin = currentUser.role === 'admin';
        
        return isOwner || isMember || isAdmin;
      });
      
      // Set filtered groups that user can see
      setGroups(userVisibleGroups);
      
      // Separate user-owned groups
      const userOwnedGroups = allGroups.filter(group => group.ownerId === currentUser.id);
      setMyGroups(userOwnedGroups);
      
      console.log('Fetching credentials...');
      // Fetch credentials
      const credentialsResponse = await axios.get('/credentials');
      const fetchedCredentials = credentialsResponse.data.data.credentials;
      setCredentials(fetchedCredentials);
      setFilteredCredentials(fetchedCredentials);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data. Please refresh the page.');
      setLoading(false);
    }
  };
  
  // Fetch PIN status from server
  const fetchPinStatus = async () => {
    try {
      const response = await axios.get('/pins/status');
      if (response.data && response.data.status === 'success') {
        setIsPinEnabled(response.data.data.enabled);
        console.log('PIN status loaded:', response.data.data.enabled);
      }
    } catch (error) {
      console.error('Error checking PIN status:', error);
      // Default to true for security if we can't check
      setIsPinEnabled(true);
    }
  };
  
  // This useEffect has been moved to the main useEffect hook below
  
  const [versionHistoryCredentialId, setVersionHistoryCredentialId] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  
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
  
  // Temporary state to hold credential form data during PIN verification
  const [tempCredentialForm, setTempCredentialForm] = useState(null);
  const [deleteItem, setDeleteItem] = useState({ id: '', type: '' });
  
  // Function to force a complete refresh of all data
  const forceRefresh = async () => {
    console.log('Forcing complete data refresh');
    setLoading(true);
    
    try {
      // Fetch fresh groups data
      const groupsResponse = await axios.get('/groups');
      
      if (groupsResponse.data && groupsResponse.data.data && groupsResponse.data.data.groups) {
        const allGroups = groupsResponse.data.data.groups;
        setGroups(allGroups);
        
        // Filter groups created/owned by the current user only
        const userOwnedGroups = allGroups.filter(group => 
          group.UserId === currentUser?.id || group.ownerId === currentUser?.id
        );
        setMyGroups(userOwnedGroups);
      }
      
      // Fetch fresh credentials data
      const credentialsResponse = await axios.get('/credentials?decrypted=true');
      
      if (credentialsResponse.data && credentialsResponse.data.data && credentialsResponse.data.data.credentials) {
        setCredentials(credentialsResponse.data.data.credentials);
        setFilteredCredentials(credentialsResponse.data.data.credentials);
      }
    } catch (error) {
      console.error('Error during force refresh:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset PIN verification state
  const resetPinVerification = () => {
    setPendingCredentialId(null);
    setPendingAction(null);
    setPinVerificationAttempts(0);
    setTempCredentialForm(null);
    setPinVerificationOpen(false);
    // Reset the pending delete item after the operation is complete
    setPendingDeleteItem({ id: '', type: '' });
  };
  
  // Set tab based on URL parameter
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'groups') {
      setTabValue(0);
    } else if (view === 'my-groups') {
      setTabValue(1);
    } else if (view === 'credentials') {
      setTabValue(2);
      
      // Check for groupId parameter when on credentials tab (handle different parameter names)
      const groupId = searchParams.get('groupId') || searchParams.get('GroudId') || searchParams.get('GroupId');
      if (groupId && credentials.length > 0 && groups.length > 0) {
        filterCredentialsByGroup(groupId);
      }
    }
  }, [searchParams, credentials.length, groups.length]);
  
  // Effect to run on component mount
  useEffect(() => {
    // Add global refresh function that components can call
    window.refreshDashboard = () => {
      console.log('Dashboard refresh requested');
      fetchData();
    };
    
    // Initial data fetch
    fetchData();
    fetchPinStatus();
    
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
    
    // Preserve the group filter when changing tabs
    const params = { view };
    
    // Only preserve group filter when on credentials tab
    if (newValue === 2 && selectedGroupId) {
      params.groupId = selectedGroupId;
    }
    
    // Don't reset filter when staying on credentials tab
    if (tabValue !== 2 || newValue !== 2) {
      // Reset group filter when changing to a different tab
      setSelectedGroupId('');
      setSelectedGroup(null);
      setFilteredCredentials(credentials);
    }
    
    setSearchParams(params);
  };
  
  // Filter credentials by group
  const filterCredentialsByGroup = (groupId) => {
    console.log('Filtering by group ID:', groupId);
    
    if (!groupId) {
      // If no group is selected, show all credentials
      console.log('No group selected, showing all credentials');
      setFilteredCredentials(credentials);
      setSelectedGroup(null);
      setSelectedGroupId('');
      
      // Update URL to remove groupId parameter
      const currentParams = Object.fromEntries(searchParams.entries());
      delete currentParams.groupId;
      delete currentParams.GroudId;
      delete currentParams.GroupId;
      setSearchParams(currentParams);
      return;
    }
    
    // Convert to string for consistency
    const groupIdStr = String(groupId);
    console.log('Looking for group with ID:', groupIdStr);
    
    // Find the selected group
    const group = groups.find(g => String(g.id) === groupIdStr);
    
    if (!group) {
      console.error(`Group with ID ${groupIdStr} not found`);
      setFilteredCredentials(credentials);
      setSelectedGroup(null);
      setSelectedGroupId('');
      
      // Update URL to remove groupId parameter
      const currentParams = Object.fromEntries(searchParams.entries());
      delete currentParams.groupId;
      delete currentParams.GroudId;
      delete currentParams.GroupId;
      setSearchParams(currentParams);
      return;
    }
    
    console.log('Found group:', group.name);
    setSelectedGroup(group);
    setSelectedGroupId(groupIdStr);
    
    // Filter credentials that belong to the selected group
    const filtered = credentials.filter(credential => {
      if (!credential.Groups || !Array.isArray(credential.Groups)) {
        return false;
      }
      
      return credential.Groups.some(g => String(g.id) === groupIdStr);
    });
    
    console.log(`Filtered to ${filtered.length} credentials`);
    setFilteredCredentials(filtered);
    
    // Update URL with groupId parameter
    const currentParams = Object.fromEntries(searchParams.entries());
    delete currentParams.groupId;
    delete currentParams.GroudId;
    delete currentParams.GroupId;
    currentParams.groupId = groupIdStr;
    setSearchParams(currentParams);
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
  const handleOpenCredentialDialog = async (credential = null, action = null) => {
    try {
      if (credential) {
        // Check if PIN is enabled in user settings
        if (!isPinEnabled) {
          console.log('PIN verification is disabled in settings, proceeding directly with credential edit');
          // PIN is disabled, fetch credential data directly
          try {
            const response = await axios.get(`/credentials/${credential.id}?decrypted=true&action=edit`);
            if (response.data && response.data.status === 'success' && response.data.data && response.data.data.credential) {
              const fetchedCredential = response.data.data.credential;
              // Set form data with fetched credential
              setCredentialForm({
                websiteName: fetchedCredential.websiteName || '',
                url: fetchedCredential.url || '',
                email: fetchedCredential.email || '',
                userId: fetchedCredential.userId || '',
                password: '', // Leave password blank when editing
                token: '', // Leave token blank when editing
                description: fetchedCredential.description || '',
                groups: fetchedCredential.Groups ? fetchedCredential.Groups.map(g => String(g.id)) : []
              });
              setOpenCredentialDialog(true);
            }
          } catch (error) {
            console.error('Error fetching credential for editing:', error);
            toast.error('Failed to fetch credential details for editing');
          }
        } else {
          // PIN is enabled, require verification
          // Only set pending action if it's a direct user action, not from PIN verification success handler
          if (pendingAction !== 'editCredential') {
            setPendingCredentialId(credential.id);
            setPendingAction(action);
            setPinVerificationOpen(true);
          } else {
            // This is being called from the PIN verification success handler
            // Just open the dialog with the credential data that was already fetched
            setOpenCredentialDialog(true);
          }
        }
      } else {
        // For new credentials, initialize all fields as empty
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
        setOpenCredentialDialog(true);
      }
    } catch (error) {
      console.error('Error opening credential dialog:', error);
      toast.error('An error occurred while preparing the credential form.');
    }
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
  const handleOpenDeleteDialog = (id, type, action) => {
    setDeleteItem({ id, type });
    // Always use 'delete' as the action parameter to match server expectations
    setPendingAction('delete');
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
      
      // Prepare the URL and method based on whether we're creating or updating
      const url = isEditing ? `/credentials/${credentialForm.id}` : '/credentials';
      const method = isEditing ? 'patch' : 'post';
      
      // Format the data for the API
      const formData = { ...credentialForm };
      
      // Handle password field appropriately
      if (isEditing) {
        // When editing, only include password and token if they're not empty
        if (!formData.password || formData.password.trim() === '') {
          delete formData.password;
        }
        if (!formData.token || formData.token.trim() === '') {
          delete formData.token;
        }
      } else {
        // For new credentials, password is optional now
        if (!formData.password) {
          formData.password = ''; // Set to empty string if not provided
        }
      }
      
      // Format groups properly for the API
      if (formData.groups && formData.groups.length > 0) {
        formData.groupIds = formData.groups;
      }
      delete formData.groups;
      
      // Make the request to create or update the credential
      const response = await axios[method](url, formData);
      
      // Handle the response
      if (response.data && (response.data.success || response.data.data)) {
        toast.success(isEditing ? 'Credential updated successfully!' : 'Credential created successfully!');
        handleCloseCredentialDialog();
        
        // Refresh data after creating/updating
        try {
          const refreshResponse = await axios.get('/credentials?decrypted=true');
          
          if (refreshResponse.data && refreshResponse.data.data && refreshResponse.data.data.credentials) {
            setCredentials(refreshResponse.data.data.credentials);
            setFilteredCredentials(refreshResponse.data.data.credentials);
            
            // If a group filter is active, apply it
            if (selectedGroupId) {
              filterCredentialsByGroup(selectedGroupId);
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing credentials:', refreshError);
        }
      } else {
        toast.error(response.data?.message || 'Failed to save credential. Please try again.');
      }
      
    } catch (error) {
      console.error('Error saving credential:', error);
      toast.error(error.response?.data?.message || 'Failed to save credential. Please try again.');
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
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          toast.success('Copied to clipboard!');
        }).catch(err => {
          console.error('Failed to copy: ', err);
          fallbackCopyToClipboard(text);
        });
      } else {
        fallbackCopyToClipboard(text);
      }
    } catch (err) {
      console.error('Copy failed: ', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Fallback method for copying to clipboard
  const fallbackCopyToClipboard = (text) => {
    try {
      // Create a temporary textarea element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      // Select and copy
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      
      // Clean up
      document.body.removeChild(textArea);
      
      if (successful) {
        toast.success('Copied to clipboard!');
      } else {
        toast.error('Failed to copy to clipboard');
      }
    } catch (err) {
      console.error('Fallback copy failed: ', err);
      toast.error('Failed to copy to clipboard');
    }
  };
  
  // Toggle password visibility
  const [showPassword, setShowPassword] = useState({
    form: false,
    viewing: false,
    viewingToken: false
  });
  
  // Fetch a specific credential (with PIN verification if needed)
  const fetchCredential = async (id) => {
    try {
      const response = await axios.get(`/credentials/${id}`);
      
      // Update credential in state
      setCredentials(prevCredentials => 
        prevCredentials.map(cred => 
          cred.id === id ? response.data.data.credential : cred
        )
      );
      
      return response.data.data.credential;
    } catch (error) {
      console.error('Error fetching credential:', error);
      
      // Check if PIN verification is required
      if (error.response?.status === 403 && error.response?.data?.data?.requirePin) {
        setPendingCredentialId(id);
        setPinVerificationOpen(true);
        return null;
      }
      
      toast.error('Failed to fetch credential details');
      return null;
    }
  };
  
  // Handle PIN verification success for viewing credential
  const handlePinVerificationSuccess = async () => {
    // Don't immediately close the PIN dialog until we've successfully completed the action
    // This prevents the dialog from flashing if there's an error
    
    // Fetch the credential that was pending PIN verification
    if (pendingCredentialId && pendingAction) {
      try {
        console.log(`PIN verification successful for action: ${pendingAction}, credential: ${pendingCredentialId}`);
        
        // Handle different actions based on pendingAction
        switch (pendingAction) {
            
          case 'viewCredential':
            // Fetch and view credential details
            try {
              const viewResponse = await axios.get(`/credentials/${pendingCredentialId}?decrypted=true&action=view`);
              
              if (viewResponse.data && viewResponse.data.status === 'success' && viewResponse.data.data && viewResponse.data.data.credential) {
                const credential = viewResponse.data.data.credential;
                
                // Update credential in state
                setCredentials(prevCredentials => 
                  prevCredentials.map(cred => 
                    cred.id === pendingCredentialId ? credential : cred
                  )
                );
                
                // Close PIN dialog and open the credential view dialog
                setPinVerificationOpen(false);
                setViewingCredential(credential);
                setOpenViewCredentialDialog(true);
                
                // Reset pending states after successful action
                resetPinVerification();
              } else {
                toast.error('Invalid credential data received');
                setPinVerificationOpen(false);
                resetPinVerification();
              }
            } catch (error) {
              console.error('Error fetching credential after PIN verification:', error);
              toast.error(error.response?.data?.message || 'Failed to fetch credential details');
              setPinVerificationOpen(false);
              resetPinVerification();
            }
            break;
            
          case 'editCredential':
            // Fetch credential for editing
            try {
              // Fix: Change the action parameter to 'read' to match the server-side middleware expectation
              const editResponse = await axios.get(`/credentials/${pendingCredentialId}?decrypted=true&action=read`);
              
              if (editResponse.data && editResponse.data.status === 'success' && editResponse.data.data && editResponse.data.data.credential) {
                const fetchedCredential = editResponse.data.data.credential;
                
                // Initialize form with existing values but leave password and token fields blank
                setCredentialForm({
                  id: fetchedCredential.id,
                  websiteName: fetchedCredential.websiteName || '',
                  url: fetchedCredential.url || '',
                  email: fetchedCredential.email || '',
                  userId: fetchedCredential.userId || '',
                  password: '', // Leave password blank when editing
                  token: '', // Leave token blank when editing
                  description: fetchedCredential.description || '',
                  groups: fetchedCredential.Groups ? fetchedCredential.Groups.map(g => String(g.id)) : []
                });
                
                // Close PIN dialog and open the credential edit dialog
                setPinVerificationOpen(false);
                setOpenCredentialDialog(true);
                
                // Reset pending states after successful action
                resetPinVerification();
              } else {
                toast.error('Invalid credential data received');
                setPinVerificationOpen(false);
                resetPinVerification();
              }
            } catch (error) {
              console.error('Error fetching credential for editing after PIN verification:', error);
              toast.error(error.response?.data?.message || 'Failed to fetch credential details for editing');
              setPinVerificationOpen(false);
              resetPinVerification();
            }
            break;
            
          case 'viewVersionHistory':
            // Fetch version history
            try {
              // Fix: Change the action parameter to 'read' to match the server-side middleware expectation
              const historyResponse = await axios.get(`/credentials/${pendingCredentialId}/versions?decrypted=true&action=read`);
              
              if (historyResponse.data && historyResponse.data.status === 'success' && historyResponse.data.data && historyResponse.data.data.versions) {
                // Close PIN dialog and open the version history dialog
                setPinVerificationOpen(false);
                setVersionHistoryCredentialId(pendingCredentialId);
                setVersionHistory(historyResponse.data.data.versions);
                setOpenVersionHistoryDialog(true);
                
                // Reset pending states after successful action
                resetPinVerification();
              } else {
                toast.error('Invalid version history data received');
                setPinVerificationOpen(false);
                resetPinVerification();
              }
            } catch (error) {
              console.error('Error fetching version history after PIN verification:', error);
              toast.error(error.response?.data?.message || 'Failed to fetch version history');
              setPinVerificationOpen(false);
              resetPinVerification();
            }
            break;
            
          case 'delete':
            // After PIN verification, determine if we're deleting a credential or a group
            try {
              // Check if we have a pending delete item to determine what we're deleting
              const itemType = pendingDeleteItem.type;
              console.log('Deleting item type:', itemType, 'with ID:', pendingCredentialId);
              
              if (itemType === 'credential') {
                try {
                  // Delete credential
                  setPinVerificationOpen(false); // Close dialog immediately for better UX
                  
                  // Show processing message
                  toast.info('Processing deletion...');
                  
                  // IMMEDIATELY hide the credential in the DOM before server request
                  // This ensures the user sees the item disappear right away
                  const credentialElements = document.querySelectorAll(`[data-credential-id="${pendingCredentialId}"]`);
                  credentialElements.forEach(el => {
                    if (el && el.style) {
                      el.style.display = 'none';
                    }
                  });
                  
                  // Show success message immediately
                  toast.success('Credential deleted successfully!');
                  
                  // Now perform the actual server deletion
                  try {
                    await axios.delete(`/credentials/${pendingCredentialId}?action=delete`);
                    // No need to do anything on success, item is already hidden
                  } catch (error) {
                    console.error('Error deleting credential:', error);
                    toast.error('Server error during deletion. Please refresh the page.');
                  }
                  
                  // Reset PIN verification state
                  resetPinVerification();
                } catch (error) {
                  console.error('Error deleting credential:', error);
                  toast.error('An unexpected error occurred.');
                  resetPinVerification();
                }
              } else if (itemType === 'group') {
                try {
                  // Delete group
                  setPinVerificationOpen(false); // Close dialog immediately for better UX
                  
                  // Show processing message
                  toast.info('Processing deletion...');
                  
                  // IMMEDIATELY hide the group in the DOM before server request
                  // This ensures the user sees the item disappear right away
                  const groupElements = document.querySelectorAll(`[data-group-id="${pendingCredentialId}"]`);
                  groupElements.forEach(el => {
                    if (el && el.style) {
                      el.style.display = 'none';
                    }
                  });
                  
                  // Show success message immediately
                  toast.success('Group deleted successfully!');
                  
                  // Now perform the actual server deletion
                  try {
                    await axios.delete(`/groups/${pendingCredentialId}?action=delete`);
                    // No need to do anything on success, item is already hidden
                  } catch (error) {
                    console.error('Error deleting group:', error);
                    toast.error('Server error during deletion. Please refresh the page.');
                  }
                  
                  // Reset PIN verification state
                  resetPinVerification();
                } catch (error) {
                  console.error('Error deleting group:', error);
                  toast.error('An unexpected error occurred.');
                  resetPinVerification();
                }
              }
            } catch (error) {
              console.error('Error during deletion after PIN verification:', error);
              toast.error(error.response?.data?.message || 'Failed to delete item.');
              setPinVerificationOpen(false);
              resetPinVerification();
            }
            break;
            
          // Other cases will go here
            
          default:
            console.error('Unknown pending action:', pendingAction);
            toast.error('An unknown action was requested');
            setPinVerificationOpen(false);
            resetPinVerification();
            break;
        }
      } catch (error) {
        console.error('Error after PIN verification:', error);
        toast.error('Failed to complete the requested action');
        setPinVerificationOpen(false);
        resetPinVerification();
      }
    } else {
      // No pending credential ID or action, just close the dialog
      setPinVerificationOpen(false);
    }
  };
  
  // Handle opening view credential dialog
  const handleOpenViewCredentialDialog = async (credential, action) => {
    try {
      if (!credential || !credential.id) {
        toast.error('Invalid credential data');
        return;
      }

      // Check if PIN is enabled in user settings
      if (!isPinEnabled) {
        console.log('PIN verification is disabled in settings, proceeding directly');
        // PIN is disabled in settings, proceed directly without verification
        try {
          const response = await axios.get(`/credentials/${credential.id}?decrypted=true&action=view`);
          
          if (response.data && response.data.status === 'success' && response.data.data && response.data.data.credential) {
            const fetchedCredential = response.data.data.credential;
            
            // Update credential in state
            setCredentials(prevCredentials => 
              prevCredentials.map(cred => 
                cred.id === credential.id ? fetchedCredential : cred
              )
            );
            
            // Set viewing credential
            setViewingCredential(fetchedCredential);
            setShowPassword({ ...showPassword, viewing: false });
            setOpenViewCredentialDialog(true);
          } else {
            toast.error('Failed to fetch credential details');
          }
        } catch (error) {
          console.error('Error fetching credential:', error);
          toast.error('Failed to fetch credential details');
        }
        return;
      }
      
      // PIN is enabled, check if verification is required
      try {
        const { requirePin, sessionInfo } = await isPinVerificationRequired('viewCredential');
        
        if (!requirePin) {
          // PIN verification is not required (active session exists)
          console.log('PIN verification not required - active session exists');
          
          // If we have session info with expiration time, show a notification
          if (sessionInfo && sessionInfo.sessionExpiresIn) {
            // Only show this notification once per session
            if (!window.sessionNotificationShown) {
              window.sessionNotificationShown = true;
              toast.info(`You will not be asked for your PIN again for the next ${Math.ceil(sessionInfo.sessionExpiresIn / 60)} minute(s) in this browser tab.`, {
                autoClose: 3000,
                position: 'bottom-right'
              });
            }
          }
          
          // Fetch credential directly without PIN verification
          try {
            const response = await axios.get(`/credentials/${credential.id}?decrypted=true&action=view`);
            
            if (response.data && response.data.status === 'success' && response.data.data && response.data.data.credential) {
              const fetchedCredential = response.data.data.credential;
              
              // Update credential in state
              setCredentials(prevCredentials => 
                prevCredentials.map(cred => 
                  cred.id === credential.id ? fetchedCredential : cred
                )
              );
              
              // Set viewing credential
              setViewingCredential(fetchedCredential);
              setShowPassword({ ...showPassword, viewing: false });
              setOpenViewCredentialDialog(true);
            } else {
              toast.error('Failed to fetch credential details');
            }
          } catch (error) {
            console.error('Error fetching credential:', error);
            toast.error('Failed to fetch credential details');
          }
        } else {
          // PIN verification is required
          console.log('PIN verification required for viewing credential');
          setPendingCredentialId(credential.id);
          setPendingAction(action || 'viewCredential');
          setPinVerificationOpen(true);
        }
      } catch (error) {
        console.error('Error checking PIN requirement:', error);
        toast.error('Failed to check PIN requirement');
      }
    } catch (error) {
      console.error('Error preparing to view credential:', error);
      toast.error('An error occurred while preparing to view the credential.');
    }
  };

  const handleCloseViewCredentialDialog = () => {
    setOpenViewCredentialDialog(false);
    setViewingCredential(null);
  };
  

  
  // Version history dialog handlers
  const handleOpenVersionHistoryDialog = async (credentialId, action) => {
    // Check if PIN is enabled in user settings
    if (!isPinEnabled) {
      console.log('PIN verification is disabled in settings, proceeding directly with version history');
      // PIN verification is not required (PIN is disabled in profile settings)
      console.log('PIN verification not required for version history - PIN is disabled');
      
      try {
        // Fetch version history directly without PIN verification
        const historyResponse = await axios.get(`/credentials/${credentialId}/versions?decrypted=true&action=read`);
        
        if (historyResponse.data && historyResponse.data.status === 'success' && historyResponse.data.data && historyResponse.data.data.versions) {
          // Open the version history dialog directly
          setVersionHistoryCredentialId(credentialId);
          setVersionHistory(historyResponse.data.data.versions);
          setOpenVersionHistoryDialog(true);
        } else {
          toast.error('Invalid version history data received');
        }
      } catch (error) {
        console.error('Error fetching version history:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch version history');
      }
    } else {
      // PIN verification is required
      console.log('PIN verification required for version history');
      setPendingCredentialId(credentialId);
      setPendingAction(action || 'viewVersionHistory');
      setPinVerificationOpen(true);
    }
  };
  
  const handleCloseVersionHistoryDialog = () => {
    setOpenVersionHistoryDialog(false);
    setVersionHistoryCredentialId(null);
    setVersionHistory([]);
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
  // handleRestoreVersion function removed as requested
  
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
          <Grid item xs={12} sm={6} md={4} key={group.id} data-group-id={group.id}>
            <Card 
              data-group-id={group.id}
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
                        onClick={() => handleOpenDeleteDialog(group.id, 'group', 'deleteGroup')}
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
            value={selectedGroupId}
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
              <MenuItem key={group.id} value={String(group.id)}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenCredentialDialog(null, 'addCredential')}
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
            <Grid item xs={12} sm={6} md={4} key={credential.id} data-credential-id={credential.id}>
              <Card 
                data-credential-id={credential.id}
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
                  
                  {credential.email && (
                    <Box sx={{ 
                      mb: 1, 
                      p: 1, 
                      bgcolor: 'rgba(0, 0, 0, 0.04)', 
                      borderRadius: 1 
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        Email: {credential.email}
                      </Typography>
                    </Box>
                  )}
                  
                  {credential.userId && (
                    <Box sx={{ 
                      mb: 1, 
                      p: 1, 
                      bgcolor: 'rgba(0, 0, 0, 0.04)', 
                      borderRadius: 1 
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        Username: {credential.userId}
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
                        onClick={() => handleOpenViewCredentialDialog(credential, 'viewCredential')}
                        aria-label="View credential details"
                      >
                        <VisibilityIcon />
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
                          onClick={() => handleOpenVersionHistoryDialog(credential.id, 'viewVersionHistory')}
                          aria-label="View credential history"
                        >
                          <HistoryIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {/* Edit button - visible to users with edit permissions */}
                    {(credential.ownerId === currentUser.id || 
                      (credential.Groups && credential.Groups.some(g => g.ownerId === currentUser.id)) ||
                      currentUser.role === 'admin' ||
                      credential.accessLevel === 'edit') && (
                      <Tooltip title="Edit Credential">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleOpenCredentialDialog(credential, 'editCredential')}
                          aria-label="Edit credential"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {/* Delete button - only visible to credential owner, group owners, or admins */}
                    {(credential.ownerId === currentUser.id || 
                      (credential.Groups && credential.Groups.some(g => g.ownerId === currentUser.id)) ||
                      currentUser.role === 'admin') && (
                      <Tooltip title="Delete Credential">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleOpenDeleteDialog(credential.id, 'credential', 'deleteCredential')}
                          aria-label="Delete credential"
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
      </Box>
    );
  };
  
  // Delete handler
  const handleDelete = async () => {
    try {
      const { id, type } = deleteItem;
      
      // Only allow credential deletion or group deletion by admin
      if (type === 'group' && currentUser?.role !== 'admin') {
        toast.error('Only administrators can delete groups.');
        handleCloseDeleteDialog();
        return;
      }
      
      // Save the item being deleted for use after PIN verification
      setPendingDeleteItem(deleteItem);
      
      // Check if PIN is enabled in user settings
      if (!isPinEnabled) {
        // PIN verification is not required (PIN is disabled in profile settings)
        console.log('PIN verification not required for deletion - PIN is disabled');
        
        // IMMEDIATELY hide the item in the DOM before server request
        // This ensures the user sees the item disappear right away
        if (type === 'credential') {
          const credentialElements = document.querySelectorAll(`[data-credential-id="${id}"]`);
          credentialElements.forEach(el => {
            if (el && el.style) {
              el.style.display = 'none';
            }
          });
        } else if (type === 'group') {
          const groupElements = document.querySelectorAll(`[data-group-id="${id}"]`);
          groupElements.forEach(el => {
            if (el && el.style) {
              el.style.display = 'none';
            }
          });
        }
        
        // Show success message immediately
        toast.success(`${type === 'credential' ? 'Credential' : 'Group'} deleted successfully!`);
        
        // Now perform the actual server deletion
        try {
          const endpoint = type === 'credential' ? `/credentials/${id}?action=delete` : `/groups/${id}?action=delete`;
          await axios.delete(endpoint);
          // No need to do anything on success, item is already hidden
        } catch (error) {
          console.error(`Error deleting ${type}:`, error);
          toast.error(`Server error during deletion. Please refresh the page.`);
        }
      } else {
        // PIN verification is required
        console.log('PIN verification required for deletion');
        setPendingCredentialId(id);
        // Always use 'delete' as the action parameter to match server expectations
        setPendingAction('delete');
        setPinVerificationOpen(true);
      }
      
      handleCloseDeleteDialog(); // Close the delete dialog
    } catch (error) {
      console.error('Error in delete handler:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
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
                    {showPassword.form ? <VisibilityOffIcon /> : <VisibilityIcon />}
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
          
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }} required error={!credentialForm.groups || credentialForm.groups.length === 0}>
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
            <FormHelperText>{(!credentialForm.groups || credentialForm.groups.length === 0) ? 'At least one group is required' : ''}</FormHelperText>
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
            disabled={!credentialForm.websiteName || (credentialForm.id === '' && !credentialForm.password) || !credentialForm.groups || credentialForm.groups.length === 0}
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
                    <Typography variant="body1" sx={{ mr: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {showPassword.viewing ? viewingCredential.password : '••••••••'}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword(prev => ({ ...prev, viewing: !prev.viewing }))}
                      color="primary"
                    >
                      {showPassword.viewing ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
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
                    <Typography variant="body1" sx={{ mr: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {showPassword.viewingToken ? viewingCredential.token : '••••••••'}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword(prev => ({ ...prev, viewingToken: !prev.viewingToken }))}
                      color="primary"
                    >
                      {showPassword.viewingToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
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
        credentialId={versionHistoryCredentialId}
        versions={versionHistory}
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
      
      {/* PIN Verification Dialog */}
      <PinVerificationDialog
        open={pinVerificationOpen}
        onClose={() => {
          resetPinVerification();
        }}
        onSuccess={handlePinVerificationSuccess}
        credentialId={pendingCredentialId}
        action={pendingAction}
        attempts={pinVerificationAttempts}
        setAttempts={setPinVerificationAttempts}
      />
    </>
  );
};

export default Dashboard;
