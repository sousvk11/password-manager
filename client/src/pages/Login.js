import React, { useState, useContext, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Link, 
  Paper, 
  Avatar,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { 
  LockOutlined as LockOutlinedIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';
import axios from '../utils/axiosConfig';
import OTPVerification from '../components/OTPVerification';

const Login = () => {
  const { login, currentUser, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // OTP verification state
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  
  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate(location.state?.from?.pathname || '/dashboard');
    }
  }, [currentUser, navigate, location]);
  
  const validateForm = () => {
    const errors = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email address is invalid';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Use the login function from AuthContext
      const result = await login(email, password);
      
      // Check if OTP verification is required
      if (result && result.requireOTP) {
        // Show OTP verification form
        setOtpEmail(result.email);
        setShowOTPVerification(true);
      }
      // If no OTP required, the login function will handle the token and redirect
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle OTP verification
  const handleVerifyOTP = async (otpCode, trustDevice) => {
    try {
      console.log('Verifying OTP:', { email: otpEmail, otpCode, trustDevice });
      
      const response = await axios.post('/auth/login/complete', {
        email: otpEmail,
        otp: otpCode,
        trustDevice
      });
      
      if (response.data.status === 'success') {
        // Store token
        localStorage.setItem('token', response.data.token);
        
        // Show success message
        toast.success('Login successful!');
        
        // Instead of directly navigating, reload the page to trigger auth context update
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'Verification failed. Please try again.');
    }
  };
  
  // Handle resend OTP
  const handleResendOTP = async () => {
    try {
      console.log('Resending OTP for:', otpEmail);
      
      const response = await axios.post('/auth/login/initiate', {
        email: otpEmail,
        password
      });
      
      if (response.data.status === 'success') {
        toast.success('Verification code resent to your email');
        return true;
      }
    } catch (error) {
      console.error('Failed to resend verification code:', error);
      toast.error(error.response?.data?.message || 'Failed to resend verification code.');
      throw error;
    }
  };
  
  // Handle cancel OTP verification
  const handleCancelOTP = () => {
    setShowOTPVerification(false);
    setOtpEmail('');
  };
  
  // Handle forgot password
  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Show OTP verification if required
  if (showOTPVerification) {
    return (
      <Container component="main" maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <OTPVerification
            email={otpEmail}
            purpose="login"
            onVerify={handleVerifyOTP}
            onResend={handleResendOTP}
            onCancel={handleCancelOTP}
          />
        </Box>
      </Container>
    );
  }
  
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
            borderRadius: 2,
            width: '100%'
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign in
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
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
              error={!!formErrors.email}
              helperText={formErrors.email}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!formErrors.password}
              helperText={formErrors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Link component={RouterLink} to="/forgot-password" variant="body2">
                Forgot password?
              </Link>
              <Link component={RouterLink} to="/register" variant="body2">
                Don't have an account? Sign Up
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
