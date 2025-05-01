import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  FormGroup,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert
} from '@mui/material';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';
import AuthContext from '../context/AuthContext';

const OtpManagement = () => {
  const { currentUser } = useContext(AuthContext);
  
  // State variables
  const [otpEnabled, setOtpEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  
  // Fetch OTP settings and PIN status when component mounts
  useEffect(() => {
    fetchOtpSettings();
    checkPinStatus();
  }, []);
  
  // Fetch current OTP settings
  const fetchOtpSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/otp-settings');
      
      if (response.data && response.data.status === 'success') {
        setOtpEnabled(response.data.data.otpEnabled);
      }
    } catch (error) {
      console.error('Error fetching OTP settings:', error);
      toast.error('Failed to load OTP settings');
    } finally {
      setLoading(false);
    }
  };
  
  // Check if PIN verification is enabled
  const checkPinStatus = async () => {
    try {
      const response = await axios.get('/pins/status');
      
      if (response.data && response.data.status === 'success') {
        setIsPinEnabled(response.data.data.enabled);
        console.log('PIN verification status:', response.data.data.enabled);
      }
    } catch (error) {
      console.error('Error checking PIN status:', error);
      // Default to true for safety if we can't determine PIN status
      setIsPinEnabled(true);
    }
  };
  
  // Handle toggle OTP
  const handleToggleOtp = async () => {
    // If trying to disable OTP and PIN is enabled, show PIN verification dialog
    if (otpEnabled && isPinEnabled) {
      console.log('PIN verification is enabled, showing PIN dialog');
      setPinDialogOpen(true);
      return;
    }
    
    // If PIN is disabled or enabling OTP, no PIN required
    try {
      setLoading(true);
      console.log('Toggling OTP without PIN, current state:', otpEnabled);
      
      // When disabling OTP and PIN is disabled, explicitly pass an empty PIN
      // This ensures the server knows we're intentionally not providing a PIN
      const requestData = {
        enable: !otpEnabled // Toggle the current state
      };
      
      // If disabling OTP, explicitly include pin: null to indicate PIN is not required
      if (otpEnabled) {
        requestData.pin = null;
      }
      
      const response = await axios.post('/otp-settings/toggle', requestData);
      
      if (response.data && response.data.status === 'success') {
        setOtpEnabled(!otpEnabled);
        toast.success(otpEnabled ? 'OTP verification disabled successfully' : 'OTP verification enabled successfully');
      }
    } catch (error) {
      console.error('Error toggling OTP:', error);
      toast.error(error.response?.data?.message || 'Failed to update OTP verification');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle PIN verification to disable OTP
  const handlePinVerification = async () => {
    if (!pin) {
      setPinError('Please enter your PIN');
      return;
    }
    
    try {
      setPinLoading(true);
      setPinError('');
      
      const response = await axios.post('/otp-settings/toggle', {
        enable: false,
        pin
      });
      
      if (response.data && response.data.status === 'success') {
        setOtpEnabled(false);
        setPinDialogOpen(false);
        setPin('');
        toast.success('OTP verification disabled successfully');
      }
    } catch (error) {
      console.error('Error disabling OTP:', error);
      setPinError(error.response?.data?.message || 'Failed to disable OTP verification');
    } finally {
      setPinLoading(false);
    }
  };
  
  // Handle close PIN dialog
  const handleClosePinDialog = () => {
    setPinDialogOpen(false);
    setPin('');
    setPinError('');
  };
  
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        OTP Verification Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        When enabled, you will be required to enter a one-time verification code sent to your email when logging in from a new device.
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={otpEnabled}
                onChange={handleToggleOtp}
                color="primary"
              />
            }
            label={otpEnabled ? "OTP Verification Enabled" : "OTP Verification Disabled"}
          />
          {!otpEnabled && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Warning: Disabling OTP verification reduces the security of your account. Anyone with your password can log in without additional verification.
            </Alert>
          )}
        </FormGroup>
      )}
      
      {/* PIN Verification Dialog */}
      <Dialog open={pinDialogOpen} onClose={handleClosePinDialog}>
        <DialogTitle>PIN Verification Required</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph sx={{ mt: 1 }}>
            For security reasons, you must verify your PIN to disable OTP verification.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Enter PIN"
            type="password"
            fullWidth
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            error={!!pinError}
            helperText={pinError}
            inputProps={{ maxLength: 6 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePinDialog}>Cancel</Button>
          <Button 
            onClick={handlePinVerification} 
            color="primary"
            disabled={pinLoading}
          >
            {pinLoading ? <CircularProgress size={24} /> : 'Verify PIN'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default OtpManagement;
