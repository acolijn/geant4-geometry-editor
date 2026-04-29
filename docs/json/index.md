# JSON Format Reference

The Geant4 Geometry Editor uses a single JSON document as the source of truth for every project. This document is consumed directly by `GeometryParser.cc` in the simulation and is also produced by the Python converter (`mc-master/converter`).

## Top-level structure

```json
{
  "world": { ... },
  "volumes": [ ... ],
  "materials": { ... }
}
```

## Volume types

Every volume shares the same base fields:

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

### Supported types

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

## Placements

One volume definition can have multiple placements. Each placement is an independent `G4PVPlacement` at a different position/rotation/parent:

```json
"placements": [
  {
    "name": "FloorLeg_1",
    "x": 2250, "y": 2250, "z": -2921.5,
    "rotation": { "x": 0, "y": 0, "z": 0 },
    "parent": "Water"
  },
  {
    "name": "FloorLeg_2",
    "x": -2250, "y": 2250, "z": -2921.5,
    "rotation": { "x": 0, "y": 0, "z": 0 },
    "parent": "Water"
  }
]
```

## Boolean solids (`type: "union"`)

A `union` volume uses `components` instead of `dimensions`. Each component is a regular shape with its own `type` (box, cylinder, etc.) and a `boolean_operation` field:

| `boolean_operation` | Effect |
|--------------------|--------|
| `"add"` | Include this shape — `G4UnionSolid` |
| `"subtract"` | Cut this shape out — `G4SubtractionSolid` |
| *(absent)* | Defaults to `"add"` (first component becomes the base solid) |

> There is no `type: "add"` or `type: "subtract"` — `boolean_operation` only appears as a property of a component, never as its `type`.

**Processing order:** all `"add"` components are combined first, then all `"subtract"` components are applied. Array order within each group is preserved.

### Boolean solid example

```json
{
  "name": "FloorLeg_1",
  "type": "union",
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

### Union with subtracted holes example

First component carries explicit `"boolean_operation": "add"`. Holes are cut by `"subtract"` components at offset positions:

```json
{
  "name": "TopCopperPlate",
  "type": "union",
  "material": "G4_Cu",
  "components": [
    {
      "name": "TopCopperPlate_base",
      "type": "cylinder",
      "boolean_operation": "add",
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

## Assemblies

An assembly groups multiple sub-volumes that are placed together. The assembly has no material or shape of its own (`G4AssemblyVolume`). Each placement in `placements[]` stamps all components into the parent volume via `MakeImprint()`.

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
    }
  ],
  "placements": [
    { "name": "TopPMT_0", "x": 0, "y": 0, "z": 13.985, "parent": "GXeVolume" },
    { "name": "BotPMT_0", "x": 0, "y": 0, "z": -938.3, "parent": "LXeVolume" }
  ]
}
```

Component positions in `placements[0]` are relative to the assembly origin. The assembly placement position is then applied on top.

## Materials

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

NIST materials (e.g. `G4_AIR`, `G4_WATER`, `G4_Cu`) do not need an entry in `materials` — they are resolved automatically by Geant4's `G4NistManager`.

## Editor-only fields

These fields are used by the editor and ignored by `GeometryParser.cc`:

| Field | Purpose |
|-------|---------|
| `_displayGroup` | Groups volumes under a named folder in the geometry tree |
| `visible` | Show/hide in the 3D view |
| `wireframe` | Render as wireframe in the 3D view |
| `hitsCollectionName` | Assigns a sensitive detector hits collection |
| `_compoundId` | Stable ID for assembly/boolean grouping in the editor |
| `_componentId` | Stable ID for a component within a compound |
| `_is_boolean_component` | Marks a flat entry as belonging to a boolean solid |
| `_boolean_parent` | Name of the parent boolean volume |

## Next Steps

See [JSON Viewer](json-viewer.md) for import/export behavior and practical usage.

