// UnionObject.jsx — render a boolean compound (union/subtract) as a single mesh.
//
// Uses manifold-3d (WASM) for true CSG. Generic across all supported solids;
// handles arbitrary numbers of subtractions without browser hangs.

import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { computeBooleanGeometry } from '../utils/manifoldCSG';

const UnionObject = React.forwardRef(({ object, volumes, isSelected, onClick, materials }, ref) => {
  const groupRef = useRef();
  const [resultGeometry, setResultGeometry] = useState(null);

  React.useImperativeHandle(ref, () => groupRef.current);

  // Boolean components belonging to this compound
  const componentVolumes = useMemo(() => {
    if (!volumes || !object.name) return [];
    return volumes.filter(
      vol => vol._is_boolean_component === true && vol._boolean_parent === object.name
    );
  }, [volumes, object.name]);

  // Material colour resolution
  const unionMaterial = useMemo(() => {
    const materialName = object.material || 'default';
    let color = '#3399ff';
    if (materials && typeof materials === 'object' && materials[materialName]) {
      const c = materials[materialName].color;
      if (typeof c === 'string') {
        color = c;
      } else if (Array.isArray(c)) {
        const [r, g, b] = c;
        color = '#' + new THREE.Color(r, g, b).getHexString();
      }
    }
    if (isSelected) color = '#ff9900';

    return new THREE.MeshStandardMaterial({
      color,
      opacity: 0.8,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, [isSelected, object.material, materials, object.name]);

  // Compute the boolean geometry whenever the component set or its definitions change.
  // computeBooleanGeometry is async (lazily inits the WASM module on first call).
  useEffect(() => {
    let cancelled = false;
    let producedGeom = null;

    if (componentVolumes.length === 0) {
      setResultGeometry(prev => {
        if (prev) prev.dispose();
        return null;
      });
      return;
    }

    (async () => {
      try {
        const geom = await computeBooleanGeometry(componentVolumes);
        if (cancelled) {
          geom?.dispose();
          return;
        }
        producedGeom = geom;
        setResultGeometry(prev => {
          if (prev && prev !== geom) prev.dispose();
          return geom;
        });
      } catch (err) {
        console.error(`UnionObject ${object.name}: CSG failed:`, err);
      }
    })();

    return () => {
      cancelled = true;
      producedGeom?.dispose();
    };
  }, [componentVolumes, object.name]);

  // Free GPU material on unmount or replacement
  useEffect(() => () => { unionMaterial.dispose(); }, [unionMaterial]);

  return (
    <group
      ref={groupRef}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick();
      }}
    >
      {resultGeometry && (
        <mesh
          geometry={resultGeometry}
          material={unionMaterial}
          onClick={(e) => {
            e.stopPropagation();
            onClick && onClick();
          }}
        />
      )}
    </group>
  );
});

export default UnionObject;
