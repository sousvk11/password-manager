/**
 * Utility functions for PIN verification
 */
import axios from './axiosConfig';

/**
 * Check if PIN verification is required for a specific action
 * This makes a request to the server to check if PIN verification is needed
 * 
 * @param {string} action - The action to check (view, edit, delete, etc.)
 * @returns {Promise<Object>} - Object with requirePin flag and session info
 */
export const isPinVerificationRequired = async (action) => {
  try {
    // Generate a unique browser tab ID if needed
    const browserTabId = window.browserTabId || `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    window.browserTabId = browserTabId;
    
    // Set the browser tab ID in the request headers
    axios.defaults.headers.common['X-Browser-Tab-ID'] = browserTabId;
    
    // Make a GET request to check PIN requirements with more detailed response
    const response = await axios.get('/pins/check-required', {
      params: { action }
    });
    
    // If we get here, PIN verification is not required (200 OK)
    // Check if there's an active session and return session info
    if (response.data && response.data.data) {
      const { requirePin, sessionExpiresIn } = response.data.data;
      
      // If this is a view action and we have an active session, show the notification
      if (!requirePin && 
          sessionExpiresIn && 
          (action === 'view' || action === 'viewCredential' || action === 'viewVersionHistory' || action === 'read')) {
        console.log(`Active PIN session found, expires in ${sessionExpiresIn} seconds`);
      }
      
      return {
        requirePin: false,
        sessionInfo: response.data.data
      };
    }
    
    return { requirePin: false };
  } catch (error) {
    // 403 with requirePin: true means PIN verification is required
    if (error.response && 
        error.response.status === 403 && 
        error.response.data && 
        error.response.data.data && 
        error.response.data.data.requirePin) {
      return { requirePin: true };
    }
    
    // For any other error, assume PIN verification is not required
    console.error('Error checking PIN verification requirement:', error);
    return { requirePin: false };
  }
};
