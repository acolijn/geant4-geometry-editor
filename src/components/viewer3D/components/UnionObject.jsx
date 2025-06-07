// UnionObject.jsx - Component for rendering union solids with multiple components
import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { CSG } from 'three-csg-ts';

// Helper function to create a basic geometry based on solid type
const createGeometry = (solid) => {
  console.log('XXXXX UnionObject:: solid', solid);
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

// UnionObject component that visualizes a true boolean union of constituent components
const UnionObject = React.forwardRef(({ object, volumes, isSelected, onClick }, ref) => {
  const groupRef = useRef();
  const [unionMesh, setUnionMesh] = useState(null);
  const [showComponents, setShowComponents] = useState(false); // Toggle to show individual components
  
  // Pass the ref to the group
  React.useImperativeHandle(ref, () => groupRef.current);
  
  // Find all volumes that have this union as their mother
  console.log('XXXXX UnionObject:: volumes', volumes);
  console.log('XXXXX UnionObject:: object', object);
  const componentVolumes = useMemo(() => {
    if (!volumes || !object.name) return [];
    return volumes.filter(vol => vol.mother_volume === object.name);
  }, [volumes, object.name]);
  
  // Get position and rotation from the object
  const position = object.position ? [
    object.position.x || 0, 
    object.position.y || 0, 
    object.position.z || 0
  ] : [0, 0, 0];
  
  // The rotation is already handled by the parent TransformableObject component
  // We don't need to apply any rotation here as the group is already properly oriented
  // Note: No need to convert from degrees to radians as the values are already in radians
  
  // Generate material for the union result
  const unionMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isSelected ? '#ff9900' : '#3399ff',
      opacity: 0.8,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [isSelected]);
  
  // Generate a base material with a random color for each component
  const createComponentMaterial = (index) => {
    // Generate a color based on the index
    const hue = (index * 137.5) % 360; // Golden angle approximation for good distribution
    const color = new THREE.Color().setHSL(hue / 360, 0.7, 0.6);
    
    return new THREE.MeshStandardMaterial({
      color: color,
      opacity: 0.4,
      transparent: true,
      wireframe: true
    });
  };
  
  // Create meshes for all components
  const componentMeshes = useMemo(() => {
    if (!componentVolumes || componentVolumes.length === 0) return [];
    
    console.log('XXXXX UnionObject:: componentVolumes', componentVolumes);
    return componentVolumes.map((component, index) => {
      // Extract the shape type and dimensions
      const shapeType = component.type;
      console.log(`XXXXX UnionObject:: Component ${index} type:`, shapeType);
      
      // Create geometry for this component based on its type and dimensions
      const geometry = createGeometry(component);
      console.log(`XXXXX UnionObject:: Component ${index} geometry:`, geometry);
      
      // Create material
      const material = createComponentMaterial(index);
      
      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      
      // Important: For CSG operations, we need to apply the matrix to the geometry
      // rather than setting position/rotation on the mesh
      // This ensures the geometry itself is transformed correctly for CSG
      
      // Create a matrix for the component's position and rotation
      const matrix = new THREE.Matrix4();
      
      // Apply position from the component
      const position = new THREE.Vector3(
        component.position?.x || 0,
        component.position?.y || 0,
        component.position?.z || 0
      );
      
      // Apply rotation from the component
      const rotation = component.rotation || { x: 0, y: 0, z: 0 };
      const euler = new THREE.Euler(
        rotation.x || 0,
        rotation.y || 0,
        rotation.z || 0,
        'XYZ'
      );
      
      // Set the matrix from position and rotation
      matrix.compose(
        position,
        new THREE.Quaternion().setFromEuler(euler),
        new THREE.Vector3(1, 1, 1) // scale
      );
      
      // Apply the matrix to the geometry
      geometry.applyMatrix4(matrix);
      
      // Reset mesh position and rotation since it's now in the geometry
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      
      console.log(`XXXXX UnionObject:: Component ${index} mesh:`, mesh);
      return mesh;
    });
  }, [componentVolumes]);
  
  // Perform CSG union operation
  useEffect(() => {
    console.log('XXXXX UnionObject:: componentMeshes', componentMeshes);
    if (!componentMeshes || componentMeshes.length === 0) {
      console.log('XXXXX UnionObject:: No component meshes, skipping union');
      return;
    }
    console.log('XXXXX UnionObject:: componentMeshes.length', componentMeshes.length);
    
    try {
      // If there's only one component, just use it directly
      if (componentMeshes.length === 1) {
        console.log('XXXXX UnionObject:: Only one component, using it directly');
        const singleMesh = componentMeshes[0].clone();
        singleMesh.material = unionMaterial;
        setUnionMesh(singleMesh);
        return;
      }
      
      // Start with the first mesh
      let resultMesh = componentMeshes[0].clone();
      console.log('XXXXX UnionObject:: First mesh cloned', resultMesh);
      
      // Union with each subsequent mesh
      for (let i = 1; i < componentMeshes.length; i++) {
        try {
          console.log(`XXXXX UnionObject:: Processing component ${i}`);
          const nextMesh = componentMeshes[i].clone();
          console.log(`XXXXX UnionObject:: Component ${i} cloned`, nextMesh);
          
          // Verify both meshes have valid geometries
          if (!resultMesh.geometry || !nextMesh.geometry) {
            console.error(`XXXXX UnionObject:: Missing geometry for union operation at component ${i}`);
            continue;
          }
          
          // Check if geometries have vertices
          if (!resultMesh.geometry.attributes.position || !nextMesh.geometry.attributes.position) {
            console.error(`XXXXX UnionObject:: Missing position attributes for union operation at component ${i}`);
            continue;
          }
          
          console.log(`XXXXX UnionObject:: Performing union with component ${i}`);
          resultMesh = CSG.union(resultMesh, nextMesh);
          console.log(`XXXXX UnionObject:: Union with component ${i} successful`, resultMesh);
        } catch (err) {
          console.error(`Error performing union with component ${i}:`, err);
        }
      }
      
      // Apply the union material
      resultMesh.material = unionMaterial;
      
      // Set the result mesh
      setUnionMesh(resultMesh);
    } catch (err) {
      console.error('Error performing CSG union:', err);
    }
  }, [componentMeshes, unionMaterial]);
  
  // Toggle component visibility with 'C' key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'c' || e.key === 'C') {
        setShowComponents(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <group
      ref={groupRef}
      position={position}

      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick();
      }}
    >
      {/* Render the union result */}
      {unionMesh && (
        <primitive object={unionMesh} />
      )}
      
      {/* Optionally render individual components for debugging */}
      {showComponents && componentVolumes.map((component, index) => {
        // Create geometry for this component
        const geometry = useMemo(() => {
          return createGeometry(component);
        }, [component]);
        
        // Create material with a unique color
        const material = useMemo(() => createComponentMaterial(index), [index]);
        
        // Extract position
        const compPosition = [
          component.position?.x || 0,
          component.position?.y || 0,
          component.position?.z || 0
        ];
        
        // Extract rotation if available
        const rotation = component.rotation || { x: 0, y: 0, z: 0 };
        const compRotX = rotation.x || 0;
        const compRotY = rotation.y || 0;
        const compRotZ = rotation.z || 0;
        
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
