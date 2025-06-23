# Geometry Tree

The Geometry Tree provides a hierarchical view of all geometry objects in your design. It allows you to navigate, select, and organize your geometry components.

## Overview

The Geometry Tree displays your geometry in a tree structure, with the World volume at the top level and all other volumes organized according to their parent-child relationships. This representation makes it easy to understand the structure of complex geometries.

## Features

### Hierarchical Display

- **World Volume**: The top-level container for all geometry objects
- **Parent-Child Relationships**: Objects are nested according to their placement in the geometry
- **Expandable Nodes**: Click the arrow next to a node to expand or collapse its children
- **Visual Indicators**: Icons indicate the type of each geometry object (box, sphere, cylinder, etc.)

### Selection

- Click on any item in the tree to select it
- The selected item will be highlighted in the 3D Viewer
- The properties of the selected item will be displayed in the Properties Tab

### Organization

The Geometry Tree organizes objects based on their relationships:

- **Physical Volumes**: Standard geometry objects placed in the World or other volumes
- **Assemblies**: Groups of objects that can be manipulated as a single unit
- **Boolean Operations**: Objects created through union, subtraction, or intersection operations
- **Replicas**: Multiple copies of an object arranged in a pattern

### Context Menu

Right-click on any item in the Geometry Tree to access a context menu with additional options:

- **Delete**: Remove the selected object and its children
- **Duplicate**: Create a copy of the selected object
- **Add to Assembly**: Add the selected object to an existing assembly
- **Export Object**: Export the selected object and its children as a JSON file
- **Update Assemblies**: Update all instances of an assembly with changes made to one instance

## Usage Tips

- **Organizing Complex Geometries**: Use assemblies to group related objects and manage complexity
- **Finding Objects**: Expand and collapse nodes to locate specific objects in complex geometries
- **Bulk Operations**: Select a parent node to perform operations on multiple objects at once
- **Visibility Control**: Toggle the visibility of objects or groups of objects

## Example

A typical Geometry Tree might look like this:

```
World
├── Detector
│   ├── Crystal1
│   ├── Crystal2
│   └── Housing
├── Support Structure
│   ├── Base
│   └── Frame
└── Shielding
```

In this example, "Detector" and "Support Structure" are parent volumes that contain other volumes. Clicking on "Crystal1" would select that specific object, while expanding "Support Structure" would reveal its child objects "Base" and "Frame".
