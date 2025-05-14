import React from 'react';
import * as THREE from 'three';

// Separate Cylinder Object Component with correct Geant4 rotation handling
const CylinderObject = React.forwardRef(({ object, isSelected, onClick }, ref) => {
  const position = object.position ? [
    object.position.x, 
    object.position.y, 
    object.position.z
  ] : [0, 0, 0];
  
  const radius = object.radius || 5;
  const height = object.height || 10;
  
  // For cylinders with height along z-axis, we need to map Geant4 rotations correctly
  // - X rotation in Geant4 → rotation around X axis
  // - Y rotation in Geant4 → rotation around Z axis
  // - Z rotation in Geant4 → rotation around Y axis (negated)
  
  // Convert from degrees to radians
  const rotX = THREE.MathUtils.degToRad(object.rotation?.x || 0);
  const rotZ = THREE.MathUtils.degToRad(object.rotation?.y || 0); // Map Y to Z
  const rotY = -THREE.MathUtils.degToRad(object.rotation?.z || 0); // Map Z to -Y
  
  // Create a custom cylinder geometry that lies in the x-y plane with height along z-axis
  const createCylinderGeometry = () => {
    // Create a standard cylinder (which has height along y-axis in Three.js)
    const cylinderGeom = new THREE.CylinderGeometry(radius, radius, height, 32);
    
    // Rotate the geometry to align with z-axis
    cylinderGeom.rotateX(Math.PI/2);
    
    return cylinderGeom;
  };

  return (
    <mesh 
      ref={ref}
      position={position}
      // Apply rotations in the correct order for Geant4 compatibility
      rotation={[rotX, rotY, rotZ]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Use the custom cylinder geometry that's pre-rotated */}
      <primitive object={createCylinderGeometry()} />
      <meshStandardMaterial 
        color="rgba(100, 255, 100, 0.7)" 
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
