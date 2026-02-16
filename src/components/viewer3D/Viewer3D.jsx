import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
// Instance tracking functionality has been removed for a cleaner implementation
import Scene from './Scene';
import GeometryTree from './GeometryTree';
import CameraSetup from './components/CameraSetup';
import { debugLog } from '../../utils/logger';

const Viewer3D = ({ geometries, selectedGeometry, onSelect, onUpdateGeometry, materials }) => {
  const [transformMode, setTransformMode] = useState('translate');
  const [cameraControls, setCameraControls] = useState(null);
  
  // Handle canvas click to deselect
  const handleCanvasClick = (e) => {
    if (selectedGeometry && e.target === e.currentTarget) {
      onSelect(null);
    }
  };
  
  // Handle transform end - completely rewritten to fix selection issues
  const handleTransformEnd = (objectKey, updates, keepSelected = true, isSourceUpdate = false) => {
    debugLog(`Transform end for ${objectKey}, keepSelected: ${keepSelected}, isSourceUpdate: ${isSourceUpdate}`);
    
    // CRITICAL: Force selection of the object being transformed
    // This must happen BEFORE any geometry updates to ensure it takes effect
    if (keepSelected && objectKey !== selectedGeometry) {
      debugLog(`Forcing selection to ${objectKey} before update`);
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
        debugLog(`Forcing selection to ${objectKey} after update`);
        onSelect(objectKey);
      });
    }
    
    // Instance tracking functionality has been removed for a cleaner implementation
    // Source object tracking and updating will be reimplemented in a simpler way
    if (isSourceUpdate) {
      debugLog('Source update from transform operation - functionality will be reimplemented');
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
          geometries.volumes.forEach((volume) => {
            if (volume.mother_volume === parentVolume.name) {
              // Just maintain the data model relationships
              // No need to change selection for child volumes
            }
          });
        }
      }
    }
  };
  
  // Get world size for use in children
  const worldSize = geometries && geometries.world && geometries.world.size ? geometries.world.size : { x: 1000, y: 1000, z: 1000 };

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
            onClick={() => cameraControls?.setFrontView()}
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
            position: [0, -4000, 0], // Default position until CameraSetup takes over
            fov: 50, 
            near: 0.1, 
            far: 20000 // Default far value until CameraSetup takes over
          }}
        >
          <CameraSetup setFrontViewCamera={setCameraControls} worldSize={geometries.world.size} />
          <Scene 
            geometries={geometries}
            selectedGeometry={selectedGeometry}
            onSelect={onSelect}
            setFrontViewCamera={setCameraControls}
            transformMode={transformMode}
            onTransformEnd={handleTransformEnd}
            worldSize={worldSize}
            materials={materials}
          />
          <OrbitControls 
            makeDefault 
            enableDamping={false} 
            maxDistance={20000} // Default value, CameraSetup will handle proper scaling
          />
        </Canvas>
      </div>
    </div>
  );
};

export default Viewer3D;
