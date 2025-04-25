import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  Switch,
  Paper,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';

const SMTPSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: 2525,
    secure: null,
    securityType: 'auto',
    username: '',
    password: '',
    senderEmail: '',
    senderName: 'Password Manager'
  });
  
  // Fetch SMTP settings
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/settings/smtp');
        
        if (response.data.data && response.data.data.setting && response.data.data.setting.value) {
          const settings = JSON.parse(response.data.data.setting.value);
          setSmtpSettings(settings);
        }
      } catch (error) {
        console.error('Error fetching SMTP settings:', error);
        toast.error('Failed to load SMTP settings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Handle form changes
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    
    if (name === 'securityType') {
      // Update security type and set secure flag accordingly
      let secureValue = null;
      
      switch(value) {
        case 'none':
          secureValue = false;
          break;
        case 'ssl':
          secureValue = true;
          break;
        case 'tls':
          secureValue = false; // STARTTLS uses secure:false
          break;
        case 'tls-if-available':
          secureValue = false; // STARTTLS when available uses secure:false
          break;
        case 'auto':
        default:
          secureValue = null; // Auto will be determined at runtime
          break;
      }
      
      setSmtpSettings({ 
        ...smtpSettings, 
        securityType: value,
        secure: secureValue
      });
    } else if (name === 'port') {
      // Ensure port is stored as a number
      const portNumber = parseInt(value) || '';
      
      // If security is set to auto, adjust based on common port numbers
      if (smtpSettings.securityType === 'auto') {
        let securityType = 'auto';
        let secureValue = null;
        
        // Auto-detect security based on port
        if (portNumber === 465) {
          securityType = 'ssl';
          secureValue = true;
        } else if (portNumber === 587) {
          securityType = 'tls';
          secureValue = false;
        } else if (portNumber === 25 || portNumber === 2525) {
          securityType = 'none';
          secureValue = false;
        }
        
        setSmtpSettings({ 
          ...smtpSettings, 
          port: portNumber,
          securityType,
          secure: secureValue
        });
      } else {
        setSmtpSettings({ ...smtpSettings, port: portNumber });
      }
    } else if (name === 'secure') {
      setSmtpSettings({ ...smtpSettings, [name]: checked });
    } else {
      setSmtpSettings({ ...smtpSettings, [name]: value });
    }
  };
  
  // Save SMTP settings
  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate required fields
      if (!smtpSettings.host) {
        toast.error('SMTP Server is required');
        setSaving(false);
        return;
      }
      
      if (!smtpSettings.username) {
        toast.error('Username is required');
        setSaving(false);
        return;
      }
      
      if (!smtpSettings.senderEmail) {
        toast.error('Sender Email is required');
        setSaving(false);
        return;
      }
      
      // Log the data being sent
      console.log('Saving SMTP settings:', {
        value: JSON.stringify(smtpSettings),
        description: 'SMTP server settings for email notifications'
      });
      
      // Update or create the SMTP settings - no need to specify key in the body
      // as we're using a dedicated endpoint for SMTP settings
      const response = await axios.put('/settings/smtp', {
        value: JSON.stringify(smtpSettings),
        description: 'SMTP server settings for email notifications'
      });
      
      console.log('SMTP settings save response:', response.data);
      
      toast.success('SMTP settings saved successfully');
      
      // Refresh the settings
      const refreshResponse = await axios.get('/settings/smtp');
      console.log('SMTP settings refresh response:', refreshResponse.data);
      
      if (refreshResponse.data.data && refreshResponse.data.data.setting && refreshResponse.data.data.setting.value) {
        const settings = JSON.parse(refreshResponse.data.data.setting.value);
        setSmtpSettings(settings);
      }
    } catch (error) {
      console.error('Error saving SMTP settings:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save SMTP settings');
    } finally {
      setSaving(false);
    }
  };
  
  // Test SMTP connection
  const handleTest = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    
    // Validate required fields
    if (!smtpSettings.host) {
      toast.error('SMTP Server is required');
      return;
    }
    
    if (!smtpSettings.port) {
      toast.error('Port is required');
      return;
    }
    
    if (!smtpSettings.username) {
      toast.error('Username is required');
      return;
    }
    
    if (!smtpSettings.password) {
      toast.error('Password is required');
      return;
    }
    
    // Determine secure setting for the test
    let secureConnection = smtpSettings.secure;
    const portNumber = parseInt(smtpSettings.port) || 2525;
    
    // If security is set to auto, determine based on port
    if (smtpSettings.securityType === 'auto' || secureConnection === null) {
      if (portNumber === 465) {
        secureConnection = true;
      } else {
        secureConnection = false;
      }
    }
    
    // Log the test configuration
    console.log('Testing SMTP with config:', {
      host: smtpSettings.host,
      port: portNumber,
      secure: secureConnection,
      securityType: smtpSettings.securityType
    });
    
    setTesting(true);
    try {
      // Ensure port is sent as a number and use the correct secure setting
      const testConfig = {
        ...smtpSettings,
        port: portNumber,
        secure: secureConnection
      };
      
      const response = await axios.post('/settings/smtp/test', {
        config: testConfig,
        testEmail
      });
      
      toast.success(response.data.message || 'SMTP test successful');
    } catch (error) {
      console.error('Error testing SMTP connection:', error);
      toast.error(error.response?.data?.message || 'SMTP test failed');
    } finally {
      setTesting(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        SMTP Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure SMTP server settings for sending verification emails, password reset emails, and other notifications.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            name="host"
            label="SMTP Server"
            value={smtpSettings.host}
            onChange={handleChange}
            fullWidth
            margin="normal"
            placeholder="smtp.example.com"
            required
            error={!smtpSettings.host && saving}
            helperText={!smtpSettings.host && saving ? "SMTP Server is required" : "For SMTP2GO use: mail.smtp2go.com"}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            name="port"
            label="Port"
            type="number"
            value={smtpSettings.port}
            onChange={handleChange}
            fullWidth
            margin="normal"
            placeholder="2525"
            helperText="For SMTP2GO use: 2525 (non-SSL) or 465 (SSL/TLS)"
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            name="username"
            label="Username"
            value={smtpSettings.username}
            onChange={handleChange}
            fullWidth
            margin="normal"
            placeholder="username@example.com"
            required
            error={!smtpSettings.username && saving}
            helperText={!smtpSettings.username && saving ? "Username is required" : ""}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={smtpSettings.password}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            name="senderEmail"
            label="Sender Email"
            value={smtpSettings.senderEmail}
            onChange={handleChange}
            fullWidth
            margin="normal"
            placeholder="noreply@example.com"
            required
            error={!smtpSettings.senderEmail && saving}
            helperText={!smtpSettings.senderEmail && saving ? "Sender Email is required" : ""}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            name="senderName"
            label="Sender Name"
            value={smtpSettings.senderName}
            onChange={handleChange}
            fullWidth
            margin="normal"
            placeholder="Password Manager"
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControl fullWidth margin="normal">
            <InputLabel id="security-type-label">Security</InputLabel>
            <Select
              labelId="security-type-label"
              id="securityType"
              name="securityType"
              value={smtpSettings.securityType}
              label="Security"
              onChange={handleChange}
            >
              <MenuItem value="auto">Auto</MenuItem>
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="ssl">SSL</MenuItem>
              <MenuItem value="tls">TLS</MenuItem>
              <MenuItem value="tls-if-available">TLS when available</MenuItem>
            </Select>
            <FormHelperText>
              {smtpSettings.securityType === 'auto' 
                ? `Auto-detected: ${smtpSettings.port === 465 ? 'SSL' : smtpSettings.port === 587 ? 'TLS' : 'None'}`
                : smtpSettings.securityType === 'ssl' 
                  ? 'Recommended for port 465'
                  : smtpSettings.securityType === 'tls'
                    ? 'Recommended for port 587'
                    : smtpSettings.securityType === 'none'
                      ? 'Recommended for ports 25 and 2525'
                      : ''}
            </FormHelperText>
          </FormControl>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<SendIcon />}
          onClick={() => document.getElementById('smtp-test-section').scrollIntoView({ behavior: 'smooth' })}
        >
          Test SMTP Connection
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
      
      <Divider sx={{ my: 4 }} />
      
      <Box id="smtp-test-section">
        <Typography variant="h6" gutterBottom>
          Test SMTP Connection
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Send a test email to verify your SMTP configuration.
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <TextField
              label="Test Email Address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              fullWidth
              placeholder="Enter email address to receive test message"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={handleTest}
              disabled={testing || !smtpSettings.host || !smtpSettings.username || !smtpSettings.password}
              fullWidth
            >
              {testing ? 'Sending...' : 'Send Test Email'}
            </Button>
          </Grid>
        </Grid>
        
        <Alert severity="info" sx={{ mt: 3 }}>
          Make sure to save your settings before testing the SMTP connection.
        </Alert>
      </Box>
    </Paper>
  );
};

export default SMTPSettings;
