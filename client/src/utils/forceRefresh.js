/**
 * Force a complete page refresh without using the browser cache
 * This ensures all data is freshly loaded from the server
 */
export const forceRefresh = () => {
  // Clear any cached data first
  if (window.sessionStorage) {
    try {
      // Clear any session-specific data
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear session storage:', e);
    }
  }
  
  // Force a complete page reload with no caching
  window.location.href = window.location.pathname + '?refresh=' + Date.now();
}
