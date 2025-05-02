import React from 'react';
import * as THREE from 'three';
import Trapezoid from './shapes/Trapezoid';

// Trapezoid Object Component
const TrapezoidObject = React.forwardRef(({ object, isSelected, onClick }, ref) => {
  const position = object.position ? [
    object.position.x, 
    object.position.y, 
    object.position.z
  ] : [0, 0, 0];
  
  // Extract dimensions from the object
  const dx1 = object.dx1 || 5; // Half-length in x at -z/2
  const dx2 = object.dx2 || 5; // Half-length in x at +z/2
  const dy1 = object.dy1 || 5; // Half-length in y at -z/2
  const dy2 = object.dy2 || 5; // Half-length in y at +z/2
  const dz = object.dz || 5;   // Half-length in z
  
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
      <Trapezoid 
        size={[dx1, dx2, dy1, dy2, dz]} 
        selected={isSelected}
        color="rgba(255, 150, 100, 0.7)"
      />
    </mesh>
  );
});

export default TrapezoidObject;
