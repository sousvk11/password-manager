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
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as ViewIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';

const CredentialVersionHistory = ({ open, handleClose, credentialId, onRestore }) => {
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
      const response = await axios.get(`/credentials/${credentialId}/versions`);
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

  const togglePasswordVisibility = (versionId) => {
    setShowPassword(prev => ({
      ...prev,
      [versionId]: !prev[versionId]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    }).catch(err => {
      console.error('Could not copy text: ', err);
      toast.error('Failed to copy to clipboard');
    });
  };

  const handleRestore = (version) => {
    if (onRestore && typeof onRestore === 'function') {
      // Create a credential object from the version
      const credential = {
        id: credentialId,
        websiteName: version.websiteName,
        url: version.url,
        email: version.email,
        userId: version.userId,
        password: version.password,
        token: version.token,
        description: version.description
      };
      
      onRestore(credential);
      handleClose();
    }
  };

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

  const renderChangedFields = (changedFields) => {
    if (!changedFields || !Array.isArray(changedFields) || changedFields.length === 0) {
      return <Typography variant="body2">No changes</Typography>;
    }

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {changedFields.map((field) => (
          <Chip
            key={field}
            label={field}
            size="small"
            variant="outlined"
            color="primary"
          />
        ))}
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
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Change Type</TableCell>
                  <TableCell>Changed By</TableCell>
                  <TableCell>Website Name</TableCell>
                  <TableCell>Password</TableCell>
                  <TableCell>Changed Fields</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id} hover>
                    <TableCell>{version.versionNumber}</TableCell>
                    <TableCell>{formatDate(version.createdAt)}</TableCell>
                    <TableCell>
                      <Chip
                        label={version.changeType}
                        size="small"
                        color={getChangeTypeColor(version.changeType)}
                      />
                    </TableCell>
                    <TableCell>
                      {version.editor ? (
                        <Typography variant="body2">
                          {version.editor.name}
                        </Typography>
                      ) : (
                        'Unknown'
                      )}
                    </TableCell>
                    <TableCell>{version.websiteName}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {showPassword[version.id] ? version.password : '••••••••'}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => togglePasswordVisibility(version.id)}
                        >
                          {showPassword[version.id] ? <VisibilityOffIcon fontSize="small" /> : <ViewIcon fontSize="small" />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(version.password)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {renderChangedFields(version.changedFields)}
                    </TableCell>
                    <TableCell>
                      {version.changeType !== 'delete' && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleRestore(version)}
                          title="Restore this version"
                        >
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
