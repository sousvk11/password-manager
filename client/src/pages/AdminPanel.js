import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
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
  Alert,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import SMTPSettings from '../components/SMTPSettings';
import DomainSettings from '../components/DomainSettings';
import DeletedItems from '../components/DeletedItems';
import AppTitleSettings from '../components/AppTitleSettings';
import FaviconUpload from '../components/FaviconUpload';

const AdminPanel = () => {
  const location = useLocation();
  
  // Tab state - check URL query param for initial tab
  const [tabValue, setTabValue] = useState(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    return tabParam ? parseInt(tabParam, 10) : 0;
  });
  
  // Users state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog states
  const [openAddUserDialog, setOpenAddUserDialog] = useState(false);
  const [openEditUserDialog, setOpenEditUserDialog] = useState(false);
  const [openDeleteUserDialog, setOpenDeleteUserDialog] = useState(false);
  
  // Form states
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  
  // Form validation
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  
  // System stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    totalCredentials: 0,
    activeUsers: 0
  });
  
  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/users');
      setUsers(response.data.data.users);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalUsers: response.data.data.users.length,
        activeUsers: response.data.data.users.filter(user => user.active).length
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch system stats
  const fetchStats = async () => {
    try {
      // Fetch groups count
      const groupsResponse = await axios.get('/groups');
      
      // Fetch credentials count
      const credentialsResponse = await axios.get('/credentials');
      
      setStats(prev => ({
        ...prev,
        totalGroups: groupsResponse.data.data.groups.length,
        totalCredentials: credentialsResponse.data.data.credentials.length
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Dialog handlers
  const handleOpenAddUserDialog = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'user'
    });
    setOpenAddUserDialog(true);
  };
  
  const handleCloseAddUserDialog = () => {
    setOpenAddUserDialog(false);
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'user'
    });
    setFormErrors({});
  };
  
  const handleOpenEditUserDialog = (user) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active !== undefined ? user.active : true
    });
    setOpenEditUserDialog(true);
  };
  
  const handleCloseEditUserDialog = () => {
    setOpenEditUserDialog(false);
    setSelectedUser(null);
  };
  
  const handleOpenDeleteUserDialog = (user) => {
    setSelectedUser(user);
    setOpenDeleteUserDialog(true);
  };
  
  const handleCloseDeleteUserDialog = () => {
    setOpenDeleteUserDialog(false);
    setSelectedUser(null);
  };
  
  // Form handlers
  const handleUserFormChange = (e) => {
    setUserForm({ ...userForm, [e.target.name]: e.target.value });
  };
  
  // Validate user form
  const validateUserForm = () => {
    const errors = {};
    
    // Validate name
    if (!userForm.name || userForm.name.trim() === '') {
      errors.name = 'Name is required';
    }
    
    // Validate email
    if (!userForm.email || !/\S+@\S+\.\S+/.test(userForm.email)) {
      errors.email = 'Valid email is required';
    }
    
    // Validate password
    if (!userForm.password || userForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    return errors;
  };
  
  // Submit handlers
  const handleAddUser = async () => {
    setIsSubmitting(true);
    
    // Validate form
    const errors = validateUserForm();
    setFormErrors(errors);
    
    // If there are errors, don't submit
    if (Object.keys(errors).length > 0) {
      setIsSubmitting(false);
      return;
    }
    
    try {
      console.log('Submitting user form:', userForm);
      const response = await axios.post('/users', userForm);
      console.log('User created successfully:', response.data);
      toast.success('User created successfully!');
      handleCloseAddUserDialog();
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.response?.data?.errors) {
        // Handle validation errors from server
        const serverErrors = {};
        error.response.data.errors.forEach(err => {
          serverErrors[err.path] = err.message;
        });
        setFormErrors(serverErrors);
      } else {
        toast.error(error.response?.data?.message || 'Failed to create user. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditUser = async () => {
    try {
      if (!selectedUser) return;
      
      const formData = { ...userForm };
      if (!formData.password) {
        delete formData.password;
      }
      
      // Use id instead of _id for Sequelize compatibility
      const userId = selectedUser.id || selectedUser._id;
      console.log('Updating user with ID:', userId);
      
      await axios.patch(`/users/${userId}`, formData);
      toast.success('User updated successfully!');
      handleCloseEditUserDialog();
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user. Please try again.');
    }
  };
  
  const handleDeleteUser = async () => {
    try {
      if (!selectedUser) return;
      
      // Use id instead of _id for Sequelize compatibility
      const userId = selectedUser.id || selectedUser._id;
      console.log('Deleting user with ID:', userId);
      
      await axios.delete(`/users/${userId}`);
      toast.success('User deleted successfully!');
      handleCloseDeleteUserDialog();
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user. Please try again.');
    }
  };
  
  // Format date
  const formatDate = (date) => {
    return date ? new Date(date).toLocaleString() : 'Never';
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Admin Panel
        </Typography>
        <Box>
          <Tooltip title="Refresh Data">
            <IconButton onClick={() => { fetchUsers(); fetchStats(); }} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Box sx={{ width: '100%', mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            System Overview
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ minWidth: 150, flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Users
              </Typography>
              <Typography variant="h4">
                {stats.totalUsers}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 150, flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Groups
              </Typography>
              <Typography variant="h4">
                {stats.totalGroups}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 150, flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Credentials
              </Typography>
              <Typography variant="h4">
                {stats.totalCredentials}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 150, flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Active Users
              </Typography>
              <Typography variant="h4">
                {stats.activeUsers}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
      
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
            <Tab label="User Management" id="tab-0" aria-controls="tabpanel-0" />
            <Tab label="System Settings" id="tab-1" aria-controls="tabpanel-1" />
            <Tab label="Deleted Items" id="tab-2" aria-controls="tabpanel-2" />
          </Tabs>
        </Box>
        
        <Box role="tabpanel" hidden={tabValue !== 0} id="tabpanel-0" aria-labelledby="tab-0" sx={{ py: 3 }}>
          {tabValue === 0 && (
            <Paper>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Users
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={handleOpenAddUserDialog}
                >
                  Add User
                </Button>
              </Box>
              
              <TableContainer>
                <Table sx={{ minWidth: 650 }} aria-label="users table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Last Login</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                          <Typography variant="body1" color="text.secondary">
                            No users found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((user) => (
                          <TableRow key={user._id} hover>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Chip 
                                label={user.role} 
                                color={user.role === 'admin' ? 'secondary' : 'primary'} 
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={user.active ? 'Active' : 'Inactive'} 
                                color={user.active ? 'success' : 'error'} 
                                size="small"
                                icon={user.active ? <CheckIcon /> : <CloseIcon />}
                              />
                            </TableCell>
                            <TableCell>{formatDate(user.createdAt)}</TableCell>
                            <TableCell>{formatDate(user.lastLogin)}</TableCell>
                            <TableCell>
                              <Tooltip title="Edit User">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleOpenEditUserDialog(user)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete User">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleOpenDeleteUserDialog(user)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={users.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          )}
        </Box>
        
        <Box role="tabpanel" hidden={tabValue !== 1} id="tabpanel-1" aria-labelledby="tab-1" sx={{ py: 3 }}>
          {tabValue === 1 && (
            <>
              <Typography variant="h6" gutterBottom>
                System Settings
              </Typography>
              
              {/* App Title Settings */}
              <AppTitleSettings />
              
              {/* Favicon Settings */}
              <FaviconUpload />
              
              {/* SMTP Settings */}
              <SMTPSettings />
              
              {/* Domain Settings */}
              <DomainSettings />
            </>
          )}
        </Box>
        
        <Box role="tabpanel" hidden={tabValue !== 2} id="tabpanel-2" aria-labelledby="tab-2" sx={{ py: 3 }}>
          {tabValue === 2 && <DeletedItems />}
        </Box>
      </Box>
      
      {/* Add User Dialog */}
      <Dialog open={openAddUserDialog} onClose={handleCloseAddUserDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          {Object.keys(formErrors).length > 0 && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              Please fix the errors below
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={userForm.name}
            onChange={handleUserFormChange}
            required
            error={!!formErrors.name}
            helperText={formErrors.name}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            id="email"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={userForm.email}
            onChange={handleUserFormChange}
            required
            error={!!formErrors.email}
            helperText={formErrors.email}
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
            value={userForm.password}
            onChange={handleUserFormChange}
            required
            error={!!formErrors.password}
            helperText={formErrors.password || 'Password must be at least 8 characters'}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth required>
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              id="role"
              name="role"
              value={userForm.role}
              label="Role"
              onChange={handleUserFormChange}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddUserDialog} disabled={isSubmitting}>Cancel</Button>
          <Button 
            onClick={handleAddUser} 
            variant="contained"
            disabled={isSubmitting || !userForm.name || !userForm.email || !userForm.password}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Adding...' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={openEditUserDialog} onClose={handleCloseEditUserDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={userForm.name}
            onChange={handleUserFormChange}
            required
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            id="email"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={userForm.email}
            onChange={handleUserFormChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="password"
            name="password"
            label="Password (leave blank to keep current)"
            type="password"
            fullWidth
            variant="outlined"
            value={userForm.password}
            onChange={handleUserFormChange}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel id="edit-role-label">Role</InputLabel>
            <Select
              labelId="edit-role-label"
              id="role"
              name="role"
              value={userForm.role}
              label="Role"
              onChange={handleUserFormChange}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={userForm.active}
                onChange={(e) => setUserForm({ ...userForm, active: e.target.checked })}
                color="success"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography>
                  Status: {userForm.active ? 'Active' : 'Inactive'}
                </Typography>
                <Chip 
                  label={userForm.active ? 'Active' : 'Inactive'} 
                  color={userForm.active ? 'success' : 'error'} 
                  size="small"
                  sx={{ ml: 1 }}
                  icon={userForm.active ? <CheckIcon /> : <CloseIcon />}
                />
              </Box>
            }
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditUserDialog}>Cancel</Button>
          <Button 
            onClick={handleEditUser} 
            variant="contained"
            disabled={!userForm.name || !userForm.email}
          >
            Update User
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={openDeleteUserDialog} onClose={handleCloseDeleteUserDialog}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user {selectedUser?.name}? This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Warning: All credentials and groups owned by this user will also be deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteUserDialog}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel;
