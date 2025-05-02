import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

// Torus shape component
const Torus = ({ 
  size = [5, 1], // [majorRadius, minorRadius]
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  color = "rgba(255, 100, 100, 0.7)", 
  wireframe = false,
  selected = false,
  onClick
}) => {
  // Extract dimensions
  const [majorRadius, minorRadius] = size;
  
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
  
  // Create edges for highlighting when selected
  const edges = useMemo(() => {
    if (!selected) return null;
    
    // Create an edges geometry for the torus
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

export default Torus;
