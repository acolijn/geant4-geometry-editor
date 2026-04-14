/**
 * AssemblyObject Component
 * 
 * This component renders an assembly (compound object) by drawing all its
 * descendant volumes as meshes inside a single group.  The parent
 * TransformableObject still controls the world position / rotation of the
 * assembly itself; here we only deal with the *local* positions of the
 * children relative to the assembly origin.
 *
 * Supported child types: box, cylinder, sphere, trapezoid, torus, ellipsoid,
 * polycone, cone.
 */
import React, { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { debugLog } from '../../../utils/logger.js';

// ---------------------------------------------------------------------------
// Helper – material colour
// ---------------------------------------------------------------------------
const getMaterialColor = (materialName, materials) => {
  const fallback = new THREE.Color(0.4, 0.4, 1.0);   // blueish default
  if (!materialName || !materials) return fallback;
  const mat = materials[materialName];
  if (mat && Array.isArray(mat.color)) {
    return new THREE.Color(mat.color[0], mat.color[1], mat.color[2]);
  }
  return fallback;
};

const getMaterialOpacity = (materialName, materials) => {
  if (!materialName || !materials) return 0.7;
  const mat = materials[materialName];
  if (mat && Array.isArray(mat.color) && mat.color.length >= 4) {
    return mat.color[3];
  }
  return 0.7;
};

// ---------------------------------------------------------------------------
// Helper – create THREE geometry from a volume's properties
// ---------------------------------------------------------------------------
const createGeometryForVolume = (vol) => {
  switch (vol.type) {
    case 'box': {
      const sx = vol.size?.x || 10;
      const sy = vol.size?.y || 10;
      const sz = vol.size?.z || 10;
      return new THREE.BoxGeometry(sx, sy, sz);
    }
    case 'cylinder': {
      const r = vol.radius || 5;
      const h = vol.height || 10;
      const geom = new THREE.CylinderGeometry(r, r, h, 32);
      geom.rotateX(Math.PI / 2);          // Geant4 convention: height along z
      return geom;
    }
    case 'sphere': {
      const r = vol.radius || 5;
      return new THREE.SphereGeometry(r, 32, 32);
    }
    case 'trapezoid': {
      // Approximate as a box using average half-widths
      const dx1 = vol.dx1 || 50;
      const dx2 = vol.dx2 || 50;
      const dy1 = vol.dy1 || 50;
      const dy2 = vol.dy2 || 50;
      const dz  = vol.dz  || 50;
      return new THREE.BoxGeometry(dx1 + dx2, dy1 + dy2, dz);
    }
    case 'torus': {
      const R = vol.majorRadius || 50;
      const r = vol.minorRadius || 10;
      return new THREE.TorusGeometry(R, r, 16, 48);
    }
    case 'ellipsoid': {
      const geom = new THREE.SphereGeometry(1, 32, 16);
      geom.scale(vol.xRadius || 50, vol.yRadius || 30, vol.zRadius || 40);
      return geom;
    }
    case 'polycone': {
      // Simple polycone: build from z-sections using LatheGeometry
      const sections = vol.zSections;
      if (sections && sections.length >= 2) {
        const points = sections.map(s => new THREE.Vector2(s.rMax || 0, s.z || 0));
        const geom = new THREE.LatheGeometry(points, 48);
        geom.rotateX(Math.PI / 2);        // Geant4 convention: axis along z
        return geom;
      }
      return new THREE.CylinderGeometry(30, 50, 100, 32);
    }
    case 'cone': {
      const rTop = vol.radiusTop ?? 0;
      const rBot = vol.radiusBottom ?? 50;
      const h = vol.height || 100;
      const geom = new THREE.CylinderGeometry(rTop, rBot, h, 32);
      geom.rotateX(Math.PI / 2);
      return geom;
    }
    default:
      return new THREE.BoxGeometry(10, 10, 10);
  }
};

// ---------------------------------------------------------------------------
// Collect all descendants of an assembly (BFS via mother_volume chain)
// Returns volumes with their *cumulative* local position/rotation relative
// to the assembly origin.
// ---------------------------------------------------------------------------
const collectDescendants = (assemblyName, volumes) => {
  if (!volumes) return [];

  // Build a map: name -> [child volumes]
  const childrenOf = {};
  volumes.forEach(v => {
    if (!v.mother_volume) return;
    if (!childrenOf[v.mother_volume]) childrenOf[v.mother_volume] = [];
    childrenOf[v.mother_volume].push(v);
  });

  // BFS starting from assemblyName, accumulating transforms
  const result = [];
  const queue = [{ parentName: assemblyName, parentPos: [0, 0, 0], parentRot: [0, 0, 0] }];

  while (queue.length > 0) {
    const { parentName, parentPos, parentRot } = queue.shift();
    const children = childrenOf[parentName];
    if (!children) continue;

    children.forEach(child => {
      // Skip compound children – they have their own renderers (UnionObject, etc.)
      // But still continue BFS through them so their descendants can be collected.
      if (child.type === 'assembly' || child.type === 'union' || child.type === 'subtraction') {
        return;
      }

      // Local position / rotation of the child relative to its direct parent
      const lx = child.position?.x || 0;
      const ly = child.position?.y || 0;
      const lz = child.position?.z || 0;
      const lr = child.rotation || { x: 0, y: 0, z: 0 };

      // Compose: parentWorld = parentPos + parentRot * localPos
      const parentQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(parentRot[0], parentRot[1], parentRot[2], 'XYZ')
      );
      const localVec = new THREE.Vector3(lx, ly, lz).applyQuaternion(parentQuat);
      const worldPos = [parentPos[0] + localVec.x, parentPos[1] + localVec.y, parentPos[2] + localVec.z];

      const localQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(lr.x || 0, lr.y || 0, lr.z || 0, 'XYZ')
      );
      const worldQuat = parentQuat.clone().multiply(localQuat);
      const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat, 'XYZ');
      const worldRot = [worldEuler.x, worldEuler.y, worldEuler.z];

      result.push({ volume: child, position: worldPos, rotation: worldRot });

      // Continue BFS for grandchildren
      queue.push({ parentName: child.name, parentPos: worldPos, parentRot: worldRot });
    });
  }

  return result;
};

// ---------------------------------------------------------------------------
// Label (shown when selected)
// ---------------------------------------------------------------------------
const Label = ({ text }) => (
  <Html position={[0, 0, 0]} center>
    <div style={{
      padding: '6px 10px',
      borderRadius: '4px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      pointerEvents: 'none'
    }}>
      {text}
    </div>
  </Html>
);

// ---------------------------------------------------------------------------
// AssemblyObject
// ---------------------------------------------------------------------------
const AssemblyObject = forwardRef(({ object, volumes, isSelected, onClick, materials }, ref) => {

  // Collect all descendant volumes with their positions relative to assembly
  const descendants = useMemo(
    () => {
      const result = collectDescendants(object.name, volumes);
      debugLog(`AssemblyObject "${object.name}": found ${result.length} descendants`, result);
      return result;
    },
    [object.name, volumes]
  );

  // Build mesh data for each descendant
  const meshData = useMemo(() => {
    return descendants.map(({ volume, position, rotation }) => {
      const geometry = createGeometryForVolume(volume);
      const edgesGeometry = new THREE.EdgesGeometry(geometry);
      const color = getMaterialColor(volume.material, materials);
      const opacity = getMaterialOpacity(volume.material, materials);
      debugLog(`AssemblyObject mesh: ${volume.name} type=${volume.type} pos=${position} size=${JSON.stringify(volume.size)} radius=${volume.radius} height=${volume.height}`);
      return { geometry, edgesGeometry, color, opacity, position, rotation, name: volume.name };
    });
  }, [descendants, materials]);

  // Version counter to force mesh remount when data changes
  const version = useMemo(() => Date.now(), [meshData]);

  return (
    <group ref={ref} onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}>
      {/* Render each descendant volume as a mesh */}
      {meshData.map((m, i) => (
        <mesh key={`${m.name || i}-${version}`} geometry={m.geometry} position={m.position} rotation={m.rotation}>
          <meshStandardMaterial
            color={m.color}
            transparent
            opacity={m.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Selection highlight: wireframes on all descendants */}
      {isSelected && meshData.map((m, i) => (
        <lineSegments key={`edge-${m.name || i}-${version}`} geometry={m.edgesGeometry} position={m.position} rotation={m.rotation}>
          <lineBasicMaterial attach="material" color="#ffff00" />
        </lineSegments>
      ))}

      {/* Label when selected */}
      {isSelected && <Label text={object.g4name || object.name || 'Assembly'} />}
    </group>
  );
});

export default AssemblyObject;
