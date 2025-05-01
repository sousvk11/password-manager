import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';

const PinVerificationDialog = ({ open, onClose, onSuccess, credentialId, action }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Reset pin when dialog opens
  useEffect(() => {
    if (open) {
      setPin('');
      setError('');
    }
  }, [open]);
  
  // Handle PIN change
  const handlePinChange = (e) => {
    const value = e.target.value;
    // Only allow digits and limit to 4 characters
    if (/^\d*$/.test(value) && value.length <= 4) {
      setPin(value);
      setError('');
    }
  };
  
  // Handle PIN verification
  const handleVerifyPin = async () => {
    // Validate PIN
    if (!pin) {
      setError('Please enter your PIN');
      return;
    }
    
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    
    try {
      setLoading(true);
      
      // Generate a unique browser tab ID if needed
      const browserTabId = window.browserTabId || `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      window.browserTabId = browserTabId;
      
      // Set the browser tab ID in the request headers
      axios.defaults.headers.common['X-Browser-Tab-ID'] = browserTabId;
      
      // Send the action with the PIN verification request
      const response = await axios.post('/pins/verify', { 
        pin, 
        action: action || 'view' 
      });
      
      if (response.data.status === 'success') {
        // Show session notification if this is a view action
        if (action === 'viewCredential' || action === 'view' || action === 'viewVersionHistory' || action === 'read') {
          toast.info('You will not be asked for your PIN again for the next 1 minute in this browser tab.', {
            autoClose: 5000,
            position: 'bottom-right'
          });
        }
        
        toast.success('PIN verified successfully');
        setAttempts(0); // Reset attempts on success
        onSuccess();
      } else {
        setAttempts(prev => prev + 1);
        setError('Invalid PIN');
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setAttempts(prev => prev + 1);
      setError(error.response?.data?.message || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle dialog close
  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };
  
  // Handle key press (Enter)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleVerifyPin();
    }
  };
  
  // Get action text based on the action type
  const getActionText = () => {
    switch (action) {
      case 'viewCredential':
        return 'view this credential';
      case 'editCredential':
        return 'edit this credential';
      case 'viewVersionHistory':
        return 'view the version history';
      case 'deleteCredential':
        return 'delete this credential';
      case 'deleteGroup':
        return 'delete this group';
      default:
        return 'access this credential';
    }
  };
  
  // Get action icon color based on the action type
  const getActionColor = () => {
    switch (action) {
      case 'deleteCredential':
      case 'deleteGroup':
        return 'error';
      case 'editCredential':
        return 'primary';
      case 'viewVersionHistory':
        return 'secondary';
      case 'viewCredential':
        return 'info';
      default:
        return 'primary';
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <LockOutlined color={getActionColor()} sx={{ mr: 1 }} />
        PIN Verification Required
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Please enter your 4-digit PIN to {getActionText()}.
        </Typography>
        
        <TextField
          fullWidth
          label="Enter PIN"
          value={pin}
          onChange={handlePinChange}
          onKeyPress={handleKeyPress}
          error={!!error}
          helperText={error}
          type="password"
          autoFocus
          disabled={loading}
          inputProps={{ 
            maxLength: 4,
            inputMode: 'numeric',
            pattern: '[0-9]*'
          }}
          sx={{ mt: 1 }}
        />
        
        {/* Only show the timeout message for view credential action */}
        {action === 'viewCredential' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You will not be asked for your PIN again for the next 1 minute in this browser tab.
          </Alert>
        )}
        
        {attempts > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {attempts} attempt{attempts > 1 ? 's' : ''} made. Please try again.
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={handleClose}
          color="inherit"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleVerifyPin} 
          color={getActionColor()} 
          variant="contained"
          disabled={loading || !pin || pin.length !== 4}
        >
          {loading ? <CircularProgress size={24} /> : 'Verify'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PinVerificationDialog;
