/**
 * Compound ID Propagator Utility
 * 
 * This utility provides functions for propagating _compoundId from assemblies
 * to their children recursively. This ensures that all objects within an assembly
 * share the same _compoundId, making them identifiable as part of the same assembly type.
 */

import { debugLog } from '../../../utils/logger.js';

/**
 * Recursively propagate a compound ID to an object and all its descendants
 * 
 * @param {Object} object - The object to propagate the compound ID to
 * @param {string} compoundId - The compound ID to propagate
 * @param {Array} allVolumes - All volumes in the geometry
 * @returns {Object} The object with the propagated compound ID
 */
export const propagateCompoundId = (object, compoundId) => {
  if (!object || !compoundId) return object;
  
  // Create a copy to avoid mutating the original
  const updatedObject = { ...object };
  
  // Add the compound ID to the object
  updatedObject._compoundId = compoundId;
  debugLog(`Propagated _compoundId ${compoundId} to object ${updatedObject.name}`);
  
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
  
  debugLog(`Propagating _compoundId ${compoundId} to descendants of ${parentName}`);
  // Create a copy of all volumes to avoid mutating the original
  const updatedVolumes = [...allVolumes];
  
  // Iterate with actual array indices to correctly handle duplicate volume names.
  // The old findIndex-by-name approach returned the first volume with a given name,
  // which was wrong when multiple assemblies share component names (e.g. TopPMTArray
  // and BotPMTArray both having "PMTBody_0").
  for (let i = 0; i < updatedVolumes.length; i++) {
    if (updatedVolumes[i].mother_volume === parentName) {
      updatedVolumes[i] = {
        ...updatedVolumes[i],
        _compoundId: compoundId
      };
      debugLog(`Propagated _compoundId ${compoundId} to child ${updatedVolumes[i].name} at index ${i}`);
      
      // Recursively propagate to descendants of this child
      propagateByIndex(updatedVolumes[i].name, compoundId, updatedVolumes);
    }
  }
  
  return updatedVolumes;
};

/**
 * Internal helper: recursively propagate _compoundId using index-based iteration
 */
function propagateByIndex(parentName, compoundId, volumes) {
  for (let i = 0; i < volumes.length; i++) {
    if (volumes[i].mother_volume === parentName) {
      volumes[i] = { ...volumes[i], _compoundId: compoundId };
      propagateByIndex(volumes[i].name, compoundId, volumes);
    }
  }
}
