import React, { useMemo } from 'react';
import * as THREE from 'three';

// Helper function to get color from material
const getMaterialColor = (materialName, materials) => {
  const defaultColor = "rgba(100, 255, 255, 0.7)";
  if (!materialName || !materials || Object.keys(materials).length === 0) {
    return defaultColor;
  }
  const material = materials[materialName];
  if (material && material.color) {
    return `rgba(${Math.floor(material.color[0] * 255)}, ${Math.floor(material.color[1] * 255)}, ${Math.floor(material.color[2] * 255)}, ${material.color[3] || 0.7})`;
  }
  return defaultColor;
};

// Torus Object Component
const TorusObject = React.forwardRef(({ object, isSelected, onClick, materials }, ref) => {
  const position = object.position ? [
    object.position.x, 
    object.position.y, 
    object.position.z
  ] : [0, 0, 0];
  
  // Extract dimensions from the object
  const majorRadius = object.majorRadius || 5;
  const minorRadius = object.minorRadius || 1;
  
  // The rotation is already handled by the parent TransformableObject component
  // We don't need to apply any rotation here as the mesh is already properly oriented
  // Note: No need to convert from degrees to radians as the values are already in radians

  // Create a torus geometry
  const geometry = useMemo(() => {
    return new THREE.TorusGeometry(
      majorRadius,
      minorRadius,
      16, // radialSegments
      32, // tubularSegments
      Math.PI * 2 // arc
    );
  }, [majorRadius, minorRadius]);

  return (
    <mesh
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      <primitive object={geometry} />
      <meshStandardMaterial 
        color={getMaterialColor(object.material, materials)} 
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

export default TorusObject;
