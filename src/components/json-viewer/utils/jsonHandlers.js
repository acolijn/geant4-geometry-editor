/**
 * JSON Viewer Handlers
 * 
 * This module contains handler functions for formatting, processing, and downloading JSON data
 * for the Geant4 Geometry Editor.
 */

import { convertToMultiplePlacements } from './MultiPlacementConverter';

/**
 * Format JSON data with proper indentation for display
 * 
 * @param {Object} data - The data to format as JSON
 * @returns {string} Formatted JSON string
 */
export const formatJson = (data) => {
  return JSON.stringify(data, null, 2);
};

/**
 * Ensure polycone and polyhedra z-planes are sorted in ascending order
 * 
 * @param {Object} volume - The volume object to process
 * @returns {Object} The volume with sorted z-planes
 */
export const ensureOrderedZPlanes = (volume) => {
  if (volume.type === 'polycone' || volume.type === 'polyhedra') {
    if (volume.dimensions && 
        Array.isArray(volume.dimensions.z) && 
        Array.isArray(volume.dimensions.rmax)) {
      
      // Create an array of indices
      const indices = Array.from({ length: volume.dimensions.z.length }, (_, i) => i);
      
      // Sort indices based on z values
      indices.sort((a, b) => volume.dimensions.z[a] - volume.dimensions.z[b]);
      
      // Check if already sorted
      const isSorted = indices.every((val, idx) => val === idx);
      if (!isSorted) {
        // Create new sorted arrays
        const sortedZ = indices.map(i => volume.dimensions.z[i]);
        const sortedRmax = indices.map(i => volume.dimensions.rmax[i]);
        
        // Handle rmin if it exists
        let sortedRmin = [];
        if (Array.isArray(volume.dimensions.rmin)) {
          sortedRmin = indices.map(i => volume.dimensions.rmin[i]);
          volume.dimensions.rmin = sortedRmin;
        }
        
        // Update the volume with sorted arrays
        volume.dimensions.z = sortedZ;
        volume.dimensions.rmax = sortedRmax;
        
        console.log(`Sorted z-planes for ${volume.name} (${volume.type})`);
      }
    }
  }
  return volume;
};

/**
 * Generate materials JSON
 * 
 * @param {Object} materials - Materials data
 * @returns {string} Formatted materials JSON
 */
export const generateMaterialsJson = (materials) => {
  return formatJson({ materials });
};

/**
 * Generate geometry JSON with multiple placements
 * 
 * @param {Object} geometries - Geometry data with world and volumes
 * @param {Object} materials - Materials data
 * @returns {string} Formatted geometry JSON with materials included
 */
export const generateGeometryJson = (geometries, materials) => {
  const geometryData = convertToMultiplePlacements({
    world: geometries.world,
    volumes: (geometries.volumes || []).map(vol => ensureOrderedZPlanes({...vol}))
  });
  
  // Add materials to the geometry JSON if provided
  if (materials && Object.keys(materials).length > 0) {
    geometryData.materials = materials;
  }
  
  return formatJson(geometryData);
};

/**
 * Handle download of JSON file
 * 
 * @param {string} content - JSON content to download
 * @param {string} filename - Name of the file to download
 */
export const handleDownload = (content, filename) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
