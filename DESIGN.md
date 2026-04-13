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

Assemblies group multiple volumes into a reusable unit. In Geant4, an assembly (`G4AssemblyVolume`) has no material or shape of its own — it is a collection of component volumes placed relative to the assembly origin. When placed, `MakeImprint()` creates physical copies of all components inside the parent volume.

**Key concepts:**
- `components[]` — the sub-volumes that make up the assembly (defined once)
- `placements[]` — where the assembly is stamped into the geometry (N times)
- Each placement creates a full copy of all components at that position
- Component positions are relative to the assembly origin
- The `material` field on the assembly is the default for components that don't specify their own

#### Real example: XENONnT PMT arrays

The XENONnT detector has 4 PMT assemblies. Here is the top PMT array (253 placements in the GXe volume):

```json
{
  "name": "TopPMTArray",
  "type": "assembly",
  "material": "GXe",
  "_displayGroup": "PMTs",
  "components": [
    {
      "name": "PMTBody_0",
      "type": "polycone",
      "material": "Kovar",
      "dimensions": { "startPhi": 0, "deltaPhi": 6.283, "zPlanes": [...] },
      "placements": [{ "x": 0, "y": 0, "z": 0, "rotation": { "x": 0, "y": 0, "z": 0 } }]
    },
    {
      "name": "PMTWindow_0",
      "type": "cylinder",
      "material": "Quartz",
      "dimensions": { "radius": 38.1, "height": 1.5 },
      "placements": [{ "x": 0, "y": 0, "z": 15.0, "rotation": { "x": 0, "y": 0, "z": 0 } }]
    },
    {
      "name": "PMTInnerVacuum_0",
      "type": "polycone",
      "material": "Vacuum",
      "dimensions": { ... },
      "placements": [{ "x": 0, "y": 0, "z": 0 }]
    },
    {
      "name": "PMTPhotocathode_0",
      "type": "cylinder",
      "material": "PhotoCathodeAluminium",
      "dimensions": { "radius": 38.0, "height": 0.05 },
      "placements": [{ "x": 0, "y": 0, "z": 14.0 }]
    },
    {
      "name": "PMTCeramic_0",
      "type": "cylinder",
      "material": "Ceramic",
      "dimensions": { "radius": 25.75, "height": 5.0 },
      "placements": [{ "x": 0, "y": 0, "z": -40.0 }]
    }
  ],
  "placements": [
    { "name": "TopPMT_0",   "x": 0,    "y": 0.0,   "z": 13.985, "parent": "GXeVolume" },
    { "name": "TopPMT_1",   "x": 76.2, "y": 0.0,   "z": 13.985, "parent": "GXeVolume" },
    { "name": "TopPMT_2",   "x": 38.1, "y": 65.99, "z": 13.985, "parent": "GXeVolume" },
    "... 250 more placements"
  ]
}
```

The bottom array is identical in structure but placed in `LXeVolume` (241 PMTs). The muon veto and neutron veto PMT arrays have 7 components each (different PMT model) and are placed in `Water`.

#### How placement works in Geant4

```
TopPMTArray (assembly definition — no physical shape)
  ├── PMTBody_0         (polycone, Kovar, at origin)
  ├── PMTWindow_0       (cylinder, Quartz, z=+15)
  ├── PMTInnerVacuum_0  (polycone, Vacuum)
  ├── PMTPhotocathode_0 (cylinder, PhotoCathodeAluminium, z=+14)
  └── PMTCeramic_0      (cylinder, Ceramic, z=-40)

placement[0]: stamp all 5 components at (0, 0, 13.985) inside GXeVolume → TopPMT_0
placement[1]: stamp all 5 components at (76.2, 0, 13.985) inside GXeVolume → TopPMT_1
... × 253
```

#### Creating a PMT and placing it multiple times (editor workflow)

1. **Define the assembly** — create a volume with `type: "assembly"`, add components with positions relative to origin
2. **Add placements** — each placement stamps all components into a parent volume
3. **Edit the definition** — changing a component (e.g. PMTBody radius) updates all 253 PMTs at once
4. **Add more placements** — `addPlacement(volumeIndex, { name: "TopPMT_253", x: ..., y: ..., z: ..., parent: "GXeVolume" })`

#### Can top and bottom PMTs be merged into one definition?

Yes. The `material` field on an assembly is **not used by Geant4** — `G4AssemblyVolume` has no material of its own. Looking at `GeometryParser.cc`, `CreateAssembly()` only calls `assembly->AddPlacedVolume()` for each component; the assembly material is ignored. The components (PMTBody=Kovar, PMTWindow=Quartz, etc.) carry their own materials.

Since TopPMTArray and BotPMTArray have **identical components** (same R11410 PMT model), they can be merged into a single volume definition with 494 placements:

```json
{
  "name": "R11410PMT",
  "type": "assembly",
  "_displayGroup": "PMTs",
  "components": [ /* 5 components, defined once */ ],
  "placements": [
    { "name": "TopPMT_0",   "x": 0,    "y": 0,    "z": 13.985,  "parent": "GXeVolume" },
    { "name": "TopPMT_1",   "x": 76.2, "y": 0,    "z": 13.985,  "parent": "GXeVolume" },
    "... 251 more in GXeVolume ...",
    { "name": "BotPMT_0",   "x": 0,    "y": 0,    "z": -938.3,  "parent": "LXeVolume" },
    { "name": "BotPMT_1",   "x": 76.2, "y": 0,    "z": -938.3,  "parent": "LXeVolume" },
    "... 239 more in LXeVolume ..."
  ]
}
```

The tree naturally splits them by parent volume — each gets its own display group folder:

```
├── LXeVolume
│   ├── GXeVolume
│   │   └── 📁 PMTs                    ← placements where parent=GXeVolume
│   │       ├── TopPMT_0..252
│   └── 📁 PMTs                        ← placements where parent=LXeVolume
│       └── BotPMT_0..240
```

This works because display group folders are per-parent: all placements of one volume share the same `_displayGroup`, but the tree creates a separate folder under each parent volume that contains placements.

#### When to keep separate definitions

Merging only works when the components are truly identical. Keep separate definitions when:

- **Different PMT model** — e.g. the veto PMTs (R11780) have 7 components vs the TPC PMTs (R11410) with 5 components. These are genuinely different objects.
- **Different display group** — mVetoPMTArray (`_displayGroup: "Muon Veto"`) and nVetoPMTArray (`_displayGroup: "Neutron Veto"`) have identical components but serve different purposes. Since `_displayGroup` is per-volume-definition (not per-placement), merging them would put all 204 veto PMTs under one folder. Keep them separate so the tree shows them in the correct group.

**Rule**: the automatic placement detection (§4) matches on `type + dimensions + material + components + _displayGroup`. Same shape but different display group → separate definition.

| Scenario | Same definition? | Why |
|----------|-----------------|-----|
| TopPMT + BotPMT | ✅ Yes | Same R11410, same `_displayGroup: "PMTs"`, different parent splits tree |
| mVetoPMT + nVetoPMT | ❌ No | Same R11780, but different `_displayGroup` ("Muon Veto" vs "Neutron Veto") |
| TPC PMT + Veto PMT | ❌ No | Different component structure entirely |
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

The tree reflects the actual Geant4 parent-child hierarchy. Display group folders are inserted as virtual nodes but **follow the containment structure** — they appear under the parent volume where the grouped volumes are actually placed.

XENONnT hierarchy (simplified):

```
World
├── 📁 Water Tank
│   ├── WaterTank                              parent=World
│   │   ├── Water                              parent=WaterTank
│   │   │   ├── 📁 Cryostats
│   │   │   │   ├── OuterCryostat               parent=Water
│   │   │   │   │   └── OuterCryostatVacuum     parent=OuterCryostat
│   │   │   │   │       └── InnerCryostat       parent=OuterCryostatVacuum
│   │   │   │   │           ├── LXeVolume       parent=InnerCryostat
│   │   │   │   │           │   ├── 📁 TPC
│   │   │   │   │           │   │   ├── BellPlate, TPCWall, CathodeRing, ...
│   │   │   │   │           │   │   └── FieldShaper_0..33
│   │   │   │   │           │   ├── GXeVolume   parent=LXeVolume
│   │   │   │   │           │   │   └── 📁 PMTs
│   │   │   │   │           │   │       ├── TopPMT_0..252  (TopPMTArray placements)
│   │   │   │   │           │   └── 📁 PMTs
│   │   │   │   │           │       └── BotPMT_0..240      (BotPMTArray placements)
│   │   │   ├── 📁 Calibration
│   │   │   │   └── CalibrationTubes            parent=Water
│   │   │   ├── 📁 Support Structure
│   │   │   │   ├── FloorLeg_1                  parent=Water
│   │   │   │   │   └── FloorLeg_1_air
│   │   │   │   ├── FloorLeg_2                  parent=Water
│   │   │   │   ├── HorizontalBeam_1..8         parent=Water
│   │   │   │   └── ...
│   │   │   ├── 📁 Muon Veto
│   │   │   │   └── mVetoTopPMT_0..83           parent=Water (mVetoPMTArray placements)
│   │   │   ├── 📁 Neutron Veto
│   │   │   │   └── nVSidePMT_0..119            parent=Water (nVetoPMTArray placements)
│   │   ├── WaterCone                           parent=WaterTank
│   │   └── AirCone                             parent=WaterTank
```

**Key rules:**
- The tree structure follows `placement.parent` — if a volume is placed in `Water`, it appears under `Water` in the tree, regardless of display group.
- Display group folders are inserted as children of the *parent volume* where the grouped volumes reside. Support Structure, Muon Veto, Neutron Veto, and Calibration all appear under `Water` because that's where their volumes are placed.
- PMTs folders appear under `GXeVolume` and `LXeVolume` respectively.
- A display group folder is shown only at the highest parent level (not duplicated down the hierarchy).
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

### Automatic placement detection

When the user adds a new volume, the editor checks whether an existing volume definition already matches (same type, dimensions, material, and components). If a match is found, the editor offers two options:

1. **Add as placement** (default) — append a new entry to the existing volume's `placements[]` with a default position and auto-generated name
2. **Create new definition** — create a separate volume entry (for when the user intends to modify it independently later)

This avoids accidental duplication and encourages the linked-placement model.

**Matching criteria** (all must match):
- `type` — same shape type
- `dimensions` — identical dimension values (deep equality)
- `material` — same material name
- `components` — for boolean/assembly types, same component structure
- `_displayGroup` — same display group (prevents merging muon veto with neutron veto PMTs)

**Name generation**: The new placement name is derived from the volume name with an incremented suffix: if the volume has placements `FloorLeg_1` through `FloorLeg_4`, the next one becomes `FloorLeg_5`.

```js
// User drags a "box, SS304LSteel, 150×150×3165" into the scene
const match = findMatchingVolume(jsonState, newVolumeDef);
if (match) {
  // Prompt: "A FloorLeg with identical shape already exists (4 placements). Add as placement #5?"
  const nextName = generateNextPlacementName(match.volume); // → "FloorLeg_5"
  addPlacement(match.index, {
    name: nextName,
    x: dropX, y: dropY, z: dropZ,
    rotation: { x: 0, y: 0, z: 0 },
    parent: targetParentName
  });
} else {
  addVolume(newVolumeDef);
}
```

For assemblies this is especially powerful: adding a PMT to the array is just one new placement entry, not a duplication of 5 component definitions.

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
