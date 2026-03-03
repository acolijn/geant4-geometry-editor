import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getMaterialColor } from '../utils/materialColorUtils';

const DEFAULT_COLOR = 'rgba(100, 255, 255, 0.7)';

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
        color={getMaterialColor(object.material, materials, DEFAULT_COLOR)} 
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
