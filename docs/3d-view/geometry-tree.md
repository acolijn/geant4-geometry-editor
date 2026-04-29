# Geometry Tree

The Geometry Tree provides a hierarchical view of all geometry objects in your design.

## Overview

The tree is built from the `placements[].parent` fields in the JSON. The World volume is at the root; every volume is shown under its parent volume. Display group folders (`_displayGroup`) group related volumes under a named virtual folder inside their parent.

## Tree structure rules

- Each volume appears once per placement, under its `placement.parent`.
- A `_displayGroup` folder is created as a virtual child of the parent volume. It groups all placements of volumes with the same display group under that parent.
- Display group folders are shown only at the highest matching parent level — they are not duplicated down the hierarchy.
- Assembly instances and boolean volumes appear as expandable nodes whose children are their components.

### XENONnT example (simplified)

```
World
└── WaterTank
    └── Water
        ├── 📁 Cryostats
        │   └── OuterCryostat → OuterCryostatVacuum → InnerCryostat
        │       ├── LXeVolume
        │       │   ├── 📁 TPC
        │       │   │   └── BellPlate, TPCWall, FieldShaper_0..33 ...
        │       │   └── GXeVolume
        │       │       └── 📁 PMTs
        │       │           └── TopPMT_0..252
        │       └── 📁 PMTs
        │           └── BotPMT_0..240
        ├── 📁 Support Structure
        │   └── FloorLeg_1..4, HorizontalBeam_1..8 ...
        ├── 📁 Neutron Veto
        │   └── nVSidePMT_0..119
        └── 📁 Muon Veto
            └── mVetoTopPMT_0..83
```

## Selection

- Click a tree node to select it. The 3D Viewer highlights the object and the Properties Tab shows its properties.
- Assemblies and boolean volumes show their component tree when expanded.

## Context menu

Right-click any tree node to access:

| Action | Description |
|--------|-------------|
| **Add Placement** | Add a new placement of this volume at a default position |
| **Delete** | Remove this placement (and volume definition if it was the last placement) |
| **Export Object** | Export the volume definition (with components) as a `.json` file |
