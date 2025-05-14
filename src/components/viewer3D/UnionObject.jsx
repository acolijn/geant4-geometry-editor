// UnionObject.jsx - Component for rendering union solids
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

// Helper function to create a basic geometry based on solid type
const createGeometry = (solid) => {
  if (!solid || !solid.type) return new THREE.BoxGeometry(1, 1, 1);
  
  switch (solid.type) {
    case 'box':
      return new THREE.BoxGeometry(
        solid.size?.x || 1,
        solid.size?.y || 1,
        solid.size?.z || 1
      );
    case 'sphere':
      return new THREE.SphereGeometry(
        solid.radius || 1,
        32, // widthSegments
        16  // heightSegments
      );
    case 'cylinder':
      // Create a cylinder with height along the y-axis (Three.js default)
      const cylinderGeometry = new THREE.CylinderGeometry(
        solid.radius || 1,
        solid.radius || 1,
        solid.height || 1,
        32 // segments
      );
      
      // Rotate it to align with Geant4's convention (height along z-axis)
      // This requires a 90-degree rotation around the X axis
      cylinderGeometry.rotateX(Math.PI / 2);
      
      return cylinderGeometry;
    default:
      // Default to a box for other types
      return new THREE.BoxGeometry(1, 1, 1);
  }
};

// UnionObject component that visualizes both constituent solids
const UnionObject = React.forwardRef(({ object, isSelected, onClick }, ref) => {
  const groupRef = useRef();
  
  // Pass the ref to the group
  React.useImperativeHandle(ref, () => groupRef.current);
  
  // Get position and rotation from the object
  const position = object.position ? [
    object.position.x || 0, 
    object.position.y || 0, 
    object.position.z || 0
  ] : [0, 0, 0];
  
  // Apply rotation (convert from degrees to radians)
  const rotX = THREE.MathUtils.degToRad(object.rotation?.x || 0);
  const rotY = THREE.MathUtils.degToRad(object.rotation?.y || 0);
  const rotZ = THREE.MathUtils.degToRad(object.rotation?.z || 0);
  
  // Get relative position and rotation for the second solid
  const relativePosition = object.relative_position ? [
    object.relative_position.x || 0,
    object.relative_position.y || 0,
    object.relative_position.z || 0
  ] : [0, 0, 5]; // Default offset along z-axis if not specified
  
  const relativeRotX = THREE.MathUtils.degToRad(object.relative_rotation?.x || 0);
  const relativeRotY = THREE.MathUtils.degToRad(object.relative_rotation?.y || 0);
  const relativeRotZ = THREE.MathUtils.degToRad(object.relative_rotation?.z || 0);
  
  // Create geometries for both solids
  const firstGeometry = useMemo(() => createGeometry(object.solid1), [object.solid1]);
  const secondGeometry = useMemo(() => createGeometry(object.solid2), [object.solid2]);
  
  // Create materials for both solids
  const firstMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSelected ? '#ff9900' : '#ff7700',
      opacity: 0.7,
      transparent: true
    });
  }, [isSelected]);
  
  const secondMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSelected ? '#ff9900' : '#9966ff',
      opacity: 0.7,
      transparent: true
    });
  }, [isSelected]);
  
  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[rotX, rotY, rotZ]}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick();
      }}
    >
      {/* First solid */}
      <mesh geometry={firstGeometry} material={firstMaterial} />
      
      {/* Second solid with relative position and rotation */}
      <mesh 
        geometry={secondGeometry} 
        material={secondMaterial}
        position={relativePosition}
        rotation={[relativeRotX, relativeRotY, relativeRotZ]}
      />
    </group>
  );
});

export default UnionObject;
