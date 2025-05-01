import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { LockOutlined, RefreshOutlined, VerifiedUser } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';
import PinVerificationDialog from './PinVerificationDialog';

const steps = ['Request PIN', 'Verify Email', 'Set PIN'];

const PinManagement = () => {
  const [loading, setLoading] = useState(true);
  const [pinStatus, setPinStatus] = useState({
    hasPin: false,
    enabled: false,
    expired: false,
    expiresAt: null
  });
  
  // OTP verification states
  const [activeStep, setActiveStep] = useState(0);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [generatedPin, setGeneratedPin] = useState(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState('');
  
  // Custom PIN state
  const [customPin, setCustomPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [useCustomPin, setUseCustomPin] = useState(true);
  
  // PIN verification dialog for disabling PIN
  const [showPinVerificationDialog, setShowPinVerificationDialog] = useState(false);

  // Fetch PIN status on component mount
  useEffect(() => {
    fetchPinStatus();
  }, []);
  
  // Fetch PIN status from server
  const fetchPinStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/pins/status');
      
      if (response.data.status === 'success') {
        setPinStatus(response.data.data);
        setEmail(response.data.data.email || '');
      }
    } catch (error) {
      console.error('Error fetching PIN status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle regenerate PIN button click
  const handleRegeneratePin = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/pins/generate/initiate');
      
      if (response.data.status === 'success') {
        setShowPinDialog(true);
        setActiveStep(1);
        startCountdown();
      }
    } catch (error) {
      console.error('Error initiating PIN generation:', error);
      toast.error('Failed to initiate PIN generation');
    } finally {
      setLoading(false);
    }
  };
  
  // Start countdown for OTP resend
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Handle OTP verification
  const handleVerifyOTP = async () => {
    if (!otp) {
      setOtpError('Please enter verification code');
      return;
    }
    
    // Validate custom PIN if user wants to set their own
    if (useCustomPin) {
      if (!customPin) {
        setPinError('Please enter a PIN');
        return;
      }
      
      if (!/^\d{4}$/.test(customPin)) {
        setPinError('PIN must be exactly 4 digits');
        return;
      }
      
      if (customPin !== confirmPin) {
        setPinError('PINs do not match');
        return;
      }
    }
    
    try {
      setLoading(true);
      const response = await axios.post('/pins/generate/complete', {
        otp,
        enabled: true,
        customPin: useCustomPin ? customPin : undefined
      });
      
      if (response.data.status === 'success') {
        setGeneratedPin(response.data.data.pin);
        setActiveStep(2);
        await fetchPinStatus();
        toast.success('PIN generated successfully');
      }
    } catch (error) {
      console.error('Error generating PIN:', error);
      setOtpError(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    try {
      setLoading(true);
      const response = await axios.post('/pins/generate/initiate');
      
      if (response.data.status === 'success') {
        startCountdown();
        toast.success('Verification code resent');
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      toast.error('Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle PIN enabled/disabled
  const handleTogglePin = async (event) => {
    const enabled = event.target.checked;
    
    // If enabling PIN, no verification needed
    if (enabled) {
      try {
        setLoading(true);
        const response = await axios.patch('/pins/toggle', {
          enabled: true
        });
        
        if (response.data.status === 'success') {
          toast.success('PIN enabled successfully');
          setPinStatus(prev => ({
            ...prev,
            enabled: true
          }));
        }
      } catch (error) {
        console.error('Error enabling PIN:', error);
        toast.error('Failed to enable PIN');
      } finally {
        setLoading(false);
      }
    } else {
      // If disabling PIN, show PIN verification dialog
      setShowPinVerificationDialog(true);
      // Reset the switch to enabled state until verification is complete
      event.target.checked = true;
    }
  };
  
  // Handle PIN verification success for disabling PIN
  const handlePinVerificationSuccess = async () => {
    try {
      setLoading(true);
      const response = await axios.patch('/pins/toggle', {
        enabled: false
      });
      
      if (response.data.status === 'success') {
        toast.success('PIN disabled successfully');
        setPinStatus(prev => ({
          ...prev,
          enabled: false
        }));
        setShowPinVerificationDialog(false);
      }
    } catch (error) {
      console.error('Error disabling PIN:', error);
      toast.error('Failed to disable PIN');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle PIN verification dialog close
  const handlePinVerificationDialogClose = () => {
    setShowPinVerificationDialog(false);
  };

  // Format expiry date
  const formatExpiryDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Close PIN dialog and reset state
  const handleClosePinDialog = () => {
    setShowPinDialog(false);
    setActiveStep(0);
    setOtp('');
    setOtpError('');
    setGeneratedPin(null);
    setCustomPin('');
    setConfirmPin('');
    setPinError('');
  };

  return (
    <>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <LockOutlined color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">PIN Management</Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Set up a 4-digit PIN to add an extra layer of security when viewing credentials.
          Your PIN will expire after 6 months for security reasons.
        </Typography>
        
        {loading && !showPinDialog ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {pinStatus.hasPin && (
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={pinStatus.enabled}
                      onChange={handleTogglePin}
                      color="primary"
                    />
                  }
                  label="Enable PIN verification"
                />
                
                <Typography variant="body2" color="text.secondary">
                  PIN expires on: {formatExpiryDate(pinStatus.expiresAt)}
                </Typography>
                
                {pinStatus.expired && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Your PIN has expired. Please generate a new one.
                  </Alert>
                )}
              </Box>
            )}
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshOutlined />}
              onClick={handleRegeneratePin}
              disabled={loading}
            >
              {pinStatus.hasPin ? 'Regenerate PIN' : 'Generate PIN'}
            </Button>
          </>
        )}
      </Paper>
      
      {/* PIN Generation Dialog */}
      <Dialog open={showPinDialog} onClose={handleClosePinDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {activeStep === 2 ? 'PIN Generated' : 'Generate PIN'}
        </DialogTitle>
        
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {activeStep === 0 && (
            <Typography variant="body1">
              We'll send a verification code to your email address to confirm your identity.
            </Typography>
          )}
          
          {activeStep === 1 && (
            <>
              <Typography variant="body1" paragraph>
                We've sent a verification code to your email: <strong>{email}</strong>
              </Typography>
              
              <TextField
                label="Verification Code"
                fullWidth
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  setOtpError('');
                }}
                error={!!otpError}
                helperText={otpError}
                margin="normal"
                variant="outlined"
              />
              
              <Box sx={{ mt: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Set Your PIN
                </Typography>
                
                <TextField
                  label="Enter 4-digit PIN"
                  fullWidth
                  value={customPin}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 4) {
                      setCustomPin(value);
                      setPinError('');
                    }
                  }}
                  error={!!pinError}
                  helperText={pinError}
                  margin="normal"
                  variant="outlined"
                  type="password"
                />
                
                <TextField
                  label="Confirm PIN"
                  fullWidth
                  value={confirmPin}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 4) {
                      setConfirmPin(value);
                      setPinError('');
                    }
                  }}
                  error={!!pinError}
                  margin="normal"
                  variant="outlined"
                  type="password"
                />
              </Box>
              
              <Button
                variant="text"
                disabled={countdown > 0}
                onClick={handleResendOTP}
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
              </Button>
            </>
          )}
          
          {activeStep === 2 && (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Your PIN has been generated successfully!
              </Alert>
              
              <Typography variant="body1" paragraph>
                Your PIN will be required when viewing sensitive information.
              </Typography>
              
              <Typography variant="body1" paragraph>
                PIN will expire on: <strong>{formatExpiryDate(pinStatus.expiresAt)}</strong>
              </Typography>
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClosePinDialog} color="inherit">
            {activeStep === 2 ? 'Close' : 'Cancel'}
          </Button>
          
          {activeStep === 1 && (
            <Button
              color="primary"
              onClick={handleVerifyOTP}
              variant="contained"
              disabled={loading || !otp}
              startIcon={loading ? <CircularProgress size={20} /> : <VerifiedUser />}
            >
              {loading ? 'Verifying...' : 'Verify & Generate PIN'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* PIN Verification Dialog for disabling PIN */}
      {showPinVerificationDialog && (
        <PinVerificationDialog
          open={showPinVerificationDialog}
          onClose={handlePinVerificationDialogClose}
          onSuccess={handlePinVerificationSuccess}
        />
      )}
    </>
  );
};

export default PinManagement;
