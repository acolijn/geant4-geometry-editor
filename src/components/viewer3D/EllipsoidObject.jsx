import React, { useMemo } from 'react';
import * as THREE from 'three';

// Ellipsoid Object Component
const EllipsoidObject = React.forwardRef(({ object, isSelected, onClick }, ref) => {
  const position = object.position ? [
    object.position.x, 
    object.position.y, 
    object.position.z
  ] : [0, 0, 0];
  
  // Extract dimensions from the object
  const xRadius = object.xRadius || 5;
  const yRadius = object.yRadius || 3;
  const zRadius = object.zRadius || 4;
  
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

  // Create an ellipsoid geometry (scaled sphere)
  const geometry = useMemo(() => {
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    sphereGeometry.scale(xRadius, yRadius, zRadius);
    return sphereGeometry;
  }, [xRadius, yRadius, zRadius]);

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
      <primitive object={geometry} />
      <meshStandardMaterial 
        color="rgba(100, 255, 255, 0.7)" 
        transparent={true}
        opacity={0.7}
      />
      {isSelected && (
        <lineSegments>
          <edgesGeometry attach="geometry" args={[geometry]} />
          <lineBasicMaterial attach="material" color="#ffff00" />
        </lineSegments>
      )}
    </mesh>
  );
});

export default EllipsoidObject;
