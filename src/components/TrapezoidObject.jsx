import React, { useMemo } from 'react';
import * as THREE from 'three';

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

  // Create a custom trapezoid geometry
  const geometry = useMemo(() => {
    // Create a BufferGeometry for the trapezoid
    const geometry = new THREE.BufferGeometry();
    
    // Define the vertices of the trapezoid
    const vertices = [
      // Bottom face (at -z/2)
      -dx1, -dy1, -dz,
      dx1, -dy1, -dz,
      dx1, dy1, -dz,
      -dx1, dy1, -dz,
      
      // Top face (at +z/2)
      -dx2, -dy2, dz,
      dx2, -dy2, dz,
      dx2, dy2, dz,
      -dx2, dy2, dz
    ];
    
    // Define the faces (triangles) using indices
    const indices = [
      // Bottom face
      0, 1, 2,
      0, 2, 3,
      
      // Top face
      4, 7, 6,
      4, 6, 5,
      
      // Side faces
      0, 4, 5,
      0, 5, 1,
      
      1, 5, 6,
      1, 6, 2,
      
      2, 6, 7,
      2, 7, 3,
      
      3, 7, 4,
      3, 4, 0
    ];
    
    // Set the vertices and indices
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    
    // Compute vertex normals for proper lighting
    geometry.computeVertexNormals();
    
    return geometry;
  }, [dx1, dx2, dy1, dy2, dz]);

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
        color="rgba(255, 150, 100, 0.7)" 
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

export default TrapezoidObject;
