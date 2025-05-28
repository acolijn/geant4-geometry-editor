/**
 * Compound ID Propagator Utility
 * 
 * This utility provides functions for propagating _compoundId from assemblies
 * to their children recursively. This ensures that all objects within an assembly
 * share the same _compoundId, making them identifiable as part of the same assembly type.
 */

/**
 * Recursively propagate a compound ID to an object and all its descendants
 * 
 * @param {Object} object - The object to propagate the compound ID to
 * @param {string} compoundId - The compound ID to propagate
 * @param {Array} allVolumes - All volumes in the geometry
 * @returns {Object} The object with the propagated compound ID
 */
export const propagateCompoundId = (object, compoundId, allVolumes) => {
  if (!object || !compoundId) return object;
  
  // Create a copy to avoid mutating the original
  const updatedObject = { ...object };
  
  // Add the compound ID to the object
  updatedObject._compoundId = compoundId;
  console.log(`Propagated _compoundId ${compoundId} to object ${updatedObject.name}`);
  
  return updatedObject;
};

/**
 * Recursively propagate a compound ID to all descendants of an object
 * 
 * @param {string} parentName - The name of the parent object
 * @param {string} compoundId - The compound ID to propagate
 * @param {Array} allVolumes - All volumes in the geometry
 * @returns {Array} Array of updated volumes
 */
export const propagateCompoundIdToDescendants = (parentName, compoundId, allVolumes) => {
  if (!parentName || !compoundId || !allVolumes) return allVolumes;
  
  // Create a copy of all volumes to avoid mutating the original
  const updatedVolumes = [...allVolumes];
  
  // Find all direct children of the parent
  const directChildren = updatedVolumes.filter(volume => volume.mother_volume === parentName);
  
  // Process each direct child
  directChildren.forEach(child => {
    const childIndex = updatedVolumes.findIndex(vol => vol.name === child.name);
    if (childIndex !== -1) {
      // Add the compound ID to the child
      updatedVolumes[childIndex] = {
        ...updatedVolumes[childIndex],
        _compoundId: compoundId
      };
      console.log(`Propagated _compoundId ${compoundId} to direct child ${child.name}`);
      
      // Recursively propagate to all descendants of this child
      const childDescendants = findAllDescendants(child.name, updatedVolumes);
      childDescendants.forEach(descendant => {
        const descendantIndex = updatedVolumes.findIndex(vol => vol.name === descendant.name);
        if (descendantIndex !== -1) {
          // Add the compound ID to the descendant
          updatedVolumes[descendantIndex] = {
            ...updatedVolumes[descendantIndex],
            _compoundId: compoundId
          };
          console.log(`Propagated _compoundId ${compoundId} to descendant ${descendant.name}`);
        }
      });
    }
  });
  
  return updatedVolumes;
};

/**
 * Find all descendants of an object recursively
 * 
 * @param {string} parentName - The name of the parent object
 * @param {Array} allVolumes - All volumes in the geometry
 * @returns {Array} Array of descendant objects
 */
const findAllDescendants = (parentName, allVolumes) => {
  // Find direct children
  const directChildren = allVolumes.filter(volume => volume.mother_volume === parentName);
  
  // Start with direct children
  let allDescendants = [...directChildren];
  
  // Recursively find descendants of each direct child
  directChildren.forEach(child => {
    const childDescendants = findAllDescendants(child.name, allVolumes);
    if (childDescendants.length > 0) {
      allDescendants = [...allDescendants, ...childDescendants];
    }
  });
  
  return allDescendants;
};
