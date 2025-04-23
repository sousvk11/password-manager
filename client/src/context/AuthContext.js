import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import jwt_decode from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up axios defaults
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || '/api';
  
  // Set token in axios headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if token is valid on initial load
  useEffect(() => {
    const verifyToken = async () => {
      setLoading(true);
      
      if (!token) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      
      try {
        // Check if token is expired
        const decodedToken = jwt_decode(token);
        const currentTime = Date.now() / 1000;
        
        if (decodedToken.exp < currentTime) {
          // Token is expired
          logout();
          setLoading(false);
          return;
        }
        
        // Get current user data
        const response = await axios.get('/users/me');
        setCurrentUser(response.data.data.user);
      } catch (err) {
        console.error('Error verifying token:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    
    verifyToken();
  }, [token]);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await axios.post('/auth/login', { email, password });
      
      const { token, data } = response.data;
      
      // Save token to localStorage
      localStorage.setItem('token', token);
      setToken(token);
      setCurrentUser(data.user);
      
      return data.user;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  // Register function
  const register = async (name, email, password) => {
    try {
      setError(null);
      const response = await axios.post('/auth/signup', { name, email, password });
      
      const { token, data } = response.data;
      
      // Save token to localStorage
      localStorage.setItem('token', token);
      setToken(token);
      setCurrentUser(data.user);
      
      return data.user;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (token) {
        await axios.get('/auth/logout');
      }
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      // Clear token and user data regardless of API call success
      localStorage.removeItem('token');
      setToken(null);
      setCurrentUser(null);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setError(null);
      const response = await axios.patch('/users/updateMe', userData);
      setCurrentUser(response.data.data.user);
      return response.data.data.user;
    } catch (err) {
      setError(err.response?.data?.message || 'Profile update failed');
      throw err;
    }
  };

  // Update password
  const updatePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      const response = await axios.patch('/users/updatePassword', {
        currentPassword,
        newPassword
      });
      
      // Update token if returned
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
      }
      
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Password update failed');
      throw err;
    }
  };

  // Check if user is admin
  const isAdmin = () => {
    return currentUser?.role === 'admin';
  };

  const contextValue = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    isAdmin
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
