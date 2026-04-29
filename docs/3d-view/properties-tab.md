# Properties Tab

The Properties Tab allows you to view and edit the properties of the currently selected volume.

## Overview

When you select a placement in the Geometry Tree or 3D Viewer, the Properties Tab shows two sections:

1. **Volume definition** (shared across all placements of this volume) — name, type, material, dimensions
2. **Placement** (specific to this instance) — position, rotation, parent volume

Editing a volume-definition field (e.g. dimensions) updates **all placements** of that volume at once. Editing a placement field only affects the selected instance.

## Editable fields

### Volume definition (shared)

| Field | Description |
|-------|-------------|
| Name | Logical volume name |
| G4 name | Geant4 physical volume name (optional) |
| Type | Shape type (read-only after creation) |
| Material | Material name (NIST or custom) |
| Dimensions | Shape-specific parameters (see types below) |
| Visible | Show/hide in 3D view |
| Wireframe | Render as wireframe |
| Display Group | Folder label in the Geometry Tree |
| Hits Collection | Sensitive detector collection name |

### Placement (per instance)

| Field | Description |
|-------|-------------|
| Placement name | Name of this `G4PVPlacement` |
| Position (x, y, z) | Position in mm relative to the parent volume |
| Rotation (x, y, z) | Euler angles in degrees (XYZ convention) |
| Parent volume | Mother volume for this placement |

## Dimension fields by type

| Type | Fields |
|------|--------|
| `box` | x, y, z (half-lengths, mm) |
| `cylinder` / `tube` | radius, height, innerRadius (optional) |
| `sphere` | radius, innerRadius, startPhi, deltaPhi, startTheta, deltaTheta |
| `cone` | rmin1, rmax1, rmin2, rmax2, height |
| `torus` | rmin, rmax, rtor, startPhi, deltaPhi |
| `trapezoid` / `trd` | x1, x2, y1, y2, z |
| `polycone` | startPhi, deltaPhi, zPlanes (z/rmin/rmax per plane) |
| `ellipsoid` | xSemiAxis, ySemiAxis, zSemiAxis |
| `assembly` | (no dimensions — managed via components) |
| `union` / `subtraction` | (no dimensions — managed via components) |

## Real-time updates

Changes in the Properties Tab are applied immediately and reflected in the 3D Viewer. There is no explicit save step — the JSON state updates on each edit.
