import React from 'react';
import * as THREE from 'three';
import { getMaterialColor } from '../utils/materialColorUtils';

const DEFAULT_COLOR = 'rgba(100, 255, 100, 0.7)';

// Separate Cylinder Object Component with correct Geant4 rotation handling
const CylinderObject = React.forwardRef(({ object, isSelected, onClick, materials }, ref) => {
  const position = object.position ? [
    object.position.x, 
    object.position.y, 
    object.position.z
  ] : [0, 0, 0];
  
  const radius = object.radius || 5;
  const height = object.height || 10;
  const innerRadius = object.innerRadius || 0;

  // Create a cylinder geometry that aligns with Geant4 convention (height along z-axis).
  // When innerRadius > 0 (hollow cylinder / tube), ExtrudeGeometry with a ring shape is
  // used because THREE.CylinderGeometry has no inner radius support.
  const createCylinderGeometry = () => {
    if (innerRadius > 0) {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: false,
        curveSegments: 32,
      });
      // ExtrudeGeometry goes from z=0 to z=height; translate to centre at origin
      geom.translate(0, 0, -height / 2);
      return geom;
    }

    // Solid cylinder: Three.js height is along y-axis, rotate to z-axis
    const cylinderGeom = new THREE.CylinderGeometry(radius, radius, height, 32);
    cylinderGeom.rotateX(Math.PI / 2);
    return cylinderGeom;
  };

  return (
    <mesh 
      ref={ref}
      position={position}
      // No rotation needed here - handled by parent TransformableObject
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Use the custom cylinder geometry that's pre-rotated */}
      <primitive object={createCylinderGeometry()} />
      <meshStandardMaterial 
        color={getMaterialColor(object.material, materials, DEFAULT_COLOR)} 
        transparent={true}
        opacity={0.7}
      />
      {isSelected && (
        <lineSegments>
          <primitive 
            object={new THREE.EdgesGeometry(createCylinderGeometry())} 
            attach="geometry" 
          />
          <lineBasicMaterial attach="material" color="#ffff00" />
        </lineSegments>
      )}
    </mesh>
  );
});

export default CylinderObject;
