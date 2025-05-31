import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { calculateWorldPosition, worldToLocalCoordinates, getParentKey, groupVolumesByParent } from './utils/geometryUtils';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
// Instance tracking functionality has been removed for a cleaner implementation
import TransformableObject from './components/TransformableObject';
import CoordinateSystem from './components/CoordinateSystem';
import CameraSetup from './components/CameraSetup';

// Scene component with all 3D elements

// Simple Scene component with flat object structure
export default function Scene({ geometries, selectedGeometry, onSelect, setFrontViewCamera, transformMode, onTransformEnd, worldSize }) {
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
  
  // Function to get a volume's parent object key using the imported function
  const getParentKeyWrapper = (volume) => {
    return getParentKey(volume, volumeNameToIndex);
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
    const parentKey = getParentKeyWrapper(volume);
    
    // Add this volume to its parent's children list
    if (volumesByParent[parentKey]) {
      volumesByParent[parentKey].push({
        volume,
        key,
        index
      });
    }
  });
  
  // Wrapper function to call the imported calculateWorldPosition with the correct parameters
  const calculateWorldPositionWrapper = (volume, visited = new Set()) => {
    return calculateWorldPosition(volume, visited, geometries, volumeNameToIndex);
  };
  
  // Wrapper function to call the imported worldToLocalCoordinates with the correct parameters
  const worldToLocalCoordinatesWrapper = (volume, worldPos, worldRot) => {
    return worldToLocalCoordinates(volume, worldPos, worldRot, geometries, volumeNameToIndex);
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
    
    // Convert world coordinates to local coordinates using our wrapper function
    const localProps = worldToLocalCoordinatesWrapper(volume, updatedProps.position, updatedProps.rotation);
    
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
          
          // Get parent's world position using our wrapper function
          const parentWorld = calculateWorldPositionWrapper(parentVolume);
          
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
      
      // Calculate the world position for this volume using our wrapper function
      const worldTransform = calculateWorldPositionWrapper(volume);
      
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
