/**
 * GeometryOperations.js
 * 
 * Utility functions for geometry operations in the Geant4 Geometry Editor
 * Contains functions for updating, adding, and removing geometries
 */

const mergeGeometryObject = (baseObject, patchObject) => {
  if (!baseObject) {
    return patchObject;
  }

  const merged = {
    ...baseObject,
    ...patchObject
  };

  const nestedKeys = ['position', 'rotation', 'size', 'dimensions'];
  nestedKeys.forEach((key) => {
    if (baseObject[key] && patchObject[key] && typeof patchObject[key] === 'object') {
      merged[key] = {
        ...baseObject[key],
        ...patchObject[key]
      };
    }
  });

  return merged;
};

/**
 * Update a geometry object
 * @param {Object} geometries - The current geometries state
 * @param {string} id - The ID of the geometry to update
 * @param {Object} updatedObject - The updated geometry object
 * @param {boolean} keepSelected - Whether to keep the object selected after update
 * @param {boolean} isLiveUpdate - Whether this is a live update
 * @param {Object} extraData - Extra data for special updates
 * @param {Function} setGeometries - Function to update geometries state
 * @param {Function} setSelectedGeometry - Function to update selected geometry
 * @param {string} selectedGeometry - Currently selected geometry
 * @param {Function} updateAssembliesFunc - Function to update assemblies
 * @param {Function} propagateCompoundIdToDescendants - Function to propagate compound ID
 */
export const updateGeometry = (
  geometries, 
  id, 
  updatedObject, 
  keepSelected = true, 
  _isLiveUpdate = false, 
  extraData = null,
  setGeometries,
  setSelectedGeometry,
  selectedGeometry,
  updateAssembliesFunc,
  _propagateCompoundIdToDescendants
) => {
  void _isLiveUpdate;
  void _propagateCompoundIdToDescendants;

  // Handle special case for assembly update via dialog
  if (extraData && id === null && updatedObject === null) {
    console.log('App: Handling assembly update via dialog', extraData);
    if (updateAssembliesFunc && typeof updateAssembliesFunc === 'function') {
      updateAssembliesFunc(extraData.updateData, extraData.objectDefinition);
    }
    return;
  }
  
  // If updatedObject is null, we can't proceed with regular updates
  if (!updatedObject) {
    console.error('App: Cannot update geometry with null object');
    return;
  }
  
  // Store the current selection before any updates
  const currentSelection = selectedGeometry;
  
  // Create a new state update that includes both geometry and selection changes
  // to ensure they happen atomically and prevent flickering/jumping
  const updateState = () => {
    // Check if the name has changed (for updating daughter references)
    let oldName = null;
    let newName = updatedObject.name;
    let oldMotherVolume = null;
    let newMotherVolume = updatedObject.mother_volume;
    let isParentChanged = false;

    console.log(`updatState:: id: ${id}`);
    
    if (id === 'world') {
      // First update the geometry
      setGeometries(prevGeometries => {
        oldName = prevGeometries.world.name;
        const mergedWorld = mergeGeometryObject(prevGeometries.world, updatedObject);
        newName = mergedWorld.name;

        // Update the world object
        const updatedGeometries = {
          ...prevGeometries,
          world: mergedWorld
        };
        
        // If name changed, update all daughter volumes that reference this as mother
        if (oldName !== newName) {
          updatedGeometries.volumes = prevGeometries.volumes.map(volume => {
            if (volume.mother_volume === oldName) {
              return { ...volume, mother_volume: newName };
            }
            return volume;
          });
        }
        
        return updatedGeometries;
      });
    } else if (id.startsWith('volume-')) {
      const index = parseInt(id.split('-')[1]);
      
      setGeometries(prevGeometries => {
        const previousObject = prevGeometries.volumes[index];
        oldName = previousObject.name;
        oldMotherVolume = previousObject.mother_volume;

        const updatedVolumes = [...prevGeometries.volumes];
        const mergedObject = mergeGeometryObject(previousObject, updatedObject);
        newName = mergedObject.name;
        newMotherVolume = mergedObject.mother_volume;
        isParentChanged = oldMotherVolume !== newMotherVolume;
        
        // Check if this is an intermediate object using world coordinates
        if (mergedObject._usingWorldCoordinates) {
          // For intermediate objects using world coordinates, we need to handle them differently
          // Remove the special flag before storing in state
          const { _usingWorldCoordinates, _isIntermediateObject, ...cleanObject } = mergedObject;
          updatedVolumes[index] = cleanObject;
        } else {
          // Normal update for regular objects
          // Remove any special flags if present
          const { _isIntermediateObject, ...cleanObject } = mergedObject;
          updatedVolumes[index] = cleanObject;
        }
        
        // If name changed, update all daughter volumes that reference this as mother
        if (oldName !== newName) {
          updatedVolumes.forEach((volume, i) => {
            if (i !== index && volume.mother_volume === oldName) {
              updatedVolumes[i] = { ...volume, mother_volume: newName };
            }
          });
        }
        
        // If parent changed and new parent is an assembly, propagate the _compoundId
        console.log(`isParentChanged: ${isParentChanged}`);
        console.log(`newMotherVolume: ${newMotherVolume}`);
        console.log(`oldMotherVolume: ${oldMotherVolume}`);
        if (isParentChanged && newMotherVolume) {
          // Find the new parent object
          const newParentIndex = updatedVolumes.findIndex(vol => vol.name === newMotherVolume);
          const newParent = newParentIndex !== -1 ? updatedVolumes[newParentIndex] : 
                           (newMotherVolume === prevGeometries.world.name ? prevGeometries.world : null);
          
          // IMPORTANT CHANGE: Only propagate _compoundId for union components, not for regular parent-child relationships
          if (newParent && newParent._compoundId && newParent.type === 'union' && updatedObject._is_boolean_component === true) {
            console.log(`Parent changed to union ${newMotherVolume} with _compoundId ${newParent._compoundId}`);
            console.log(`This is a boolean component of the union, propagating _compoundId`);
            
            // Add _compoundId to the updated object since it's a boolean component of a union
            updatedVolumes[index]._compoundId = newParent._compoundId;
            console.log(`Added _compoundId ${newParent._compoundId} to boolean component ${updatedObject.name}`);
            
            // No need to propagate _compoundId to descendants for boolean components
            return {
              ...prevGeometries,
              volumes: updatedVolumes
            };
          } else {
            // For regular parent-child relationships or non-boolean components of unions,
            // DO NOT propagate the _compoundId
            console.log(`Parent changed to ${newMotherVolume}, but not propagating _compoundId because it's not a boolean component of a union`);
            
            // Keep the original _compoundId or leave it undefined
            console.log(`Preserved original _compoundId for ${updatedObject.name}: ${updatedVolumes[index]._compoundId || 'undefined'}`);
            
            return {
              ...prevGeometries,
              volumes: updatedVolumes
            };
          }
        }
        
        return {
          ...prevGeometries,
          volumes: updatedVolumes
        };
      });
    }
  };
  
  // Execute the state update
  updateState();
  
  // CRITICAL: When keepSelected is false, we should NOT change the selection at all
  // This allows the Viewer3D component to manage selection explicitly
  if (keepSelected) {
    // Only change selection when explicitly requested
    setSelectedGeometry(id);
    console.log(`Setting selection to ${id} as requested`);
  } else {
    // When keepSelected is false, maintain the current selection
    console.log(`Keeping current selection (${currentSelection}) as requested`);
  }
};

/**
 * Generate a unique ID
 * @returns {string} A unique ID
 */
/*export const generateId = () => {
  return `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}; */

/**
 * Add a new geometry
 * @param {Object} newGeometry - The new geometry to add
 * @param {Object} geometries - The current geometries state
 * @param {Function} setGeometries - Function to update geometries state
 * @param {Function} setSelectedGeometry - Function to update selected geometry
 * @param {Function} propagateCompoundIdToDescendants - Function to propagate compound ID
 * @returns {string} The name of the added geometry
 */
export const addGeometry = (
  newGeometry, 
  geometries, 
  setGeometries, 
  setSelectedGeometry,
  propagateCompoundIdToDescendants
) => {
  
  // Set a user-friendly g4name if not already provided
  if (!newGeometry.g4name || newGeometry.g4name === `New${newGeometry.type.charAt(0).toUpperCase() + newGeometry.type.slice(1)}`) {
    // Find existing objects of this type to determine the next number
    const existingCount = geometries.volumes.filter(vol => vol.type === newGeometry.type).length;
    // Format: Type_Number (e.g., Box_1, Sphere_2)
    newGeometry.g4name = `${newGeometry.type.charAt(0).toUpperCase() + newGeometry.type.slice(1)}_${existingCount + 1}`;
  }
  
  // Check if the parent is an assembly and propagate _compoundId if needed
  if (newGeometry.mother_volume && newGeometry.mother_volume !== 'World') {
    // Find the parent object
    const parentVolume = geometries.volumes.find(vol => vol.name === newGeometry.mother_volume);
    
    // If the parent is an assembly and has a _compoundId, propagate it to the new object
    //if (parentVolume && parentVolume.type === 'assembly' && parentVolume._compoundId) {
    if (parentVolume && parentVolume._compoundId) {

      console.log(`New object's parent is compound ${parentVolume.name} with _compoundId ${parentVolume._compoundId}`);
      newGeometry._compoundId = parentVolume._compoundId;
      
      // Store the original type information before it gets overridden
      // This will be used in MultiPlacementConverter to preserve the object's true type
      if (newGeometry.type === 'assembly') {
        // Only store _originalType for assemblies since that's where the issue occurs
        newGeometry._originalType = newGeometry.g4name || newGeometry.name;
        console.log(`Preserved original type ${newGeometry._originalType} for new assembly ${newGeometry.name}`);
      }
      
      console.log(`Added _compoundId ${parentVolume._compoundId} to new object ${newGeometry.name}`);
    }
  }
  
  // Log the geometry being added
  console.log('Adding geometry:', newGeometry);
  
  // Get the index that the new volume will have
  const newVolumeIndex = geometries.volumes.length;
  const newVolumeKey = `volume-${newVolumeIndex}`;
  
  // Update geometries with the new object
  setGeometries(prevGeometries => {
    const updatedGeometries = {
      ...prevGeometries,
      volumes: [...prevGeometries.volumes, newGeometry]
    };
    
    // If the new object has a _compoundId (from an assembly parent), we need to propagate it to any descendants
    // This is for cases where a complex object with children is added to an assembly
    if (newGeometry._compoundId) {
      return {
        ...updatedGeometries,
        volumes: propagateCompoundIdToDescendants(
          newGeometry.name,
          newGeometry._compoundId,
          updatedGeometries.volumes
        )
      };
    }
    
    return updatedGeometries;
  });
  
  // Select the newly added geometry
  // Use a small timeout to ensure the geometry is added to the DOM before selecting
  // This ensures the transform controls appear immediately
  setTimeout(() => {
    console.log(`Selecting newly created object: ${newVolumeKey}`);
    setSelectedGeometry(newVolumeKey);
  }, 50);
  
  // Return the name of the added geometry (useful for tracking)
  return newGeometry.name;
};

/**
 * Remove a geometry
 * @param {string} id - The ID of the geometry to remove
 * @param {Object} geometries - The current geometries state
 * @param {Function} setGeometries - Function to update geometries state
 * @param {Function} setSelectedGeometry - Function to update selected geometry
 * @param {string} selectedGeometry - Currently selected geometry
 */
export const removeGeometry = (
  id, 
  geometries, 
  setGeometries, 
  setSelectedGeometry, 
  selectedGeometry
) => {
  if (id === 'world') {
    console.error('Cannot remove world geometry');
    return;
  }
  
  if (id.startsWith('volume-')) {
    const index = parseInt(id.split('-')[1]);
    const volumeToRemove = geometries.volumes[index];
    
    // Find all volumes to remove (the selected volume and all its descendants recursively)
    let volumesToRemove = [];
    
    // Function to recursively find all descendants
    const findDescendants = (parentName) => {
      geometries.volumes.forEach((vol, idx) => {
        if (vol.mother_volume === parentName) {
          volumesToRemove.push(idx);
          // Recursively find descendants of this volume
          findDescendants(vol.name);
        }
      });
    };
    
    // Start with the selected volume
    volumesToRemove.push(index);
    
    // Find all descendants
    findDescendants(volumeToRemove.name);
    
    console.log(`Removing volume ${volumeToRemove.name} with ${volumesToRemove.length - 1} descendants`);
    
    // Remove all volumes in the volumesToRemove array
    setGeometries(prevGeometries => {
      // Sort indices in descending order to avoid index shifting issues
      volumesToRemove.sort((a, b) => b - a);
      
      // Create a copy of the volumes array
      let newVolumes = [...prevGeometries.volumes];
      
      // Remove volumes at the specified indices
      for (const idx of volumesToRemove) {
        newVolumes.splice(idx, 1);
      }
      
      // Adjust the indices in the selectedGeometry if needed
      if (selectedGeometry && selectedGeometry.startsWith('volume-')) {
        const selectedIndex = parseInt(selectedGeometry.split('-')[1]);
        
        // Check if the selected geometry is being removed
        if (volumesToRemove.includes(selectedIndex)) {
          // If the selected geometry is being removed, deselect it
          setSelectedGeometry(null);
        } else {
          // Calculate the new index after removals
          let newIndex = selectedIndex;
          for (const idx of volumesToRemove) {
            if (idx < selectedIndex) {
              newIndex--;
            }
          }
          setSelectedGeometry(`volume-${newIndex}`);
        }
      }
      
      return {
        ...prevGeometries,
        volumes: newVolumes
      };
    });
  }
};

// Functions are already exported individually with 'export const'
