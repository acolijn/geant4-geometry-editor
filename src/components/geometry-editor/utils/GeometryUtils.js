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
 * @param {string|Object} objectIdentifier - Either the name of the object, an object ID (e.g. 'world', 'volume-1'), or the object itself
 * @param {Object} geometries - The current geometries state
 * @returns {Object} The extracted object and its descendants
 */
export const extractObjectWithDescendants = (objectIdentifier, geometries) => {
  // Find the object in the geometries
  let mainObject = null;
  let objectType = '';
  let isWorld = false;
  
  // Handle different types of object identifiers
  if (typeof objectIdentifier === 'string') {
    // Case 1: objectIdentifier is a string ID like 'world' or 'volume-1'
    if (objectIdentifier === 'world') {
      mainObject = { ...geometries.world };
      objectType = 'world';
      isWorld = true;
    } else if (objectIdentifier.startsWith('volume-')) {
      const index = parseInt(objectIdentifier.split('-')[1]);
      if (!isNaN(index) && geometries.volumes[index]) {
        mainObject = { ...geometries.volumes[index] };
        objectType = 'volume';
      }
    } else {
      // Case 2: objectIdentifier is a name string
      // Check if the object is the world
      if (geometries.world.name === objectIdentifier) {
        mainObject = { ...geometries.world };
        objectType = 'world';
        isWorld = true;
      } else {
        // Find the object in the volumes array by name
        const volumeIndex = geometries.volumes.findIndex(vol => vol.name === objectIdentifier);
        if (volumeIndex !== -1) {
          mainObject = { ...geometries.volumes[volumeIndex] };
          objectType = 'volume';
        }
      }
    }
  } else if (objectIdentifier && typeof objectIdentifier === 'object') {
    // Case 3: objectIdentifier is the actual object
    mainObject = { ...objectIdentifier };
    // Determine if it's the world object
    isWorld = mainObject.name === geometries.world.name;
    objectType = isWorld ? 'world' : 'volume';
  }
  
  // If the object is not found, return null
  if (!mainObject) {
    console.error(`Object not found: ${typeof objectIdentifier === 'string' ? objectIdentifier : 'object'}`);
    return null;
  }
  
  // Remove displayName property if it exists - it should not be saved
  if (mainObject.displayName) {
    delete mainObject.displayName;
  }
  
  // Find all descendants recursively using the helper function
  const descendants = findAllDescendants(mainObject.name, geometries.volumes);
  
  // Return the object and its descendants
  return {
    object: mainObject,
    objectType,
    descendants,
    isWorld
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

/**
 * Get the currently selected geometry object based on the selectedGeometry ID
 * 
 * @param {string} selectedGeometry - ID of currently selected geometry
 * @param {Object} geometries - Object containing all geometries
 * @returns {Object|null} The selected geometry object or null if no geometry is selected
 */
export const getSelectedGeometryObject = (selectedGeometry, geometries) => {
  // Return null if no geometry is selected
  if (!selectedGeometry) return null;
  
  // Return the world volume if 'world' is selected
  if (selectedGeometry === 'world') return geometries.world;
  
  // Return the volume at the specified index if a volume is selected
  if (selectedGeometry.startsWith('volume-')) {
    const index = parseInt(selectedGeometry.split('-')[1]);
    return geometries.volumes[index];
  }
  
  return null;
};
