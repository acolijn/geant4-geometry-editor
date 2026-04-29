// UnionObject.jsx - Component for rendering union solids with multiple components
import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { CSG } from 'three-csg-ts';

// When a boolean solid has more than this many subtraction components, use
// Geant4-style approximate rendering (Inside-test) instead of CSG meshing.
// CSG compounds because each subtraction recomputes the full triangle mesh.
const SIMPLIFY_THRESHOLD = 5;

// Grid subdivisions per axis used when building an approximate perforated
// cylinder mesh.  60 divisions on a 706 mm-radius plate → ~23 mm cell, which
// is smaller than the 39.5 mm hole radius and gives clean-looking holes.
const APPROX_GRID_N = 60;

// ---------------------------------------------------------------------------
// Inside-test helpers (compound-local coordinates)
// ---------------------------------------------------------------------------

function isInsideSubtraction(px, py, pz, component) {
  const cx = component.position?.x || 0;
  const cy = component.position?.y || 0;
  const cz = component.position?.z || 0;

  if (component.type === 'cylinder') {
    const r = 0.97*component.radius || 1;
    const halfH = (component.height || 1) / 2;
    const dx = px - cx, dy = py - cy;
    return dx * dx + dy * dy <= r * r && Math.abs(pz - cz) <= halfH + 0.01;
  }

  if (component.type === 'box') {
    const { x = 1, y = 1, z = 1 } = component.size || {};
    return (
      Math.abs(px - cx) <= x / 2 &&
      Math.abs(py - cy) <= y / 2 &&
      Math.abs(pz - cz) <= z / 2
    );
  }

  return false;
}

// ---------------------------------------------------------------------------
// Approximate mesh builder for cylinder-with-many-holes
// ---------------------------------------------------------------------------

/**
 * Build a mesh for `baseVol` (cylinder) with all `subtractVols` cut out using
 * the Inside-test approach: generate a fine planar grid for top/bottom caps,
 * discard any triangle whose centroid falls inside a subtraction volume, and
 * keep a standard cylinder side wall.
 *
 * All coordinates are in the boolean solid's local (compound) frame.
 */
function buildApproximateMesh(baseVol, subtractVols, material) {
  // Fall back to simple geometry if base is not a cylinder
  if (!baseVol || baseVol.type !== 'cylinder') {
    const geom = createGeometry(baseVol || {});
    const m = new THREE.Mesh(geom, material);
    const p = baseVol?.position;
    if (p) m.position.set(p.x || 0, p.y || 0, p.z || 0);
    return m;
  }

  const R     = baseVol.radius || 1;
  const H     = baseVol.height || 1;
  const halfH = H / 2;
  const bx    = baseVol.position?.x || 0;
  const by    = baseVol.position?.y || 0;
  const bz    = baseVol.position?.z || 0;
  const innerR = baseVol.innerRadius || 0;

  const step  = (2 * R) / APPROX_GRID_N;
  const R2    = R * R;
  const iR2   = innerR * innerR;
  const posArr = [];

  // Check whether a centroid lands inside any subtracted solid
  const anyInside = (px, py, pz) =>
    subtractVols.some(v => isInsideSubtraction(px, py, pz, v));

  // Add one cap face (topZ or botZ).  flipWinding reverses triangle order so
  // normals point outward on both faces.
  function addCap(faceZ, flip) {
    for (let ix = 0; ix < APPROX_GRID_N; ix++) {
      for (let iy = 0; iy < APPROX_GRID_N; iy++) {
        const x0 = bx - R + ix * step,       x1 = x0 + step;
        const y0 = by - R + iy * step,       y1 = y0 + step;

        // Triangle A: (x0,y0) – (x1,y0) – (x0,y1)
        const cxA = (x0 + x1 + x0) / 3, cyA = (y0 + y0 + y1) / 3;
        const dxA = cxA - bx, dyA = cyA - by, r2A = dxA * dxA + dyA * dyA;
        if (r2A <= R2 && (innerR === 0 || r2A >= iR2) && !anyInside(cxA, cyA, faceZ)) {
          if (!flip) posArr.push(x0,y0,faceZ, x1,y0,faceZ, x0,y1,faceZ);
          else       posArr.push(x0,y1,faceZ, x1,y0,faceZ, x0,y0,faceZ);
        }

        // Triangle B: (x1,y0) – (x1,y1) – (x0,y1)
        const cxB = (x1 + x1 + x0) / 3, cyB = (y0 + y1 + y1) / 3;
        const dxB = cxB - bx, dyB = cyB - by, r2B = dxB * dxB + dyB * dyB;
        if (r2B <= R2 && (innerR === 0 || r2B >= iR2) && !anyInside(cxB, cyB, faceZ)) {
          if (!flip) posArr.push(x1,y0,faceZ, x1,y1,faceZ, x0,y1,faceZ);
          else       posArr.push(x0,y1,faceZ, x1,y1,faceZ, x1,y0,faceZ);
        }
      }
    }
  }

  addCap(bz + halfH, false); // top face, normal +Z
  addCap(bz - halfH, true);  // bottom face, normal -Z

  // Side wall (standard cylinder, no hole testing needed on the rim)
  const N_SIDE = 64;
  const topZ = bz + halfH, botZ = bz - halfH;
  for (let i = 0; i < N_SIDE; i++) {
    const a0 = (i / N_SIDE) * Math.PI * 2;
    const a1 = ((i + 1) / N_SIDE) * Math.PI * 2;
    const sx0 = bx + R * Math.cos(a0), sy0 = by + R * Math.sin(a0);
    const sx1 = bx + R * Math.cos(a1), sy1 = by + R * Math.sin(a1);
    posArr.push(sx0, sy0, botZ, sx1, sy1, topZ, sx1, sy1, botZ);
    posArr.push(sx0, sy0, botZ, sx0, sy0, topZ, sx1, sy1, topZ);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(posArr), 3));
  geom.computeVertexNormals();

  const mesh = new THREE.Mesh(geom, material);
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.updateMatrix();
  return mesh;
}

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
    case 'tubs': {
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
    }
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
    {
      // Use a sphere and scale it to approximate an ellipsoid
      const sphereGeom = new THREE.SphereGeometry(1, 32, 16);
      sphereGeom.scale(
        solid.xRadius || solid.ax || 1,
        solid.yRadius || solid.by || 1,
        solid.zRadius || solid.cz || 1
      );
      return sphereGeom;
    }
    default:
      // Default to a box for other types
      return new THREE.BoxGeometry(1, 1, 1);
  }
};

// UnionObject component that visualizes a true boolean union of constituent components
const UnionObject = React.forwardRef(({ object, volumes, isSelected, onClick, materials }, ref) => {
  const groupRef = useRef();
  const [unionMesh, setUnionMesh] = useState(null);
  
  // Pass the ref to the group
  // This is critical for the transform controls to work
  React.useImperativeHandle(ref, () => groupRef.current);
  
  // Find all volumes that are boolean components of this union
  // This should only change if volumes or object.name changes
  const componentVolumes = useMemo(() => {
    if (!volumes || !object.name) return [];
    
    // Only use the explicit is_boolean_component flag - no backward compatibility
    const components = volumes.filter(vol => 
      vol._is_boolean_component === true && vol._boolean_parent === object.name
    );
    return components;
  }, [volumes, object.name]);
  
  // The rotation is already handled by the parent TransformableObject component
  // We don't need to apply any rotation here as the group is already properly oriented
  // Note: No need to convert from degrees to radians as the values are already in radians
  
  // Use the material from the union object itself, or fall back to a default
  const getUnionColor = () => {
    // Check if we have a material for this object
    const materialName = object.material || 'default';
    let color = '#3399ff'; // Default blue
    
    // If materials are provided and the material name exists, use its color
    if (materials && typeof materials === 'object') {
      // Check if the material exists in the materials object
      if (materials[materialName]) {
        // Material exists, now check if it has a color property
        if (typeof materials[materialName].color === 'string') {
          // Use the color string directly
          color = materials[materialName].color;
        } else if (Array.isArray(materials[materialName].color)) {
          // Convert color array [r,g,b,a] to hex string
          const [r, g, b] = materials[materialName].color;
          color = new THREE.Color(r, g, b).getHexString();
          color = '#' + color;
        }
      }
    }
    
    // If selected, override with selection color
    if (isSelected) {
      color = '#ff9900';
    }
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
    return material;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected, object.material, materials, object.name]);
  
  // Create meshes for all components - this should only run when componentVolumes changes
  // Using a stable reference to avoid recreating meshes unnecessarily
  const componentMeshes = useMemo(() => {
    if (!componentVolumes.length) return [];
    
    // Create a deep copy of the component volumes to avoid reference issues
    // We'll create completely isolated meshes for each component
    return componentVolumes.map((component) => {
      // Create a deep clone of the component to avoid reference issues
      const componentClone = structuredClone(component);
      
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
      
      return mesh;
    });
  }, [componentVolumes, unionMaterial]);
  
  // Perform CSG union operation - only when componentMeshes changes
  // This ensures we don't recreate the union mesh unnecessarily
  useEffect(() => {
    if (!componentMeshes || componentMeshes.length === 0) {
      setUnionMesh(null);
      return;
    }
    
    try {
      // If there's only one component, just use it directly
      if (componentMeshes.length === 1) {
        // Clone the mesh to avoid reference issues
        const singleMesh = componentMeshes[0].clone();
        
        // Apply the union material
        singleMesh.material = unionMaterial;
        
        // Important: Reset the position and rotation of the mesh
        // The parent TransformableObject will handle positioning
        singleMesh.position.set(0, 0, 0);
        singleMesh.rotation.set(0, 0, 0);
        singleMesh.updateMatrix();
        
        setUnionMesh(singleMesh);
        return;
      }
      
      // Group components by operation type
      const unionComponents = [];
      const subtractComponents = [];
      
      // Sort components by operation type
      componentMeshes.forEach((mesh, index) => {
        const component = componentVolumes[index];
        const operationType = component.boolean_operation || 'union';
        
        if (operationType === 'subtract') {
          subtractComponents.push(mesh);
        } else {
          unionComponents.push(mesh);
        }
      });
      
      // We need at least one union component to start with
      if (unionComponents.length === 0) {
        setUnionMesh(null);
        return;
      }

      // --- Geant4-style approximate rendering for complex boolean solids ---
      // When there are many subtractions (e.g. hundreds of PMT holes in a
      // copper plate), sequential CSG recomputes the triangle mesh each step
      // and hangs the browser.  Instead, filter the base geometry triangles
      // by an Inside-test — the same approach Geant4's own visualiser uses.
      if (subtractComponents.length > SIMPLIFY_THRESHOLD) {
        const baseVols = componentVolumes.filter(
          v => !v.boolean_operation || v.boolean_operation !== 'subtract'
        );
        const subVols = componentVolumes.filter(
          v => v.boolean_operation === 'subtract'
        );
        if (baseVols.length > 0) {
          const approxMesh = buildApproximateMesh(baseVols[0], subVols, unionMaterial);
          setUnionMesh(approxMesh);
          return;
        }
      }

      // Start with the first union mesh - clone it to avoid reference issues
      let resultMesh = unionComponents[0].clone();
      // Union with each subsequent union mesh
      for (let i = 1; i < unionComponents.length; i++) {
        try {
          // Clone the next mesh to avoid reference issues
          const nextMesh = unionComponents[i].clone();
          
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
          resultMesh = CSG.union(resultMesh, nextMesh);
        } catch (err) {
          console.error(`UnionObject ${object.name}: Error performing union with component ${i}:`, err);
        }
      }
      
      // Now subtract each subtract component
      for (let i = 0; i < subtractComponents.length; i++) {
        try {
          // Clone the next mesh to avoid reference issues
          const nextMesh = subtractComponents[i].clone();
          
          // Verify both meshes have valid geometries
          if (!resultMesh.geometry || !nextMesh.geometry) {
            console.error(`UnionObject ${object.name}: Missing geometry for subtract operation at component ${i}`);
            continue;
          }
          
          // Check if geometries have vertices
          if (!resultMesh.geometry.attributes.position || !nextMesh.geometry.attributes.position) {
            console.error(`UnionObject ${object.name}: Missing position attributes for subtract operation at component ${i}`);
            continue;
          }
          
          // Perform the CSG subtract operation
          resultMesh = CSG.subtract(resultMesh, nextMesh);
        } catch (err) {
          console.error(`UnionObject ${object.name}: Error performing subtraction with component ${i}:`, err);
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
      setUnionMesh(resultMesh);
    } catch (err) {
      console.error('Error creating union mesh:', err);
    }
    // componentVolumes and object.name are stable references captured indirectly via componentMeshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentMeshes, unionMaterial]);
  
  // The TransformableObject component expects to control the position of this group
  // So we need to make sure the group is positioned at the origin and let TransformableObject handle positioning
  return (
    <group
      ref={groupRef}
      // Important: Position must be [0,0,0] so TransformableObject can control it
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      onClick={(e) => {
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
            e.stopPropagation();
            onClick && onClick();
          }}
        />
      )}
      
      {/* We're completely disabling the rendering of component wireframes */}
      {/* No wireframes will be shown for any boolean components */}
    </group>
  );
});

export default UnionObject;
