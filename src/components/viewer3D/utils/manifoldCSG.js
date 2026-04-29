// manifoldCSG.js — boolean CSG via manifold-3d (WASM)
//
// Drops three-csg-ts entirely. Single generic path for any base + any
// combination of unions/subtractions. No shape-specific fallbacks.
//
// All transform composition happens on the THREE side first (geometry baked
// at the right pose), then geometry → manifold → boolean → geometry.

import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';

let _lib = null;
let _initPromise = null;

/**
 * Lazy-init the manifold-3d WASM module. Cached: subsequent calls are
 * a synchronous return of the same instance.
 */
export async function getManifoldLib() {
  if (_lib) return _lib;
  if (!_initPromise) {
    _initPromise = (async () => {
      const lib = await Module({ locateFile: () => wasmUrl });
      lib.setup();
      _lib = lib;
      return lib;
    })();
  }
  return _initPromise;
}

/**
 * Build a transformed THREE.BufferGeometry for a boolean component.
 * Position + rotation (radians, XYZ Euler) are baked into the geometry so
 * the resulting manifold sits at the right pose in compound-local space.
 */
function buildComponentGeometry(component) {
  const geom = createGeometryForComponent(component);
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(
      component.position?.x || 0,
      component.position?.y || 0,
      component.position?.z || 0
    ),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(
      component.rotation?.x || 0,
      component.rotation?.y || 0,
      component.rotation?.z || 0,
      'XYZ'
    )),
    new THREE.Vector3(1, 1, 1)
  );
  geom.applyMatrix4(matrix);
  return geom;
}

/**
 * Create a primitive THREE.BufferGeometry for a single boolean component.
 * Mirrors the cases supported elsewhere in the editor.
 */
function createGeometryForComponent(solid) {
  if (!solid || !solid.type) return new THREE.BoxGeometry(1, 1, 1);
  switch (solid.type) {
    case 'box':
      return new THREE.BoxGeometry(
        solid.size?.x || 1,
        solid.size?.y || 1,
        solid.size?.z || 1
      );
    case 'sphere':
      return new THREE.SphereGeometry(solid.radius || 1, 32, 16);
    case 'cylinder':
    case 'tube':
    case 'tubs': {
      const g = new THREE.CylinderGeometry(
        solid.radius || 1,
        solid.radius || 1,
        solid.height || solid.z || 1,
        32
      );
      g.rotateX(Math.PI / 2);
      return g;
    }
    case 'trapezoid':
    case 'trd':
      return new THREE.BoxGeometry(
        (solid.dx1 || solid.x1 || 1) + (solid.dx2 || solid.x2 || 1),
        (solid.dy1 || solid.y1 || 1) + (solid.dy2 || solid.y2 || 1),
        solid.dz || solid.height || 1
      );
    case 'torus':
      return new THREE.TorusGeometry(
        solid.majorRadius || solid.torus_radius || 5,
        solid.minorRadius || solid.tube_radius || 1,
        16,
        32
      );
    case 'ellipsoid': {
      const s = new THREE.SphereGeometry(1, 32, 16);
      s.scale(
        solid.xRadius || solid.ax || 1,
        solid.yRadius || solid.by || 1,
        solid.zRadius || solid.cz || 1
      );
      return s;
    }
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

/**
 * Convert a THREE.BufferGeometry into a Manifold. The geometry is welded
 * by mergeVertices() so adjacent triangles share vertex indices, which is
 * required for manifold-3d to recognise it as a 2-manifold solid.
 */
function geometryToManifold(geom, lib) {
  const merged = mergeVertices(geom.clone(), 1e-5);
  const positions = merged.attributes.position.array;
  const indices = merged.index ? merged.index.array : null;

  const vertProperties = positions instanceof Float32Array
    ? positions
    : new Float32Array(positions);

  let triVerts;
  if (indices) {
    triVerts = indices instanceof Uint32Array ? indices : new Uint32Array(indices);
  } else {
    const n = positions.length / 3;
    triVerts = new Uint32Array(n);
    for (let i = 0; i < n; i++) triVerts[i] = i;
  }

  const meshIn = new lib.Mesh({ numProp: 3, vertProperties, triVerts });
  meshIn.merge();
  const manifold = new lib.Manifold(meshIn);
  merged.dispose();
  return manifold;
}

/**
 * Convert a Manifold into a THREE.BufferGeometry ready for rendering.
 * Recomputes vertex normals so MeshStandardMaterial shades correctly.
 */
function manifoldToGeometry(manifold) {
  const mesh = manifold.getMesh();
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(mesh.vertProperties), 3)
  );
  geom.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.triVerts), 1));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Compute the boolean result for an array of component definitions.
 * Returns a THREE.BufferGeometry, or null if there are no usable components.
 *
 * componentVolumes: [{ type, position, rotation, boolean_operation, ... }]
 *   boolean_operation === 'subtract' → subtractor; anything else (incl.
 *   'union' or undefined) → unioner.
 */
export async function computeBooleanGeometry(componentVolumes) {
  if (!componentVolumes || componentVolumes.length === 0) return null;

  const lib = await getManifoldLib();
  const { Manifold } = lib;

  const unioners = [];
  const subtractors = [];
  const builtGeoms = [];

  try {
    for (const comp of componentVolumes) {
      const geom = buildComponentGeometry(comp);
      builtGeoms.push(geom);
      const m = geometryToManifold(geom, lib);
      if (comp.boolean_operation === 'subtract') subtractors.push(m);
      else unioners.push(m);
    }

    if (unioners.length === 0) return null;

    let result = unioners.length === 1 ? unioners[0] : Manifold.union(unioners);
    if (unioners.length > 1) unioners.forEach(m => m.delete());

    if (subtractors.length > 0) {
      const subAggregate = subtractors.length === 1
        ? subtractors[0]
        : Manifold.union(subtractors);
      if (subtractors.length > 1) subtractors.forEach(m => m.delete());
      const next = Manifold.difference(result, subAggregate);
      result.delete();
      subAggregate.delete();
      result = next;
    }

    const out = manifoldToGeometry(result);
    result.delete();
    return out;
  } finally {
    builtGeoms.forEach(g => g.dispose());
  }
}
