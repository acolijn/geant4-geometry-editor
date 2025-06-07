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
const UnionObject = React.forwardRef(({ object, volumes, isSelected, onClick, materials }, ref) => {
  const groupRef = useRef();
  const [unionMesh, setUnionMesh] = useState(null);
  const [showComponents, setShowComponents] = useState(false); // Toggle to show individual components
  
  // Pass the ref to the group
  // This is critical for the transform controls to work
  React.useImperativeHandle(ref, () => groupRef.current);
  
  // Debug when component is mounted or updated
  useEffect(() => {
    console.log(`UnionObject mounted/updated: ${object.name}`, { 
      isSelected, 
      ref: groupRef.current 
    });
    return () => {
      console.log(`UnionObject unmounted: ${object.name}`);
    };
  }, [object.name, isSelected]);
  
  // Find all volumes that are boolean components of this union
  // This should only change if volumes or object.name changes
  const componentVolumes = useMemo(() => {
    if (!volumes || !object.name) return [];
    console.log(`UnionObject ${object.name}: Finding component volumes`);
    
    // Only use the explicit is_boolean_component flag - no backward compatibility
    const components = volumes.filter(vol => 
      vol.is_boolean_component === true && vol.boolean_parent === object.name
    );
    
    console.log(`UnionObject ${object.name}: Found ${components.length} components`);
    return components;
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
  
  // Use the material from the union object itself, or fall back to a default
  const getUnionColor = () => {
    // Check if we have a material for this object
    const materialName = object.material || 'default';
    let color = '#3399ff'; // Default blue
    
    // Debug materials object
    console.log(`UnionObject ${object.name} materials:`, materials);
    console.log(`UnionObject ${object.name} material name:`, materialName);
    
    // If materials are provided and the material name exists, use its color
    if (materials && typeof materials === 'object') {
      // Check if the material exists in the materials object
      if (materials[materialName]) {
        // Material exists, now check if it has a color property
        if (typeof materials[materialName].color === 'string') {
          // Use the color string directly
          color = materials[materialName].color;
          console.log(`UnionObject ${object.name} using material color string:`, color);
        } else if (Array.isArray(materials[materialName].color)) {
          // Convert color array [r,g,b,a] to hex string
          const [r, g, b] = materials[materialName].color;
          color = new THREE.Color(r, g, b).getHexString();
          color = '#' + color;
          console.log(`UnionObject ${object.name} converted color array to hex:`, color);
        } else {
          console.log(`UnionObject ${object.name} material has invalid color format, using default blue`);
        }
      } else {
        console.log(`UnionObject ${object.name} material '${materialName}' not found, using default blue`);
      }
    } else {
      console.log(`UnionObject ${object.name} no materials provided, using default blue`);
    }
    
    // If selected, override with selection color
    if (isSelected) {
      color = '#ff9900';
      console.log(`UnionObject ${object.name} is selected, using selection color:`, color);
    }
    
    console.log(`UnionObject FINAL color for ${object.name}:`, {
      materialName,
      color,
      isSelected
    });
    
    return color;
  };
  
  // Create the union material with the appropriate color
  const unionMaterial = useMemo(() => {
    const color = getUnionColor();
    
    // Create a new material with the appropriate color
    const material = new THREE.MeshStandardMaterial({
      color: color,
      opacity: 0.8,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    console.log(`UnionObject ${object.name} created material with color:`, {
      colorValue: color,
      materialColor: material.color
    });
    
    return material;
  }, [isSelected, object.material, materials, object.name]);
  
  // For individual components when debugging, create wireframe materials
  // When showComponents is true, we show wireframe versions of the components
  // These should use the union's material color but in wireframe mode for clarity
  const createComponentMaterial = () => {
    // Use the same color as the union
    const color = getUnionColor();
    
    // Create a new wireframe material with the union's color
    return new THREE.MeshStandardMaterial({
      color: color,
      opacity: 0.5,
      transparent: true,
      wireframe: true,
      side: THREE.DoubleSide
    });
  };
  
  // Create meshes for all components - this should only run when componentVolumes changes
  // Using a stable reference to avoid recreating meshes unnecessarily
  const componentMeshes = useMemo(() => {
    if (!componentVolumes.length) return [];
    
    console.log(`UnionObject ${object.name}: Creating ${componentVolumes.length} component meshes`);
    
    // Create a deep copy of the component volumes to avoid reference issues
    // We'll create completely isolated meshes for each component
    return componentVolumes.map((component, index) => {
      // Create a deep clone of the component to avoid reference issues
      const componentClone = JSON.parse(JSON.stringify(component));
      const shapeType = componentClone.type;
      console.log(`UnionObject ${object.name}: Component ${index} type:`, shapeType);
      
      // Create geometry for this component based on its type and dimensions
      const geometry = createGeometry(componentClone);
      
      // For CSG operations, all components should use the union's material
      // This ensures consistent material properties across the entire union
      // We'll use the unionMaterial directly for all component meshes
      
      // Create mesh with the geometry and the union's material
      const mesh = new THREE.Mesh(geometry, unionMaterial);
      
      // Important: For CSG operations, we need to apply the matrix to the geometry
      // rather than setting position/rotation on the mesh
      // This ensures the geometry itself is transformed correctly for CSG
      
      // Create a matrix for the component's position and rotation
      const matrix = new THREE.Matrix4();
      
      // Apply position from the component - these are LOCAL positions relative to the union
      const position = new THREE.Vector3(
        componentClone.position?.x || 0,
        componentClone.position?.y || 0,
        componentClone.position?.z || 0
      );
      
      // Apply rotation from the component - these are LOCAL rotations relative to the union
      const rotation = componentClone.rotation || { x: 0, y: 0, z: 0 };
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
  
  // Perform CSG union operation - only when componentMeshes changes
  // This ensures we don't recreate the union mesh unnecessarily
  useEffect(() => {
    if (!componentMeshes || componentMeshes.length === 0) {
      console.log(`UnionObject ${object.name}: No component meshes, skipping union`);
      return;
    }
    
    console.log(`UnionObject ${object.name}: Creating union from ${componentMeshes.length} components`);
    
    // Create a unique ID for this union operation to help with debugging
    const unionId = `union-${object.name}-${Date.now()}`;
    console.log(`UnionObject: Starting union operation ${unionId}`);
    
    try {
      // If there's only one component, just use it directly
      if (componentMeshes.length === 1) {
        console.log(`UnionObject ${object.name}: Only one component, using it directly`);
        
        // Clone the mesh to avoid reference issues
        const singleMesh = componentMeshes[0].clone();
        
        // Apply the union material
        singleMesh.material = unionMaterial;
        
        // Important: Reset the position and rotation of the mesh
        // The parent TransformableObject will handle positioning
        singleMesh.position.set(0, 0, 0);
        singleMesh.rotation.set(0, 0, 0);
        singleMesh.updateMatrix();
        
        console.log(`UnionObject ${object.name}: Single component mesh created`);
        setUnionMesh(singleMesh);
        return;
      }
      
      // Start with the first mesh - clone it to avoid reference issues
      let resultMesh = componentMeshes[0].clone();
      console.log(`UnionObject ${object.name}: First mesh cloned`);
      
      // Union with each subsequent mesh
      for (let i = 1; i < componentMeshes.length; i++) {
        try {
          console.log(`UnionObject ${object.name}: Processing component ${i}`);
          
          // Clone the next mesh to avoid reference issues
          const nextMesh = componentMeshes[i].clone();
          
          // Verify both meshes have valid geometries
          if (!resultMesh.geometry || !nextMesh.geometry) {
            console.error(`UnionObject ${object.name}: Missing geometry for union operation at component ${i}`);
            continue;
          }
          
          // Check if geometries have vertices
          if (!resultMesh.geometry.attributes.position || !nextMesh.geometry.attributes.position) {
            console.error(`UnionObject ${object.name}: Missing position attributes for union operation at component ${i}`);
            continue;
          }
          
          // Perform the CSG union operation
          console.log(`UnionObject ${object.name}: Performing union with component ${i}`);
          resultMesh = CSG.union(resultMesh, nextMesh);
          console.log(`UnionObject ${object.name}: Union with component ${i} successful`);
        } catch (err) {
          console.error(`UnionObject ${object.name}: Error performing union with component ${i}:`, err);
        }
      }
      
      // Apply the union material
      resultMesh.material = unionMaterial;
      
      // Important: Reset the position and rotation of the result mesh
      // The parent TransformableObject will handle positioning
      resultMesh.position.set(0, 0, 0);
      resultMesh.rotation.set(0, 0, 0);
      resultMesh.updateMatrix();
      
      // Set the union mesh
      console.log(`UnionObject ${object.name}: Final union mesh created`);
      console.log(`UnionObject: Completed union operation ${unionId}`);
      setUnionMesh(resultMesh);
    } catch (err) {
      console.error('Error creating union mesh:', err);
    }
  }, [componentMeshes, unionMaterial]);
  
  // Toggle component visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'c' || e.key === 'C') {
        setShowComponents(prev => !prev);
        console.log(`UnionObject ${object.name}: Components visibility toggled: ${!showComponents}`);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [object.name]);
  
  // The TransformableObject component expects to control the position of this group
  // So we need to make sure the group is positioned at the origin and let TransformableObject handle positioning
  return (
    <group
      ref={groupRef}
      // Important: Position must be [0,0,0] so TransformableObject can control it
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      onClick={(e) => {
        console.log('Union object clicked', object.name);
        e.stopPropagation();
        onClick && onClick();
      }}
    >
      {/* Render the union result */}
      {unionMesh && (
        <mesh
          geometry={unionMesh.geometry}
          material={unionMaterial}
          onClick={(e) => {
            console.log('Union mesh clicked', object.name);
            console.log('Union material:', unionMaterial);
            e.stopPropagation();
            onClick && onClick();
          }}
        />
      )}
      
      {/* Optionally render individual components for debugging */}
      {showComponents && componentVolumes.map((component, index) => {
        // For debugging components, we create static geometries that won't be affected by other operations
        // Each component gets its own isolated geometry and material
        return (
          <group key={`component-${component.name || index}`}>
            <mesh 
              position={[
                component.position?.x || 0,
                component.position?.y || 0,
                component.position?.z || 0
              ]}
              rotation={[
                component.rotation?.x || 0,
                component.rotation?.y || 0,
                component.rotation?.z || 0
              ]}
              geometry={createGeometry(component)}
              material={createComponentMaterial(index)}
            />
          </group>
        );
      })}
    </group>
  );
});

export default UnionObject;
