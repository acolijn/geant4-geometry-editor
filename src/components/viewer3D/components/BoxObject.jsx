import React from 'react';
import * as THREE from 'three';
import { getMaterialColor } from '../utils/materialColorUtils';

const DEFAULT_COLOR = 'rgba(100, 100, 255, 0.7)';

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
          color={getMaterialColor(object.material, materials, DEFAULT_COLOR)} 
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
