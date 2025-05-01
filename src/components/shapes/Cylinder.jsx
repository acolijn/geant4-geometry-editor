import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Cylinder = forwardRef(({ position, radius, height, innerRadius = 0, rotation, color, wireframe, selected, onClick }, ref) => {
  const groupRef = React.useRef();
  const [hovered, setHovered] = useState(false);

  useImperativeHandle(ref, () => groupRef.current);

  const safePosition = position || [0, 0, 0];
  const safeRotation = rotation || [0, 0, 0];
  
  // Create a custom cylinder geometry that lies in the x-y plane with height along z-axis
  const createCylinderGeometry = () => {
    // Create a standard cylinder (which has height along y-axis in Three.js)
    const cylinderGeom = new THREE.CylinderGeometry(
      radius, // top radius
      radius, // bottom radius
      height, // height
      32, // radial segments
      1, // height segments
      innerRadius > 0, // open ended?
      innerRadius // inner radius
    );
    
    // Rotate the geometry to align with z-axis (height along z)
    cylinderGeom.rotateX(Math.PI/2);
    
    return cylinderGeom;
  };

  useFrame(() => {
    const mesh = groupRef.current?.children?.[0];
    if (mesh && mesh.material) {
      if (selected) {
        mesh.material.emissive = new THREE.Color(0x555555);
      } else if (hovered) {
        mesh.material.emissive = new THREE.Color(0x333333);
      } else {
        mesh.material.emissive = new THREE.Color(0x000000);
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={safePosition}
      rotation={safeRotation} // Use original rotation without modification
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow receiveShadow>
        <primitive object={createCylinderGeometry()} />
        <meshStandardMaterial 
          color={color || 'rgba(100, 255, 100, 0.7)'} 
          wireframe={wireframe}
          transparent={true}
          opacity={wireframe ? 0.3 : 0.7}
        />
      </mesh>
      {selected && (
        <lineSegments>
          <primitive 
            object={new THREE.EdgesGeometry(createCylinderGeometry())} 
            attach="geometry" 
          />
          <lineBasicMaterial attach="material" color="#ffff00" />
        </lineSegments>
      )}
    </group>
  );
});

export default Cylinder;
