import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Cylinder = forwardRef(({ position, radius, height, innerRadius = 0, rotation, color, wireframe, selected, onClick }, ref) => {
  const groupRef = React.useRef();
  const [hovered, setHovered] = useState(false);

  useImperativeHandle(ref, () => groupRef.current);

  const safePosition = position || [0, 0, 0];
  const safeRotation = rotation || [0, 0, 0];
  const baseRotation = [Math.PI / 2 + safeRotation[0], safeRotation[1], safeRotation[2]];

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
      rotation={baseRotation}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, 32, 1, innerRadius > 0, innerRadius]} />
        <meshStandardMaterial 
          color={color || 'rgba(100, 255, 100, 0.7)'} 
          wireframe={wireframe}
          transparent={true}
          opacity={wireframe ? 0.3 : 0.7}
        />
      </mesh>
      {selected && (
        <lineSegments>
          <edgesGeometry attach="geometry" args={[new THREE.CylinderGeometry(radius, radius, height, 32, 1, innerRadius > 0, innerRadius)]} />
          <lineBasicMaterial attach="material" color="#ffff00" />
        </lineSegments>
      )}
    </group>
  );
});

export default Cylinder;
