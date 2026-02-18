import * as THREE from 'three';

// Function to calculate the world position of a volume based on its parent hierarchy
// We use a visited set to prevent circular references
export const calculateWorldPosition = (volume, visited = new Set(), geometries, volumeNameToIndex) => {
  if (!volume) {
    console.warn('Invalid volume passed to calculateWorldPosition');
    return {
      position: [0, 0, 0],
      rotation: [0, 0, 0]
    };
  }

  // Check for circular references
  if (visited.has(volume.name)) {
    console.warn(`Circular reference detected for volume: ${volume.name}`);
    return {
      position: volume.position ? [volume.position.x || 0, volume.position.y || 0, volume.position.z || 0] : [0, 0, 0],
      rotation: volume.rotation ? [volume.rotation.x || 0, volume.rotation.y || 0, volume.rotation.z || 0] : [0, 0, 0]
    };
  }
  
  // Create a new copy of the visited set for this level of recursion
  // This prevents issues with shared visited sets across different branches of recursion
  const currentVisited = new Set(visited);
  currentVisited.add(volume.name);
  
  if (!volume.mother_volume || volume.mother_volume === 'World') {
    // Direct child of world - use its own position
    return {
      position: volume.position ? [volume.position.x || 0, volume.position.y || 0, volume.position.z || 0] : [0, 0, 0],
      rotation: volume.rotation ? [volume.rotation.x || 0, volume.rotation.y || 0, volume.rotation.z || 0] : [0, 0, 0]
    };
  }
  
  // Find parent volume
  const parentIndex = volumeNameToIndex[volume.mother_volume];
  if (parentIndex === undefined) {
    // Parent not found, use own position
    return {
      position: volume.position ? [volume.position.x || 0, volume.position.y || 0, volume.position.z || 0] : [0, 0, 0],
      rotation: volume.rotation ? [volume.rotation.x || 0, volume.rotation.y || 0, volume.rotation.z || 0] : [0, 0, 0]
    };
  }
  
  const parentVolume = geometries.volumes[parentIndex];
  
  // Special handling for assembly parents
  if (parentVolume.type === 'assembly') {
    // Check for self-reference (assembly referencing itself as parent)
    if (parentVolume.name === volume.name) {
      console.error(`Self-reference detected: ${volume.name} has itself as parent. Using World position.`);
      return {
        position: volume.position ? 
          [volume.position.x || 0, volume.position.y || 0, volume.position.z || 0] : [0, 0, 0],
        rotation: volume.rotation ? 
          [volume.rotation.x || 0, volume.rotation.y || 0, volume.rotation.z || 0] : [0, 0, 0]
      };
    }
    
    // Get the full world position of the assembly, including any transforms from its parent
    // This ensures that when an assembly is a daughter of another object, its components inherit the full transform chain
    let assemblyWorld;
    
    // If the assembly has a parent that's not World, calculate its world position recursively
    if (parentVolume.mother_volume && parentVolume.mother_volume !== 'World') {
      // Find the assembly's parent
      const assemblyParentIndex = volumeNameToIndex[parentVolume.mother_volume];
      if (assemblyParentIndex !== undefined) {
        // Check for circular reference between parent and child
        if (parentVolume.mother_volume === volume.name) {
          console.warn(`Circular parent-child reference detected: ${volume.name} <-> ${parentVolume.name}`);
          // Use local position to break the circular reference
          assemblyWorld = {
            position: parentVolume.position ? 
              [parentVolume.position.x || 0, parentVolume.position.y || 0, parentVolume.position.z || 0] : [0, 0, 0],
            rotation: parentVolume.rotation ? 
              [parentVolume.rotation.x || 0, parentVolume.rotation.y || 0, parentVolume.rotation.z || 0] : [0, 0, 0]
          };
        } else {
          // Get the assembly's world position by calculating it from its parent
          assemblyWorld = calculateWorldPosition(parentVolume, currentVisited, geometries, volumeNameToIndex);
        }
      } else {
        // If parent not found, use assembly's local position
        assemblyWorld = {
          position: parentVolume.position ? 
            [parentVolume.position.x || 0, parentVolume.position.y || 0, parentVolume.position.z || 0] : [0, 0, 0],
          rotation: parentVolume.rotation ? 
            [parentVolume.rotation.x || 0, parentVolume.rotation.y || 0, parentVolume.rotation.z || 0] : [0, 0, 0]
        };
      }
    } else {
      // If the assembly's parent is World, use its position directly
      assemblyWorld = {
        position: parentVolume.position ? 
          [parentVolume.position.x || 0, parentVolume.position.y || 0, parentVolume.position.z || 0] : [0, 0, 0],
        rotation: parentVolume.rotation ? 
          [parentVolume.rotation.x || 0, parentVolume.rotation.y || 0, parentVolume.rotation.z || 0] : [0, 0, 0]
      };
    }
    
    // Now use the assembly's world position instead of just its local position
    const assemblyPos = assemblyWorld.position;
    const assemblyRot = assemblyWorld.rotation;
    
    // For components in an assembly, we need to properly transform the local position
    // using the assembly's rotation, not just add positions
    const localPos = volume.position ? [volume.position.x || 0, volume.position.y || 0, volume.position.z || 0] : [0, 0, 0];
    const localRot = volume.rotation ? [volume.rotation.x || 0, volume.rotation.y || 0, volume.rotation.z || 0] : [0, 0, 0];
    
    // Create a matrix to transform the local position by the assembly's transform
    const assemblyMatrix = new THREE.Matrix4();
    
    // Create rotation matrix for the assembly
    const rotMatrix = new THREE.Matrix4();
    
    // Create individual rotation matrices for the assembly
    const rotX = new THREE.Matrix4().makeRotationX(assemblyRot[0]);
    const rotY = new THREE.Matrix4().makeRotationY(assemblyRot[1]);
    const rotZ = new THREE.Matrix4().makeRotationZ(assemblyRot[2]);
    
    // Apply in sequence: first X, then Y, then Z
    rotMatrix.copy(rotX).multiply(rotY).multiply(rotZ);
    
    // Set assembly position and rotation
    assemblyMatrix.setPosition(new THREE.Vector3(assemblyPos[0], assemblyPos[1], assemblyPos[2]));
    assemblyMatrix.multiply(rotMatrix);
    
    // Transform local position by assembly matrix
    const localVector = new THREE.Vector3(localPos[0], localPos[1], localPos[2]);
    localVector.applyMatrix4(assemblyMatrix);
    
    // For top-level components in an assembly, we need to combine the assembly's rotation
    // with the component's own rotation to allow individual rotation of objects within assemblies
    if (volume.mother_volume === parentVolume.name && parentVolume.type === 'assembly') {
      // Combine assembly rotation with the object's own rotation
      const assemblyQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(assemblyRot[0], assemblyRot[1], assemblyRot[2], 'XYZ')
      );
      
      const localQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(localRot[0], localRot[1], localRot[2], 'XYZ')
      );
      
      // Multiply quaternions to combine rotations (order matters)
      const combinedQuat = assemblyQuat.multiply(localQuat);
      
      // Convert back to Euler angles
      const combinedEuler = new THREE.Euler().setFromQuaternion(combinedQuat, 'XYZ');
      const combinedRotation = [
        combinedEuler.x,
        combinedEuler.y,
        combinedEuler.z
      ];
      
      return {
        position: [localVector.x, localVector.y, localVector.z],
        rotation: combinedRotation
      };
    }
    
    // For nested components (components of components), combine rotations using quaternions
    const assemblyQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(assemblyRot[0], assemblyRot[1], assemblyRot[2], 'XYZ')
    );
    
    const localQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(localRot[0], localRot[1], localRot[2], 'XYZ')
    );
    
    // Multiply quaternions to combine rotations (order matters)
    const combinedQuat = assemblyQuat.multiply(localQuat);
    
    // Convert back to Euler angles
    const combinedEuler = new THREE.Euler().setFromQuaternion(combinedQuat, 'XYZ');
    const combinedRotation = [
      combinedEuler.x,
      combinedEuler.y,
      combinedEuler.z
    ];
    
    return {
      position: [localVector.x, localVector.y, localVector.z],
      rotation: combinedRotation
    };
  }
  
  // Get parent's world position recursively
  // Check for circular reference between parent and child
  if (parentVolume.mother_volume === volume.name) {
    console.warn(`Circular parent-child reference detected: ${volume.name} <-> ${parentVolume.name}`);
    // Use local position to break the circular reference
    return {
      position: volume.position ? 
        [volume.position.x || 0, volume.position.y || 0, volume.position.z || 0] : [0, 0, 0],
      rotation: volume.rotation ? 
        [volume.rotation.x || 0, volume.rotation.y || 0, volume.rotation.z || 0] : [0, 0, 0]
    };
  }
  
  // Use the currentVisited set to track visited volumes and prevent circular references
  const parentWorld = calculateWorldPosition(parentVolume, currentVisited, geometries, volumeNameToIndex);
  
  // Convert volume's local position to world position based on parent
  const localPos = volume.position ? [volume.position.x || 0, volume.position.y || 0, volume.position.z || 0] : [0, 0, 0];
  const localRot = volume.rotation ? [volume.rotation.x || 0, volume.rotation.y || 0, volume.rotation.z || 0] : [0, 0, 0];
  
  // Create a matrix to transform the local position by the parent's transform
  const parentMatrix = new THREE.Matrix4();
  
  // Set parent rotation (convert from degrees to radians)
  const parentRotX = parentWorld.rotation[0];
  const parentRotY = parentWorld.rotation[1];
  const parentRotZ = parentWorld.rotation[2];
  
  // Apply rotations in the correct sequence for Geant4 (X, then Y around new Y, then Z around new Z)
  // This is critical for compound objects to rotate correctly as a single solid
  const rotMatrix = new THREE.Matrix4();
  
  // Create individual rotation matrices
  const rotX = new THREE.Matrix4().makeRotationX(parentRotX);
  const rotY = new THREE.Matrix4().makeRotationY(parentRotY);
  const rotZ = new THREE.Matrix4().makeRotationZ(parentRotZ);
  
  // Apply in sequence: first X, then Y, then Z
  rotMatrix.copy(rotX).multiply(rotY).multiply(rotZ);
  
  // Set parent position and rotation
  parentMatrix.setPosition(new THREE.Vector3(parentWorld.position[0], parentWorld.position[1], parentWorld.position[2]));
  parentMatrix.multiply(rotMatrix);
  
  // Transform local position by parent matrix
  const localVector = new THREE.Vector3(localPos[0], localPos[1], localPos[2]);
  localVector.applyMatrix4(parentMatrix);
  
  // Combine rotations using quaternions for proper rotation composition
  // This is the correct way to handle nested rotations in 3D space
  const parentQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      parentWorld.rotation[0],
      parentWorld.rotation[1],
      parentWorld.rotation[2],
      'XYZ'
    )
  );
  
  const localQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      localRot[0],
      localRot[1],
      localRot[2],
      'XYZ'
    )
  );
  
  // Multiply quaternions to combine rotations (order matters)
  const combinedQuat = parentQuat.multiply(localQuat);
  
  // Convert back to Euler angles in degrees
  const combinedEuler = new THREE.Euler().setFromQuaternion(combinedQuat, 'XYZ');
  const combinedRotation = [
    combinedEuler.x,
    combinedEuler.y,
    combinedEuler.z
  ];
  
  return {
    position: [localVector.x, localVector.y, localVector.z],
    rotation: combinedRotation
  };
};

// Function to convert world coordinates back to local coordinates
export const worldToLocalCoordinates = (volume, worldPos, worldRot, geometries, volumeNameToIndex) => {
  // For direct children of World, the local coordinates are simply the world coordinates
  if (!volume.mother_volume || volume.mother_volume === 'World') {
    return {
      position: {
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
      },
      rotation: {
        x: worldRot.x,
        y: worldRot.y,
        z: worldRot.z,
      }
    };
  }
  
  // Find parent volume
  const parentIndex = volumeNameToIndex[volume.mother_volume];
  if (parentIndex === undefined) {
    console.error(`Parent volume not found: ${volume.mother_volume}`);
    // Fallback to world coordinates if parent not found
    return {
      position: {
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
      },
      rotation: {
        x: worldRot.x,
        y: worldRot.y,
        z: worldRot.z,
      }
    };
  }
  
  const parentVolume = geometries.volumes[parentIndex];
  
  // Get parent's world position
  const parentWorld = calculateWorldPosition(parentVolume, new Set(), geometries, volumeNameToIndex);
  
  // Create vectors for world positions
  const parentWorldPos = new THREE.Vector3(
    parentWorld.position[0],
    parentWorld.position[1],
    parentWorld.position[2]
  );
  
  const childWorldPos = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
  
  // Create a matrix for the parent's rotation
  const parentRotMatrix = new THREE.Matrix4();
  
  // Set parent rotation (convert from degrees to radians)
  const parentRotX = parentWorld.rotation[0];
  const parentRotY = parentWorld.rotation[1];
  const parentRotZ = parentWorld.rotation[2];
  
  // Create a rotation matrix in the correct sequence for Geant4 (X, then Y around new Y, then Z around new Z)
  // Create individual rotation matrices
  const rotX = new THREE.Matrix4().makeRotationX(parentRotX);
  const rotY = new THREE.Matrix4().makeRotationY(parentRotY);
  const rotZ = new THREE.Matrix4().makeRotationZ(parentRotZ);
  
  // Apply in sequence: first X, then Y, then Z
  parentRotMatrix.copy(rotX).multiply(rotY).multiply(rotZ);
  
  // Create the parent's world transformation matrix
  const parentWorldMatrix = new THREE.Matrix4().compose(
    parentWorldPos,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(parentRotX, parentRotY, parentRotZ, 'XYZ')),
    new THREE.Vector3(1, 1, 1)
  );
  
  // Get the inverse of the parent's world matrix
  const inverseParentWorldMatrix = parentWorldMatrix.clone().invert();
  
  // Transform the child's world position to local position relative to parent
  const localPos = childWorldPos.clone().applyMatrix4(inverseParentWorldMatrix);
  
  // Handle rotation conversion
  // Create quaternions for the world rotation and parent rotation
  const worldQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      worldRot.x,
      worldRot.y,
      worldRot.z,
      'XYZ'
    )
  );
  
  const parentQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(parentRotX, parentRotY, parentRotZ, 'XYZ')
  );
  
  // Get the inverse of the parent's rotation
  const inverseParentQuat = parentQuat.clone().invert();
  
  // Multiply the world rotation by the inverse parent rotation
  // This gives us the local rotation
  const localQuat = worldQuat.clone().premultiply(inverseParentQuat);
  
  // Convert back to Euler angles
  const localEuler = new THREE.Euler().setFromQuaternion(localQuat, 'XYZ');
  
  return {
    position: {
      x: localPos.x,
      y: localPos.y,
      z: localPos.z,
      unit: volume.position?.unit || 'cm'
    },
    rotation: {
      x: localEuler.x,
      y: localEuler.y,
      z: localEuler.z,
      unit: volume.rotation?.unit || 'rad'
    }
  };
};

// Function to get the parent key for a volume
export const getParentKey = (volume, volumeNameToIndex) => {
  if (!volume.mother_volume || volume.mother_volume === 'World') {
    return 'world';
  }
  
  // Find the index of the parent volume by name
  const parentIndex = volumeNameToIndex[volume.mother_volume];
  if (parentIndex !== undefined) {
    return `volume-${parentIndex}`;
  }
  
  // Default to world if parent not found
  return 'world';
};

// Function to group volumes by their parent
export const groupVolumesByParent = (geometries, volumeNameToIndex) => {
  const volumesByParent = {
    world: [] // Volumes with World as parent
  };
  
  // Initialize volume groups for all volumes
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    const key = `volume-${index}`;
    volumesByParent[key] = []; // Initialize empty array for each volume
  });
  
  // Populate the groups
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    const key = `volume-${index}`;
    const parentKey = getParentKey(volume, volumeNameToIndex);
    
    // Add this volume to its parent's children list
    if (volumesByParent[parentKey]) {
      volumesByParent[parentKey].push({
        volume,
        key,
        index
      });
    }
  });
  
  return volumesByParent;
};
