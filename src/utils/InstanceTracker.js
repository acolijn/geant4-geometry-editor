/**
 * InstanceTracker.js
 * 
 * Utility for tracking and updating multiple instances of the same object
 * in the Geant4 Geometry Editor.
 * 
 * Enhanced to support compound objects (parent + descendants).
 */

// Store instance groups with a unique source identifier
const instanceGroups = {};

// Store type-based groups for finding similar objects
const typeGroups = {};

// Store source metadata including last modified time
const sourceMeta = {};

// Store compound object data (parent + descendants)
const compoundObjects = {};

// Store pending updates
const pendingUpdates = {};

// Listeners for update events
const updateListeners = [];

/**
 * Register an object as an instance of a source
 * @param {string} sourceId - Unique identifier for the source (e.g., JSON filename or object UUID)
 * @param {string} instanceId - Volume ID in the format 'volume-X'
 * @param {number} volumeIndex - The index of the volume in the volumes array
 * @param {Object} sourceData - The source object data
 * @param {Object} compoundData - Optional compound object data (parent + descendants)
 */
const registerInstance = (sourceId, instanceId, volumeIndex, sourceData = null, compoundData = null) => {
  if (!instanceGroups[sourceId]) {
    instanceGroups[sourceId] = [];
  }
  
  // Initialize or update source metadata
  if (sourceData && (!sourceMeta[sourceId] || !sourceMeta[sourceId].data)) {
    sourceMeta[sourceId] = {
      lastModified: new Date().toISOString(),
      data: sourceData,
      hash: generateHash(sourceData),
      objectType: sourceData.object?.type || 'unknown'
    };
    
    // Register with type groups for finding similar objects
    if (sourceData.object?.type) {
      const objectType = sourceData.object.type;
      if (!typeGroups[objectType]) {
        typeGroups[objectType] = [];
      }
      
      // Add to type group if not already there
      if (!typeGroups[objectType].includes(sourceId)) {
        typeGroups[objectType].push(sourceId);
      }
    }
  }
  
  // Check if this instance is already registered
  const existingIndex = instanceGroups[sourceId].findIndex(
    instance => instance.instanceId === instanceId
  );
  
  if (existingIndex === -1) {
    instanceGroups[sourceId].push({ 
      instanceId, 
      volumeIndex,
      addedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      needsUpdate: false,
      objectType: sourceData?.object?.type || 'unknown'
    });
    console.log(`Registered instance ${instanceId} (index: ${volumeIndex}) for source ${sourceId}`);
  } else {
    // Update the volume index if it changed
    instanceGroups[sourceId][existingIndex].volumeIndex = volumeIndex;
    instanceGroups[sourceId][existingIndex].lastUpdated = new Date().toISOString();
    instanceGroups[sourceId][existingIndex].objectType = sourceData?.object?.type || instanceGroups[sourceId][existingIndex].objectType;
    console.log(`Updated instance ${instanceId} (new index: ${volumeIndex}) for source ${sourceId}`);
  }
  
  // Store compound object data if provided
  if (compoundData && compoundData.object && Array.isArray(compoundData.descendants)) {
    compoundObjects[sourceId] = {
      data: compoundData,
      lastModified: new Date().toISOString(),
      instanceCount: instanceGroups[sourceId].length
    };
    console.log(`Stored compound object data for source ${sourceId} with ${compoundData.descendants.length} descendants`);
  }
  
  // After registering, check for other instances of the same type that might need updating
  if (sourceData?.object?.type) {
    findAndMarkSimilarObjectsForUpdate(sourceId, sourceData);
  }
};

/**
 * Find other instances of the same object type and mark them for update
 * @param {string} sourceId - The source ID that was just updated
 * @param {Object} sourceData - The source data
 */
const findAndMarkSimilarObjectsForUpdate = (sourceId, sourceData) => {
  if (!sourceData?.object?.type) {
    console.warn('Cannot find similar objects: source data has no object type');
    console.log('Source data:', sourceData);
    return;
  }
  
  const objectType = sourceData.object.type;
  console.log(`Finding similar objects of type: ${objectType}`);
  
  // Debug: log all type groups
  console.log('All type groups:', typeGroups);
  
  // Get all sources of the same type
  const sourcesOfSameType = typeGroups[objectType] || [];
  console.log(`Sources of type ${objectType}:`, sourcesOfSameType);
  
  // If no sources found, try to find objects of the same type directly
  if (sourcesOfSameType.length === 0) {
    console.log('No sources found in type groups, checking all instance groups...');
    
    // Check all instance groups for objects of the same type
    Object.keys(instanceGroups).forEach(otherSourceId => {
      if (otherSourceId === sourceId) return; // Skip the current source
      
      const instances = instanceGroups[otherSourceId];
      const hasSameTypeInstance = instances.some(instance => {
        const instanceType = instance.objectType;
        return instanceType === objectType;
      });
      
      if (hasSameTypeInstance) {
        console.log(`Found source ${otherSourceId} with instances of type ${objectType}`);
        
        // Add to type group
        if (!typeGroups[objectType]) {
          typeGroups[objectType] = [];
        }
        if (!typeGroups[objectType].includes(otherSourceId)) {
          typeGroups[objectType].push(otherSourceId);
        }
      }
    });
    
    // Try again with updated type groups
    const updatedSourcesOfSameType = typeGroups[objectType] || [];
    console.log(`Updated sources of type ${objectType}:`, updatedSourcesOfSameType);
  }
  
  // For each source of the same type (except the current one)
  sourcesOfSameType.forEach(otherSourceId => {
    if (otherSourceId === sourceId) return; // Skip the current source
    
    // Mark all instances of this source as needing update
    if (instanceGroups[otherSourceId]) {
      console.log(`Found similar source: ${otherSourceId} of type ${objectType}`);
      
      // Mark all instances as needing update
      instanceGroups[otherSourceId].forEach(instance => {
        instance.needsUpdate = true;
        console.log(`Marked instance ${instance.instanceId} for update`);
      });
      
      // Add to pending updates
      pendingUpdates[otherSourceId] = {
        sourceId: otherSourceId,
        updatedAt: new Date().toISOString(),
        affectedInstances: instanceGroups[otherSourceId].length,
        sourceData: sourceData,
        fromSimilarType: true,
        originalSourceId: sourceId
      };
    }
  });
  
  // Also check for objects of the same type directly in the scene
  console.log('Checking for objects of the same type directly in the scene...');
  
  // Add a direct update for all objects of the same type
  const directUpdateId = `direct-update-${objectType}-${Date.now()}`;
  let directUpdateCount = 0;
  
  // Go through all instance groups to find objects of the same type
  Object.keys(instanceGroups).forEach(otherSourceId => {
    if (otherSourceId === sourceId) return; // Skip the current source
    
    instanceGroups[otherSourceId].forEach(instance => {
      // Check if this instance is of the same type
      if (instance.objectType === objectType) {
        instance.needsUpdate = true;
        directUpdateCount++;
        console.log(`Directly marked instance ${instance.instanceId} of type ${objectType} for update`);
      }
    });
  });
  
  if (directUpdateCount > 0) {
    pendingUpdates[directUpdateId] = {
      sourceId: directUpdateId,
      updatedAt: new Date().toISOString(),
      affectedInstances: directUpdateCount,
      sourceData: sourceData,
      fromSimilarType: true,
      originalSourceId: sourceId,
      directUpdate: true
    };
  }
  
  // Notify listeners about the update
  if (Object.keys(pendingUpdates).length > 0) {
    console.log('Pending updates after finding similar objects:', pendingUpdates);
    notifyUpdateListeners();
  } else {
    console.log('No pending updates found after checking for similar objects');
  }
};

/**
 * Generate a simple hash for an object to detect changes
 * @param {Object} obj - The object to hash
 * @returns {string} - A hash string
 */
const generateHash = (obj) => {
  try {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  } catch (e) {
    console.error('Error generating hash:', e);
    return Date.now().toString(16);
  }
};

/**
 * Update source data and mark instances for update
 * @param {string} sourceId - Unique identifier for the source
 * @param {Object} newSourceData - The updated source data
 * @param {boolean} updateImmediately - Whether to update instances immediately
 * @returns {Object} - Information about affected instances
 */
const updateSource = (sourceId, newSourceData, updateImmediately = false) => {
  if (!instanceGroups[sourceId]) {
    console.warn(`No instances found for source ID: ${sourceId}`);
    return { affected: 0, updated: 0 };
  }
  
  // Update source metadata
  const newHash = generateHash(newSourceData);
  const isChanged = !sourceMeta[sourceId] || sourceMeta[sourceId].hash !== newHash;
  
  if (!isChanged) {
    console.log(`Source ${sourceId} hasn't changed, no updates needed`);
    return { affected: 0, updated: 0 };
  }
  
  sourceMeta[sourceId] = {
    lastModified: new Date().toISOString(),
    data: newSourceData,
    hash: newHash
  };
  
  // Mark all instances as needing update
  const instances = instanceGroups[sourceId];
  instances.forEach(instance => {
    instance.needsUpdate = true;
  });
  
  // Add to pending updates
  pendingUpdates[sourceId] = {
    sourceId,
    updatedAt: new Date().toISOString(),
    affectedInstances: instances.length,
    sourceData: newSourceData
  };
  
  // Notify listeners about the update
  notifyUpdateListeners();
  
  // If updateImmediately is true, apply updates now
  let updated = 0;
  if (updateImmediately) {
    updated = applyUpdates(sourceId);
  }
  
  return { 
    affected: instances.length, 
    updated,
    pendingUpdates: instances.length - updated
  };
};

/**
 * Get all instances of a source except the one being edited
 * @param {string} sourceId - Unique identifier for the source
 * @param {string} excludeInstanceId - Instance ID to exclude from results
 * @returns {Array} - Array of instance objects
 */
const getRelatedInstances = (sourceId, excludeInstanceId) => {
  let relatedInstances = [];
  
  // First check for direct instances of the same source
  if (instanceGroups[sourceId]) {
    // Log the instances for debugging
    console.log(`All instances for source ${sourceId}:`, instanceGroups[sourceId]);
    
    // Filter out the instance being edited
    relatedInstances = instanceGroups[sourceId].filter(
      instance => instance.instanceId !== excludeInstanceId
    );
  } else {
    console.warn(`No direct instances found for source ID: ${sourceId}`);
  }
  
  // If no direct instances found, check for instances of the same type
  if (relatedInstances.length === 0 && sourceMeta[sourceId]?.objectType) {
    const objectType = sourceMeta[sourceId].objectType;
    console.log(`Looking for instances of the same type: ${objectType}`);
    
    // Get all sources of the same type
    const sourcesOfSameType = typeGroups[objectType] || [];
    
    // For each source of the same type (except the current one)
    sourcesOfSameType.forEach(otherSourceId => {
      if (otherSourceId === sourceId) return; // Skip the current source
      
      // Add all instances of this source
      if (instanceGroups[otherSourceId]) {
        const otherInstances = instanceGroups[otherSourceId].filter(
          instance => instance.instanceId !== excludeInstanceId
        );
        relatedInstances = [...relatedInstances, ...otherInstances];
      }
    });
  }
  
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

// Store update handlers for different components
const updateHandlers = [];

/**
 * Register a handler function that will actually update instances
 * @param {Function} handler - Function that will be called with update information
 * @returns {Function} - Function to unregister the handler
 */
const registerUpdateHandler = (handler) => {
  if (typeof handler !== 'function') {
    console.error('Update handler must be a function');
    return () => {};
  }
  
  updateHandlers.push(handler);
  console.log(`Registered update handler, total handlers: ${updateHandlers.length}`);
  
  return () => {
    const index = updateHandlers.indexOf(handler);
    if (index !== -1) {
      updateHandlers.splice(index, 1);
      console.log(`Unregistered update handler, remaining handlers: ${updateHandlers.length}`);
    }
  };
};

/**
 * Apply pending updates for a specific source or all sources
 * @param {string} sourceId - Optional source ID to update (if omitted, updates all)
 * @returns {number} - Number of instances updated
 */
const applyUpdates = (sourceId = null) => {
  const sourcesToUpdate = sourceId ? [sourceId] : Object.keys(pendingUpdates);
  let totalUpdated = 0;
  
  sourcesToUpdate.forEach(sid => {
    if (!pendingUpdates[sid] || !instanceGroups[sid]) return;
    
    const sourceData = pendingUpdates[sid].sourceData;
    const instances = instanceGroups[sid];
    
    // Prepare update information for handlers
    const updateInfo = {
      sourceId: sid,
      sourceData: sourceData,
      instances: []
    };
    
    instances.forEach(instance => {
      if (instance.needsUpdate) {
        // Add this instance to the list of instances to update
        updateInfo.instances.push({
          instanceId: instance.instanceId,
          volumeIndex: instance.volumeIndex
        });
        
        // Mark as updated
        instance.needsUpdate = false;
        instance.lastUpdated = new Date().toISOString();
        totalUpdated++;
      }
    });
    
    // Only call handlers if there are instances to update
    if (updateInfo.instances.length > 0) {
      // Call all registered handlers with the update information
      updateHandlers.forEach(handler => {
        try {
          handler(updateInfo);
        } catch (e) {
          console.error('Error in update handler:', e);
        }
      });
    }
    
    // Remove from pending updates if all instances are updated
    const stillNeedsUpdate = instances.some(instance => instance.needsUpdate);
    if (!stillNeedsUpdate) {
      delete pendingUpdates[sid];
    }
  });
  
  // Notify listeners about the update
  notifyUpdateListeners();
  
  return totalUpdated;
};

/**
 * Get all pending updates
 * @returns {Object} - Object with sourceId keys and update info
 */
const getPendingUpdates = () => {
  return { ...pendingUpdates };
};

/**
 * Clear a pending update
 * @param {string} sourceId - The source ID to clear
 */
const clearPendingUpdate = (sourceId) => {
  if (pendingUpdates[sourceId]) {
    delete pendingUpdates[sourceId];
    notifyUpdateListeners();
  }
};

/**
 * Update all instances of a compound object based on source ID
 * @param {Object} geometries - Current geometries state
 * @param {Object} sourceObject - Source object with updated properties
 * @param {Array} sourceDescendants - Descendants of the source object
 * @param {string} sourceId - Source ID to match instances
 * @returns {Object} - Result of the update operation
 */
const updateCompoundObjects = (geometries, sourceObject, sourceDescendants, sourceId) => {
  if (!geometries || !sourceObject || !Array.isArray(sourceDescendants) || !sourceId) {
    console.error('Missing required parameters for compound object update');
    return { success: false, message: 'Missing parameters', count: 0 };
  }
  
  // Get all instances with this source ID
  const instances = instanceGroups[sourceId] || [];
  
  if (instances.length === 0) {
    console.log(`No instances found for source ID: ${sourceId}`);
    return { success: false, message: 'No instances found', count: 0 };
  }
  
  console.log(`Found ${instances.length} instances for source ID: ${sourceId}`);
  
  // Create a new copy of geometries to work with
  const newGeometries = { 
    world: { ...geometries.world },
    volumes: [...geometries.volumes]
  };
  
  let updatedCount = 0;
  
  // Update each main instance
  instances.forEach(instance => {
    const { volumeIndex } = instance;
    
    if (volumeIndex >= 0 && volumeIndex < newGeometries.volumes.length) {
      const currentInstance = newGeometries.volumes[volumeIndex];
      
      // Create updated instance with properties from source object
      const updatedInstance = { ...sourceObject };
      
      // Preserve instance-specific properties
      updatedInstance.name = currentInstance.name;
      updatedInstance.position = currentInstance.position;
      updatedInstance.rotation = currentInstance.rotation;
      updatedInstance.mother_volume = currentInstance.mother_volume;
      updatedInstance._sourceId = sourceId; // Preserve the source ID
      
      // Replace the instance in the volumes array
      newGeometries.volumes[volumeIndex] = updatedInstance;
      updatedCount++;
      
      console.log(`Updated main instance: ${currentInstance.name} at index ${volumeIndex}`);
      
      // Now update all descendants of this instance
      if (sourceDescendants.length > 0) {
        // Find all volumes that have this instance as their mother_volume
        newGeometries.volumes.forEach((volume, volIndex) => {
          if (volume.mother_volume === currentInstance.name) {
            // This is a direct descendant of our instance
            const descendantName = volume.name;
            
            // Find the corresponding descendant in the source
            const sourceDescendant = sourceDescendants.find(desc => {
              // Try different matching strategies
              return (
                // Match by type if names don't match
                desc.type === volume.type
              );
            });
            
            if (sourceDescendant) {
              // Create updated descendant with preserved properties
              const updatedDescendant = { ...sourceDescendant };
              
              // Preserve instance-specific properties
              updatedDescendant.name = descendantName;
              updatedDescendant.position = volume.position;
              updatedDescendant.rotation = volume.rotation;
              updatedDescendant.mother_volume = currentInstance.name;
              
              // Preserve source ID if it exists
              if (volume._sourceId) {
                updatedDescendant._sourceId = volume._sourceId;
              }
              
              // Replace in the volumes array
              newGeometries.volumes[volIndex] = updatedDescendant;
              updatedCount++;
              
              console.log(`Updated descendant: ${descendantName}`);
            }
          }
        });
      }
    }
  });
  
  // Clear any pending updates for this source ID
  clearPendingUpdate(sourceId);
  
  // Update the compound object data with the latest version
  compoundObjects[sourceId] = {
    data: {
      object: sourceObject,
      descendants: sourceDescendants
    },
    lastModified: new Date().toISOString(),
    instanceCount: instances.length
  };
  
  if (updatedCount > 0) {
    return { 
      success: true, 
      message: `Updated ${instances.length} instances with ${updatedCount} total objects`, 
      count: updatedCount,
      newGeometries
    };
  }
  
  return { success: false, message: 'No objects were updated', count: 0 };
};

/**
 * Get count of pending updates
 * @returns {number} - Number of sources with pending updates
 */
const getPendingUpdateCount = () => {
  return Object.keys(pendingUpdates).length;
};

/**
 * Get count of instances needing updates
 * @returns {number} - Total number of instances needing updates
 */
const getPendingInstanceCount = () => {
  let count = 0;
  Object.values(instanceGroups).forEach(instances => {
    instances.forEach(instance => {
      if (instance.needsUpdate) count++;
    });
  });
  return count;
};

/**
 * Add a listener for update events
 * @param {Function} listener - Function to call when updates change
 * @returns {Function} - Function to remove the listener
 */
const addUpdateListener = (listener) => {
  updateListeners.push(listener);
  return () => {
    const index = updateListeners.indexOf(listener);
    if (index !== -1) updateListeners.splice(index, 1);
  };
};

/**
 * Notify all listeners about update changes
 */
const notifyUpdateListeners = () => {
  const updateInfo = {
    pendingSourceCount: Object.keys(pendingUpdates).length,
    pendingInstanceCount: getPendingInstanceCount(),
    pendingUpdates: { ...pendingUpdates }
  };
  
  updateListeners.forEach(listener => {
    try {
      listener(updateInfo);
    } catch (e) {
      console.error('Error in update listener:', e);
    }
  });
};

/**
 * Get compound object data for a source
 * @param {string} sourceId - Unique identifier for the source
 * @returns {Object|null} - Compound object data or null if not found
 */
const getCompoundObject = (sourceId) => {
  return compoundObjects[sourceId]?.data || null;
};

/**
 * Update a compound object with new data
 * @param {string} sourceId - Unique identifier for the source
 * @param {Object} newCompoundData - New compound object data
 * @returns {Object} - Result of the update operation
 */
const updateCompoundObject = (sourceId, newCompoundData) => {
  if (!sourceId || !newCompoundData || !newCompoundData.object || !Array.isArray(newCompoundData.descendants)) {
    console.error('Invalid compound object data for update');
    return { success: false, message: 'Invalid compound object data' };
  }
  
  // Store the updated compound object data
  compoundObjects[sourceId] = {
    data: newCompoundData,
    lastModified: new Date().toISOString(),
    instanceCount: (instanceGroups[sourceId] || []).length
  };
  
  // Mark all instances as needing update
  if (instanceGroups[sourceId]) {
    instanceGroups[sourceId].forEach(instance => {
      instance.needsUpdate = true;
    });
    
    // Add to pending updates
    pendingUpdates[sourceId] = {
      sourceId,
      updatedAt: new Date().toISOString(),
      affectedInstances: instanceGroups[sourceId].length,
      compoundData: newCompoundData,
      isCompoundUpdate: true
    };
    
    // Notify listeners about the update
    notifyUpdateListeners();
    
    return { 
      success: true, 
      message: `Compound object ${sourceId} updated with ${instanceGroups[sourceId].length} instances marked for update`,
      instanceCount: instanceGroups[sourceId].length
    };
  }
  
  return { success: false, message: 'No instances found for this source' };
};

/**
 * Get all compound objects that need updates
 * @returns {Array} - Array of compound objects that need updates
 */
const getPendingCompoundUpdates = () => {
  const updates = [];
  
  Object.keys(pendingUpdates).forEach(sourceId => {
    const update = pendingUpdates[sourceId];
    
    if (update.isCompoundUpdate && compoundObjects[sourceId]) {
      updates.push({
        sourceId,
        name: update.compoundData?.object?.name || 'Unknown Object',
        type: update.compoundData?.object?.type || 'unknown',
        instanceCount: update.affectedInstances || 0,
        descendantCount: update.compoundData?.descendants?.length || 0,
        updatedAt: update.updatedAt
      });
    }
  });
  
  return updates;
};

// Create a singleton instance that can be imported throughout the app
export const instanceTracker = {
  registerInstance,
  getRelatedInstances,
  getSourceIdForInstance,
  updateInstanceIndex,
  removeInstance,
  getAllSources,
  getDebugInfo,
  updateSource,
  registerUpdateHandler,
  applyUpdates,
  getPendingUpdates,
  getPendingUpdateCount,
  getPendingInstanceCount,
  addUpdateListener,
  removeUpdateListener: (listener) => {
    const index = updateListeners.indexOf(listener);
    if (index !== -1) {
      updateListeners.splice(index, 1);
    }
  },
  // New compound object functions
  getCompoundObject,
  updateCompoundObject,
  getPendingCompoundUpdates,
  updateCompoundObjects
};
