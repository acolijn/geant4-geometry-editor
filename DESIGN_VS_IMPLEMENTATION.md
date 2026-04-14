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
| Phase 3: Stable selection keys | ❌ Not started |
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
| `addPlacement(volumeIndex, placement)` | Not implemented separately | ❌ Missing |
| `removePlacement(volumeIndex, placementIndex)` | Handled inside `applyRemoveFromJson` (multi-placement branch) | ✅ Inline |
| `updatePlacement(volumeIndex, placementIndex, patch)` | Handled inside `applyUpdateToJson` | ✅ Inline |
| `addComponent(volumeIndex, component)` | Handled inside `applyAddToJson` (auto-detects compound parent) | ✅ Inline |
| `removeComponent(volumeIndex, componentIndex)` | Handled inside `applyRemoveFromJson` (`_componentIndex` branch) | ✅ Inline |
| `updateComponent(volumeIndex, componentIndex, patch)` | Handled inside `applyUpdateToJson` (`ci` branch) | ✅ Inline |
| `duplicateVolume(volumeIndex)` | Not implemented | ❌ Missing |
| `duplicatePlacement(volumeIndex, placementIndex)` | Not implemented | ❌ Missing |

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
| Flat entry has `id: "vol-3-pl-0"` | Stable composite key | Not implemented — uses array index | ❌ |
| Selection key: `vol-${vi}-pl-${pi}` | Stable across edits | `volume-${arrayIndex}` (fragile) | ❌ |
| Flat entry has `volumeDef` reference | Direct ref to JSON | Not implemented — uses index lookup | ❌ |
| Additional flat fields: `_compoundId`, `_componentId`, `_instanceId`, `_componentIndex` | Not in spec | Implemented for compound tracking | ⚠️ Extra |

**Verdict: Selection key is the biggest unimplemented design item. The current `volume-${index}` key shifts when volumes are added/removed, which can cause selection jumps. The existing workaround (re-selecting by name after mutations) mitigates this but doesn't fully solve it.**

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
| Automatic placement detection | Spec'd in detail | Not implemented | ❌ |
| Object library import merges matching defs | Adds new placements to existing | `mergeJsonVolumes()` merges compound placements | ✅ |

### Automatic Placement Detection

DESIGN.md describes a feature where importing a volume that already exists (same type, dimensions, material, components, `_displayGroup`) should prompt the user to add as a new placement instead of creating a duplicate definition. This is **not implemented**. Currently, importing always creates a new volume or merges at the compound level.

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
| `src/components/json-viewer/utils/jsonToGeometry.js` | Vestigial | Used only for import path; could be replaced by direct JSON + expandToFlat |
| `src/components/json-viewer/utils/geometryToJson.js` | Vestigial | Used for export; could be replaced by direct jsonData serialization |
| `src/components/geometry-editor/utils/compoundIdPropagator.js` | Vestigial | Logic moved to useAppState; may still be imported |
| `src/components/geometry-editor/utils/GeometryUtils.js` | Partially vestigial | Some utilities may no longer be needed |

---

## 10. Summary: What Remains

### High Value / Design Spec Items

| Item | Priority | Effort |
|---|---|---|
| **Stable selection keys** (`vol-${vi}-pl-${pi}`) | High | Medium — requires updating all selection consumers |
| **Automatic placement detection** on import | Medium | Medium — matching logic + UI prompt |
| **`addPlacement` API** (add placement to existing volume) | Medium | Low — straightforward JSON splice |
| **`duplicateVolume` / `duplicatePlacement`** | Low | Low |

### Cleanup Items

| Item | Priority | Effort |
|---|---|---|
| Remove `jsonToGeometry.js` / `geometryToJson.js` from import/export paths | Low | Medium — need to rewire import/export flows |
| Remove `compoundIdPropagator.js` if fully dead | Low | Low |
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
