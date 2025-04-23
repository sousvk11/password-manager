import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import AuthContext from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { currentUser, loading, isAdmin } = useContext(AuthContext);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser || !isAdmin()) {
    // Redirect to dashboard if not admin
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
