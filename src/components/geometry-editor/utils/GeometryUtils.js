/**
 * GeometryUtils.js
 * 
 * Utility functions for geometry manipulation in the Geant4 Geometry Editor
 * Contains helper functions for working with geometries
 */

/**
 * Propagate a compound ID to all descendants of a given object
 * @param {string} parentName - The name of the parent object
 * @param {string} compoundId - The compound ID to propagate
 * @param {Array} volumes - The array of volumes to update
 * @returns {Array} The updated volumes array
 */
export const propagateCompoundIdToDescendants = (parentName, compoundId, volumes) => {
  // Create a copy of the volumes array to avoid mutating the original
  const updatedVolumes = [...volumes];
  
  // Find all direct children of the parent
  const directChildren = updatedVolumes.filter(vol => vol.mother_volume === parentName);
  
  // If no direct children, return the original array
  if (directChildren.length === 0) {
    return updatedVolumes;
  }
  
  // For each direct child, update its _compoundId and recursively update its descendants
  directChildren.forEach(child => {
    // Find the index of the child in the volumes array
    const childIndex = updatedVolumes.findIndex(vol => vol.name === child.name);
    
    // Update the child's _compoundId
    if (childIndex !== -1) {
      updatedVolumes[childIndex] = {
        ...updatedVolumes[childIndex],
        _compoundId: compoundId
      };
      
      console.log(`Propagated _compoundId ${compoundId} to child ${child.name}`);
      
      // Recursively update the child's descendants
      const childName = updatedVolumes[childIndex].name;
      const updatedWithGrandchildren = propagateCompoundIdToDescendants(
        childName,
        compoundId,
        updatedVolumes
      );
      
      // Update the volumes array with the recursively updated descendants
      // Since we're mutating the array in place, we need to be careful about indices
      for (let i = 0; i < updatedWithGrandchildren.length; i++) {
        updatedVolumes[i] = updatedWithGrandchildren[i];
      }
    }
  });
  
  return updatedVolumes;
};

/**
 * Extract an object and all its descendants
 * @param {string} objectName - The name of the object to extract
 * @param {Object} geometries - The current geometries state
 * @returns {Object} The extracted object and its descendants
 */
export const extractObjectWithDescendants = (objectName, geometries) => {
  // Find the object in the geometries
  let object = null;
  let objectType = '';
  
  // Check if the object is the world
  if (geometries.world.name === objectName) {
    object = { ...geometries.world };
    objectType = 'world';
  } else {
    // Find the object in the volumes array
    const volumeIndex = geometries.volumes.findIndex(vol => vol.name === objectName);
    if (volumeIndex !== -1) {
      object = { ...geometries.volumes[volumeIndex] };
      objectType = 'volume';
    }
  }
  
  // If the object is not found, return null
  if (!object) {
    console.error(`Object with name ${objectName} not found`);
    return null;
  }
  
  // Find all descendants recursively
  const descendants = findAllDescendants(objectName, geometries.volumes);
  
  // Return the object and its descendants
  return {
    object,
    objectType,
    descendants
  };
};

/**
 * Find all descendants of a given object
 * @param {string} parentName - The name of the parent object
 * @param {Array} volumes - The array of volumes to search
 * @returns {Array} The array of descendant volumes
 */
export const findAllDescendants = (parentName, volumes) => {
  // Find all direct children of the parent
  const directChildren = volumes.filter(vol => vol.mother_volume === parentName);
  
  // If no direct children, return an empty array
  if (directChildren.length === 0) {
    return [];
  }
  
  // For each direct child, recursively find its descendants
  let allDescendants = [...directChildren];
  
  directChildren.forEach(child => {
    const childDescendants = findAllDescendants(child.name, volumes);
    allDescendants = [...allDescendants, ...childDescendants];
  });
  
  return allDescendants;
};

/**
 * Check if an object has children
 * @param {string} objectName - The name of the object to check
 * @param {Array} volumes - The array of volumes to search
 * @returns {boolean} True if the object has children, false otherwise
 */
export const hasChildren = (objectName, volumes) => {
  return volumes.some(vol => vol.mother_volume === objectName);
};
