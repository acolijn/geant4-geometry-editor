/**
 * InstanceTracker.js
 * 
 * Utility for tracking and updating multiple instances of the same object
 * in the Geant4 Geometry Editor.
 */

// Store instance groups with a unique source identifier
const instanceGroups = {};

/**
 * Register an object as an instance of a source
 * @param {string} sourceId - Unique identifier for the source (e.g., JSON filename or object UUID)
 * @param {string} instanceId - Volume ID in the format 'volume-X'
 * @param {number} volumeIndex - The index of the volume in the volumes array
 */
const registerInstance = (sourceId, instanceId, volumeIndex) => {
  if (!instanceGroups[sourceId]) {
    instanceGroups[sourceId] = [];
  }
  
  // Check if this instance is already registered
  const existingIndex = instanceGroups[sourceId].findIndex(
    instance => instance.instanceId === instanceId
  );
  
  if (existingIndex === -1) {
    instanceGroups[sourceId].push({ 
      instanceId, 
      volumeIndex,
      addedAt: new Date().toISOString()
    });
    console.log(`Registered instance ${instanceId} (index: ${volumeIndex}) for source ${sourceId}`);
  } else {
    // Update the volume index if it changed
    instanceGroups[sourceId][existingIndex].volumeIndex = volumeIndex;
    console.log(`Updated instance ${instanceId} (new index: ${volumeIndex}) for source ${sourceId}`);
  }
};

/**
 * Get all instances of a source except the one being edited
 * @param {string} sourceId - Unique identifier for the source
 * @param {string} excludeInstanceId - Instance ID to exclude from results
 * @returns {Array} - Array of instance objects
 */
const getRelatedInstances = (sourceId, excludeInstanceId) => {
  if (!instanceGroups[sourceId]) {
    console.warn(`No instances found for source ID: ${sourceId}`);
    return [];
  }
  
  // Log the instances for debugging
  console.log(`All instances for source ${sourceId}:`, instanceGroups[sourceId]);
  
  // Filter out the instance being edited
  const relatedInstances = instanceGroups[sourceId].filter(
    instance => instance.instanceId !== excludeInstanceId
  );
  
  console.log(`Found ${relatedInstances.length} related instances after filtering out ${excludeInstanceId}`);
  return relatedInstances;
};

/**
 * Get the source ID for an instance
 * @param {string} instanceId - Volume ID in the format 'volume-X'
 * @returns {string|null} - Source ID or null if not found
 */
const getSourceIdForInstance = (instanceId) => {
  for (const sourceId in instanceGroups) {
    const found = instanceGroups[sourceId].some(
      instance => instance.instanceId === instanceId
    );
    if (found) {
      return sourceId;
    }
  }
  return null;
};

/**
 * Update the volume index for an instance (needed when volumes are added/removed)
 * @param {string} instanceId - Volume ID in the format 'volume-X'
 * @param {number} newVolumeIndex - The new index in the volumes array
 */
const updateInstanceIndex = (instanceId, newVolumeIndex) => {
  for (const sourceId in instanceGroups) {
    const instanceIndex = instanceGroups[sourceId].findIndex(
      instance => instance.instanceId === instanceId
    );
    
    if (instanceIndex !== -1) {
      instanceGroups[sourceId][instanceIndex].volumeIndex = newVolumeIndex;
      console.log(`Updated index for instance ${instanceId} to ${newVolumeIndex}`);
      return true;
    }
  }
  return false;
};

/**
 * Remove an instance from tracking
 * @param {string} instanceId - Volume ID in the format 'volume-X'
 */
const removeInstance = (instanceId) => {
  for (const sourceId in instanceGroups) {
    const instanceIndex = instanceGroups[sourceId].findIndex(
      instance => instance.instanceId === instanceId
    );
    
    if (instanceIndex !== -1) {
      instanceGroups[sourceId].splice(instanceIndex, 1);
      console.log(`Removed instance ${instanceId} from source ${sourceId}`);
      
      // If no instances left for this source, remove the source entry
      if (instanceGroups[sourceId].length === 0) {
        delete instanceGroups[sourceId];
        console.log(`Removed empty source ${sourceId}`);
      }
      
      return true;
    }
  }
  return false;
};

/**
 * Get all registered sources
 * @returns {Array} - Array of source IDs
 */
const getAllSources = () => {
  return Object.keys(instanceGroups);
};

/**
 * Get all instances for debugging
 * @returns {Object} - The full instance groups object
 */
const getDebugInfo = () => {
  return { ...instanceGroups };
};

// Create a singleton instance that can be imported throughout the app
export const instanceTracker = {
  registerInstance,
  getRelatedInstances,
  getSourceIdForInstance,
  updateInstanceIndex,
  removeInstance,
  getAllSources,
  getDebugInfo
};
