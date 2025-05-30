import * as THREE from 'three';

// Function to handle transform updates for a volume and propagate to children
export const handleVolumeTransform = (
  objKey, 
  updatedProps, 
  onTransformEnd, 
  geometries, 
  volumeNameToIndex, 
  volumesByParent, 
  dragStateRef, 
  worldToLocalCoordinates, 
  calculateWorldPosition, 
  keepSelected = false, 
  isLiveUpdate = false
) => {
  // If this is the world volume, use world coordinates directly
  if (objKey === 'world') {
    onTransformEnd(objKey, updatedProps, keepSelected);
    return;
  }
  
  // Get the volume index from the key
  const volumeIndex = parseInt(objKey.replace('volume-', ''));
  if (isNaN(volumeIndex) || !geometries.volumes[volumeIndex]) {
    console.error(`Invalid volume key: ${objKey}`);
    return;
  }
  
  const volume = geometries.volumes[volumeIndex];
  const isMotherVolume = volumesByParent[objKey] && volumesByParent[objKey].length > 0;
  const isDaughterObject = volume.mother_volume && volume.mother_volume !== 'World';
  const isIntermediateObject = isMotherVolume && isDaughterObject;
  
  // Handle the start of dragging
  if (isLiveUpdate && !dragStateRef.current.isDragging) {
    // Start of a new drag operation
    dragStateRef.current = {
      isDragging: true,
      currentDragKey: objKey,
      isMotherVolume: isMotherVolume,
      originalPositions: {}
    };
    
    // Store original positions of all volumes for reference
    if (isMotherVolume) {
      // For mother volumes, store the original positions of all children
      const storeChildPositions = (parentKey) => {
        if (volumesByParent[parentKey]) {
          volumesByParent[parentKey].forEach(child => {
            const childVolume = geometries.volumes[child.index];
            dragStateRef.current.originalPositions[child.key] = {
              position: { ...childVolume.position },
              rotation: { ...childVolume.rotation }
            };
            
            // Recursively store positions for grandchildren
            storeChildPositions(child.key);
          });
        }
      };
      
      storeChildPositions(objKey);
    }
  }
  
  // Convert world coordinates to local coordinates
  const localProps = worldToLocalCoordinates(volume, updatedProps.position, updatedProps.rotation, geometries, volumeNameToIndex);
  
  // Different handling based on whether this is a live update during dragging
  if (isLiveUpdate) {
    // During dragging
    if (dragStateRef.current.currentDragKey === objKey) {
      // This is the object being directly dragged
      // Check if this is an intermediate object (both a mother and a daughter)
      // Either from our calculation or from the flag sent by TransformableObject
      if (isIntermediateObject || updatedProps._isIntermediateObject) {
        // For intermediate objects, we need to use the world coordinates directly
        // This prevents the jumping behavior when the mouse stops moving
        const worldProps = {
          position: updatedProps.position,
          rotation: updatedProps.rotation
        };
        
        // Mark this as using world coordinates for proper handling on mouse release
        worldProps._usingWorldCoordinates = true;
        
        // Update state with world coordinates for smooth dragging
        onTransformEnd(objKey, worldProps, true, true);
      }
      // For top-level mother volumes (direct children of World)
      else if (isMotherVolume) {
        // For mother volumes, we update the state immediately so children move along with it
        onTransformEnd(objKey, localProps, keepSelected);
      } 
      // For leaf objects (no children)
      else {
        // For daughter objects being dragged directly, we don't update the state
        // to avoid coordinate transformation issues - just update the visual representation
        // The actual state update will happen in handleMouseUp
      }
    }
  } else {
    // Final update when dragging ends
    
    // Special handling for intermediate objects when dragging ends
    if (isIntermediateObject) {
      // For intermediate objects, we need to properly convert from world to local coordinates
      // Find the parent volume
      const parentIndex = volumeNameToIndex[volume.mother_volume];
      if (parentIndex !== undefined) {
        const parentVolume = geometries.volumes[parentIndex];
        
        // Get parent's world position
        const parentWorld = calculateWorldPosition(parentVolume, new Set(), geometries, volumeNameToIndex);
        
        // Create vectors for world positions
        const parentWorldPos = new THREE.Vector3(
          parentWorld.position[0],
          parentWorld.position[1],
          parentWorld.position[2]
        );
        
        // Get the current world position of the object being dragged
        const objectWorldPos = new THREE.Vector3(
          updatedProps.position.x,
          updatedProps.position.y,
          updatedProps.position.z
        );
        
        // Calculate the local position relative to the parent
        // This is the vector from the parent to the object in world space
        const localPos = new THREE.Vector3().subVectors(objectWorldPos, parentWorldPos);
        
        // If the parent has rotation, we need to account for that
        if (parentWorld.rotation[0] !== 0 || parentWorld.rotation[1] !== 0 || parentWorld.rotation[2] !== 0) {
          // Create a rotation matrix for the parent's rotation
          const parentRotX = parentWorld.rotation[0];
          const parentRotY = parentWorld.rotation[1];
          const parentRotZ = parentWorld.rotation[2];
          
          // Create a rotation matrix in the correct sequence for Geant4 (X, then Y around new Y, then Z around new Z)
          const parentRotMatrix = new THREE.Matrix4();
          
          // Create individual rotation matrices
          const rotX = new THREE.Matrix4().makeRotationX(parentRotX);
          const rotY = new THREE.Matrix4().makeRotationY(parentRotY);
          const rotZ = new THREE.Matrix4().makeRotationZ(parentRotZ);
          
          // Apply in sequence: first X, then Y, then Z
          parentRotMatrix.copy(rotX).multiply(rotY).multiply(rotZ);
          
          // Get the inverse of the parent's rotation matrix
          const inverseParentRotMatrix = parentRotMatrix.clone().invert();
          
          // Apply the inverse rotation to the local position
          localPos.applyMatrix4(inverseParentRotMatrix);
        }
        
        // Create the final local coordinates
        const finalLocalProps = {
          position: {
            x: localPos.x,
            y: localPos.y,
            z: localPos.z,
            unit: volume.position?.unit || 'cm'
          },
          rotation: localProps.rotation // Use the rotation from the standard conversion
        };
        
        // Update with the correctly calculated local coordinates
        onTransformEnd(objKey, finalLocalProps, keepSelected);
      } else {
        // Fallback to standard local coordinates if parent not found
        onTransformEnd(objKey, localProps, keepSelected);
      }
    } else {
      // For non-intermediate objects, use the standard local coordinates
      onTransformEnd(objKey, localProps, keepSelected);
    }
    
    // Reset drag state
    dragStateRef.current = {
      isDragging: false,
      currentDragKey: null,
      isMotherVolume: false,
      originalPositions: {}
    };
  }
};
