/**
 * Centralized definition of geometry icons
 * This file provides consistent icons for all geometry types across the application
 */

// Regular (outline) icons for each geometry type
export const icons = {
  box: {
    regular: '▢', // Square
    filled: '■'    // Filled square
  },
  sphere: {
    regular: '◯', // Circle
    filled: '●'    // Filled circle
  },
  cylinder: {
    regular: '⌭', // Cylinder
    filled: '⌭'    // No good filled variant, will use color instead
  },
  ellipsoid: {
    regular: '⬭', // Ellipse
    filled: '⬬'    // Filled ellipse
  },
  torus: {
    regular: '◎', // Double circle
    filled: '◉'    // Filled double circle
  },
  polycone: {
    regular: '⏣', // Polycone
    filled: '⏣'    // No good filled variant, will use color instead
  },
  trapezoid: {
    regular: '⏢', // Trapezoid
    filled: '⏢'    // No good filled variant, will use color instead
  },
  assembly: {
    regular: '📁', // Folder
    filled: '📂'    // Open folder
  },
  union: {
    regular: '∪', // Mathematical union symbol
    filled: '∪'    // Mathematical union symbol
  },
  // Default fallback
  default: {
    regular: '▢', // Square
    filled: '■'    // Filled square
  }
};

/**
 * Get the appropriate icon for a geometry type
 * @param {string} type - The geometry type
 * @param {boolean} isActive - Whether the volume is active
 * @returns {string} The icon character
 */
export const getGeometryIcon = (type, isActive = false) => {
  
  const iconType = icons[type] ? type : 'default';
  return icons[iconType].regular;
};

/**
 * Get the icon for a specific volume
 * @param {Object} volume - The volume object
 * @param {boolean} isActive - Whether the volume is active
 * @returns {string} The icon character
 */
export const getVolumeIcon = (volume, isActive = false) => {
  return getGeometryIcon(volume.type, isActive);
};
