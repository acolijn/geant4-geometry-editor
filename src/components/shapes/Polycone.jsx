import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

// Polycone shape component - a shape made of multiple z-sections with different radii
const Polycone = ({ 
  zSections = [
    { z: -5, rMin: 0, rMax: 3 },
    { z: 0, rMin: 0, rMax: 5 },
    { z: 5, rMin: 0, rMax: 2 }
  ], 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  color = "rgba(255, 200, 100, 0.7)", 
  wireframe = false,
  selected = false,
  onClick
}) => {
  // Create a custom polycone geometry
  const geometry = useMemo(() => {
    // Sort sections by z-coordinate
    const sortedSections = [...zSections].sort((a, b) => a.z - b.z);
    
    if (sortedSections.length < 2) {
      console.error('Polycone needs at least 2 z-sections');
      return new THREE.BufferGeometry();
    }
    
    // Create a lathe geometry
    const points = [];
    
    // Add points for each z-section (outer radius)
    sortedSections.forEach(section => {
      points.push(new THREE.Vector2(section.rMax, section.z));
    });
    
    // Add points for each z-section in reverse order (inner radius)
    // Only if we have inner radii (hollow polycone)
    if (sortedSections.some(section => section.rMin > 0)) {
      for (let i = sortedSections.length - 1; i >= 0; i--) {
        const section = sortedSections[i];
        if (section.rMin > 0) {
          points.push(new THREE.Vector2(section.rMin, section.z));
        }
      }
    }
    
    // Create the lathe geometry
    const segments = 32;
    const latheGeometry = new THREE.LatheGeometry(points, segments);
    
    return latheGeometry;
  }, [zSections]);
  
  // Create edges for highlighting when selected
  const edges = useMemo(() => {
    if (!selected) return null;
    
    // Create an edges geometry for the polycone
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
          side={THREE.DoubleSide}
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

export default Polycone;
