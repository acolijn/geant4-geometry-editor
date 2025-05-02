import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

// Trapezoid shape component
const Trapezoid = ({ 
  size = [10, 10, 10, 5, 5], // [dx1, dx2, dy1, dy2, dz]
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  color = "rgba(100, 100, 255, 0.7)", 
  wireframe = false,
  selected = false,
  onClick
}) => {
  // Create a custom trapezoid geometry
  const geometry = useMemo(() => {
    // Extract dimensions
    const [dx1, dx2, dy1, dy2, dz] = size;
    
    // Create a buffer geometry
    const geometry = new THREE.BufferGeometry();
    
    // Define the vertices of the trapezoid
    const vertices = new Float32Array([
      // Bottom face (z = -dz/2)
      -dx1, -dy1, -dz/2,  // 0: bottom left back
       dx1, -dy1, -dz/2,  // 1: bottom right back
       dx1,  dy1, -dz/2,  // 2: bottom right front
      -dx1,  dy1, -dz/2,  // 3: bottom left front
      
      // Top face (z = dz/2)
      -dx2, -dy2, dz/2,   // 4: top left back
       dx2, -dy2, dz/2,   // 5: top right back
       dx2,  dy2, dz/2,   // 6: top right front
      -dx2,  dy2, dz/2    // 7: top left front
    ]);
    
    // Define the faces (triangles) of the trapezoid
    const indices = [
      // Bottom face
      0, 1, 2,
      0, 2, 3,
      
      // Top face
      4, 6, 5,
      4, 7, 6,
      
      // Side faces
      0, 4, 1,
      1, 4, 5,
      
      1, 5, 2,
      2, 5, 6,
      
      2, 6, 3,
      3, 6, 7,
      
      3, 7, 0,
      0, 7, 4
    ];
    
    // Set the vertices and indices
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    // Calculate normals
    geometry.computeVertexNormals();
    
    return geometry;
  }, [size]);
  
  // Create edges for highlighting when selected
  const edges = useMemo(() => {
    if (!selected) return null;
    
    // Extract dimensions
    const [dx1, dx2, dy1, dy2, dz] = size;
    
    // Define the vertices for the edges
    const points = [
      // Bottom face
      new THREE.Vector3(-dx1, -dy1, -dz/2),
      new THREE.Vector3(dx1, -dy1, -dz/2),
      new THREE.Vector3(dx1, dy1, -dz/2),
      new THREE.Vector3(-dx1, dy1, -dz/2),
      new THREE.Vector3(-dx1, -dy1, -dz/2),
      
      // Top face
      new THREE.Vector3(-dx2, -dy2, dz/2),
      new THREE.Vector3(dx2, -dy2, dz/2),
      new THREE.Vector3(dx2, dy2, dz/2),
      new THREE.Vector3(-dx2, dy2, dz/2),
      new THREE.Vector3(-dx2, -dy2, dz/2),
      
      // Connect bottom to top
      new THREE.Vector3(-dx1, -dy1, -dz/2),
      new THREE.Vector3(-dx2, -dy2, dz/2),
      new THREE.Vector3(dx1, -dy1, -dz/2),
      new THREE.Vector3(dx2, -dy2, dz/2),
      new THREE.Vector3(dx1, dy1, -dz/2),
      new THREE.Vector3(dx2, dy2, dz/2),
      new THREE.Vector3(-dx1, dy1, -dz/2),
      new THREE.Vector3(-dx2, dy2, dz/2)
    ];
    
    return points;
  }, [selected, size]);

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
        <Line
          points={edges}
          color="#ffff00"
          lineWidth={1}
        />
      )}
    </group>
  );
};

export default Trapezoid;
