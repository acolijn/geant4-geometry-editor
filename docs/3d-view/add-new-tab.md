# Add New Tab

The Add New Tab provides a streamlined interface for creating new geometry objects and adding them to your design.

## Overview

The Add New Tab is part of the right panel in the 3D View and allows you to create various types of geometry objects with predefined default properties. This tab simplifies the process of adding new elements to your geometry.

## Features

### Geometry Types

The Add New Tab offers a variety of geometry types to choose from:

- **Basic Shapes**:
  - Box: Rectangular prism with configurable dimensions
  - Sphere: Spherical volume with configurable radius
  - Cylinder: Cylindrical volume with configurable radius and height
  - Cone: Conical volume with configurable top and bottom radii
  - Torus: Toroidal volume with configurable radii
  - Polyhedron: Custom shape defined by vertices and faces

- **Advanced Geometries**:
  - Assembly: Container for grouping multiple objects
  - Boolean Operations: Union, subtraction, and intersection of volumes
  - Replica: Multiple copies of an object arranged in a pattern

### Creation Process

To create a new geometry object:

1. Select the desired geometry type from the list
2. Configure the initial properties (optional)
3. Click the "Create" button
4. The new object will appear in the 3D Viewer and Geometry Tree

### Default Properties

Each geometry type comes with sensible default properties:

- **Default Size**: Appropriate dimensions for the selected shape
- **Default Material**: The currently selected material or a default material
- **Default Position**: Placed at the origin or at a logical position relative to the selected parent volume
- **Default Name**: Automatically generated based on the geometry type and a unique identifier

### Parent Volume Selection

The Add New Tab allows you to specify where the new object should be placed:

- **World Volume**: Place the object in the top-level world volume
- **Selected Volume**: Place the object inside the currently selected volume
- **Custom Parent**: Select a specific volume as the parent

### Templates and Presets

To speed up the creation process, the Add New Tab includes:

- **Templates**: Predefined configurations for common objects
- **Recent Objects**: Quick access to recently created object types
- **Favorites**: Save and reuse your frequently used configurations

## Advanced Options

For more complex scenarios, the Add New Tab provides advanced options:

- **Copy Properties**: Create a new object with properties copied from an existing object
- **Multiple Creation**: Create multiple instances of the same object with variations
- **Parametric Creation**: Define objects using mathematical expressions

## Usage Tips

- **Quick Creation**: Use the default properties for rapid prototyping
- **Organized Hierarchy**: Select the appropriate parent volume before creating new objects
- **Efficient Workflow**: Create all objects of the same type at once, then adjust their properties
- **Templates**: Save your own templates for frequently used configurations
