import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  Avatar,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Alert
} from '@mui/material';
import { LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';

const steps = ['Request Reset', 'Verify Email', 'Reset Password'];

const ForgotPassword = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [errors, setErrors] = useState({});

  // Handle request password reset
  const handleRequestReset = async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('/auth/forgot-password', { email });
      
      if (response.data.status === 'success') {
        toast.success('Verification code sent to your email');
        setActiveStep(1);
        // Start countdown for resend button
        setCountdown(60);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    // Validate OTP
    if (!otp) {
      setErrors({ otp: 'Verification code is required' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('/auth/verify-reset-code', { email, otp });
      
      if (response.data.status === 'success') {
        toast.success('Code verified successfully');
        setActiveStep(2);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  // Handle reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    const newErrors = {};
    if (!password) newErrors.password = 'New password is required';
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('/auth/reset-password', {
        email,
        otp,
        password
      });
      
      if (response.data.status === 'success') {
        toast.success('Password reset successful! You can now login with your new password.');
        // Redirect to login page immediately
        window.location.href = '/login';
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    try {
      const response = await axios.post('/auth/forgot-password', { email });
      
      if (response.data.status === 'success') {
        toast.success('New verification code sent to your email');
        // Reset countdown
        setCountdown(60);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer effect
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Reset Password
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ width: '100%', mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {activeStep === 0 && (
            <Box component="form" onSubmit={handleRequestReset} sx={{ width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Send Reset Code'}
              </Button>
            </Box>
          )}
          
          {activeStep === 1 && (
            <Box component="form" onSubmit={handleVerifyOTP} sx={{ width: '100%' }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                A verification code has been sent to {email}
              </Alert>
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="otp"
                label="Verification Code"
                name="otp"
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                error={!!errors.otp}
                helperText={errors.otp}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify Code'}
              </Button>
              
              <Button
                type="button"
                fullWidth
                variant="outlined"
                onClick={handleResendOTP}
                disabled={countdown > 0 || loading}
                sx={{ mb: 2 }}
              >
                {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
              </Button>
            </Box>
          )}
          
          {activeStep === 2 && (
            <Box component="form" onSubmit={handleResetPassword} sx={{ width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="New Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!errors.password}
                helperText={errors.password}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm New Password"
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Reset Password'}
              </Button>
            </Box>
          )}
          
          <Link component={RouterLink} to="/login" variant="body2">
            Remember your password? Sign in
          </Link>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
