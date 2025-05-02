import React, { useMemo } from 'react';
import * as THREE from 'three';

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

  // Create a custom polycone geometry with axis along z-direction
  const geometry = useMemo(() => {
    // Sort sections by z-coordinate
    const sortedSections = [...zSections].sort((a, b) => a.z - b.z);
    
    if (sortedSections.length < 2) {
      console.error('Polycone needs at least 2 z-sections');
      return new THREE.BufferGeometry();
    }
    
    // Create points for the lathe geometry
    // The points are in the x-z plane (y=0), with z being the height/axis
    const points = [];
    
    // Add points for each z-section (outer radius)
    sortedSections.forEach(section => {
      points.push(new THREE.Vector2(section.rMax, section.z));
    });
    
    // Add points for each z-section in reverse order (inner radius)
    // Only if we have inner radii (hollow polycone)
    if (sortedSections.some(section => section.rMin > 0)) {
      for (let i = sortedSections.length - 1; i >= 0; i--) {
        const section = sortedSections[i];
        if (section.rMin > 0) {
          points.push(new THREE.Vector2(section.rMin, section.z));
        }
      }
    }
    
    // Create the lathe geometry
    // The lathe geometry rotates points around the y-axis in Three.js
    // So we need to rotate our final geometry to align with z-axis
    const segments = 32;
    const latheGeometry = new THREE.LatheGeometry(points, segments);
    
    // Rotate the geometry to make the axis along z-direction
    latheGeometry.rotateX(Math.PI / 2);
    
    return latheGeometry;
  }, [zSections]);

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
        color="rgba(255, 200, 100, 0.7)" 
        transparent={true}
        opacity={0.7}
        side={THREE.DoubleSide}
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

export default PolyconeObject;
