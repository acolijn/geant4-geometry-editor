import React from 'react';
import * as THREE from 'three';
import { getMaterialColor } from '../utils/materialColorUtils';

const DEFAULT_COLOR = 'rgba(255, 255, 100, 0.7)';

// Sphere Object Component
const SphereObject = React.forwardRef(({ object, isSelected, onClick, materials }, ref) => {
  const position = object.position ? [
    object.position.x, 
    object.position.y, 
    object.position.z
  ] : [0, 0, 0];
  
  const radius = object.radius || 5;
  
  // The rotation is already handled by the parent TransformableObject component
  // We don't need to apply any rotation here as the mesh is already properly oriented
  // Note: No need to convert from degrees to radians as the values are already in radians
  
  return (
    <mesh 
      ref={ref}
      position={position}

      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial 
        color={getMaterialColor(object.material, materials, DEFAULT_COLOR)} 
        transparent={true}
        opacity={0.7}
      />
      {isSelected && (
        <lineSegments>
          <edgesGeometry attach="geometry" args={[new THREE.SphereGeometry(radius, 32, 32)]} />
          <lineBasicMaterial attach="material" color="#ffff00" />
        </lineSegments>
      )}
    </mesh>
  );
});

export default SphereObject;
