# Geant4 Geometry Editor — Design Specification

## Goal

Refactor the editor so that the **JSON geometry format is the internal data structure** (source of truth). The current flat volume array becomes a **derived view** computed on demand for rendering and tree display. This eliminates the fragile bidirectional conversion (`jsonToGeometry` ↔ `geometryToJson`).

**Constraint**: The JSON format must remain compatible with `GeometryParser.cc` — no changes to the simulation's parser.

---

## 1. JSON Data Structure (unchanged)

The JSON format stays as-is. It is already consumed by `GeometryParser.cc` and produced by the Python converter (`mc-master/converter`).

### Top-level structure

```json
{
  "world": { ... },
  "volumes": [ ... ],
  "materials": { ... }
}
```

### Volume types

Every volume has the same base fields:

```json
{
  "name": "Water",
  "g4name": "Water_Tube",
  "type": "<type>",
  "material": "G4_WATER",
  "dimensions": { ... },
  "placements": [ ... ],
  "visible": true,
  "_displayGroup": "Water Tank"
}
```

**Supported types** (matching `GeometryParser.cc`):

| Type | Dimensions |
|------|-----------|
| `box` | `x, y, z` (half-lengths in mm) |
| `cylinder` / `tube` | `radius, height` (optionally `innerRadius`) |
| `sphere` | `radius` (optionally `innerRadius`, `startPhi`, `deltaPhi`, `startTheta`, `deltaTheta`) |
| `cone` | `rmin1, rmax1, rmin2, rmax2, height` |
| `torus` | `rmin, rmax, rtor` (optionally `startPhi`, `deltaPhi`) |
| `trapezoid` / `trd` | `x1, x2, y1, y2, z` |
| `polycone` | `startPhi, deltaPhi, zPlanes[]` (each with `z, rmin, rmax`) |
| `ellipsoid` | `xSemiAxis, ySemiAxis, zSemiAxis` |
| `orb` | `radius` |
| `elliptical_tube` | `dx, dy, dz` |
| `polyhedra` | `startPhi, deltaPhi, numSides, zPlanes[]` |

### Placements

Each volume has an array of placements. One definition, N placements — this is how Geant4 works (one `G4LogicalVolume`, multiple `G4PVPlacement`).

```json
"placements": [
  {
    "name": "FloorLeg_1",
    "g4name": "support_leg1floor",
    "x": 2250, "y": 2250, "z": -2921.5,
    "rotation": { "x": 0, "y": 0, "z": 0 },
    "parent": "Water"
  },
  {
    "name": "FloorLeg_2",
    "g4name": "support_leg2floor",
    "x": -2250, "y": 2250, "z": -2921.5,
    "rotation": { "x": 0, "y": 0, "z": 0 },
    "parent": "Water"
  }
]
```

All placements of the same volume share the same shape, material, and dimensions. Only position, rotation, name, and parent differ.

### Boolean solids (subtraction, union, intersection)

Boolean volumes have `components` instead of `dimensions`. The first component is the base shape; subsequent components have a `boolean_operation` field:

```json
{
  "name": "FloorLeg_1",
  "type": "subtraction",
  "material": "SS304LSteel",
  "components": [
    {
      "name": "FloorLeg_1_outer",
      "type": "box",
      "dimensions": { "x": 150, "y": 150, "z": 3165 },
      "placements": [{ "x": 0, "y": 0, "z": 0, "rotation": { "x": 0, "y": 0, "z": 0 } }]
    },
    {
      "name": "FloorLeg_1_inner",
      "type": "box",
      "boolean_operation": "subtract",
      "dimensions": { "x": 138, "y": 138, "z": 3165 },
      "placements": [{ "x": 0, "y": 0, "z": 0, "rotation": { "x": 0, "y": 0, "z": 0 } }]
    }
  ],
  "placements": [
    { "name": "FloorLeg_1", "x": 2250, "y": 2250, "z": -2921.5, "parent": "Water" }
  ]
}
```

### Assemblies

Assemblies group multiple volumes into a reusable unit. Components are placed relative to the assembly origin:

```json
{
  "name": "TopPMTArray",
  "type": "assembly",
  "material": "GXe",
  "components": [
    {
      "name": "PMTBody",
      "type": "cylinder",
      "material": "Kovar",
      "dimensions": { "radius": 38.1, "height": 30 },
      "placements": [{ "x": 0, "y": 0, "z": 0, "parent": "" }]
    }
  ],
  "placements": [
    { "name": "TopPMT_0", "x": 0, "y": 0, "z": 13.985, "parent": "GXeVolume" },
    { "name": "TopPMT_1", "x": 76.2, "y": 0, "z": 13.985, "parent": "GXeVolume" }
  ]
}
```

### Materials

```json
"materials": {
  "LXe": {
    "name": "LXe",
    "type": "element_based",
    "density": 2.862,
    "elements": [{ "symbol": "Xe", "fraction": 1.0 }]
  },
  "SS304LSteel": {
    "name": "SS304LSteel",
    "type": "compound",
    "density": 7.99,
    "elements": [
      { "symbol": "Fe", "fraction": 0.68 },
      { "symbol": "Cr", "fraction": 0.19 }
    ]
  }
}
```

### Editor-only fields

These fields are used by the editor UI and ignored by `GeometryParser.cc`:

| Field | Purpose |
|-------|---------|
| `_displayGroup` | Display folder in the tree (e.g. `"Support Structure"`) |
| `visible` | Whether to show in 3D view |
| `wireframe` | Render as wireframe |
| `hitsCollectionName` | Sensitive detector hits collection |

---

## 2. Editor Architecture

### Current (flat, bidirectional)

```
JSON → jsonToGeometry() → flat volumes[] → geometryToJson() → JSON
                               ↑ edits
```

Problem: the inverse mapping (`geometryToJson`) must reconstruct compound structure from metadata (`_compoundId`, `_componentId`, `_boolean_parent`). This is fragile and breaks for each new type.

### New (JSON-primary)

```
JSON (state) ← edits (mutations)
     ↓
derived flat view (computed, read-only) → 3D rendering + tree display
```

- **JSON is React state** — stored in `useAppState`, distributed via context
- **Flat view is `useMemo`** — expanded from JSON on every state change
- **Edits mutate JSON** — via a mutation API (see §3)
- **Save = serialize JSON** — no conversion needed
- **Load = set JSON as state** — `jsonToGeometry` disappears
- **`geometryToJson` disappears entirely**

### Derived flat view

The flat view is what rendering and the tree need: one entry per physical placement with world-resolved properties.

```js
// Computed from JSON via useMemo
const flatVolumes = useMemo(() => expandToFlat(jsonState), [jsonState]);
```

Each flat entry:

```js
{
  volumeIndex: 3,          // index in json.volumes[]
  placementIndex: 0,       // index in volume.placements[]
  id: "vol-3-pl-0",        // stable identifier
  name: "FloorLeg_1",      // placement name
  g4name: "support_leg1floor",
  type: "subtraction",
  material: "SS304LSteel",
  position: { x: 2250, y: 2250, z: -2921.5 },
  rotation: { x: 0, y: 0, z: 0 },
  parent: "Water",
  visible: true,
  _displayGroup: "Support Structure",
  // Back-reference to the source definition
  volumeDef: <reference to json.volumes[3]>
}
```

### Selection key

Currently: `volume-${arrayIndex}` (fragile, changes when array is modified).

New: `vol-${volumeIndex}-pl-${placementIndex}` — stable as long as the volume isn't deleted.

---

## 3. Mutation API

All edits go through a central mutation layer that operates on the JSON tree:

```js
// Volume-level mutations
addVolume(volumeDef)                          // append to volumes[]
removeVolume(volumeIndex)                     // splice from volumes[]
updateVolume(volumeIndex, patch)              // merge into volume definition

// Placement mutations
addPlacement(volumeIndex, placement)          // append to placements[]
removePlacement(volumeIndex, placementIndex)  // splice from placements[]
updatePlacement(volumeIndex, placementIndex, patch)  // merge into placement

// Component mutations (for boolean/assembly)
addComponent(volumeIndex, component)
removeComponent(volumeIndex, componentIndex)
updateComponent(volumeIndex, componentIndex, patch)

// Convenience
duplicateVolume(volumeIndex)                  // deep copy with new name
duplicatePlacement(volumeIndex, placementIndex) // add placement with offset
```

Each mutation returns a new JSON state (immutable updates for React):

```js
function updatePlacement(json, volumeIndex, placementIndex, patch) {
  const newJson = structuredClone(json);
  Object.assign(newJson.volumes[volumeIndex].placements[placementIndex], patch);
  return newJson;
}
```

---

## 4. Editor Functionality

### Tree view

The tree shows the parent-child hierarchy from the flat view:

```
World
├── 📁 Water Tank
│   ├── WaterTank
│   ├── Water
│   ├── WaterCone
│   └── AirCone
├── 📁 Support Structure
│   ├── FloorLeg_1         (placement 0 of FloorLeg)
│   │   └── FloorLeg_1_air
│   ├── FloorLeg_2         (placement 1 of FloorLeg)
│   │   └── FloorLeg_2_air
│   └── ...
├── 📁 PMTs
│   ├── TopPMT_0            (placement 0 of TopPMTArray)
│   ├── TopPMT_1            (placement 1 of TopPMTArray)
│   └── ...
```

- **Display group folders** are virtual — driven by `_displayGroup` on the volume definition, shown only at the highest parent level.
- **Selecting a placement** opens the property editor with the volume definition (shared) and placement-specific fields (position, rotation, parent).
- **Editing a shared property** (dimensions, material) updates all placements of that volume. This is the "linked" behavior.

### Property editor

When a placement is selected, the property panel shows two sections:

1. **Volume definition** (shared across all placements):
   - Name, type, material, dimensions
   - Editing these affects all placements

2. **Placement** (specific to this instance):
   - Position, rotation, parent volume
   - Editing these affects only this placement

### 3D view

- Renders one mesh per flat view entry
- Transform gizmo edits `updatePlacement(vi, pi, { x, y, z })`
- Visibility toggle edits `updateVolume(vi, { visible: false })`

### Import / export

- **Load JSON**: `setJsonState(parsed)` — done
- **Save JSON**: `JSON.stringify(jsonState)` — done
- **Import object**: append to `volumes[]` (supports assembly, boolean, simple)
- **Save object**: extract a volume definition (with components) as a standalone JSON

### Object library

A saved object is just a JSON volume definition. Importing it:

```js
addVolume(objectDef)  // adds the definition with 0 placements
addPlacement(newIndex, { name: "MyObj_1", x: 0, y: 0, z: 0, parent: "World" })
```

Importing the same object 3 times = 1 entry in `volumes[]` with 3 entries in `placements[]`. Editing the shape updates all 3.

---

## 5. Geant4 Mapping

The JSON maps directly to Geant4 constructs:

| JSON | Geant4 |
|------|--------|
| Volume definition | `G4LogicalVolume` (solid + material) |
| Placement entry | `G4PVPlacement` (position + rotation + parent) |
| Assembly | `G4AssemblyVolume` + `MakeImprint()` per placement |
| Boolean components | `G4UnionSolid` / `G4SubtractionSolid` / `G4IntersectionSolid` |
| Material (nist) | `G4NistManager::FindOrBuildMaterial()` |
| Material (compound) | `new G4Material()` with element fractions |

`GeometryParser.cc` already reads this format directly — no changes needed.

---

## 6. Migration Plan

### Phase 1: JSON as state, flat as derived view

- Change `useAppState.js` to store JSON as primary state
- Add `expandToFlat(json)` to derive the flat volume array via `useMemo`
- All existing components keep reading `geometries.volumes` from the flat view
- Import path: `setJsonState(loadedJson)` instead of `jsonToGeometry()`
- Export path: `JSON.stringify(jsonState)` instead of `generateJson()`
- **Result**: save-load is lossless, no conversion bugs, all UI keeps working

### Phase 2: Mutation API

- Implement the mutation functions (`updateVolume`, `updatePlacement`, etc.)
- Migrate edit paths one by one: property editor, transforms, add/remove
- Replace `onUpdateGeometry(key, updatedObj)` with specific mutation calls
- **Result**: edits go through JSON, flat view auto-updates

### Phase 3: Stable selection keys

- Replace `volume-${index}` with `vol-${vi}-pl-${pi}` identifiers
- Update all components that handle selection
- **Result**: selection is stable across edits

### Phase 4: Tree reads JSON directly (optional)

- GeometryTree builds its hierarchy from JSON instead of flat view
- Scene.jsx reads placement data from JSON
- **Result**: removes the flat view dependency, cleaner architecture

Each phase is independently deployable and testable. Phase 1 alone eliminates the save-load fragility.
