import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import TransformableObject from './TransformableObject';
import BoxObject from './BoxObject';
import SphereObject from './SphereObject';
import CylinderObject from './CylinderObject';

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
    
    // Combine rotations (add parent and local rotations)
    // Note: This is a simplification - proper rotation combination would use quaternions
    const combinedRotation = [
      parentWorld.rotation[0] + localRot[0],
      parentWorld.rotation[1] + localRot[1],
      parentWorld.rotation[2] + localRot[2]
    ];
    
    return {
      position: [localVector.x, localVector.y, localVector.z],
      rotation: combinedRotation
    };
  };
  
  // Function to handle transform updates for a volume and propagate to children
  const handleVolumeTransform = (objKey, updatedProps) => {
    // Update the volume's properties
    onTransformEnd(objKey, updatedProps);
    
    // If this is a mother volume, we need to update all children
    if (volumesByParent[objKey] && volumesByParent[objKey].length > 0) {
      // We don't need to do anything here because the children will be re-rendered
      // with their new calculated world positions when the state updates
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
          onTransformEnd={(objKey, updatedProps) => handleVolumeTransform(objKey, updatedProps)}
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
      
      {/* World volume */}
      <TransformableObject 
        object={geometries.world}
        objectKey="world"
        isSelected={selectedGeometry === 'world'}
        transformMode={transformMode}
        onSelect={() => onSelect('world')}
        onTransformEnd={onTransformEnd}
      />
      
      {/* Render all volumes in a flat structure */}
      {renderVolumes()}
    </>
  );
}

// GeometryTree component for the left panel
const GeometryTree = ({ geometries, selectedGeometry, onSelect }) => {
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
    
    // Render all children of this parent
    return volumesByParent[parentKey].map(({ volume, key, index }) => {
      let icon = '📦';
      if (volume.type === 'sphere') icon = '🔴';
      if (volume.type === 'cylinder') icon = '🧪';
      
      return (
        <React.Fragment key={key}>
          <div 
            onClick={() => onSelect(key)}
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
            <span style={{ marginRight: '5px' }}>{icon}</span>
            {volume.name || `${volume.type.charAt(0).toUpperCase() + volume.type.slice(1)} ${index + 1}`}
          </div>
          {renderVolumeTree(key, level + 1)}
        </React.Fragment>
      );
    });
  };
  
  return (
    <div style={{ padding: '10px', backgroundColor: '#f5f5f5', height: '100%', overflowY: 'auto' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Geometry Tree</h3>
      <div style={{ marginBottom: '5px' }}>
        {/* World volume */}
        <div 
          onClick={() => onSelect('world')}
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
          <span style={{ marginRight: '5px' }}>🌐</span>
          <strong>World</strong>
        </div>
        
        {/* Render volumes with World as parent and their children recursively */}
        {renderVolumeTree('world')}
      </div>
    </div>
  );
};

const Viewer3D = ({ geometries, selectedGeometry, onSelect, onUpdateGeometry }) => {
  const [transformMode, setTransformMode] = useState('translate');
  const [frontViewCamera, setFrontViewCamera] = useState(null);
  
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
  
  // Handle transform end
  const handleTransformEnd = (objectKey, updates, keepSelected = true) => {
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
      if (updates.radius !== undefined) {
        updatedObject.radius = updates.radius;
      }
      if (updates.height !== undefined) {
        updatedObject.height = updates.height;
      }
      if (updates.innerRadius !== undefined) {
        updatedObject.innerRadius = updates.innerRadius;
      }
    }
    
    // Update radius for sphere
    if (updatedObject.type === 'sphere' && updates.radius !== undefined) {
      updatedObject.radius = updates.radius;
    }
    
    // Call the update function with the keepSelected parameter - no setTimeout needed
    // This ensures the state update happens synchronously
    onUpdateGeometry(objectKey, updatedObject, keepSelected);
    
    // If this is a parent object, we need to ensure the parent-child relationship is maintained
    // The group structure in the render function already ensures children move with parents visually
    // This section handles the data model updates
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
              // Ensure child volumes stay selected if they were previously selected
              if (selectedGeometry === `volume-${index}`) {
                // Direct selection without setTimeout to avoid race conditions
                onSelect(`volume-${index}`);
              }
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
