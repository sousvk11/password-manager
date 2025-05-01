/**
 * Helper utility to handle deletion operations with state management
 */

// Store for recently deleted items that helps coordinate between components
class DeletedItemsManager {
  constructor() {
    this.deletedItems = new Set();
    this.listeners = [];
  }

  // Add an item to the deleted items list
  addDeletedItem(type, id) {
    const key = `${type}-${id}`;
    this.deletedItems.add(key);
    this.notifyListeners();
    
    // Store in localStorage to persist through page refreshes if needed
    try {
      const existingItems = JSON.parse(localStorage.getItem('recentlyDeletedItems') || '[]');
      existingItems.push({ type, id, timestamp: Date.now() });
      localStorage.setItem('recentlyDeletedItems', JSON.stringify(existingItems));
    } catch (e) {
      console.error('Failed to update localStorage:', e);
    }
  }

  // Check if an item is in the deleted items list
  isDeleted(type, id) {
    const key = `${type}-${id}`;
    return this.deletedItems.has(key);
  }

  // Add a listener for deletion events
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners of changes
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.deletedItems));
  }

  // Clean up old items (called periodically)
  cleanUp() {
    try {
      const existingItems = JSON.parse(localStorage.getItem('recentlyDeletedItems') || '[]');
      const currentTime = Date.now();
      const newItems = existingItems.filter(item => (currentTime - item.timestamp) < 3600000); // Keep items deleted in the last hour
      localStorage.setItem('recentlyDeletedItems', JSON.stringify(newItems));
    } catch (e) {
      console.error('Failed to clean up localStorage:', e);
    }
  }
}

// Create a singleton instance
const deletedItemsManager = new DeletedItemsManager();

// Initialize from localStorage if available
try {
  const existingItems = JSON.parse(localStorage.getItem('recentlyDeletedItems') || '[]');
  existingItems.forEach(item => {
    deletedItemsManager.addDeletedItem(item.type, item.id);
  });
  
  // Clean up old items
  deletedItemsManager.cleanUp();
} catch (e) {
  console.error('Failed to initialize from localStorage:', e);
}

export default deletedItemsManager;
