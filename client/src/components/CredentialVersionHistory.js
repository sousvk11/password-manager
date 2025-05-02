import React, { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CopyIcon from '@mui/icons-material/ContentCopy';
// Restore functionality removed as requested
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';

const CredentialVersionHistory = ({ open, handleClose, credentialId }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState({});

  useEffect(() => {
    if (open && credentialId) {
      fetchVersionHistory();
    }
  }, [open, credentialId]);

  const fetchVersionHistory = async () => {
    setLoading(true);
    try {
      // Request decrypted versions
      const response = await axios.get(`/credentials/${credentialId}/versions?decrypted=true`);
      if (response.data && response.data.data && response.data.data.versions) {
        setVersions(response.data.data.versions);
      } else {
        setVersions([]);
      }
    } catch (error) {
      console.error('Error fetching credential version history:', error);
      toast.error('Failed to load version history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (id) => {
    setShowPassword(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text) => {
    if (!text) {
      toast.error('Nothing to copy');
      return;
    }
    
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

  // handleRestore function removed as requested

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getChangeTypeColor = (changeType) => {
    switch (changeType) {
      case 'create':
        return 'success';
      case 'update':
        return 'primary';
      case 'delete':
        return 'error';
      default:
        return 'default';
    }
  };

  const renderSensitiveField = (value, fieldId) => {
    const isVisible = showPassword[fieldId];
    
    // Only show toggle and copy if there's actually a value
    const hasValue = value && value !== '(empty)' && value !== '(decryption error)';
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {isVisible ? (value || '(empty)') : (hasValue ? '••••••••' : '(empty)')}
        </Typography>
        {hasValue && (
          <>
            <IconButton
              size="small"
              onClick={() => togglePasswordVisibility(fieldId)}
            >
              {isVisible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => copyToClipboard(value)}
              title="Copy value"
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </Box>
    );
  };

  const renderGroupIds = (groupIds) => {
    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return <Typography variant="body2">(empty)</Typography>;
    }
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {groupIds.map(id => (
          <Chip
            key={id}
            label={id}
            size="small"
            variant="outlined"
            color="secondary"
          />
        ))}
      </Box>
    );
  };

  const renderChangedFields = (version) => {
    if (!version.changedFields || !Array.isArray(version.changedFields) || version.changedFields.length === 0) {
      return <Typography variant="body2">No changes</Typography>;
    }

    if (version.changeType === 'create') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {version.changedFields.map((field) => {
            const isSensitive = field === 'password' || field === 'token';
            const isGroupIds = field === 'groupIds';
            const value = version[field];
            
            return (
              <Box key={field} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Chip
                  label={field}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
                {isSensitive ? 
                  renderSensitiveField(value, `${version.id}-${field}`) : 
                  isGroupIds ?
                  renderGroupIds(value) :
                  <Typography variant="body2">{value || '(empty)'}</Typography>
                }
              </Box>
            );
          })}
        </Box>
      );
    }

    if (version.changeType === 'delete') {
      return (
        <Typography variant="body2" color="error">
          This credential was deleted
        </Typography>
      );
    }

    // For updates, show before and after values
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {version.changedFields.map((field) => {
          const change = version.fieldChanges?.[field] || {};
          const isSensitive = field === 'password' || field === 'token';
          const isGroupIds = field === 'groupIds';
          
          return (
            <Box key={field} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Chip
                label={field}
                size="small"
                variant="outlined"
                color="primary"
              />
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                {/* Old Value */}
                <Box sx={{ flex: 1 }}>
                  {isSensitive ? 
                    renderSensitiveField(change.oldValue, `${version.id}-${field}-old`) : 
                    isGroupIds ?
                    renderGroupIds(change.oldValue) :
                    <Typography variant="body2">{change.oldValue || '(empty)'}</Typography>
                  }
                </Box>
                
                {/* Arrow */}
                <Typography variant="body2" sx={{ mx: 1 }}>→</Typography>
                
                {/* New Value */}
                <Box sx={{ flex: 1 }}>
                  {isSensitive ? 
                    renderSensitiveField(change.newValue, `${version.id}-${field}-new`) : 
                    isGroupIds ?
                    renderGroupIds(change.newValue) :
                    <Typography variant="body2">{change.newValue || '(empty)'}</Typography>
                  }
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Credential Version History
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
        ) : versions.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', my: 4 }}>
            No version history found for this credential.
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            {versions.map((version, index) => (
              <Paper key={version.id} elevation={1} sx={{ mb: 3, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">Version {version.versionNumber}</Typography>
                    <Chip
                      label={version.changeType}
                      size="small"
                      color={getChangeTypeColor(version.changeType)}
                    />
                  </Box>
                  {/* Restore button removed as requested */}
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {formatDate(version.createdAt)} by {version.editor ? version.editor.name : 'Unknown'}
                </Typography>
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Website: {version.websiteName}
                  </Typography>
                  
                  {version.changeType === 'update' && (
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Changed Fields:
                    </Typography>
                  )}
                  
                  {renderChangedFields(version)}
                </Box>
              </Paper>
            ))}
          </Box>
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

export default CredentialVersionHistory;
