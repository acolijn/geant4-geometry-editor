import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
// Instance tracking functionality has been removed for a cleaner implementation
import TransformableObject from './viewer3D/TransformableObject';
import BoxObject from './viewer3D/BoxObject';
import SphereObject from './viewer3D/SphereObject';
import CylinderObject from './viewer3D/CylinderObject';
import TrapezoidObject from './viewer3D/TrapezoidObject';
import TorusObject from './viewer3D/TorusObject';
import EllipsoidObject from './viewer3D/EllipsoidObject';
import PolyconeObject from './viewer3D/PolyconeObject';

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
function CameraSetup({ setFrontViewCamera }) {
  const { camera } = useThree();
  
  // Set front view on initial load with z-axis pointing upward
  useEffect(() => {
    // Position camera to look at the scene from the front (y-axis)
    // with z-axis pointing upward
    camera.position.set(0, -250, 0);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, 1); // Set z-axis as the up direction
    
    // Store the camera in the ref for the front view button
    if (setFrontViewCamera) {
      setFrontViewCamera(camera);
    }
  }, [camera, setFrontViewCamera]);
  
  return null;
}




// Simple Scene component with flat object structure
function Scene({ geometries, selectedGeometry, onSelect, setFrontViewCamera, transformMode, onTransformEnd }) {
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
  const calculateWorldPosition = (volume) => {
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
    
    // Get parent's world position recursively
    const parentWorld = calculateWorldPosition(parentVolume);
    
    // Convert volume's local position to world position based on parent
    const localPos = volume.position ? [volume.position.x || 0, volume.position.y || 0, volume.position.z || 0] : [0, 0, 0];
    const localRot = volume.rotation ? [volume.rotation.x || 0, volume.rotation.y || 0, volume.rotation.z || 0] : [0, 0, 0];
    
    // Create a matrix to transform the local position by the parent's transform
    const parentMatrix = new THREE.Matrix4();
    
    // Set parent rotation (convert from degrees to radians)
    const parentRotX = THREE.MathUtils.degToRad(parentWorld.rotation[0]);
    const parentRotY = THREE.MathUtils.degToRad(parentWorld.rotation[1]);
    const parentRotZ = THREE.MathUtils.degToRad(parentWorld.rotation[2]);
    
    // Apply rotations in the correct sequence
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.makeRotationX(parentRotX);
    rotMatrix.multiply(new THREE.Matrix4().makeRotationY(parentRotY));
    rotMatrix.multiply(new THREE.Matrix4().makeRotationZ(parentRotZ));
    
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
        THREE.MathUtils.degToRad(parentWorld.rotation[0]),
        THREE.MathUtils.degToRad(parentWorld.rotation[1]),
        THREE.MathUtils.degToRad(parentWorld.rotation[2]),
        'XYZ'
      )
    );
    
    const localQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(localRot[0]),
        THREE.MathUtils.degToRad(localRot[1]),
        THREE.MathUtils.degToRad(localRot[2]),
        'XYZ'
      )
    );
    
    // Multiply quaternions to combine rotations (order matters)
    const combinedQuat = parentQuat.multiply(localQuat);
    
    // Convert back to Euler angles in degrees
    const combinedEuler = new THREE.Euler().setFromQuaternion(combinedQuat, 'XYZ');
    const combinedRotation = [
      THREE.MathUtils.radToDeg(combinedEuler.x),
      THREE.MathUtils.radToDeg(combinedEuler.y),
      THREE.MathUtils.radToDeg(combinedEuler.z)
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
    const parentRotX = THREE.MathUtils.degToRad(parentWorld.rotation[0]);
    const parentRotY = THREE.MathUtils.degToRad(parentWorld.rotation[1]);
    const parentRotZ = THREE.MathUtils.degToRad(parentWorld.rotation[2]);
    
    // Create a rotation matrix in the correct sequence (X, Y, Z)
    parentRotMatrix.makeRotationX(parentRotX);
    parentRotMatrix.multiply(new THREE.Matrix4().makeRotationY(parentRotY));
    parentRotMatrix.multiply(new THREE.Matrix4().makeRotationZ(parentRotZ));
    
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
        THREE.MathUtils.degToRad(worldRot.x),
        THREE.MathUtils.degToRad(worldRot.y),
        THREE.MathUtils.degToRad(worldRot.z),
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
        x: THREE.MathUtils.radToDeg(localEuler.x),
        y: THREE.MathUtils.radToDeg(localEuler.y),
        z: THREE.MathUtils.radToDeg(localEuler.z),
        unit: volume.rotation?.unit || 'deg'
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
            const parentRotX = THREE.MathUtils.degToRad(parentWorld.rotation[0]);
            const parentRotY = THREE.MathUtils.degToRad(parentWorld.rotation[1]);
            const parentRotZ = THREE.MathUtils.degToRad(parentWorld.rotation[2]);
            
            // Create a rotation matrix in the correct sequence (X, Y, Z)
            const parentRotMatrix = new THREE.Matrix4();
            parentRotMatrix.makeRotationX(parentRotX);
            parentRotMatrix.multiply(new THREE.Matrix4().makeRotationY(parentRotY));
            parentRotMatrix.multiply(new THREE.Matrix4().makeRotationZ(parentRotZ));
            
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
      const rotX = THREE.MathUtils.degToRad(worldTransform.rotation[0]);
      const rotY = THREE.MathUtils.degToRad(worldTransform.rotation[1]);
      const rotZ = THREE.MathUtils.degToRad(worldTransform.rotation[2]);
      
      // Create a rotation matrix that applies rotations in the correct sequence
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationX(rotX);
      rotationMatrix.multiply(new THREE.Matrix4().makeRotationY(rotY));
      rotationMatrix.multiply(new THREE.Matrix4().makeRotationZ(rotZ));
      
      // Extract Euler angles from the matrix
      const euler = new THREE.Euler();
      euler.setFromRotationMatrix(rotationMatrix);
      
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
      <CameraSetup setFrontViewCamera={setFrontViewCamera} />
      
      {/* World volume - rendered as a non-interactive wireframe */}
      <mesh
        visible
        userData={{ isWorldVolume: true }}
        scale={[geometries.world.size?.x || 100, geometries.world.size?.y || 100, geometries.world.size?.z || 100]}
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
const GeometryTree = ({ geometries, selectedGeometry, onSelect }) => {
  // State to track expanded nodes - initially only World is expanded
  const [expandedNodes, setExpandedNodes] = useState({ world: true });
  
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
      
      // Check if this node has children
      const hasChildren = volumesByParent[key] && volumesByParent[key].length > 0;
      
      return (
        <React.Fragment key={key}>
          <div 
            onClick={() => {
              // If this object is already selected, unselect it by setting selection to null
              // Otherwise, select this object
              onSelect(selectedGeometry === key ? null : key);
            }}
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
            {volume.name || `${volume.type.charAt(0).toUpperCase() + volume.type.slice(1)} ${index + 1}`}
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
    </div>
  );
};

const Viewer3D = ({ geometries, selectedGeometry, onSelect, onUpdateGeometry }) => {
  const [transformMode, setTransformMode] = useState('translate');
  const [frontViewCamera, setFrontViewCamera] = useState(null);
  
  // Register update handler with the InstanceTracker
  // Instance tracking functionality has been removed for a cleaner implementation
  // The update handler will be reimplemented in a simpler way
  
  // Function to set front view
  const setFrontView = () => {
    if (frontViewCamera) {
      frontViewCamera.position.set(0, -250, 0);
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
    
    // Update rotation - ensure we're not losing any properties
    if (updates.rotation) {
      updatedObject.rotation = {
        ...(updatedObject.rotation || {}),
        ...updates.rotation,
        // Ensure unit is preserved
        unit: updates.rotation.unit || updatedObject.rotation?.unit || 'deg'
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
      {/* Left panel with geometry tree */}
      <div style={{ width: '250px', height: '100%', borderRight: '1px solid #ddd' }}>
        <GeometryTree 
          geometries={geometries} 
          selectedGeometry={selectedGeometry} 
          onSelect={onSelect} 
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
        >
          <Scene 
            geometries={geometries} 
            selectedGeometry={selectedGeometry} 
            onSelect={onSelect}
            setFrontViewCamera={setFrontViewCamera}
            transformMode={transformMode}
            onTransformEnd={handleTransformEnd}
          />
          <OrbitControls makeDefault enableDamping={false} />
        </Canvas>
      </div>
    </div>
  );
};

export default Viewer3D;
