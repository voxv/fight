// Utility functions for math, collision, helpers

export function isKeyPressed(key) {
  if (typeof window !== 'undefined' && window.isKeyDown && typeof window.isKeyDown === 'object') {
    return !!window.isKeyDown[key];
  }
  return false;
}
// Add more utility functions here as needed
