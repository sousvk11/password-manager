import React, { useState, useContext, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  IconButton, 
  Typography, 
  Menu, 
  MenuItem, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Avatar, 
  Tooltip 
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Group as GroupIcon,
  VpnKey as CredentialIcon,
  AdminPanelSettings as AdminIcon,
  Assessment as ActivityIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  DeleteOutline as DeletedItemsIcon
} from '@mui/icons-material';
import AuthContext from '../context/AuthContext';

const drawerWidth = 240;

const Layout = () => {
  const { currentUser, logout, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [appTitle, setAppTitle] = useState('Password Manager');
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Fetch app title on component mount
  useEffect(() => {
    const fetchAppTitle = async () => {
      try {
        const response = await axios.get('/profile/company/app-title');
        if (response.data.status === 'success' && response.data.data.appTitle) {
          const title = response.data.data.appTitle;
          setAppTitle(title);
          
          // Update the document title to match the app title
          document.title = title;
          console.log('Updated document title to:', title);
        }
      } catch (error) {
        console.error('Error fetching app title:', error);
      }
    };

    fetchAppTitle();
  }, []);
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };
  
  const handleNavigate = (path) => {
    navigate(path);
  };
  
  const menuId = 'primary-account-menu';
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      id={menuId}
      keepMounted
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
        <ListItemIcon>
          <PersonIcon fontSize="small" />
        </ListItemIcon>
        Profile
      </MenuItem>
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        Logout
      </MenuItem>
    </Menu>
  );
  
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(drawerOpen && {
            marginLeft: drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`,
            transition: (theme) => theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
        }}
      >
        <Toolbar sx={{ height: '52px', minHeight: '52px' }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* Logo component that matches the screenshot */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              component="img"
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjZmZmZmZmIj48cGF0aCBkPSJNMTggOGgtMVY2YzAtMi43Ni0yLjI0LTUtNS01UzcgMy4yNCA3IDZ2Mkg2Yy0xLjEgMC0yIC45LTIgMnYxMGMwIDEuMS45IDIgMiAyaDEyYzEuMSAwIDItLjkgMi0yVjEwYzAtMS4xLS45LTItMi0yem0tNiA5Yy0xLjEgMC0yLS45LTItMnMuOS0yIDItMiAyIC45IDIgMi0uOSAyLTIgMnptMy4xLTlIOC45VjZjMC0xLjcxIDEuMzktMy4xIDMuMS0zLjEgMS43MSAwIDMuMSAxLjM5IDMuMSAzLjF2MnoiLz48L3N2Zz4="
              alt="Lock Icon"
              sx={{ 
                width: 24, 
                height: 24,
                mr: 1,
                bgcolor: 'transparent'
              }} 
            />
            <Typography variant="h6" color="white" sx={{ fontWeight: 'normal', fontSize: '1rem' }}>
              {appTitle}
            </Typography>
          </Box>
          
          {/* Spacer to push user info to the right */}
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {currentUser?.name}
            </Typography>
            <Tooltip title="Account settings">
              <IconButton
                edge="end"
                aria-label="account of current user"
                aria-controls={menuId}
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                <Avatar 
                  src={currentUser ? `/api/v1/profile/picture/${currentUser.id}?t=${new Date().getTime()}` : `/api/v1/profile/picture?t=${new Date().getTime()}`}
                  sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}
                  alt={currentUser?.name || 'User'}
                >
                  {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      {renderMenu}
      
      <Drawer
        variant="permanent"
        open={drawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            ...(drawerOpen ? {
              overflowX: 'hidden',
            } : {
              overflowX: 'hidden',
              width: theme => theme.spacing(7),
            }),
          },
        }}
      >
        <Toolbar sx={{ height: '52px', minHeight: '52px' }}>
          {/* Company Logo inside Toolbar */}
          <Box
            component="img"
            src={`/api/v1/profile/company/logo/1?t=${new Date().getTime()}`}
            alt="Company Logo"
            sx={{
              height: '36px',
              maxWidth: '180px',
              objectFit: 'contain',
              mr: 2,
              ml: 1
            }}
            onError={(e) => {
              // Fallback to @keeper text logo if image fails to load
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <Box
            sx={{
              display: 'none',
              alignItems: 'center'
            }}
          >
            <Box
              component="span"
              sx={{
                color: '#ffc107',
                fontSize: '1.25rem',
                mr: 0.5,
                display: 'flex'
              }}
            >
              🔒
            </Box>
            <Typography
              variant="h6"
              component="div"
              sx={{
                color: '#757575',
                fontWeight: 500,
                fontSize: '1.25rem'
              }}
            >
              keeper
            </Typography>
          </Box>
        </Toolbar>
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem 
              button 
              onClick={() => handleNavigate('/dashboard')}
              sx={{ 
                mb: 1,
                borderRadius: '0 20px 20px 0',
                '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.1)' },
              }}
            >
              <ListItemIcon>
                <DashboardIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
            
            <ListItem 
              button 
              onClick={() => handleNavigate('/dashboard?view=groups')}
              sx={{ 
                mb: 1,
                borderRadius: '0 20px 20px 0',
                '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.1)' },
              }}
            >
              <ListItemIcon>
                <GroupIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Groups" />
            </ListItem>
            
            <ListItem 
              button 
              onClick={() => handleNavigate('/dashboard?view=credentials')}
              sx={{ 
                mb: 1,
                borderRadius: '0 20px 20px 0',
                '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.1)' },
              }}
            >
              <ListItemIcon>
                <CredentialIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Credentials" />
            </ListItem>
            
            {/* Only show Activity Logs for admin users */}
            {isAdmin() && (
              <ListItem 
                button 
                onClick={() => handleNavigate('/activity')}
                sx={{ 
                  mb: 1,
                  borderRadius: '0 20px 20px 0',
                  '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.1)' },
                }}
              >
                <ListItemIcon>
                  <ActivityIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Activity Logs" />
              </ListItem>
            )}
          </List>
          
          <Divider />
          
          {isAdmin() && (
            <List>
              <ListItem 
                button 
                onClick={() => handleNavigate('/admin')}
                sx={{ 
                  mt: 1,
                  borderRadius: '0 20px 20px 0',
                  '&:hover': { bgcolor: 'rgba(245, 0, 87, 0.1)' },
                }}
              >
                <ListItemIcon>
                  <AdminIcon color="secondary" />
                </ListItemIcon>
                <ListItemText primary="Admin Panel" />
              </ListItem>
              
              <ListItem 
                button 
                onClick={() => handleNavigate('/admin?tab=2')}
                sx={{ 
                  mt: 1,
                  borderRadius: '0 20px 20px 0',
                  '&:hover': { bgcolor: 'rgba(245, 0, 87, 0.1)' },
                }}
              >
                <ListItemIcon>
                  <DeletedItemsIcon color="secondary" />
                </ListItemIcon>
                <ListItemText primary="Deleted Items" />
              </ListItem>
            </List>
          )}
        </Box>
      </Drawer>
      
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
