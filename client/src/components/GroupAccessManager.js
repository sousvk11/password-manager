import React, { useState, useEffect, useContext } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Box,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
  Input
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import axios from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';

const GroupAccessManager = ({ open, handleClose, groupId, onUpdate }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('viewer'); // Default to viewer role
  const [addingMember, setAddingMember] = useState(false);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    if (open && groupId) {
      fetchMembersList();
      fetchUsers();
    }
  }, [open, groupId]);

  const fetchMembersList = async () => {
    setLoading(true);
    try {
      console.log(`Fetching members for group ${groupId}`);
      
      // Always fetch fresh data from the server to ensure we have the latest roles
      const response = await axios.get(`/groups/${groupId}/members`);
      console.log('Group members response:', response.data);
      
      let membersList = [];
      
      // Handle different response structures
      if (response.data && response.data.data && response.data.data.members) {
        membersList = response.data.data.members;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        membersList = response.data.data;
      } else if (response.data && response.data.members) {
        membersList = response.data.members;
      } else if (response.data && Array.isArray(response.data)) {
        membersList = response.data;
      }
      
      console.log('Parsed members list:', membersList);
      if (membersList.length > 0) {
        // Ensure we clear any existing members before setting new ones
        setMembers(membersList);
      } else {
        // If no members returned, set an empty array
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching group members list:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('Failed to load members list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupWithMembers = async () => {
    try {
      console.log(`Fetching group ${groupId} with members`);
      const response = await axios.get(`/groups/${groupId}`);
      console.log('Group with members response:', response.data);
      
      if (response.data && response.data.data && response.data.data.group && response.data.data.group.members) {
        console.log('Setting members from group data:', response.data.data.group.members);
        setMembers(response.data.data.group.members);
      } else if (response.data && response.data.group && response.data.group.members) {
        console.log('Setting members from group data:', response.data.group.members);
        setMembers(response.data.group.members);
      }
    } catch (error) {
      console.error('Error fetching group with members:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching users for dropdown...');
      try {
        // Try the /api/users endpoint first
        const response = await axios.get('/users');
        console.log('Users response:', response.data);
        
        let usersList = [];
        
        if (response.data && response.data.data && response.data.data.users) {
          usersList = response.data.data.users;
        } else if (response.data && response.data.users) {
          usersList = response.data.users;
        } else if (response.data && Array.isArray(response.data)) {
          usersList = response.data;
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          usersList = response.data.data;
        }
        
        console.log('Parsed users list:', usersList);
        
        if (usersList && usersList.length > 0) {
          setUsers(usersList);
          return;
        }
      } catch (innerError) {
        console.error('Error fetching users:', innerError);
        console.error('Error details:', innerError.response?.data || innerError.message);
      }
      
      // Try the /api/auth/users endpoint as fallback
      try {
        const fallbackResponse = await axios.get('/auth/users');
        console.log('Fallback users response:', fallbackResponse.data);
        
        let usersList = [];
        
        if (fallbackResponse.data && fallbackResponse.data.data && fallbackResponse.data.data.users) {
          usersList = fallbackResponse.data.data.users;
        } else if (fallbackResponse.data && fallbackResponse.data.users) {
          usersList = fallbackResponse.data.users;
        } else if (fallbackResponse.data && Array.isArray(fallbackResponse.data)) {
          usersList = fallbackResponse.data;
        } else if (fallbackResponse.data && fallbackResponse.data.data && Array.isArray(fallbackResponse.data.data)) {
          usersList = fallbackResponse.data.data;
        }
        
        if (usersList && usersList.length > 0) {
          setUsers(usersList);
          return;
        }
      } catch (fallbackError) {
        console.error('Error fetching users from fallback endpoint:', fallbackError);
      }
      
      // Last resort fallback: If we can't fetch users, at least add the current user
      if (currentUser) {
        console.log('Using current user as fallback:', currentUser);
        setUsers([currentUser]);
      } else {
        toast.error('Failed to load users. Please try again.');
      }
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      toast.error('Failed to load users. Please try again.');
    }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      console.log(`Updating role for member ${userId} in group ${groupId} to ${newRole}`);
      
      const response = await axios.put(`/groups/${groupId}/members/${userId}`, {
        role: newRole
      });
      
      console.log('Update member role response:', response.data);
      
      if (response.data && (response.data.success || response.data.status === 'success')) {
        toast.success('Member role updated successfully');
        
        // Force a complete refresh of the members list from the server
        await fetchMembersList();
        
        // Notify parent component to update its state
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate();
        }
        
        // Force refresh of the dashboard to update the group card
        if (window.refreshDashboard && typeof window.refreshDashboard === 'function') {
          window.refreshDashboard();
        }
      } else {
        toast.error(response.data?.message || 'Failed to update member role');
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      console.log(`Removing member ${userId} from group ${groupId}`);
      
      const response = await axios.delete(`/groups/${groupId}/members/${userId}`);
      console.log('Remove member response:', response.data);
      
      if (response.data && (response.data.success || response.data.status === 'success')) {
        toast.success('Member removed successfully');
        
        // Update the members list in state directly for immediate UI update
        setMembers(prevMembers => prevMembers.filter(member => {
          const memberId = member.id || member.userId || (member.User && member.User.id);
          return memberId !== userId;
        }));
        
        // Then fetch the updated list from the server
        await fetchMembersList();
        
        // Notify parent component to update its state
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate();
        }
        
        // Force refresh of the dashboard to update the group card
        if (window.refreshDashboard && typeof window.refreshDashboard === 'function') {
          window.refreshDashboard();
        }
      } else {
        toast.error(response.data?.message || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleAddMember = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setAddingMember(true);
    try {
      // Track success and failures
      let successCount = 0;
      let failCount = 0;
      let errorMessages = [];
      
      console.log('Adding members:', selectedUsers);
      
      // Add each selected user one by one
      for (const userId of selectedUsers) {
        try {
          console.log(`Adding user ${userId} to group ${groupId} with role ${selectedRole}`);
          
          // Use the existing addUserToGroup endpoint which is already working
          const response = await axios.post(`/groups/${groupId}/members`, {
            userId: parseInt(userId, 10), // Ensure userId is sent as a number
            role: selectedRole // Use the selected role (viewer or editor)
          });
          
          console.log('Response:', response.data);
          
          if (response.data && (response.data.success || response.data.status === 'success')) {
            successCount++;
          } else {
            console.error('Failed to add member, response:', response.data);
            failCount++;
            if (response.data && response.data.message) {
              errorMessages.push(response.data.message);
            }
          }
        } catch (error) {
          console.error(`Error adding member ${userId}:`, error);
          console.error('Error details:', error.response?.data || error.message);
          failCount++;
          
          // Collect error messages
          if (error.response?.data?.message) {
            errorMessages.push(error.response.data.message);
          } else if (error.message) {
            errorMessages.push(error.message);
          }
        }
      }
      
      // Show appropriate toast messages
      if (successCount > 0) {
        toast.success(`${successCount} member${successCount !== 1 ? 's' : ''} added successfully`);
        fetchMembersList();
        setSelectedUsers([]);
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate();
        }
      }
      
      if (failCount > 0) {
        // Show more detailed error message if available
        if (errorMessages.length > 0) {
          // Show only the first error to avoid overwhelming the user
          toast.error(`Failed to add ${failCount} member${failCount !== 1 ? 's' : ''}: ${errorMessages[0]}`);
        } else {
          toast.error(`Failed to add ${failCount} member${failCount !== 1 ? 's' : ''}`);
        }
      }
    } catch (error) {
      console.error('Error in batch member addition:', error);
      toast.error('An error occurred while adding members');
    } finally {
      setAddingMember(false);
    }
  };

  const handleUserSelectionChange = (event) => {
    const value = event.target.value;
    setSelectedUsers(value);
  };

  const isAdmin = currentUser && currentUser.role === 'admin';
  const filteredUsers = users.filter(user => 
    !members.some(member => member.userId === user.id || member.id === user.id)
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Manage Group Members
        <IconButton
          aria-label="close"
          onClick={handleClose}
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
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                Add New Member:
              </Typography>
              <FormControl sx={{ minWidth: 200 }}>
                <Select
                  multiple
                  value={selectedUsers}
                  onChange={handleUserSelectionChange}
                  displayEmpty
                  size="small"
                  renderValue={(selected) => {
                    if (selected.length === 0) {
                      return <em>Select Users</em>;
                    }
                    
                    return `${selected.length} user${selected.length !== 1 ? 's' : ''} selected`;
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        width: 250,
                      },
                    },
                  }}
                >
                  {users.length === 0 ? (
                    <MenuItem disabled>Loading users...</MenuItem>
                  ) : (
                    users.map((user) => {
                      // Skip rendering the current user as an option
                      if (currentUser && user.id === currentUser.id) {
                        return null;
                      }
                      
                      // Check if user is already a member
                      const isAlreadyMember = members.some(member => {
                        const memberId = member.id || member.userId || (member.User && member.User.id);
                        return memberId === user.id;
                      });
                      
                      return (
                        <MenuItem 
                          key={user.id} 
                          value={user.id}
                          disabled={isAlreadyMember}
                        >
                          {user.name || 'Unknown'} ({user.email || 'No email'})
                        </MenuItem>
                      );
                    }).filter(Boolean) // Filter out null entries (like current user)
                  )}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }}>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  size="small"
                >
                  <MenuItem value="viewer">View Only</MenuItem>
                  <MenuItem value="editor">Edit</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PersonAddIcon />}
                onClick={handleAddMember}
                disabled={addingMember || selectedUsers.length === 0}
              >
                {addingMember ? <CircularProgress size={24} /> : 'Add Members'}
              </Button>
            </Box>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : members && members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No members found for this group.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (members || []).map(member => {
                      // Debug output to see the member structure
                      console.log('Rendering member:', member);
                      
                      // Handle different possible member data structures
                      const userId = member.id || member.userId || (member.User && member.User.id);
                      const user = member.User || member;
                      const name = user.name || 'Unknown';
                      const email = user.email || 'Unknown';
                      
                      // Extract role from different possible structures
                      let role = 'member';
                      if (member.role) {
                        role = member.role;
                      } else if (member.GroupMember && member.GroupMember.role) {
                        role = member.GroupMember.role;
                      } else if (typeof member.dataValues === 'object' && member.dataValues.role) {
                        role = member.dataValues.role;
                      }
                      
                      console.log(`Member ${name} has role: ${role}`);
                      
                      // Skip rendering if we don't have a valid userId
                      if (!userId) {
                        console.warn('Skipping member with no userId:', member);
                        return null;
                      }
                      
                      return (
                        <TableRow key={userId} hover>
                          <TableCell>{name}</TableCell>
                          <TableCell>{email}</TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <Select
                                value={role}
                                onChange={(e) => handleUpdateMemberRole(userId, e.target.value)}
                                size="small"
                                renderValue={(selected) => {
                                  return selected === 'viewer' ? 'View Only' : 
                                         selected === 'editor' ? 'Edit' : 
                                         selected === 'admin' ? 'Admin' : 'Member';
                                }}
                              >
                                <MenuItem value="viewer">View Only</MenuItem>
                                <MenuItem value="editor">Edit</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Remove Member">
                              <IconButton
                                color="error"
                                onClick={() => handleRemoveMember(userId)}
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    }).filter(Boolean) // Filter out any null entries
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GroupAccessManager;
