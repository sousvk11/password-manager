import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert
} from '@mui/material';
import { toast } from 'react-toastify';

const OTPVerification = ({ email, purpose, onVerify, onResend, onCancel }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const inputRefs = useRef([]);
  
  // Start countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);
  
  // Handle OTP input change
  const handleChange = (e, index) => {
    const value = e.target.value;
    
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;
    
    // Update OTP array
    const newOtp = [...otp];
    newOtp[index] = value.slice(0, 1); // Only take the first character
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };
  
  // Handle key down events for backspace navigation
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input on backspace if current input is empty
      inputRefs.current[index - 1].focus();
    }
  };
  
  // Handle paste event
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    
    // Check if pasted content is a 6-digit number
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      
      // Focus last input
      inputRefs.current[5].focus();
    }
  };
  
  // Handle verify button click
  const handleVerify = async () => {
    const otpValue = otp.join('');
    
    // Validate OTP
    if (otpValue.length !== 6) {
      toast.error('Please enter all 6 digits of the verification code');
      return;
    }
    
    setLoading(true);
    try {
      console.log(`Submitting OTP: ${otpValue}`);
      await onVerify(otpValue, trustDevice);
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle resend button click
  const handleResend = async () => {
    setLoading(true);
    try {
      await onResend();
      setCountdown(60); // Start 60-second countdown
      toast.success('Verification code resent');
    } catch (error) {
      console.error('Resend error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Get purpose-specific text
  const getPurposeText = () => {
    switch (purpose) {
      case 'login':
        return {
          title: 'Login Verification',
          description: 'We\'ve sent a verification code to your email. Please enter it below to complete your login.',
          buttonText: 'Verify & Login'
        };
      case 'registration':
        return {
          title: 'Email Verification',
          description: 'We\'ve sent a verification code to your email. Please enter it below to complete your registration.',
          buttonText: 'Verify & Create Account'
        };
      case 'reset':
        return {
          title: 'Password Reset Verification',
          description: 'We\'ve sent a verification code to your email. Please enter it below to reset your password.',
          buttonText: 'Verify & Continue'
        };
      default:
        return {
          title: 'Verification Required',
          description: 'We\'ve sent a verification code to your email. Please enter it below to continue.',
          buttonText: 'Verify'
        };
    }
  };
  
  const { title, description, buttonText } = getPurposeText();
  
  return (
    <Paper sx={{ p: 4, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {title}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        A 6-digit verification code has been sent to <strong>{email}</strong>
      </Alert>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        {otp.map((digit, index) => (
          <TextField
            key={index}
            inputRef={(el) => (inputRefs.current[index] = el)}
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={index === 0 ? handlePaste : null}
            variant="outlined"
            inputProps={{
              maxLength: 1,
              style: { textAlign: 'center', fontSize: '1.5rem' }
            }}
            sx={{ 
              width: '3rem', 
              mx: 0.5,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'primary.light',
                },
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.dark',
                },
              },
            }}
          />
        ))}
      </Box>
      
      {purpose === 'login' && (
        <FormControlLabel
          control={
            <Checkbox
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              color="primary"
            />
          }
          label="Trust this device for 30 days"
          sx={{ mb: 2 }}
        />
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
        >
          {loading ? <CircularProgress size={24} /> : buttonText}
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="text"
            color="primary"
            onClick={handleResend}
            disabled={loading || countdown > 0}
          >
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
          </Button>
          
          <Button
            variant="text"
            color="inherit"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default OTPVerification;
