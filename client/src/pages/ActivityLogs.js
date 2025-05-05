import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const ActivityLogs = () => {
  const { currentUser, isAdmin } = useContext(AuthContext);
  
  // State
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filter state
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    startDate: '',
    endDate: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  
  // Fetch activities
  const fetchActivities = async () => {
    setLoading(true);
    try {
      let endpoint = isAdmin() 
        ? '/activities' 
        : `/activities/user/${currentUser.id}`;
      
      // Add query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page + 1);
      queryParams.append('limit', rowsPerPage);
      
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.resourceType) queryParams.append('resourceType', filters.resourceType);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      console.log(`Fetching activities from: ${endpoint}?${queryParams.toString()}`);
      const response = await axios.get(`${endpoint}?${queryParams.toString()}`);
      console.log('Activity logs response:', response.data);
      
      if (response.data && response.data.data && response.data.data.activities) {
        setActivities(response.data.data.activities);
        setTotalCount(response.data.totalPages * rowsPerPage);
      } else {
        setActivities([]);
        setTotalCount(0);
        console.error('Unexpected activity logs response format:', response.data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to load activity logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [page, rowsPerPage, currentUser.id, isAdmin]);
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Handle filter change
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };
  
  // Apply filters
  const applyFilters = () => {
    setPage(0);
    fetchActivities();
  };
  
  // Clear filters
  const clearFilters = () => {
    setFilters({
      action: '',
      resourceType: '',
      startDate: '',
      endDate: ''
    });
    setPage(0);
    setTimeout(fetchActivities, 0);
  };
  
  // Toggle filters
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  
  // Helper functions
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Function to safely access nested properties
  const safeGet = (obj, path, defaultValue = '') => {
    try {
      const result = path.split('.').reduce((o, key) => o && o[key], obj);
      return result !== undefined ? result : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };
  
  // Get action color
  const getActionColor = (action) => {
    if (action.startsWith('create')) return 'success';
    if (action.startsWith('edit') || action.startsWith('update')) return 'primary';
    if (action.startsWith('delete')) return 'error';
    if (action.startsWith('share')) return 'secondary';
    if (action === 'login' || action === 'logout') return 'info';
    return 'default';
  };
  
  // Get resource type icon color
  const getResourceTypeColor = (resourceType) => {
    switch (resourceType) {
      case 'user':
        return 'primary';
      case 'credential':
        return 'secondary';
      case 'group':
        return 'success';
      default:
        return 'default';
    }
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Activity Logs
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchActivities} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle Filters">
            <IconButton 
              onClick={toggleFilters} 
              color={showFilters ? "primary" : "default"}
            >
              <FilterIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="action-filter-label">Action</InputLabel>
                <Select
                  labelId="action-filter-label"
                  id="action"
                  name="action"
                  value={filters.action}
                  label="Action"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="login">Login</MenuItem>
                  <MenuItem value="logout">Logout</MenuItem>
                  <MenuItem value="create_credential">Create Credential</MenuItem>
                  <MenuItem value="edit_credential">Edit Credential</MenuItem>
                  <MenuItem value="delete_credential">Delete Credential</MenuItem>
                  <MenuItem value="create_group">Create Group</MenuItem>
                  <MenuItem value="edit_group">Edit Group</MenuItem>
                  <MenuItem value="delete_group">Delete Group</MenuItem>
                  <MenuItem value="share_credential">Share Credential</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="resource-type-filter-label">Resource Type</InputLabel>
                <Select
                  labelId="resource-type-filter-label"
                  id="resourceType"
                  name="resourceType"
                  value={filters.resourceType}
                  label="Resource Type"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="credential">Credential</MenuItem>
                  <MenuItem value="group">Group</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                id="startDate"
                name="startDate"
                label="Start Date"
                type="date"
                size="small"
                value={filters.startDate}
                onChange={handleFilterChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                id="endDate"
                name="endDate"
                label="End Date"
                type="date"
                size="small"
                value={filters.endDate}
                onChange={handleFilterChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="contained" 
                  onClick={applyFilters}
                  fullWidth
                >
                  Apply
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={clearFilters}
                  color="error"
                >
                  <ClearIcon />
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      <Paper>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="activity logs table">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Resource Type</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Device Info</TableCell>
                <TableCell>Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No activity logs found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow key={activity.id} hover>
                    <TableCell>{formatTimestamp(activity.createdAt || activity.timestamp)}</TableCell>
                    <TableCell>
                      {activity.User ? (
                        <>
                          <Typography variant="body2">
                            {activity.User.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.User.email}
                          </Typography>
                        </>
                      ) : (
                        'Unknown User'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={activity.action.replace(/_/g, ' ')} 
                        size="small" 
                        color={getActionColor(activity.action)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={activity.resourceType} 
                        size="small" 
                        variant="outlined"
                        color={getResourceTypeColor(activity.resourceType)}
                      />
                    </TableCell>
                    <TableCell>
                      {activity.details && (
                        <Box>
                          {/* Display standard details */}
                          {safeGet(activity, 'details.websiteName') && (
                            <Typography variant="body2">
                              Website: {safeGet(activity, 'details.websiteName')}
                            </Typography>
                          )}
                          {safeGet(activity, 'details.name') && (
                            <Typography variant="body2">
                              Name: {safeGet(activity, 'details.name')}
                            </Typography>
                          )}
                          {safeGet(activity, 'details.groupName') && (
                            <Typography variant="body2">
                              Group: {safeGet(activity, 'details.groupName')}
                            </Typography>
                          )}
                          {safeGet(activity, 'details.fields') && (
                            <Typography variant="body2">
                              Fields: {Array.isArray(safeGet(activity, 'details.fields')) 
                                ? safeGet(activity, 'details.fields').join(', ') 
                                : safeGet(activity, 'details.fields')}
                            </Typography>
                          )}
                          {safeGet(activity, 'details.action') && (
                            <Typography variant="body2">
                              Action: {safeGet(activity, 'details.action')}
                            </Typography>
                          )}
                          
                          {/* Display resource-specific details */}
                          {activity.resourceType === 'credential' && safeGet(activity, 'details.credentialName') && (
                            <Typography variant="body2">
                              Credential: {safeGet(activity, 'details.credentialName')}
                            </Typography>
                          )}
                          {activity.resourceType === 'group' && safeGet(activity, 'details.groupName') && (
                            <Typography variant="body2">
                              Group: {safeGet(activity, 'details.groupName')}
                            </Typography>
                          )}
                          {activity.resourceType === 'user' && safeGet(activity, 'details.targetUser') && (
                            <Typography variant="body2">
                              Target User: {safeGet(activity, 'details.targetUser')}
                            </Typography>
                          )}
                          
                          {/* Display any additional context */}
                          {safeGet(activity, 'details.context') && (
                            <Typography variant="body2">
                              Context: {safeGet(activity, 'details.context')}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Device Information */}
                      <Box>
                        {safeGet(activity, 'details.browser') && (
                          <Typography variant="body2">
                            Browser: {safeGet(activity, 'details.browser')}
                          </Typography>
                        )}
                        {safeGet(activity, 'details.os') && (
                          <Typography variant="body2">
                            OS: {safeGet(activity, 'details.os')}
                          </Typography>
                        )}
                        <Typography variant="body2">
                          IP: {activity.ipAddress || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {/* Location Information */}
                      {safeGet(activity, 'details.location') ? (
                        <Box>
                          {safeGet(activity, 'details.location.country') && (
                            <Typography variant="body2">
                              Country: {safeGet(activity, 'details.location.country')}
                            </Typography>
                          )}
                          {safeGet(activity, 'details.location.region') && (
                            <Typography variant="body2">
                              Region: {safeGet(activity, 'details.location.region')}
                            </Typography>
                          )}
                          {safeGet(activity, 'details.location.city') && (
                            <Typography variant="body2">
                              City: {safeGet(activity, 'details.location.city')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2">Location data unavailable</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default ActivityLogs;
