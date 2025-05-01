import React, { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Cylinder = forwardRef(({ position, radius, height, innerRadius = 0, rotation, color, wireframe, selected, onClick }, ref) => {
  const mesh = React.useRef();
  
  // Forward the mesh ref to parent
  useImperativeHandle(ref, () => mesh.current);
  const [hovered, setHovered] = useState(false);
  
  // Highlight effect when selected or hovered
  useFrame(() => {
    if (mesh.current && mesh.current.material) {
      if (selected) {
        mesh.current.material.emissive = new THREE.Color(0x555555);
      } else if (hovered) {
        mesh.current.material.emissive = new THREE.Color(0x333333);
      } else {
        mesh.current.material.emissive = new THREE.Color(0x000000);
      }
    }
  });

  // For Geant4, cylinders are typically along the z-axis
  // We need to handle this differently to prevent erratic rotation with transform controls
  
  // Instead of applying a default rotation to the mesh and then adding the object rotation,
  // we'll apply the rotation directly to the geometry and use the object's rotation as-is
  
  // This approach prevents the erratic rotation behavior when using transform controls
  const cylinderGeometry = useMemo(() => {
    // Create a standard cylinder geometry
    const geom = new THREE.CylinderGeometry(radius, radius, height, 32, 1, innerRadius > 0, innerRadius);
    
    // Rotate the geometry to align with z-axis (90 degrees around X)
    // This is a one-time rotation of the geometry itself, not the mesh
    geom.rotateX(Math.PI / 2);
    
    return geom;
  }, [radius, height, innerRadius]);
  
  // Use the object's rotation directly without combining it with a default rotation

  return (
    <mesh
      ref={mesh}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      <primitive object={cylinderGeometry} />
      <meshStandardMaterial 
        color={color || 'rgba(100, 255, 100, 0.7)'} 
        wireframe={wireframe}
        transparent={true}
        opacity={wireframe ? 0.3 : 0.7}
      />
      {selected && (
        <lineSegments>
          <edgesGeometry attach="geometry" args={[cylinderGeometry]} />
          <lineBasicMaterial attach="material" color="#ffff00" />
        </lineSegments>
      )}
    </mesh>
  );
});

export default Cylinder;
