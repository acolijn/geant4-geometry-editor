import React from 'react';
import * as THREE from 'three';

// Helper function to get color from material
const getMaterialColor = (materialName, materials) => {
  const defaultColor = "rgba(100, 255, 100, 0.7)";

  console.log('COLOR',materialName, materials);

  if (!materialName || !materials || Object.keys(materials).length === 0) {
    return defaultColor;
  }
  const material = materials[materialName];
  if (material && material.color) {
    return `rgba(${Math.floor(material.color[0] * 255)}, ${Math.floor(material.color[1] * 255)}, ${Math.floor(material.color[2] * 255)}, ${material.color[3] || 0.7})`;
  }
  return defaultColor;
};

// Separate Cylinder Object Component with correct Geant4 rotation handling
const CylinderObject = React.forwardRef(({ object, isSelected, onClick, materials }, ref) => {
  const position = object.position ? [
    object.position.x, 
    object.position.y, 
    object.position.z
  ] : [0, 0, 0];
  
  const radius = object.radius || 5;
  const height = object.height || 10;
  
  // For cylinders with height along z-axis, we need to handle rotations correctly
  // but we should NOT remap axes as that causes confusion in compound objects
  
  // Use rotation values directly (they should already be in radians)
  // This ensures consistent behavior with other object types
  const rotX = object.rotation?.x || 0;
  const rotY = object.rotation?.y || 0;
  const rotZ = object.rotation?.z || 0;
  
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
        color={getMaterialColor(object.material, materials)} 
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
