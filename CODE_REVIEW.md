# Code Review Report — geant4-geometry-editor frontend

**Date:** 2026-04-16  
**Scope:** `src/` (excluding `tools/`)  
**Overall Health:** 6 / 10

The architecture is well-designed — JSON as canonical state with pure `jsonOperations.js` functions, stable `_id` keys, and a clean `useMemo`-derived flat view are all solid choices. Three real bugs are present, and there are several additional memory management issues.

---

## Critical Issues

### C1 — Three.js memory leak in UnionObject.jsx

**File:** `src/components/viewer3D/components/UnionObject.jsx`

The `componentMeshes` useMemo creates one `THREE.Geometry` per component on every re-computation. The CSG `useEffect` replaces `unionMesh` state with a new result mesh but never disposes the previous one. Neither the per-component geometries nor the accumulated CSG result geometries are disposed on unmount.

**Impact:** Every re-selection or data change leaks GPU-side geometry buffers without bound.

**Fix:**
```js
useEffect(() => {
  let resultMesh = null;
  // ... existing CSG logic, assign to resultMesh ...
  setUnionMesh(prev => {
    if (prev) prev.geometry?.dispose();  // material is shared — don't dispose it
    return resultMesh;
  });
  return () => { resultMesh?.geometry?.dispose(); };
}, [componentMeshes, unionMaterial]);

// Separate unmount cleanup for componentMeshes:
useEffect(() => {
  return () => { componentMeshes.forEach(m => m.geometry?.dispose()); };
}, [componentMeshes]);
```

---

### C2 — g4name rename bug in applyDuplicateVolumeToJson

**File:** `src/utils/jsonOperations.js`, line 892

```js
if (pl.g4name === pl.name) pl.g4name = newPlName;  // BUG: pl.name already overwritten
```

By line 891, `pl.name` has already been set to `newPlName`. The comparison `pl.g4name === pl.name` compares the already-updated name to itself — always false. Component placement `g4name` fields are never updated, leaving them pointing at the old volume name.

**Fix:**
```js
const oldPlName = pl.name;
const newPlName = pl.name.replace(oldName, newName);
if (newPlName !== oldPlName) {
  nameMap.set(oldPlName, newPlName);
  pl.name = newPlName;
  if (pl.g4name === oldPlName) pl.g4name = newPlName;  // compare to OLD name
}
```

---

### C3 — Assembly world-position matrix composition error

**File:** `src/components/viewer3D/utils/geometryUtils.js`, lines 128-129 and 231-232

```js
assemblyMatrix.setPosition(new THREE.Vector3(...));
assemblyMatrix.multiply(rotMatrix);  // BUG: multiply rotates the translation column too
```

`Matrix4.setPosition` + `.multiply(rotMatrix)` computes `Identity-with-translation * rotMatrix`, which incorrectly rotates the translation column. Should use `compose()`.

Note: `worldToLocalCoordinates` (line 344) already uses `compose()` correctly.

**Fix (both occurrences):**
```js
const assemblyMatrix = new THREE.Matrix4().compose(
  new THREE.Vector3(assemblyPos[0], assemblyPos[1], assemblyPos[2]),
  new THREE.Quaternion().setFromEuler(
    new THREE.Euler(assemblyRot[0], assemblyRot[1], assemblyRot[2], 'XYZ')
  ),
  new THREE.Vector3(1, 1, 1)
);
```

---

## Warnings

**W1 — CylinderObject.jsx:** `createCylinderGeometry()` called twice per render, never disposed. No `useMemo`/`useEffect` cleanup point.

**W2 — AssemblyObject.jsx line 225:** `EdgesGeometry` and underlying geometries created in `useMemo` are never disposed when `descendants` or `materials` changes.

**W3 — Scene.jsx lines 29-63:** `volumeNameToIndex` and `volumesByParent` rebuilt unconditionally on every render. Should be `useMemo`-ized on `geometries.volumes`.

**W4 — useAppState.js:** `handleReplaceJsonVolumes` computes `existingNames` once from initial state; if two incoming volumes share a name they are processed inconsistently.

**W5 — BoxObject.jsx line 57:** `new THREE.BoxGeometry(...)` created inline in JSX (every render), never disposed.

---

## Suggestions

- `UnionObject.jsx`: `getUnionColor` is redefined on every render and called inside a `useMemo` with a suppressed eslint-deps warning. Inline the logic directly into the `useMemo`.
- `geometryUtils.js` lines 137-187: two structurally identical code paths for assembly vs. non-assembly parent can be collapsed.
- `useAppState.js` line 19: `cloneData` alias for `structuredClone` adds indirection without value.
- `mergeJsonVolumes` (jsonOperations.js line 980): duplicate detection ignores rotation — two placements at the same position with different rotations are considered duplicates.

---

## Positives

- JSON-primary state architecture with `expandToFlat` as a pure `useMemo` is well-executed.
- `applyDuplicateVolumeToJson` compound-rename two-pass `nameMap` logic is thorough (modulo C2).
- `calculateWorldPosition` circular-reference detection using per-branch `Set` is correct.
- `worldToLocalCoordinates` uses `Matrix4.compose()` correctly — the fix for C3 follows the existing pattern in the same file.
- Error boundaries around the Canvas are a good production-readiness call.
- `pendingSelectionRef` pattern for post-mutation selection avoids stale-closure issues cleanly.
