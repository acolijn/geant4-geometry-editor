import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

// Ellipsoid shape component
const Ellipsoid = ({ 
  size = [5, 3, 4], // [xRadius, yRadius, zRadius]
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  color = "rgba(100, 255, 255, 0.7)", 
  wireframe = false,
  selected = false,
  onClick
}) => {
  // Extract dimensions
  const [xRadius, yRadius, zRadius] = size;
  
  // Create a sphere geometry that we'll scale to make an ellipsoid
  const geometry = useMemo(() => {
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    
    // Apply scaling to create an ellipsoid
    sphereGeometry.scale(xRadius, yRadius, zRadius);
    
    return sphereGeometry;
  }, [xRadius, yRadius, zRadius]);
  
  // Create edges for highlighting when selected
  const edges = useMemo(() => {
    if (!selected) return null;
    
    // Create an edges geometry for the ellipsoid
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    return edgesGeometry;
  }, [selected, geometry]);

  return (
    <group position={position} rotation={rotation} onClick={onClick}>
      <mesh geometry={geometry}>
        <meshStandardMaterial 
          color={color} 
          wireframe={wireframe}
          transparent={true}
          opacity={0.7}
        />
      </mesh>
      
      {selected && edges && (
        <lineSegments>
          <primitive object={edges} attach="geometry" />
          <lineBasicMaterial attach="material" color="#ffff00" />
        </lineSegments>
      )}
    </group>
  );
};

export default Ellipsoid;
