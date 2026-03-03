import React from 'react';
import * as THREE from 'three';
import { getMaterialColor } from '../utils/materialColorUtils';

const DEFAULT_COLOR = 'rgba(100, 255, 100, 0.7)';

// Separate Cylinder Object Component with correct Geant4 rotation handling
const CylinderObject = React.forwardRef(({ object, isSelected, onClick, materials }, ref) => {
  const position = object.position ? [
    object.position.x, 
    object.position.y, 
    object.position.z
  ] : [0, 0, 0];
  
  const radius = object.radius || 5;
  const height = object.height || 10;
  
  // The rotation is already handled by the parent TransformableObject component
  // We don't need to apply any rotation here as the mesh is already properly oriented
  // Note: No need to convert from degrees to radians as the values are already in radians
  
  // Create a cylinder geometry that aligns with Geant4 convention (height along z-axis)
  const createCylinderGeometry = () => {
    // Create a standard cylinder (which has height along y-axis in Three.js)
    const cylinderGeom = new THREE.CylinderGeometry(radius, radius, height, 32);
    
    // Rotate the geometry to align with z-axis
    // This is a static rotation of the geometry itself, not a dynamic object rotation
    cylinderGeom.rotateX(Math.PI/2);
    
    return cylinderGeom;
  };

  return (
    <mesh 
      ref={ref}
      position={position}
      // No rotation needed here - handled by parent TransformableObject
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Use the custom cylinder geometry that's pre-rotated */}
      <primitive object={createCylinderGeometry()} />
      <meshStandardMaterial 
        color={getMaterialColor(object.material, materials, DEFAULT_COLOR)} 
        transparent={true}
        opacity={0.7}
      />
      {isSelected && (
        <lineSegments>
          <primitive 
            object={new THREE.EdgesGeometry(createCylinderGeometry())} 
            attach="geometry" 
          />
          <lineBasicMaterial attach="material" color="#ffff00" />
        </lineSegments>
      )}
    </mesh>
  );
});

export default CylinderObject;
