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
| `union` | No `dimensions` — uses `components[]` with `boolean_operation: "add"` or `"subtract"` |
| `assembly` | No `dimensions` — uses `components[]` placed relative to assembly origin |

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

### Boolean solids (subtraction, union)

Boolean volumes use `components` instead of `dimensions`. Every component specifies its relative position via its `placements[0]` entry (only one placement per component is used). Each component carries a `boolean_operation` field that tells `GeometryParser.cc` how to combine it into the final solid.

**Supported `boolean_operation` values:**

| Value | Meaning |
|-------|---------|
| `"union"` or `"add"` | Combine with the current solid via `G4UnionSolid` |
| `"subtract"` | Remove from the current solid via `G4SubtractionSolid` |

> **Note:** `"intersection"` is listed as a volume type in `GeometryParser.cc` routing but is **not implemented** in the component-level boolean processing. Do not use `"type": "intersection"` — it has no effect.

**Important: processing order.** `GeometryParser.cc` separates all components into two groups and processes them in this fixed order regardless of their position in the JSON array:

1. All `"union"` / `"add"` components are combined first (left-to-right within the group)
2. All `"subtract"` components are then subtracted from the result (left-to-right within the group)

This means `A union B subtract C subtract D` is always computed as `(A union B) - C - D`, not `((A - C) union B) - D`. Design your component lists accordingly.

**Top-level `type` field:** The `"type"` field on the volume (`"subtraction"` or `"union"`) routes `GeometryParser.cc` to the boolean solid builder. The actual operations are determined entirely by `boolean_operation` on the components. The top-level `type` is also used by the editor UI to display the volume correctly.

#### Subtraction example (`type: "subtraction"`)

The base shape is the first component (no `boolean_operation` required — it defaults to the base). Subsequent components with `"boolean_operation": "subtract"` are cut out.

```json
{
  "name": "FloorLeg_1",
  "g4name": "support_leg1floor",
  "type": "subtraction",
  "material": "SS304LSteel",
  "components": [
    {
      "name": "FloorLeg_1_outer",
      "type": "box",
      "dimensions": { "x": 150, "y": 150, "z": 3165 },
      "placements": [{ "x": 0, "y": 0, "z": 0, "rotation": { "x": 0, "y": 0, "z": 0 } }],
      "_displayGroup": "Support Structure"
    },
    {
      "name": "FloorLeg_1_inner",
      "type": "box",
      "boolean_operation": "subtract",
      "dimensions": { "x": 138, "y": 138, "z": 3165 },
      "placements": [{ "x": 0, "y": 0, "z": 0, "rotation": { "x": 0, "y": 0, "z": 0 } }],
      "_displayGroup": "Support Structure"
    }
  ],
  "placements": [
    { "name": "FloorLeg_1", "x": 2250, "y": 2250, "z": -2921.5, "parent": "Water" }
  ],
  "visible": true,
  "_displayGroup": "Support Structure"
}
```

#### Union with subtracted holes example (`type: "union"`)

For `"type": "union"`, the first component typically carries an **explicit** `"boolean_operation": "union"`. Additional components can be added (`"union"`) or cut out (`"subtract"`). Here, a copper plate base with multiple cylindrical holes punched through it:

```json
{
  "name": "TopCopperPlate",
  "g4name": "Cu_TopCopperPlate",
  "type": "union",
  "material": "G4_Cu",
  "components": [
    {
      "name": "TopCopperPlate_base",
      "type": "cylinder",
      "boolean_operation": "union",
      "dimensions": { "radius": 706.0, "height": 20.0 },
      "placements": [{ "x": 0, "y": 0, "z": 0, "rotation": { "x": 0, "y": 0, "z": 0 } }]
    },
    {
      "name": "TopCopperPlate_hole_0",
      "type": "cylinder",
      "boolean_operation": "subtract",
      "dimensions": { "radius": 39.5, "height": 22.0 },
      "placements": [{ "x": 0, "y": 0, "z": 0, "rotation": { "x": 0, "y": 0, "z": 0 } }]
    },
    {
      "name": "TopCopperPlate_hole_1",
      "type": "cylinder",
      "boolean_operation": "subtract",
      "dimensions": { "radius": 39.5, "height": 22.0 },
      "placements": [{ "x": 76.2, "y": 0, "z": 0, "rotation": { "x": 0, "y": 0, "z": 0 } }]
    }
  ],
  "placements": [
    { "name": "TopCopperPlate", "x": 0, "y": 0, "z": 0, "parent": "LXeVolume" }
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

#### Real example: XENONnT PMT assemblies

The XENONnT detector uses 3 PMT models. The assembly name is the **PMT model identifier**, not the placement location — this makes the object reusable across projects.

| Assembly name | PMT model | Components | Placements | Parents |
|--------------|-----------|------------|------------|---------|
| `R11410-21` | Hamamatsu R11410-21 (3") | 5 | 494 (253 top + 241 bottom) | GXeVolume, LXeVolume |
| `R5912-100` | Hamamatsu R5912-100-10 (8") | 7 | 120 | Water (neutron veto) |
| `R7081` | Hamamatsu R7081 (10") | 7 | 84 | Water (muon veto) |

The R11410-21 TPC PMT:

```json
{
  "name": "R11410-21",
  "type": "assembly",
  "_displayGroup": "PMTs",
  "components": [
    {
      "name": "PMTBody",
      "type": "polycone",
      "material": "Kovar",
      "dimensions": { "startPhi": 0, "deltaPhi": 6.283, "zPlanes": [...] },
      "placements": [{ "x": 0, "y": 0, "z": 0 }]
    },
    {
      "name": "PMTWindow",
      "type": "cylinder",
      "material": "Quartz",
      "dimensions": { "radius": 38.1, "height": 1.5 },
      "placements": [{ "x": 0, "y": 0, "z": 15.0 }]
    },
    {
      "name": "PMTInnerVacuum",
      "type": "polycone",
      "material": "Vacuum",
      "dimensions": { ... },
      "placements": [{ "x": 0, "y": 0, "z": 0 }]
    },
    {
      "name": "PMTPhotocathode",
      "type": "cylinder",
      "material": "PhotoCathodeAluminium",
      "dimensions": { "radius": 38.0, "height": 0.05 },
      "placements": [{ "x": 0, "y": 0, "z": 14.0 }],
      "hitsCollectionName": "TPCHitsCollection"
    },
    {
      "name": "PMTCeramic",
      "type": "cylinder",
      "material": "Ceramic",
      "dimensions": { "radius": 25.75, "height": 5.0 },
      "placements": [{ "x": 0, "y": 0, "z": -40.0 }]
    }
  ],
  "placements": [
    { "name": "TopPMT_0",   "x": 0,    "y": 0.0,   "z": 13.985,  "parent": "GXeVolume" },
    { "name": "TopPMT_1",   "x": 76.2, "y": 0.0,   "z": 13.985,  "parent": "GXeVolume" },
    "... 251 more in GXeVolume ...",
    { "name": "BotPMT_0",   "x": 0,    "y": 0,     "z": -938.3,  "parent": "LXeVolume" },
    { "name": "BotPMT_1",   "x": 76.2, "y": 0,     "z": -938.3,  "parent": "LXeVolume" },
    "... 239 more in LXeVolume ..."
  ]
}
```

The veto PMTs follow the same pattern — each is named after its model:

```json
{
  "name": "R5912-100",
  "type": "assembly",
  "_displayGroup": "Neutron Veto",
  "components": [
    { "name": "nVetoPMTWindow",       "type": "ellipsoid", "material": "Glass", ... },
    { "name": "nVetoPMTVacuum",       "type": "ellipsoid", "material": "Vacuum", ... },
    { "name": "nVetoPMTPhotocathode", "type": "ellipsoid", "material": "PhotoCathodeAluminium", ...,
      "hitsCollectionName": "nVetoHitsCollection" },
    { "name": "nVetoPMTWaist",        "type": "cylinder",  "material": "Glass", ... },
    { "name": "nVetoPMTBodyVacuum",   "type": "cylinder",  "material": "Vacuum", ... },
    { "name": "nVetoPMTBody",         "type": "cylinder",  "material": "SS304LSteel", ... },
    { "name": "nVetoPMTBase",         "type": "cylinder",  "material": "SS304LSteel", ... }
  ],
  "placements": [
    { "name": "nVSidePMT_0", "x": -625, "y": 1860.25, "z": -828, "parent": "Water" },
    "... 119 more"
  ]
}
```

**Naming convention**: the assembly `name` identifies the *object type*, the placement `name` identifies the *instance*. This means:
- Saving `R11410-21` to the object library gives you a reusable PMT that can be imported into any project
- The auto-placement detection matches on the object name — adding another R11410-21 adds a placement, not a duplicate definition
- The placement names (`TopPMT_0`, `BotPMT_0`, `nVSidePMT_0`) describe *where* and *which*, not *what*

#### How placement works in Geant4

```
R11410-21 (assembly definition — no physical shape)
  ├── PMTBody         (polycone, Kovar, at origin)
  ├── PMTWindow       (cylinder, Quartz, z=+15)
  ├── PMTInnerVacuum  (polycone, Vacuum)
  ├── PMTPhotocathode (cylinder, PhotoCathodeAluminium, z=+14)
  └── PMTCeramic      (cylinder, Ceramic, z=-40)

placement[0]:   stamp all 5 at (0, 0, +13.985)  in GXeVolume → TopPMT_0
placement[1]:   stamp all 5 at (76.2, 0, +13.985) in GXeVolume → TopPMT_1
... × 253 in GXeVolume
placement[253]: stamp all 5 at (0, 0, -938.3)   in LXeVolume → BotPMT_0
... × 241 in LXeVolume
```

#### Creating a PMT and placing it multiple times (editor workflow)

1. **Define the assembly** — create `R11410-21` with `type: "assembly"`, add 5 components with positions relative to origin
2. **Add placements** — each placement stamps all components into a parent volume
3. **Edit the definition** — changing a component (e.g. PMTBody radius) updates all 494 PMTs at once
4. **Add more placements** — `addPlacement(volumeIndex, { name: "TopPMT_253", x: ..., y: ..., z: ..., parent: "GXeVolume" })`
5. **Reuse in another project** — save `R11410-21` to the object library, import it into a new geometry, add placements there

#### Merging top and bottom PMTs

The `material` field on an assembly is **not used by Geant4** — `G4AssemblyVolume` has no material of its own. Looking at `GeometryParser.cc`, `CreateAssembly()` only calls `assembly->AddPlacedVolume()` for each component; the assembly material is ignored. The components (PMTBody=Kovar, PMTWindow=Quartz, etc.) carry their own materials.

Since the top and bottom TPC PMTs are the same R11410-21 model with **identical components**, they belong in a single volume definition with 494 placements (253 in GXeVolume + 241 in LXeVolume). The tree naturally splits them by parent volume:

```
├── LXeVolume
│   ├── GXeVolume
│   │   └── 📁 PMTs                    ← R11410-21 placements where parent=GXeVolume
│   │       ├── TopPMT_0..252
│   └── 📁 PMTs                        ← R11410-21 placements where parent=LXeVolume
│       └── BotPMT_0..240
```

This works because display group folders are per-parent: all placements of `R11410-21` share `_displayGroup: "PMTs"`, but the tree creates a separate folder under each parent volume.

#### When to keep separate definitions

| Assembly | Model | `_displayGroup` | Same def? | Why |
|----------|-------|-----------------|-----------|-----|
| `R11410-21` | Hamamatsu R11410-21 | `"PMTs"` | Single definition | Same object, 494 placements split across GXe/LXe |
| `R5912-100` | Hamamatsu R5912-100-10 | `"Neutron Veto"` | Separate | Different display group from muon veto |
| `R7081` | Hamamatsu R7081 | `"Muon Veto"` | Separate | Different display group from neutron veto |

Note: `R5912-100` and `R7081` have identical component structure (same 7 sub-volumes, same dimensions). They *could* be merged into one definition, but they have different `_displayGroup` values. Since `_displayGroup` is per-definition (not per-placement), merging would lose the distinction between muon veto and neutron veto in the tree. If we wanted to merge them, we'd need per-placement display groups — a possible future extension.
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

| Field | Applies to | Purpose |
|-------|-----------|---------|
| `_displayGroup` | volume, component | Display folder in the tree (e.g. `"Support Structure"`) |
| `visible` | volume, placement, component | Whether to show in 3D view |
| `wireframe` | volume | Render as wireframe in 3D view |
| `hitsCollectionName` | volume, component | Sensitive detector hits collection name |
| `_compoundId` | compound volume | Stable ID for assembly/union/subtraction grouping |
| `_componentId` | component | Stable ID for a component within a compound |
| `_is_boolean_component` | component | `true` when the component is part of a boolean solid |
| `_boolean_parent` | component | Name of the parent boolean volume |

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

A saved object is a JSON volume definition, named after what the object *is* (e.g. `R11410-21.json`, not `TopPMTArray.json`). Importing it:

```js
addVolume(objectDef)  // adds the R11410-21 definition with 0 placements
addPlacement(newIndex, { name: "TopPMT_0", x: 0, y: 0, z: 13.985, parent: "GXeVolume" })
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
// User drags an R11410-21 PMT from the object library into the scene
const match = findMatchingVolume(jsonState, newVolumeDef);
if (match) {
  // Prompt: "An R11410-21 assembly already exists (494 placements). Add as placement #495?"
  const nextName = generateNextPlacementName(match.volume); // → "BotPMT_242"
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
| Boolean component (`boolean_operation: "add"`) | `G4UnionSolid` |
| Boolean component (`boolean_operation: "subtract"`) | `G4SubtractionSolid` |
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
