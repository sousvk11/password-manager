import React, { useState, useContext } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
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
  const [anchorEl, setAnchorEl] = useState(null);
  
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
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Password Manager
          </Typography>
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
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
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
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
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
