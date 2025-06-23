# Properties Tab

The Properties Tab allows you to view and edit the properties of selected geometry objects in detail.

## Overview

When you select an object in the 3D Viewer or Geometry Tree, the Properties Tab displays all of its configurable properties. This tab provides a comprehensive interface for modifying the object's characteristics, including its position, rotation, size, and material.

## Features

### General Properties

For all geometry objects, the Properties Tab displays:

- **Name**: The unique identifier for the object
- **Type**: The geometry type (box, sphere, cylinder, etc.)
- **Material**: The assigned material
- **Mother Volume**: The parent volume containing this object

### Position and Rotation

The Properties Tab provides precise control over the object's position and orientation:

- **Position**: X, Y, Z coordinates with unit selection (mm, cm, m)
- **Rotation**: X, Y, Z rotation angles with unit selection (degrees, radians)

These values can be entered directly for precise positioning or adjusted using the transformation controls in the 3D Viewer.

### Dimension Properties

Depending on the geometry type, different dimension properties are available:

- **Box**: Length, width, and height
- **Sphere**: Radius, phi and theta segments
- **Cylinder**: Radius, height, and segment count
- **Cone**: Top radius, bottom radius, height, and segment count
- **Torus**: Radius, tube radius, and segment count
- **Polyhedron**: Vertex positions and face indices

Each property includes appropriate unit selection (mm, cm, m).

### Material Properties

The Properties Tab allows you to:

- **Select Material**: Choose from existing materials
- **View Properties**: See the properties of the selected material
- **Create New**: Quick access to create a new material

### Advanced Properties

For more complex objects, additional properties may be available:

- **Boolean Operations**: Parameters for union, subtraction, or intersection
- **Replica Settings**: Count, spacing, and direction for replicated volumes
- **Assembly Properties**: Options for managing assemblies
- **Visualization Options**: Color, opacity, and visibility settings

## Real-time Updates

Changes made in the Properties Tab are immediately reflected in the 3D Viewer, providing instant visual feedback. This real-time interaction makes it easy to fine-tune your geometry.

## Validation

The Properties Tab includes validation to ensure that property values are valid:

- **Range Checking**: Ensures values are within acceptable ranges
- **Unit Conversion**: Automatically converts between different units
- **Error Highlighting**: Visually indicates invalid values
- **Warning Messages**: Provides feedback about potential issues

## Keyboard Shortcuts

To improve efficiency, the Properties Tab supports several keyboard shortcuts:

- **Tab**: Navigate between input fields
- **Arrow Up/Down**: Increment/decrement numeric values
- **Ctrl+Z**: Undo the last change
- **Ctrl+Y**: Redo the last undone change

## Usage Tips

- **Precision Editing**: Use the Properties Tab for precise numerical adjustments
- **Batch Editing**: Select multiple objects to edit common properties simultaneously
- **Copy Properties**: Use the context menu to copy properties from one object to another
- **Reset to Default**: Option to reset properties to their default values
