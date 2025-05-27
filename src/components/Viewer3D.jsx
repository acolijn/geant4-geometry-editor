import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
// Instance tracking functionality has been removed for a cleaner implementation
import TransformableObject from './viewer3D/TransformableObject';
/* import BoxObject from './viewer3D/BoxObject';
import SphereObject from './viewer3D/SphereObject';
import CylinderObject from './viewer3D/CylinderObject';
import TrapezoidObject from './viewer3D/TrapezoidObject';
import TorusObject from './viewer3D/TorusObject';
import EllipsoidObject from './viewer3D/EllipsoidObject';
import PolyconeObject from './viewer3D/PolyconeObject'; */

// Coordinate system component
function CoordinateSystem() {
  const { scene } = useThree();
  
  useEffect(() => {
    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);
    
    return () => {
      scene.remove(axesHelper);
    };
  }, [scene]);
  
  return null;
}

// Camera setup component
function CameraSetup({ setFrontViewCamera, worldSize }) {
  const { camera } = useThree();
  
  // Calculate camera distance based on world size
  const calculateCameraDistance = () => {
    // Get the maximum dimension of the world volume
    const maxDimension = Math.max(
      worldSize?.x || 2000,
      worldSize?.y || 2000,
      worldSize?.z || 2000
    );
    
    // Set camera distance to be 1.75x the maximum dimension
    // This provides enough space to view the entire world volume
    return -1.75 * maxDimension;
  };
  
  // Set front view on initial load with z-axis pointing upward
  useEffect(() => {
    // Position camera to look at the scene from the front (y-axis)
    // with z-axis pointing upward
    const cameraDistance = calculateCameraDistance();
    camera.position.set(0, cameraDistance, 0);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, 1); // Set z-axis as the up direction
    
    // Store the camera in the ref for the front view button
    if (setFrontViewCamera) {
      setFrontViewCamera(camera);
    }
  }, [camera, setFrontViewCamera, worldSize]);
  
  return null;
}




// Simple Scene component with flat object structure
function Scene({ geometries, selectedGeometry, onSelect, setFrontViewCamera, transformMode, onTransformEnd, worldSize }) {
  // Track which objects are source objects (objects that have been loaded from files)
  const [sourceObjects, setSourceObjects] = useState({});
  
  // Instance tracking functionality has been removed for a cleaner implementation
  // Source object tracking will be reimplemented in a simpler way
  useEffect(() => {
    // Simple placeholder for now - we'll implement a better solution later
    const newSourceObjects = {};
    
    // For now, we'll just consider all objects as non-source objects
    // This will be replaced with a proper tracking mechanism
    
    setSourceObjects(newSourceObjects);
  }, [geometries]);
  // Debug the selected geometry to help diagnose issues
  React.useEffect(() => {
    if (selectedGeometry) {
      console.log(`Selected geometry: ${selectedGeometry}`);
    }
  }, [selectedGeometry]);
  // Create a map of volume names to their indices for easy lookup
  const volumeNameToIndex = {};
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    if (volume.name) {
      volumeNameToIndex[volume.name] = index;
    }
  });
  
  // Function to get a volume's parent object key
  const getParentKey = (volume) => {
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
  
  // Group volumes by their parent
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
    const parentKey = getParentKey(volume);
    
    // Add this volume to its parent's children list
    if (volumesByParent[parentKey]) {
      volumesByParent[parentKey].push({
        volume,
        key,
        index
      });
    }
  });
  
  // Function to calculate the world position of a volume based on its parent hierarchy
  // We use a visited set to prevent circular references
  const calculateWorldPosition = (volume, visited = new Set()) => {
    // Check for circular references
    if (visited.has(volume.name)) {
      console.warn(`Circular reference detected for volume: ${volume.name}`);
      return {
        position: volume.position ? [volume.position.x || 0, volume.position.y || 0, volume.position.z || 0] : [0, 0, 0],
        rotation: volume.rotation ? [volume.rotation.x || 0, volume.rotation.y || 0, volume.rotation.z || 0] : [0, 0, 0]
      };
    }
    
    // Add this volume to the visited set
    visited.add(volume.name);
    
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
      // For assemblies, we use the assembly's position directly without recursion
      // This prevents circular references when working with assemblies
      const assemblyPos = parentVolume.position ? 
        [parentVolume.position.x || 0, parentVolume.position.y || 0, parentVolume.position.z || 0] : [0, 0, 0];
      const assemblyRot = parentVolume.rotation ? 
        [parentVolume.rotation.x || 0, parentVolume.rotation.y || 0, parentVolume.rotation.z || 0] : [0, 0, 0];
      
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
      
      // Check if the assembly's parent is also an assembly (to avoid nested assembly issues)
      if (parentVolume.mother_volume && 
          parentVolume.mother_volume !== 'World' && 
          parentVolume.mother_volume !== volume.name) { // Avoid circular reference
        
        const grandparentIndex = volumeNameToIndex[parentVolume.mother_volume];
        if (grandparentIndex !== undefined) {
          const grandparentVolume = geometries.volumes[grandparentIndex];
          if (grandparentVolume && grandparentVolume.type === 'assembly') {
            console.warn(`Nested assemblies detected: ${volume.name} -> ${parentVolume.name} -> ${grandparentVolume.name}. Using direct parent only.`);
            // We'll still use the direct parent's position, but log a warning
          }
        }
      }
      
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
    const parentWorld = calculateWorldPosition(parentVolume, visited);
    
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
  const worldToLocalCoordinates = (volume, worldPos, worldRot) => {
    // For direct children of World, the local coordinates are simply the world coordinates
    if (!volume.mother_volume || volume.mother_volume === 'World') {
      return {
        position: {
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z,
          unit: volume.position?.unit || 'cm'
        },
        rotation: {
          x: worldRot.x,
          y: worldRot.y,
          z: worldRot.z,
          unit: volume.rotation?.unit || 'deg'
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
          unit: volume.position?.unit || 'cm'
        },
        rotation: {
          x: worldRot.x,
          y: worldRot.y,
          z: worldRot.z,
          unit: volume.rotation?.unit || 'deg'
        }
      };
    }
    
    const parentVolume = geometries.volumes[parentIndex];
    
    // Get parent's world position
    const parentWorld = calculateWorldPosition(parentVolume);
    
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
        //unit: volume.position?.unit || 'cm'
      },
      rotation: {
        // This is wrong!
        //x: THREE.MathUtils.radToDeg(localEuler.x),
        //y: THREE.MathUtils.radToDeg(localEuler.y),
        //z: THREE.MathUtils.radToDeg(localEuler.z),
        // This is good!
        x: localEuler.x,
        y: localEuler.y,
        z: localEuler.z        
      }
    };
  };
  
  // Store the current drag state to handle live updates properly
  const dragStateRef = useRef({
    isDragging: false,
    currentDragKey: null,
    isMotherVolume: false,
    originalPositions: {}
  });
  
  // Function to handle transform updates for a volume and propagate to children
  const handleVolumeTransform = (objKey, updatedProps, keepSelected = false, isLiveUpdate = false) => {
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
    const localProps = worldToLocalCoordinates(volume, updatedProps.position, updatedProps.rotation);
    
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
          const parentWorld = calculateWorldPosition(parentVolume);
          
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
  
  // Render all volumes in a flat structure
  const renderVolumes = () => {
    if (!geometries.volumes) return null;
    
    return geometries.volumes.map((volume, index) => {
      const key = `volume-${index}`;
      const isMotherVolume = volumesByParent[key] && volumesByParent[key].length > 0;
      
      // Calculate the world position for this volume
      const worldTransform = calculateWorldPosition(volume);
      
      // Apply rotation (convert from degrees to radians for Three.js)
      const rotX = worldTransform.rotation[0];
      const rotY = worldTransform.rotation[1];
      const rotZ = worldTransform.rotation[2];
      
      // For compound objects, we need to preserve the original rotation values
      // instead of converting them through matrices, which can introduce errors
      // This ensures daughter objects don't pick up extra rotations
      
      // Create Euler angles directly from the world transform rotation values
      // This preserves the exact rotation values without matrix conversion errors
      const euler = new THREE.Euler(rotX, rotY, rotZ, 'XYZ');
      
      return (
        <TransformableObject 
          key={key}
          object={{
            ...volume,
            // Use calculated world position for rendering
            calculatedWorldPosition: {
              x: worldTransform.position[0],
              y: worldTransform.position[1],
              z: worldTransform.position[2]
            },
            calculatedWorldRotation: {
              x: worldTransform.rotation[0],
              y: worldTransform.rotation[1],
              z: worldTransform.rotation[2]
            }
          }}
          objectKey={key}
          isSelected={selectedGeometry === key}
          transformMode={transformMode}
          onSelect={() => onSelect(key)}
          isMotherVolume={isMotherVolume}
          worldPosition={worldTransform.position}
          worldRotation={[euler.x, euler.y, euler.z]}
          isSourceObject={sourceObjects[key] === true}
          onTransformEnd={(objKey, updatedProps, keepSelected, isLiveUpdate) => handleVolumeTransform(objKey, updatedProps, keepSelected, isLiveUpdate)}
        />
      );
    });
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <CoordinateSystem />
      <CameraSetup setFrontViewCamera={setFrontViewCamera} worldSize={worldSize} />
      
      {/* World volume - rendered as a non-interactive wireframe */}
      <mesh
        visible
        userData={{ isWorldVolume: true }}
        scale={[geometries.world.size?.x || 1000, geometries.world.size?.y || 1000, geometries.world.size?.z || 1000]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#aaaaaa" wireframe={true} transparent={true} opacity={0.3} />
      </mesh>
      
      {/* Hidden TransformableObject for World to maintain data model, but not interactive */}
      {selectedGeometry === 'world' && (
        <TransformableObject 
          object={{...geometries.world, isNonMovable: true, isNonSelectable: true}}
          objectKey="world"
          isSelected={selectedGeometry === 'world'}
          transformMode={transformMode}
          onSelect={() => {/* No-op */}}
          onTransformEnd={onTransformEnd}
          isSourceObject={sourceObjects['world'] === true}
          visible={false}
        />
      )}
      
      {/* Render all volumes in a flat structure */}
      {renderVolumes()}
    </>
  );
}

// GeometryTree component for the left panel
const GeometryTree = ({ geometries, selectedGeometry, onSelect, onUpdateGeometry }) => {
  // State to track expanded nodes - initially only World is expanded
  const [expandedNodes, setExpandedNodes] = useState({ world: true });
  
  // State for context menu
  const [contextMenu, setContextMenu] = useState(null);
  
  // State for assembly selection dialog
  const [assemblyDialog, setAssemblyDialog] = useState({
    open: false,
    volumeIndex: null,
    assemblies: []
  });
  
  // Function to toggle node expansion
  const toggleNodeExpansion = (nodeKey, event) => {
    // Stop the click event from bubbling up to the parent div
    // which would trigger selection
    event.stopPropagation();
    
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };
  
  // Function to handle right-click for context menu
  const handleContextMenu = (event, volumeIndex) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      volumeIndex
    });
  };
  
  // Function to close context menu
  const handleCloseContextMenu = () => {
    // Close the context menu
    setContextMenu(null);
  };
  
  // Function to update all similar assemblies
  const handleUpdateAllAssemblies = (volumeIndex) => {
    handleCloseContextMenu();
    
    // Get the selected volume
    const selectedVolume = geometries.volumes[volumeIndex];
    
    // Only proceed if the selected volume is an assembly
    if (selectedVolume.type !== 'assembly') {
      alert('Only assemblies can be updated. Please select an assembly.');
      return;
    }
    
    // Count of updated assemblies
    let updatedCount = 0;
    
    // First, find all components in the source assembly
    const sourceComponents = [];
    const sourceAssemblyName = selectedVolume.name;
    
    // Find all components that belong to the source assembly
    for (let i = 0; i < geometries.volumes.length; i++) {
      const volume = geometries.volumes[i];
      if (volume.mother_volume === sourceAssemblyName) {
        sourceComponents.push({
          index: i,
          volume: volume,
          _componentId: volume._componentId
        });
      }
    }
    
    console.log(`Found ${sourceComponents.length} components in source assembly ${sourceAssemblyName}:`, sourceComponents);
    
    // Update all assemblies except the selected one
    for (let i = 0; i < geometries.volumes.length; i++) {
      const volume = geometries.volumes[i];
      
      // Skip the source assembly itself
      if (i === volumeIndex) continue;
      
      // Only update assemblies
      if (volume.type !== 'assembly') continue;
      
      const targetAssemblyName = volume.name;
      
      // Create a new object with properties from the selected assembly
      // but preserve position, rotation, name, and identifiers of the target assembly
      const updatedAssembly = {
        ...selectedVolume,
        // CRITICAL: Preserve these properties
        position: { ...volume.position },
        rotation: { ...volume.rotation },
        name: targetAssemblyName, // Preserve assembly name
        mother_volume: volume.mother_volume
      };
      
      // If the assembly has an instance ID, preserve it
      if (volume._instanceId) {
        updatedAssembly._instanceId = volume._instanceId;
      }
      
      // Preserve displayName and g4name if they exist
      if (volume.displayName) {
        updatedAssembly.displayName = volume.displayName;
      }
      if (volume.g4name) {
        updatedAssembly.g4name = volume.g4name;
      }
      
      // Debug logs
      console.log(`Updating assembly at index ${i}:`, {
        sourceAssembly: selectedVolume,
        targetAssembly: volume,
        updatedAssembly: updatedAssembly
      });
      
      // Update this specific assembly
      // Use the volume ID format: 'volume-index'
      onUpdateGeometry(`volume-${i}`, updatedAssembly, true, false);
      
      // Now update all components of this assembly
      // First, find all components that belong to this target assembly
      const targetComponents = [];
      for (let j = 0; j < geometries.volumes.length; j++) {
        const component = geometries.volumes[j];
        if (component.mother_volume === targetAssemblyName) {
          targetComponents.push({
            index: j,
            volume: component,
            _componentId: component._componentId
          });
        }
      }
      
      console.log(`Found ${targetComponents.length} components in target assembly ${targetAssemblyName}:`, targetComponents);
      
      // For each source component, find matching target component by _componentId
      // and update it with the source component's properties
      for (const sourceComponent of sourceComponents) {
        // Find matching target component by _componentId
        const matchingTargetComponent = targetComponents.find(tc => 
          tc._componentId && sourceComponent._componentId && tc._componentId === sourceComponent._componentId
        );
        
        if (matchingTargetComponent) {
          // Create updated component with properties from source but preserve critical identifiers
          const updatedComponent = {
            ...sourceComponent.volume,
            // CRITICAL: Preserve these identifiers
            name: matchingTargetComponent.volume.name, // Preserve internal name
            mother_volume: targetAssemblyName, // Preserve parent relationship
            _componentId: matchingTargetComponent.volume._componentId // Preserve component ID
          };
          
          // Preserve displayName and g4name if they exist
          if (matchingTargetComponent.volume.displayName) {
            updatedComponent.displayName = matchingTargetComponent.volume.displayName;
          }
          if (matchingTargetComponent.volume.g4name) {
            updatedComponent.g4name = matchingTargetComponent.volume.g4name;
          }
          
          console.log(`Updating component at index ${matchingTargetComponent.index}:`, {
            sourceComponent: sourceComponent.volume,
            targetComponent: matchingTargetComponent.volume,
            updatedComponent: updatedComponent
          });
          
          // Update this specific component
          onUpdateGeometry(`volume-${matchingTargetComponent.index}`, updatedComponent, true, false);
        } else {
          console.log(`No matching component found for source component with ID ${sourceComponent._componentId}`);
        }
      }
      
      updatedCount++;
    }
    
    // Show success message
    if (updatedCount > 0) {
      alert(`Updated ${updatedCount} assemblies successfully.`);
    } else {
      alert('No other assemblies found to update.');
    }
  };
  
  // Function to update selected assemblies
  const handleUpdateSelectedAssemblies = (volumeIndex) => {
    handleCloseContextMenu();
    
    // Get the selected volume
    const selectedVolume = geometries.volumes[volumeIndex];
    
    // Only proceed if the selected volume is an assembly
    if (selectedVolume.type !== 'assembly') {
      alert('Only assemblies can be updated. Please select an assembly.');
      return;
    }
    
    // Find all assemblies in the scene
    const allAssemblies = geometries.volumes
      .map((volume, index) => ({ volume, index }))
      .filter(item => item.volume.type === 'assembly' && item.index !== volumeIndex);
    
    if (allAssemblies.length === 0) {
      alert('No other assemblies found to update.');
      return;
    }
    
    // Create a simple selection dialog
    const assemblyOptions = allAssemblies.map(item => 
      `${item.index}: ${item.volume.name}`
    ).join('\n');
    
    const userInput = prompt(
      `Select assemblies to update (comma-separated indices):\n${assemblyOptions}`,
      ''
    );
    
    if (!userInput) return; // User cancelled
    
    // Parse the selected indices
    const selectedIndices = userInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    if (selectedIndices.length === 0) {
      alert('No valid indices selected.');
      return;
    }
    
    // First, find all components in the source assembly
    const sourceComponents = [];
    const sourceAssemblyName = selectedVolume.name;
    
    // Find all components that belong to the source assembly
    for (let i = 0; i < geometries.volumes.length; i++) {
      const volume = geometries.volumes[i];
      if (volume.mother_volume === sourceAssemblyName) {
        sourceComponents.push({
          index: i,
          volume: volume,
          _componentId: volume._componentId
        });
      }
    }
    
    console.log(`Found ${sourceComponents.length} components in source assembly ${sourceAssemblyName}:`, sourceComponents);
    
    // Count of successfully updated assemblies
    let updatedCount = 0;
    
    // Update the selected assemblies
    for (const index of selectedIndices) {
      // Skip invalid indices
      if (index < 0 || index >= geometries.volumes.length) continue;
      
      const volume = geometries.volumes[index];
      
      // Skip non-assemblies
      if (volume.type !== 'assembly') continue;
      
      const targetAssemblyName = volume.name;
      
      // Create a new object with properties from the selected assembly
      // but preserve position, rotation, name, and identifiers of the target assembly
      const updatedAssembly = {
        ...selectedVolume,
        // CRITICAL: Preserve these properties
        position: { ...volume.position },
        rotation: { ...volume.rotation },
        name: targetAssemblyName, // Preserve assembly name
        mother_volume: volume.mother_volume
      };
      
      // If the assembly has an instance ID, preserve it
      if (volume._instanceId) {
        updatedAssembly._instanceId = volume._instanceId;
      }
      
      // Preserve displayName and g4name if they exist
      if (volume.displayName) {
        updatedAssembly.displayName = volume.displayName;
      }
      if (volume.g4name) {
        updatedAssembly.g4name = volume.g4name;
      }
      
      // Update this specific assembly
      // Use the volume ID format: 'volume-index'
      onUpdateGeometry(`volume-${index}`, updatedAssembly, true, false);
      
      // Now update all components of this assembly
      // First, find all components that belong to this target assembly
      const targetComponents = [];
      for (let j = 0; j < geometries.volumes.length; j++) {
        const component = geometries.volumes[j];
        if (component.mother_volume === targetAssemblyName) {
          targetComponents.push({
            index: j,
            volume: component,
            _componentId: component._componentId
          });
        }
      }
      
      console.log(`Found ${targetComponents.length} components in target assembly ${targetAssemblyName}:`, targetComponents);
      
      // For each source component, find matching target component by _componentId
      // and update it with the source component's properties
      for (const sourceComponent of sourceComponents) {
        // Find matching target component by _componentId
        const matchingTargetComponent = targetComponents.find(tc => 
          tc._componentId && sourceComponent._componentId && tc._componentId === sourceComponent._componentId
        );
        
        if (matchingTargetComponent) {
          // Create updated component with properties from source but preserve critical identifiers
          const updatedComponent = {
            ...sourceComponent.volume,
            // CRITICAL: Preserve these identifiers
            name: matchingTargetComponent.volume.name, // Preserve internal name
            mother_volume: targetAssemblyName, // Preserve parent relationship
            _componentId: matchingTargetComponent.volume._componentId // Preserve component ID
          };
          
          // Preserve displayName and g4name if they exist
          if (matchingTargetComponent.volume.displayName) {
            updatedComponent.displayName = matchingTargetComponent.volume.displayName;
          }
          if (matchingTargetComponent.volume.g4name) {
            updatedComponent.g4name = matchingTargetComponent.volume.g4name;
          }
          
          console.log(`Updating component at index ${matchingTargetComponent.index}:`, {
            sourceComponent: sourceComponent.volume,
            targetComponent: matchingTargetComponent.volume,
            updatedComponent: updatedComponent
          });
          
          // Update this specific component
          onUpdateGeometry(`volume-${matchingTargetComponent.index}`, updatedComponent, true, false);
        } else {
          console.log(`No matching component found for source component with ID ${sourceComponent._componentId}`);
        }
      }
      
      updatedCount++;
    }
    
    // Show success message
    if (updatedCount > 0) {
      alert(`Updated ${updatedCount} assemblies successfully.`);
    } else {
      alert('No assemblies were updated.');
    }
  };
  
  // Function to handle Add to Assembly option
  const handleAddToAssembly = (volumeIndex) => {
    // Close the context menu
    handleCloseContextMenu();
    
    // Find all assemblies in the geometry
    const assemblies = geometries.volumes
      .map((volume, index) => ({ volume, index }))
      .filter(item => item.volume.type === 'assembly');
    
    if (assemblies.length === 0) {
      alert('No assemblies available. Create an assembly first.');
      return;
    }
    
    // Open the assembly selection dialog
    setAssemblyDialog({
      open: true,
      volumeIndex,
      assemblies
    });
  };
  
  // Function to confirm adding to assembly
  const handleConfirmAddToAssembly = (assemblyIndex) => {
    const volumeIndex = assemblyDialog.volumeIndex;
    const volume = geometries.volumes[volumeIndex];
    const assembly = geometries.volumes[assemblyIndex];
    
    // Get the volume key for updating
    const volumeKey = `volume-${volumeIndex}`;
    
    // Update the volume's mother_volume to the assembly
    const updatedVolume = {
      mother_volume: assembly.name
    };
    
    // Update the geometry using onUpdateGeometry
    onUpdateGeometry(volumeKey, updatedVolume);
    
    // Log the update
    console.log('Adding volume to assembly:', {
      volume: geometries.volumes[volumeIndex],
      assembly,
      updatedVolume
    });
    
    // Close the dialog
    setAssemblyDialog({
      open: false,
      volumeIndex: null,
      assemblies: []
    });
  };
  // Create a map of volume names to their indices for easy lookup
  const volumeNameToIndex = {};
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    if (volume.name) {
      volumeNameToIndex[volume.name] = index;
    }
  });
  
  // Function to get a volume's parent object key
  const getParentKey = (volume) => {
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
  
  // Group volumes by their parent
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
    const parentKey = getParentKey(volume);
    
    // Add this volume to its parent's children list
    if (volumesByParent[parentKey]) {
      volumesByParent[parentKey].push({
        volume,
        key,
        index
      });
    }
  });
  
  // Recursive function to render a volume and its children in the tree
  const renderVolumeTree = (parentKey, level = 0) => {
    // If this parent has no children, return null
    if (!volumesByParent[parentKey] || volumesByParent[parentKey].length === 0) {
      return null;
    }
    
    // Sort volumes alphabetically by name
    const sortedVolumes = [...volumesByParent[parentKey]].sort((a, b) => {
      const nameA = a.volume.name || `${a.volume.type.charAt(0).toUpperCase() + a.volume.type.slice(1)} ${a.index + 1}`;
      const nameB = b.volume.name || `${b.volume.type.charAt(0).toUpperCase() + b.volume.type.slice(1)} ${b.index + 1}`;
      return nameA.localeCompare(nameB);
    });
    
    // Render all children of this parent (now sorted alphabetically)
    return sortedVolumes.map(({ volume, key, index }) => {
      let icon = '📦'; // Default box icon
      if (volume.type === 'sphere') icon = '🔴';
      if (volume.type === 'cylinder') icon = '🧪';
      if (volume.type === 'ellipsoid') icon = '🥚';
      if (volume.type === 'torus') icon = '🍩';
      if (volume.type === 'polycone') icon = '🏆';
      if (volume.type === 'trapezoid') icon = '🔷';
      if (volume.type === 'assembly') icon = '📁'; // Folder icon for assemblies
      
      // Check if this node has children
      const hasChildren = volumesByParent[key] && volumesByParent[key].length > 0;
      
      // Check if volume is active (has isActive flag and hitsCollectionName)
      const isActive = volume.isActive && volume.hitsCollectionName;
      
      return (
        <React.Fragment key={key}>
          <div 
            onClick={() => {
              // If this object is already selected, unselect it by setting selection to null
              // Otherwise, select this object
              onSelect(selectedGeometry === key ? null : key);
            }}
            onContextMenu={(e) => handleContextMenu(e, index)}
            style={{
              padding: '8px',
              backgroundColor: selectedGeometry === key ? '#1976d2' : '#fff',
              color: selectedGeometry === key ? '#fff' : '#000',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '5px',
              marginLeft: `${15 + level * 20}px`, // Indent based on hierarchy level
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {/* Expand/collapse icon - only show if node has children */}
            {hasChildren && (
              <span 
                onClick={(e) => toggleNodeExpansion(key, e)} 
                style={{ 
                  marginRight: '5px', 
                  cursor: 'pointer',
                  color: selectedGeometry === key ? '#fff' : '#555',
                  fontSize: '14px',
                  width: '16px',
                  textAlign: 'center'
                }}
              >
                {expandedNodes[key] ? '▼' : '►'}
              </span>
            )}
            {/* If no children, add spacing to align with nodes that have the toggle */}
            {!hasChildren && <span style={{ width: '16px', marginRight: '5px' }}></span>}
            <span style={{ marginRight: '5px' }}>{icon}</span>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {/* Display the Geant4 name (displayName) if available, otherwise fall back to internal name */}
              {volume.displayName || volume.name || `${volume.type.charAt(0).toUpperCase() + volume.type.slice(1)} ${index + 1}`}
              
              {isActive && (
                <span 
                  style={{ 
                    marginLeft: '8px', 
                    backgroundColor: '#4caf50', 
                    color: 'white', 
                    fontSize: '0.7rem', 
                    padding: '2px 6px', 
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '16px'
                  }}
                  title={`Active: ${volume.hitsCollectionName}`}
                >
                  {volume.hitsCollectionName}
                </span>
              )}
            </span>
          </div>
          {/* Only render children if node is expanded */}
          {expandedNodes[key] && renderVolumeTree(key, level + 1)}
        </React.Fragment>
      );
    });
  };
  
  return (
    <div style={{ padding: '10px', backgroundColor: '#f5f5f5', height: '100%', overflowY: 'auto' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Geometry Tree</h3>
      <div style={{ marginBottom: '5px' }}>
        {/* World volume - selectable but not movable */}
        <div 
          onClick={() => {
            // Allow selecting/unselecting World volume in the tree
            onSelect(selectedGeometry === 'world' ? null : 'world');
          }}
          style={{
            padding: '8px',
            backgroundColor: selectedGeometry === 'world' ? '#1976d2' : '#fff',
            color: selectedGeometry === 'world' ? '#fff' : '#000',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '5px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {/* Expand/collapse icon for World */}
          <span 
            onClick={(e) => toggleNodeExpansion('world', e)} 
            style={{ 
              marginRight: '5px', 
              cursor: 'pointer',
              color: selectedGeometry === 'world' ? '#fff' : '#555',
              fontSize: '14px',
              width: '16px',
              textAlign: 'center'
            }}
          >
            {expandedNodes['world'] ? '▼' : '►'}
          </span>
          <span style={{ marginRight: '5px' }}>🌐</span>
          <strong>World</strong>
          <span style={{ marginLeft: '5px', fontSize: '0.8em', color: selectedGeometry === 'world' ? '#ddd' : '#777' }}></span>
        </div>
        
        {/* Render volumes with World as parent and their children recursively, but only if World is expanded */}
        {expandedNodes['world'] && renderVolumeTree('world')}
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.mouseY,
            left: contextMenu.mouseX,
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 1000
          }}
        >
          <div
            onClick={() => handleAddToAssembly(contextMenu.volumeIndex)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              hover: { backgroundColor: '#f5f5f5' }
            }}
          >
            Add to Assembly
          </div>
          
          {/* Only show update options for assemblies */}
          {geometries.volumes[contextMenu.volumeIndex]?.type === 'assembly' && (
            <>
              <div
                onClick={() => handleUpdateAllAssemblies(contextMenu.volumeIndex)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  hover: { backgroundColor: '#f5f5f5' }
                }}
              >
                Update All Similar Assemblies
              </div>
              <div
                onClick={() => handleUpdateSelectedAssemblies(contextMenu.volumeIndex)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  hover: { backgroundColor: '#f5f5f5' }
                }}
              >
                Update Selected Assemblies
              </div>
            </>
          )}
          
          <div
            onClick={handleCloseContextMenu}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              hover: { backgroundColor: '#f5f5f5' }
            }}
          >
            Cancel
          </div>
        </div>
      )}
      
      {/* Assembly Selection Dialog */}
      {assemblyDialog.open && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 1001,
            padding: '16px',
            minWidth: '300px'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
            Select Assembly
          </div>
          
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {assemblyDialog.assemblies.map(({ volume, index }) => (
              <div
                key={index}
                onClick={() => handleConfirmAddToAssembly(index)}
                style={{
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  hover: { backgroundColor: '#f5f5f5' },
                  marginBottom: '4px'
                }}
              >
                <span style={{ marginRight: '5px' }}>📁</span>
                <span>{volume.displayName || volume.name}</span>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              onClick={() => setAssemblyDialog({ open: false, volumeIndex: null, assemblies: [] })}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginRight: '8px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Viewer3D = ({ geometries, selectedGeometry, onSelect, onUpdateGeometry }) => {
  const [transformMode, setTransformMode] = useState('translate');
  const [frontViewCamera, setFrontViewCamera] = useState(null);
  
  // Register update handler with the InstanceTracker
  // Instance tracking functionality has been removed for a cleaner implementation
  // The update handler will be reimplemented in a simpler way
  
  // Calculate camera distance based on world size
  const calculateCameraDistance = () => {
    // Get the maximum dimension of the world volume
    const maxDimension = Math.max(
      geometries.world.size?.x || 2000,
      geometries.world.size?.y || 2000,
      geometries.world.size?.z || 2000
    );
    
    // Set camera distance to be 2x the maximum dimension to ensure everything is visible
    // This allows the camera to scale properly with larger world volumes
    return -2 * maxDimension;
  };

  // Function to set front view
  const setFrontView = () => {
    if (frontViewCamera) {
      const cameraDistance = calculateCameraDistance();
      frontViewCamera.position.set(0, cameraDistance, 0);
      frontViewCamera.lookAt(0, 0, 0);
      frontViewCamera.up.set(0, 0, 1); // Maintain z-axis as up direction
      frontViewCamera.updateProjectionMatrix();
    }
  };
  
  // Handle canvas click to deselect
  const handleCanvasClick = (e) => {
    if (selectedGeometry && e.target === e.currentTarget) {
      onSelect(null);
    }
  };
  
  // Handle transform end - completely rewritten to fix selection issues
  const handleTransformEnd = (objectKey, updates, keepSelected = true, isSourceUpdate = false) => {
    console.log(`Transform end for ${objectKey}, keepSelected: ${keepSelected}, isSourceUpdate: ${isSourceUpdate}`);
    
    // CRITICAL: Force selection of the object being transformed
    // This must happen BEFORE any geometry updates to ensure it takes effect
    if (keepSelected && objectKey !== selectedGeometry) {
      console.log(`Forcing selection to ${objectKey} before update`);
      onSelect(objectKey);
    }
    
    // Get the current object
    let currentObject;
    if (objectKey === 'world') {
      currentObject = { ...geometries.world };
    } else if (objectKey.startsWith('volume-')) {
      const index = parseInt(objectKey.split('-')[1]);
      currentObject = { ...geometries.volumes[index] };
    } else {
      return;
    }
    
    // Apply updates to the current object
    const updatedObject = { ...currentObject };
    
    // Update position - ensure we're not losing any properties
    if (updates.position) {
      updatedObject.position = {
        ...(updatedObject.position || {}),
        ...updates.position,
        // Ensure unit is preserved
        unit: updates.position.unit || updatedObject.position?.unit || 'cm'
      };
    }
    
    // Update rotation - all values are now in radians
    if (updates.rotation) {
      updatedObject.rotation = {
        ...(updatedObject.rotation || {}),
        ...updates.rotation
        // No unit needed as all rotation values are in radians
      };
    }
    
    // Update size for box
    if (updates.size && updatedObject.type === 'box') {
      updatedObject.size = {
        ...updatedObject.size,
        ...updates.size
      };
    }
    
    // Update radius and height for cylinder
    if (updatedObject.type === 'cylinder') {
      if (updates.radius !== undefined) updatedObject.radius = updates.radius;
      if (updates.height !== undefined) updatedObject.height = updates.height;
      if (updates.innerRadius !== undefined) updatedObject.innerRadius = updates.innerRadius;
    }
    
    // Update radius for sphere
    if (updatedObject.type === 'sphere' && updates.radius !== undefined) {
      updatedObject.radius = updates.radius;
    }
    
    // Update properties for ellipsoid
    if (updatedObject.type === 'ellipsoid') {
      if (updates.xRadius !== undefined) updatedObject.xRadius = updates.xRadius;
      if (updates.yRadius !== undefined) updatedObject.yRadius = updates.yRadius;
      if (updates.zRadius !== undefined) updatedObject.zRadius = updates.zRadius;
    }
    
    // Update properties for torus
    if (updatedObject.type === 'torus') {
      if (updates.majorRadius !== undefined) updatedObject.majorRadius = updates.majorRadius;
      if (updates.minorRadius !== undefined) updatedObject.minorRadius = updates.minorRadius;
    }
    
    // Update properties for trapezoid
    if (updatedObject.type === 'trapezoid') {
      if (updates.dx1 !== undefined) updatedObject.dx1 = updates.dx1;
      if (updates.dx2 !== undefined) updatedObject.dx2 = updates.dx2;
      if (updates.dy1 !== undefined) updatedObject.dy1 = updates.dy1;
      if (updates.dy2 !== undefined) updatedObject.dy2 = updates.dy2;
      if (updates.dz !== undefined) updatedObject.dz = updates.dz;
    }
    
    // Update properties for polycone
    if (updatedObject.type === 'polycone' && updates.zSections) {
      updatedObject.zSections = updates.zSections;
    }
    
    // Update the geometry WITHOUT changing selection
    // The third parameter (false) is critical - it tells onUpdateGeometry not to change selection
    onUpdateGeometry(objectKey, updatedObject, false);
    
    // CRITICAL: Force selection of the object again AFTER the update
    // This ensures it stays selected even if something in the update process changed it
    if (keepSelected) {
      // Use requestAnimationFrame to ensure this happens after the current render cycle
      requestAnimationFrame(() => {
        console.log(`Forcing selection to ${objectKey} after update`);
        onSelect(objectKey);
      });
    }
    
    // Instance tracking functionality has been removed for a cleaner implementation
    // Source object tracking and updating will be reimplemented in a simpler way
    if (isSourceUpdate) {
      console.log('Source update from transform operation - functionality will be reimplemented');
    }
    
    // If this is a parent object, handle parent-child relationships
    if (updates.position || updates.rotation) {
      if (objectKey === 'world') {
        // World volume updates don't need special handling for children
      } else if (objectKey.startsWith('volume-')) {
        const parentIndex = parseInt(objectKey.split('-')[1]);
        const parentVolume = geometries.volumes[parentIndex];
        
        // Only proceed if we have a valid parent volume name
        if (parentVolume && parentVolume.name) {
          // Find all volumes that have this volume as their mother
          // We don't need to update their positions since they're already positioned relative to parent
          // in the Three.js scene graph, but we do need to maintain selection state
          geometries.volumes.forEach((volume, index) => {
            if (volume.mother_volume === parentVolume.name) {
              // Just maintain the data model relationships
              // No need to change selection for child volumes
            }
          });
        }
      }
    }
  };
  
  // Check if geometries is valid
  if (!geometries || !geometries.world) {
    return <div>Loading geometries...</div>;
  }
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex' }}>
      {/* Left panel - Geometry Tree */}
      <div style={{ width: '25%', height: '100%', borderRight: '1px solid #ccc' }}>
        <GeometryTree 
          geometries={geometries} 
          selectedGeometry={selectedGeometry} 
          onSelect={onSelect}
          onUpdateGeometry={onUpdateGeometry}
        />
      </div>
      
      {/* 3D Viewer */}
      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        {/* Transform mode buttons - top left */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 100,
          display: 'flex',
          gap: '5px'
        }}>
          <button 
            onClick={() => setTransformMode('translate')}
            style={{
              backgroundColor: transformMode === 'translate' ? '#1976d2' : '#f1f1f1',
              color: transformMode === 'translate' ? 'white' : 'black',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Move
          </button>
          <button 
            onClick={() => setTransformMode('rotate')}
            style={{
              backgroundColor: transformMode === 'rotate' ? '#1976d2' : '#f1f1f1',
              color: transformMode === 'rotate' ? 'white' : 'black',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Rotate
          </button>
          <button 
            onClick={() => setTransformMode('scale')}
            style={{
              backgroundColor: transformMode === 'scale' ? '#1976d2' : '#f1f1f1',
              color: transformMode === 'scale' ? 'white' : 'black',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Scale
          </button>
        </div>
        
        {/* Front view button - bottom left */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          zIndex: 100
        }}>
          <button 
            onClick={setFrontView}
            style={{
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Front View
          </button>
        </div>
        
        <Canvas 
          style={{ background: '#f0f0f0' }} 
          onClick={handleCanvasClick}
          camera={{
            position: [0, calculateCameraDistance(), 0], 
            fov: 50, 
            near: 0.1, 
            far: Math.abs(calculateCameraDistance()) * 4
          }}
        >
          <Scene 
            geometries={geometries} 
            selectedGeometry={selectedGeometry} 
            onSelect={onSelect}
            setFrontViewCamera={setFrontViewCamera}
            transformMode={transformMode}
            onTransformEnd={handleTransformEnd}
            worldSize={geometries.world.size}
          />
          <OrbitControls 
            makeDefault 
            enableDamping={false} 
            maxDistance={Math.abs(calculateCameraDistance()) * 10} // Scale maxDistance with world size
          />
        </Canvas>
      </div>
    </div>
  );
};

export default Viewer3D;
