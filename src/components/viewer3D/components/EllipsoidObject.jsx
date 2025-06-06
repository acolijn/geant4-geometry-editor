import React, { useMemo } from 'react';
import * as THREE from 'three';

// Helper function to get color from material
const getMaterialColor = (materialName, materials) => {
  const defaultColor = "rgba(200, 100, 255, 0.7)";
  if (!materialName || !materials || Object.keys(materials).length === 0) {
    return defaultColor;
  }
  const material = materials[materialName];
  if (material && material.color) {
    return `rgba(${Math.floor(material.color[0] * 255)}, ${Math.floor(material.color[1] * 255)}, ${Math.floor(material.color[2] * 255)}, ${material.color[3] || 0.7})`;
  }
  return defaultColor;
};

// Ellipsoid Object Component
const EllipsoidObject = React.forwardRef(({ object, isSelected, onClick, materials }, ref) => {
  const position = object.position ? [
    object.position.x, 
    object.position.y, 
    object.position.z
  ] : [0, 0, 0];
  
  console.log('XXXXX EllipsoidObject:: object', object);
  
  // Extract dimensions from the object
  const xRadius = object.xRadius || 5;
  const yRadius = object.yRadius || 3;
  const zRadius = object.zRadius || 4;
  
  // The rotation is already handled by the parent TransformableObject component
  // We don't need to apply any rotation here as the mesh is already properly oriented
  // The parent TransformableObject applies the rotation from object.rotation
  // 
  // Note: No need to convert from degrees to radians as the values are already in radians
  // 
  // We're removing the unnecessary rotation code here since:
  // 1. The rotation is already applied by the parent component
  // 2. Setting rotation here would override the parent's rotation
  //
  console.log('EllipsoidObject:: object.rotation', object.rotation);

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

export default EllipsoidObject;
