# DESIGN.md vs. Current Implementation — Gap Analysis

*Generated: 2026-04-14*

This report compares the vision in `DESIGN.md` against the actual codebase to identify what has been implemented, what differs, and what remains.

---

## Executive Summary

The core goal — **JSON as the internal data structure** — is fully achieved. The fragile bidirectional conversion (`jsonToGeometry ↔ geometryToJson`) has been eliminated. All mutations flow through JSON, and the flat view is derived read-only. Several design details were implemented differently than spec'd, mostly as practical simplifications.

| Design Phase | Status |
|---|---|
| Phase 1: JSON as state, flat as derived view | ✅ Complete |
| Phase 2: Mutation API | ✅ Complete (different shape than spec) |
| Phase 3: Stable selection keys | ✅ Complete |
| Phase 4: Tree reads JSON directly | ❌ Not started |

---

## 1. JSON Data Structure

| Aspect | DESIGN.md | Implementation | Match |
|---|---|---|---|
| Top-level structure `{ world, volumes, materials }` | ✅ | ✅ | ✅ |
| Volume types (box, cylinder, sphere, cone, torus, trd, polycone, ellipsoid, orb, elliptical_tube, polyhedra) | ✅ | ✅ | ✅ |
| Placements array (one definition, N placements) | ✅ | ✅ | ✅ |
| Boolean solids with `components[]` | ✅ | ✅ | ✅ |
| Assemblies with `components[]` + `placements[]` | ✅ | ✅ | ✅ |
| Editor-only fields (`_displayGroup`, `visible`, `wireframe`, `hitsCollectionName`) | ✅ | ✅ | ✅ |
| Materials structure | ✅ | ✅ | ✅ |

**Verdict: JSON structure matches spec exactly.**

---

## 2. Architecture

### Source of Truth

| DESIGN.md | Implementation | Match |
|---|---|---|
| JSON is React state, stored in `useAppState` | `jsonData` in useAppState via `useState` | ✅ |
| Flat view computed via `useMemo` | Flat view derived via `reDeriveFlat()` on every mutation | ⚠️ Different |
| `jsonToGeometry` disappears | Still exists in `jsonToGeometry.js` (used for import path) | ⚠️ Partial |
| `geometryToJson` disappears entirely | `generateJson` still exists in `geometryToJson.js` (used for export) | ⚠️ Partial |

### Details on deviations:

**Flat view derivation**: DESIGN.md specifies `useMemo(() => expandToFlat(jsonState), [jsonState])`. The implementation uses `reDeriveFlat(newJson)` which is called imperatively after each mutation. Functionally equivalent — the flat view is always re-derived from JSON — but the mechanism is imperative rather than declarative.

**Legacy conversion functions**: `jsonToGeometry.js` and `geometryToJson.js` still exist and are used:
- `jsonToGeometry()` — used during JSON import to create the initial flat geometry set
- `generateJson()` — used during JSON export/save to produce the output JSON

These are vestigial. The primary data flow no longer depends on them for internal state, but they're still in the import/export pipeline. They could be replaced by direct JSON manipulation + `expandToFlat()`.

### Data Flow

| Operation | DESIGN.md | Implementation | Match |
|---|---|---|---|
| Edit → mutate JSON → flat auto-updates | ✅ | `applyXxxToJson()` → `reDeriveFlat()` | ✅ |
| Save = serialize JSON | ✅ | Project save serializes `jsonData` directly | ✅ |
| Load = set JSON as state | ✅ | `handleLoadProject()` calls `reDeriveFlat(loaded)` | ✅ |
| No flat → JSON reverse path | ✅ | `reDeriveFlat` is one-way | ✅ |
| Lazy init from flat if JSON null | Not mentioned | `getOrInitJson()` seeds JSON from flat | ⚠️ Extra |

**Verdict: Core architecture matches. Derivation is imperative instead of declarative. Legacy converters still present but not on the critical path.**

---

## 3. Mutation API

DESIGN.md specified fine-grained, separated mutation functions:

| DESIGN.md Function | Implementation | Match |
|---|---|---|
| `addVolume(volumeDef)` | `applyAddToJson(json, flatNewVolume)` | ✅ Combined |
| `removeVolume(volumeIndex)` | `applyRemoveFromJson(json, flatVolumes, flatIndex)` | ✅ Combined |
| `updateVolume(volumeIndex, patch)` | `applyUpdateToJson(json, flatVolumes, flatIndex, patch)` | ✅ Combined |
| `addPlacement(volumeIndex, placement)` | `applyAddPlacementToJson` in jsonOperations + context menu | ✅ |
| `removePlacement(volumeIndex, placementIndex)` | Handled inside `applyRemoveFromJson` (multi-placement branch) | ✅ Inline |
| `updatePlacement(volumeIndex, placementIndex, patch)` | Handled inside `applyUpdateToJson` | ✅ Inline |
| `addComponent(volumeIndex, component)` | Handled inside `applyAddToJson` (auto-detects compound parent) | ✅ Inline |
| `removeComponent(volumeIndex, componentIndex)` | Handled inside `applyRemoveFromJson` (`_componentIndex` branch) | ✅ Inline |
| `updateComponent(volumeIndex, componentIndex, patch)` | Handled inside `applyUpdateToJson` (`ci` branch) | ✅ Inline |
| `duplicateVolume(volumeIndex)` | Not implemented | ❌ Missing |
| `duplicatePlacement(volumeIndex, placementIndex)` | Via `applyAddPlacementToJson` (copies + offsets) | ✅ |

### Key differences:

The design envisioned **12 separate mutation functions** with clean signatures indexed by `volumeIndex` and `placementIndex`. The implementation uses **3 combined functions** (`applyAddToJson`, `applyUpdateToJson`, `applyRemoveFromJson`) that accept a flat volume index and internally resolve to the correct JSON target (volume vs. placement vs. component).

**Trade-offs:**
- ✅ Fewer functions to maintain
- ✅ The flat→JSON mapping logic is centralized
- ❌ Function signatures are less clean (require flat volumes array as parameter)
- ❌ `addPlacement` has no direct API — adding a placement of an existing volume requires going through the geometry add flow

---

## 4. Flat View / Selection Keys

| Aspect | DESIGN.md | Implementation | Match |
|---|---|---|---|
| Flat entry has `volumeIndex`, `placementIndex` | ✅ | `_volumeIndex`, `_placementIndex` (prefixed) | ✅ |
| Flat entry has `id: "vol-3-pl-0"` | Stable composite key | `_id: buildVolumeKey(vi, pi)` in expandToFlat | ✅ |
| Selection key: `vol-${vi}-pl-${pi}` | Stable across edits | `buildVolumeKey()` + `isVolumeKey()` + `findFlatIndex()` | ✅ |
| Flat entry has `volumeDef` reference | Direct ref to JSON | Uses `_volumeIndex` back-reference (equivalent) | ✅ |
| Additional flat fields: `_compoundId`, `_componentId`, `_instanceId`, `_componentIndex` | Not in spec | Implemented for compound tracking | ⚠️ Extra |

**Verdict: Selection keys are fully implemented using `buildVolumeKey(vi, pi, ci, sci)` in expandToFlat.js. Keys are stable across edits — based on JSON array indices, not flat array position.**

---

## 5. Tree View

| Aspect | DESIGN.md | Implementation | Match |
|---|---|---|---|
| Tree follows `placement.parent` hierarchy | ✅ | ✅ via `getParentKey()` | ✅ |
| Display group folders as virtual nodes | ✅ | ✅ `_displayGroup` folders rendered | ✅ |
| Folders under parent volume (not global) | ✅ | ✅ Grouped by parent | ✅ |
| Selecting placement opens property editor | ✅ | ✅ | ✅ |
| Editing shared property updates all placements | ✅ | ✅ (via JSON mutation → re-derive) | ✅ |
| Tree reads from flat view | Phase 4: reads JSON directly | Still reads flat view | ✅ (Phase 4 not started) |

**Verdict: Tree view matches spec.**

---

## 6. Property Editor

| DESIGN.md | Implementation | Match |
|---|---|---|
| Volume definition section (shared) | ✅ name, type, material, dimensions | ✅ |
| Placement section (instance-specific) | ✅ position, rotation, parent | ✅ |
| Editing shared property affects all placements | ✅ | ✅ |
| Editing placement affects only this instance | ✅ | ✅ |

**Verdict: Matches spec.**

---

## 7. Import / Export / Object Library

| Aspect | DESIGN.md | Implementation | Match |
|---|---|---|---|
| Load JSON: `setJsonState(parsed)` | ✅ | `handleLoadProject()` | ✅ |
| Save JSON: `JSON.stringify(jsonState)` | ✅ | Project save from jsonData | ✅ |
| Import object: append to volumes | ✅ | `handleAppendJsonVolumes()` + `mergeJsonVolumes()` | ✅ |
| Save object: extract subtree | ✅ | `extractSubtreeFromJson()` | ✅ |
| Automatic placement detection | Spec'd in detail | `findMatchingVolume()` + auto-merge in `handleAppendJsonVolumes` | ✅ |
| Object library import merges matching defs | Adds new placements to existing | `mergeJsonVolumes()` merges compound placements | ✅ |

### Automatic Placement Detection

Implemented via `findMatchingVolume()` in jsonOperations.js and auto-merge logic in `handleAppendJsonVolumes`. When importing a volume that matches an existing definition (same type, dimensions, material, components, `_displayGroup`), its placements are automatically added to the matching volume instead of creating a duplicate definition.

---

## 8. 3D View

| Aspect | DESIGN.md | Implementation | Match |
|---|---|---|---|
| One mesh per flat entry | ✅ | ✅ | ✅ |
| Transform gizmo → `updatePlacement` | ✅ | Calls `onUpdateGeometry` which maps to `applyUpdateToJson` | ✅ |
| Visibility toggle → `updateVolume` | ✅ | `handleBatchSetVisibility()` | ✅ |

**Verdict: Matches spec.**

---

## 9. Dead / Vestigial Code

The following items from the old architecture are still present:

| File | Status | Notes |
|---|---|---|
| `src/components/json-viewer/utils/jsonToGeometry.js` | Vestigial | No longer imported by production code; used only in legacy tests |
| `src/components/json-viewer/utils/geometryToJson.js` | Vestigial | No longer imported by production code; used only in legacy tests |
| `src/components/geometry-editor/utils/compoundIdPropagator.js` | Active | Used by useAppState for compound ID propagation |
| `src/components/geometry-editor/utils/GeometryUtils.js` | Active | Duplicate `propagateCompoundIdToDescendants` removed; remaining functions in use |

---

## 10. Summary: What Remains

### High Value / Design Spec Items

| Item | Priority | Effort |
|---|---|---|
| **`duplicateVolume`** (deep copy with new name) | Low | Low |

### Cleanup Items

| Item | Priority | Effort |
|---|---|---|
| Remove `jsonToGeometry.js` / `geometryToJson.js` entirely (test-only) | Low | Medium — need to rewrite legacy tests |
| Switch flat derivation from imperative to `useMemo` | Low | Low — cosmetic |

---

## 11. Architecture Diagram (Current)

```
┌─────────────────────────────────────────────────────┐
│                   useAppState                        │
│                                                      │
│  jsonData (source of truth)                          │
│     │                                                │
│     ├── applyAddToJson()    ──┐                      │
│     ├── applyUpdateToJson() ──┼── reDeriveFlat() ──→ geometries (derived)
│     ├── applyRemoveFromJson()─┘        │                  │
│     │                          expandToFlat()             │
│     │                                                     │
│     └── refreshView() ── restructureCompounds()           │
│            + structuredClone + reDeriveFlat               │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  GeometryEditor          Viewer3D / Scene                 │
│  ├── PropertyEditor      ├── Canvas (Three.js)            │
│  └── AddNewTab           └── GeometryTree                 │
│                                                           │
│  Both read `geometries` (flat) for display                │
│  Both call mutation handlers for edits                    │
└───────────────────────────────────────────────────────────┘
```
