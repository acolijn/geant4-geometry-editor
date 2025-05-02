import React from 'react';
import * as THREE from 'three';
import Polycone from './shapes/Polycone';

// Polycone Object Component
const PolyconeObject = React.forwardRef(({ object, isSelected, onClick }, ref) => {
  const position = object.position ? [
    object.position.x, 
    object.position.y, 
    object.position.z
  ] : [0, 0, 0];
  
  // Extract z-sections from the object
  const zSections = object.zSections || [
    { z: -5, rMin: 0, rMax: 3 },
    { z: 0, rMin: 0, rMax: 5 },
    { z: 5, rMin: 0, rMax: 2 }
  ];
  
  // Apply rotation (convert from degrees to radians)
  // For Geant4 compatibility, we need to apply rotations in the correct sequence:
  // First X, then Y (around new Y axis), then Z (around new Z axis)
  const rotX = THREE.MathUtils.degToRad(object.rotation?.x || 0);
  const rotY = THREE.MathUtils.degToRad(object.rotation?.y || 0);
  const rotZ = THREE.MathUtils.degToRad(object.rotation?.z || 0);

  // Create a rotation matrix that applies rotations in the correct sequence
  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeRotationX(rotX);
  rotationMatrix.multiply(new THREE.Matrix4().makeRotationY(rotY));
  rotationMatrix.multiply(new THREE.Matrix4().makeRotationZ(rotZ));

  // Extract Euler angles from the matrix (this will be in the THREE.js default order)
  const euler = new THREE.Euler();
  euler.setFromRotationMatrix(rotationMatrix);

  return (
    <mesh 
      ref={ref}
      position={position}
      rotation={[euler.x, euler.y, euler.z]}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      <Polycone 
        zSections={zSections} 
        selected={isSelected}
        color="rgba(255, 200, 100, 0.7)"
      />
    </mesh>
  );
});

export default PolyconeObject;
