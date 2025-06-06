import React from 'react';
import * as THREE from 'three';

// Helper function to get color from material
const getMaterialColor = (materialName, materials) => {
  // Default color if no material is assigned or found
  const defaultColor = "rgba(100, 100, 255, 0.7)";
  
  // If no material name is provided or materials object is empty
  if (!materialName || !materials || Object.keys(materials).length === 0) {
    return defaultColor;
  }
  
  // Get the material by name
  const material = materials[materialName];
  
  // If material exists and has a color property
  if (material && material.color) {
    // Convert the color array [r, g, b, a] (0-1 values) to rgba string
    return `rgba(${Math.floor(material.color[0] * 255)}, ${Math.floor(material.color[1] * 255)}, ${Math.floor(material.color[2] * 255)}, ${material.color[3] || 0.7})`;
  }
  
  // Return default color if material doesn't have a color
  return defaultColor;
};

// Box Object Component
const BoxObject = React.forwardRef(({ object, isSelected, onClick, materials }, ref) => {
  const position = object.position ? [
    object.position.x, 
    object.position.y, 
    object.position.z
  ] : [0, 0, 0];
  
  const size = object.size ? [
    object.size.x, 
    object.size.y, 
    object.size.z
  ] : [10, 10, 10];
  
  // The rotation is already handled by the parent TransformableObject component
  // We don't need to apply any rotation here as the mesh is already properly oriented
  // Note: No need to convert from degrees to radians as the values are already in radians
  
  // Check if this is the World volume
  const isWorld = object.name === 'World';
  
  return (
    <mesh 
      ref={ref}
      position={position}

      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      <boxGeometry args={size} />
      {isWorld ? (
        // World volume - transparent wireframe only
        <meshStandardMaterial 
          color="rgba(200, 200, 255, 0.3)" 
          wireframe={true}
          transparent={true}
          opacity={0.5}
        />
      ) : (
        // Regular box volume with material color if available
        <meshStandardMaterial 
          color={getMaterialColor(object.material, materials)} 
          transparent={true}
          opacity={0.7}
        />
      )}
      {isSelected && (
        <lineSegments>
          <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(...size)]} />
          <lineBasicMaterial attach="material" color="#ffff00" />
        </lineSegments>
      )}
    </mesh>
  );
});

export default BoxObject;
