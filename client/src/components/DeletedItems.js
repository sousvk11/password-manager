import React, { useState, useEffect } from 'react';
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
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Pagination,
  Grid,
  Tooltip
} from '@mui/material';
import { 
  DeleteForever as DeleteForeverIcon,
  Visibility as ViewIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import axios from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import PinVerificationDialog from './PinVerificationDialog';

const DeletedItems = () => {
  const [deletedItems, setDeletedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1
  });
  const [filters, setFilters] = useState({
    type: '',
    search: '',
    showRestored: false
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');

  // Fetch deleted items from API
  const fetchDeletedItems = async () => {
    try {
      setLoading(true);
      const { type, search, showRestored } = filters;
      const response = await axios.get('/deleted-items', {
        params: {
          page: pagination.currentPage,
          limit: 10,
          type: type || undefined,
          search: search || undefined,
          showRestored: showRestored
        }
      });

      if (response.data.status === 'success') {
        setDeletedItems(response.data.data.deletedItems);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching deleted items:', error);
      toast.error('Failed to load deleted items');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDeletedItems();
  }, [pagination.currentPage, filters]);

  // Handle page change
  const handlePageChange = (event, value) => {
    setPagination({
      ...pagination,
      currentPage: value
    });
  };

  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters({
      ...filters,
      [name]: value
    });
    // Reset to first page when filters change
    setPagination({
      ...pagination,
      currentPage: 1
    });
  };

  // Handle view item details
  const handleViewItem = (item) => {
    setSelectedItem(item);
    setViewDialogOpen(true);
  };

  // Handle restore item
  // Handle permanent delete
  const handleDeleteClick = (item) => {
    setSelectedItem(item);
    setActionType('delete');
    setPinDialogOpen(true);
  };

  // Handle PIN verification
  const handlePinVerified = async (pin) => {
    setPinDialogOpen(false);
    
    if (actionType === 'delete') {
      setDeleteDialogOpen(true);
    }
  };

  // Permanently delete item
  const handleDeleteConfirm = async () => {
    try {
      const response = await axios.delete(`/deleted-items/${selectedItem.id}/permanent-delete`, {
        data: { pin: null } // PIN already verified in dialog
      });

      if (response.data.status === 'success') {
        toast.success(`${selectedItem.itemType.charAt(0).toUpperCase() + selectedItem.itemType.slice(1)} permanently deleted`);
        fetchDeletedItems();
      }
    } catch (error) {
      console.error('Error permanently deleting item:', error);
      toast.error(error.response?.data?.message || 'Failed to permanently delete item');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Render item content
  const renderItemContent = (item) => {
    try {
      const content = JSON.parse(item.content);
      return (
        <Box sx={{ maxHeight: '500px', overflow: 'auto' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {item.itemType === 'credential' ? 'Credential Details' : 'Group Details'}
          </Typography>
          
          <Paper sx={{ p: 2, mb: 2 }} elevation={1}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Basic Information
            </Typography>
            <Typography variant="body2">
              <strong>{item.itemType === 'credential' ? 'Website Name' : 'Group Name'}:</strong> {item.name}
            </Typography>
            <Typography variant="body2">
              <strong>Original ID:</strong> {item.originalId}
            </Typography>
            <Typography variant="body2">
              <strong>Item Type:</strong> {item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)}
            </Typography>
            <Typography variant="body2">
              <strong>Deleted At:</strong> {formatDate(item.deletedAt)}
            </Typography>
            <Typography variant="body2">
              <strong>Deleted By:</strong> {item.deletedByUser?.name || 'Unknown'} ({item.deletedByUser?.email || 'N/A'})
            </Typography>
            <Typography variant="body2">
              <strong>Original Owner:</strong> {item.originalOwner?.name || 'Unknown'} ({item.originalOwner?.email || 'N/A'})
            </Typography>
            <Typography variant="body2">
              <strong>Status:</strong> {item.isRestored ? 'Restored' : 'Deleted'}
            </Typography>
          </Paper>
          
          {item.itemType === 'credential' && (
            <Paper sx={{ p: 2, mb: 2 }} elevation={1}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Credential Details
              </Typography>
              <Typography variant="body2">
                <strong>URL:</strong> {content.url || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Email:</strong> {content.email || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Username:</strong> {content.username || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Password:</strong> {content.password || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Token:</strong> {content.token || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Description:</strong> {content.description || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Last Modified:</strong> {content.lastModified ? formatDate(content.lastModified) : 'N/A'}
              </Typography>
            </Paper>
          )}
          
          {item.itemType === 'group' && (
            <Paper sx={{ p: 2, mb: 2 }} elevation={1}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Group Details
              </Typography>
              <Typography variant="body2">
                <strong>Description:</strong> {content.description || 'N/A'}
              </Typography>
              {content.members && content.members.length > 0 && (
                <>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Members:</strong>
                  </Typography>
                  <ul style={{ margin: '4px 0' }}>
                    {content.members.map((member, index) => (
                      <li key={index}>{member.name || member.email || 'Unknown user'}</li>
                    ))}
                  </ul>
                </>
              )}
            </Paper>
          )}
          
          <Paper sx={{ p: 2 }} elevation={1}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Timestamps
            </Typography>
            <Typography variant="body2">
              <strong>Created:</strong> {formatDate(content.createdAt)}
            </Typography>
            <Typography variant="body2">
              <strong>Last Updated:</strong> {formatDate(content.updatedAt)}
            </Typography>
          </Paper>
        </Box>
      );
    } catch (error) {
      console.error('Error parsing content:', error);
      return <Typography color="error">Error parsing content: {error.message}</Typography>;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Deleted Items
      </Typography>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Item Type</InputLabel>
              <Select
                value={filters.type}
                label="Item Type"
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="credential">Credentials</MenuItem>
                <MenuItem value="group">Groups</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Search by name"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                endAdornment: <SearchIcon color="action" />
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.showRestored}
                label="Status"
                onChange={(e) => handleFilterChange('showRestored', e.target.value)}
              >
                <MenuItem value={false}>Active Only</MenuItem>
                <MenuItem value={true}>Show Restored</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Items Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Deleted By</TableCell>
              <TableCell>Original Owner</TableCell>
              <TableCell>Deleted At</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">Loading...</TableCell>
              </TableRow>
            ) : deletedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No deleted items found</TableCell>
              </TableRow>
            ) : (
              deletedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)} 
                      color={item.itemType === 'credential' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{item.deletedByUser?.name || 'Unknown'}</TableCell>
                  <TableCell>{item.originalOwner?.name || 'Unknown'}</TableCell>
                  <TableCell>{formatDate(item.deletedAt)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={item.isRestored ? 'Restored' : 'Deleted'} 
                      color={item.isRestored ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => handleViewItem(item)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {!item.isRestored && (
                      <Tooltip title="Permanently Delete">
                        <IconButton size="small" onClick={() => handleDeleteClick(item)}>
                          <DeleteForeverIcon fontSize="small" color="error" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination 
            count={pagination.totalPages} 
            page={pagination.currentPage}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
      
      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedItem?.itemType === 'credential' ? 'Credential Details' : 'Group Details'}
        </DialogTitle>
        <DialogContent>
          {selectedItem && renderItemContent(selectedItem)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Permanently Delete {selectedItem?.itemType}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete this {selectedItem?.itemType}?
            <br />
            Name: {selectedItem?.name}
            <br /><br />
            <Typography color="error" fontWeight="bold">
              This action cannot be undone!
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Permanently Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* PIN Dialog */}
      <PinVerificationDialog 
        open={pinDialogOpen}
        onClose={() => setPinDialogOpen(false)}
        onSuccess={handlePinVerified}
        action={actionType === 'restore' ? 'restoreItem' : 'deleteItem'}
      />
    </Box>
  );
};

export default DeletedItems;
