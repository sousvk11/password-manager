// This script forces a hard refresh when called
function forceReload() {
  // Clear browser cache and reload
  window.location.href = window.location.href.split('?')[0] + '?refresh=' + new Date().getTime();
}
