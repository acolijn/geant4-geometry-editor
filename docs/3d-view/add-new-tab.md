# Add New Tab

The Add New Tab provides a streamlined interface for creating new geometry objects and importing objects from the library.

## Overview

The Add New Tab is part of the right panel in the 3D View. It contains three actions:

1. **Import From Library** — import a previously exported volume (with its components) from a JSON file
2. **Create New Primitive** — create a new volume of a selected type in a chosen mother volume
3. **Manage Hit Collections** — open the dialog to configure sensitive detector hit collections

## Supported geometry types

When creating a new primitive, the following types are available:

| Type | Description |
|------|-------------|
| `box` | Rectangular box (half-lengths in mm) |
| `cylinder` | Cylinder or tube (radius, height, optional inner radius) |
| `sphere` | Sphere (radius, optional inner radius) |
| `trapezoid` | Trapezoid (`trd`) with two rectangular faces |
| `torus` | Torus (minor and major radii) |
| `ellipsoid` | Tri-axial ellipsoid |
| `polycone` | Polycone defined by z-planes |
| `assembly` | Group of sub-volumes (no material) |
| `union` | Boolean union with sub-components |

After creation, use the Properties Tab to set dimensions, material, and position.

## Creating a new primitive

1. Select the **Geometry Type** from the drop-down.
2. Select the **Mother Volume** using the tree selector.
3. Click **Add Geometry**.

The new volume is added to the Geometry Tree with default dimensions and `G4_AIR` material. Edit its properties in the Properties Tab.

## Importing from library

1. Click **Import From Library**.
2. Select a `.json` file exported from this editor (a single volume definition with optional components).
3. The volume is added with the currently selected mother volume.

For assemblies and boolean volumes, all components are imported with the definition.

## Managing hit collections

Click **Manage Hit Collections** to open the dialog where you can assign sensitive detector hit collection names to volumes. These names map to `hitsCollectionName` in the JSON and are used by `MySensitiveDetector.cc`.
