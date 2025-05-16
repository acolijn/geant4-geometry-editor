// UnionObject.jsx - Component for rendering union solids with multiple components
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

// Helper function to create a basic geometry based on solid type
const createGeometry = (solid) => {
  if (!solid || !solid.type) return new THREE.BoxGeometry(1, 1, 1);
  
  switch (solid.type) {
    case 'box':
      return new THREE.BoxGeometry(
        solid.size?.x || 1,
        solid.size?.y || 1,
        solid.size?.z || 1
      );
    case 'sphere':
      return new THREE.SphereGeometry(
        solid.radius || 1,
        32, // widthSegments
        16  // heightSegments
      );
    case 'cylinder':
    case 'tube':
    case 'tubs':
      // Create a cylinder with height along the y-axis (Three.js default)
      const cylinderGeometry = new THREE.CylinderGeometry(
        solid.radius || 1,
        solid.radius || 1,
        solid.height || solid.z || 1,
        32 // segments
      );
      
      // Rotate it to align with Geant4's convention (height along z-axis)
      // This requires a 90-degree rotation around the X axis
      cylinderGeometry.rotateX(Math.PI / 2);
      
      return cylinderGeometry;
    case 'trapezoid':
    case 'trd':
      // Create a simple box as a placeholder for trapezoid
      return new THREE.BoxGeometry(
        (solid.dx1 || solid.x1 || 1) + (solid.dx2 || solid.x2 || 1),
        (solid.dy1 || solid.y1 || 1) + (solid.dy2 || solid.y2 || 1),
        solid.dz || solid.height || 1
      );
    case 'torus':
      return new THREE.TorusGeometry(
        solid.majorRadius || solid.torus_radius || 5,
        solid.minorRadius || solid.tube_radius || 1,
        16, // tubular segments
        32  // radial segments
      );
    case 'ellipsoid':
      // Use a sphere and scale it to approximate an ellipsoid
      const sphereGeom = new THREE.SphereGeometry(1, 32, 16);
      sphereGeom.scale(
        solid.xRadius || solid.ax || 1,
        solid.yRadius || solid.by || 1,
        solid.zRadius || solid.cz || 1
      );
      return sphereGeom;
    default:
      // Default to a box for other types
      return new THREE.BoxGeometry(1, 1, 1);
  }
};

// Helper function to extract dimensions from a component
const extractDimensions = (component) => {
  // If the component has a dimensions property, use that
  if (component.dimensions) {
    return component.dimensions;
  }
  // Otherwise, use the component itself as the dimensions
  return component;
};

// UnionObject component that visualizes all constituent components
const UnionObject = React.forwardRef(({ object, isSelected, onClick }, ref) => {
  const groupRef = useRef();
  
  // Pass the ref to the group
  React.useImperativeHandle(ref, () => groupRef.current);
  
  // Get position and rotation from the object
  const position = object.position ? [
    object.position.x || 0, 
    object.position.y || 0, 
    object.position.z || 0
  ] : [0, 0, 0];
  
  // Apply rotation (convert from degrees to radians)
  const rotX = THREE.MathUtils.degToRad(object.rotation?.x || 0);
  const rotY = THREE.MathUtils.degToRad(object.rotation?.y || 0);
  const rotZ = THREE.MathUtils.degToRad(object.rotation?.z || 0);
  
  // Generate a base material with a random color for each component
  const createMaterial = (index) => {
    // Generate a color based on the index
    const hue = (index * 137.5) % 360; // Golden angle approximation for good distribution
    const color = new THREE.Color().setHSL(hue / 360, 0.7, 0.6);
    
    return new THREE.MeshStandardMaterial({
      color: isSelected ? '#ff9900' : color,
      opacity: 0.7,
      transparent: true
    });
  };
  
  // Check if we have the new multi-component format
  const hasComponents = Array.isArray(object.components) && object.components.length >= 2;
  
  // For backward compatibility, handle the old format with solid1 and solid2
  if (!hasComponents) {
    // Create geometries for both solids
    const firstGeometry = useMemo(() => createGeometry(object.solid1), [object.solid1]);
    const secondGeometry = useMemo(() => createGeometry(object.solid2), [object.solid2]);
    
    // Create materials for both solids
    const firstMaterial = useMemo(() => createMaterial(0), [isSelected]);
    const secondMaterial = useMemo(() => createMaterial(1), [isSelected]);
    
    // Get relative position and rotation for the second solid
    const relativePosition = object.relative_position ? [
      object.relative_position.x || 0,
      object.relative_position.y || 0,
      object.relative_position.z || 0
    ] : [0, 0, 5]; // Default offset along z-axis if not specified
    
    const relativeRotX = THREE.MathUtils.degToRad(object.relative_rotation?.x || 0);
    const relativeRotY = THREE.MathUtils.degToRad(object.relative_rotation?.y || 0);
    const relativeRotZ = THREE.MathUtils.degToRad(object.relative_rotation?.z || 0);
    
    return (
      <group
        ref={groupRef}
        position={position}
        rotation={[rotX, rotY, rotZ]}
        onClick={(e) => {
          e.stopPropagation();
          onClick && onClick();
        }}
      >
        {/* First solid */}
        <mesh geometry={firstGeometry} material={firstMaterial} />
        
        {/* Second solid with relative position and rotation */}
        <group position={relativePosition} rotation={[relativeRotX, relativeRotY, relativeRotZ]}>
          <mesh geometry={secondGeometry} material={secondMaterial} />
        </group>
      </group>
    );
  }
  
  // Handle the new multi-component format
  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[rotX, rotY, rotZ]}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick();
      }}
    >
      {/* Render all components */}
      {object.components.map((component, index) => {
        // Extract the shape type and dimensions
        const shapeType = component.shape || 'box';
        const dimensions = extractDimensions(component);
        
        // Create geometry for this component
        const geometry = useMemo(() => {
          return createGeometry({
            type: shapeType,
            ...dimensions
          });
        }, [shapeType, dimensions]);
        
        // Create material with a unique color
        const material = useMemo(() => createMaterial(index), [index, isSelected]);
        
        // Get the placement information for this component
        const placement = component.placement && component.placement[0] ? component.placement[0] : { x: 0, y: 0, z: index * 5 };
        
        // Extract position
        const compPosition = [
          placement.x || 0,
          placement.y || 0,
          placement.z || 0
        ];
        
        // Extract rotation if available
        const rotation = placement.rotation || { x: 0, y: 0, z: 0 };
        const compRotX = THREE.MathUtils.degToRad(rotation.x || 0);
        const compRotY = THREE.MathUtils.degToRad(rotation.y || 0);
        const compRotZ = THREE.MathUtils.degToRad(rotation.z || 0);
        
        return (
          <group key={`component-${index}`} position={compPosition} rotation={[compRotX, compRotY, compRotZ]}>
            <mesh geometry={geometry} material={material} />
          </group>
        );
      })}
    </group>
  );
});

export default UnionObject;
