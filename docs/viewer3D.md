# Viewer3D

The Viewer3D component provides an interactive 3D visualization of the geometry configuration in the Geant4 Geometry Editor.

## Overview

The Viewer3D is a powerful visualization tool that allows users to:
- View the complete geometry in an interactive 3D environment
- Select and manipulate volumes directly in the 3D view
- Apply transformations (position, rotation) visually
- Inspect the geometry hierarchy and relationships

## Component Structure

The Viewer3D consists of:
- **3D Canvas** - The main rendering area for the 3D visualization
- **Camera Controls** - Tools for navigating the 3D view
- **Transform Controls** - Tools for manipulating selected volumes
- **Geometry Tree** - Hierarchical view of all volumes in the scene

## Key Features

### 3D Visualization

The Viewer3D provides a comprehensive 3D visualization of the geometry:

- **Real-time Rendering**: Immediate visual feedback for all changes
- **Material Visualization**: Visual representation of different materials
- **Transparency Options**: Ability to see inside complex structures
- **Wireframe Mode**: View the geometry as wireframes for better inspection
- **Grid and Axes**: Reference grid and coordinate axes for orientation

### Interactive Selection

Users can interact with the geometry directly in the 3D view:

- **Direct Selection**: Click on volumes to select them
- **Selection Highlighting**: Visual indication of selected volumes
- **Multiple Selection**: Select multiple volumes for bulk operations
- **Selection Synchronization**: Selection is synchronized with the Geometry Tree

### Transform Controls

The Viewer3D includes interactive transform controls:

- **Translation**: Move volumes in 3D space
- **Rotation**: Rotate volumes around their axes
- **Scaling**: Adjust the size of volumes (where applicable)
- **Snapping**: Optional grid snapping for precise positioning
- **Local/World Space**: Toggle between local and world coordinate systems

### Geometry Tree

The Geometry Tree panel shows the hierarchy of all geometry objects:

- **Hierarchical Display**: Volumes are organized in a tree structure
- **Collapsible Nodes**: Expand or collapse branches as needed
- **Visual Icons**: Each geometry type has a distinctive icon
- **Selection**: Click on any volume to select it in the 3D view
- **Visibility Toggle**: Show or hide individual volumes

## Components

### GeometryTree

The GeometryTree component provides a hierarchical tree view of all geometry objects:

- **Hierarchical Organization**: Parent-child relationships are visually represented
- **Interactive Selection**: Select volumes by clicking on tree items
- **Visibility Control**: Toggle visibility of individual volumes
- **Active Volume Indication**: Highlight volumes with hit collections

[Learn more about GeometryTree](api/GeometryTree.md)

### TransformableObject

The TransformableObject component wraps 3D objects to make them transformable:

- **Transform Controls**: Adds controls for translation, rotation, and scaling
- **Event Handling**: Processes user interactions with the object
- **Transform Synchronization**: Updates the underlying geometry data

## Usage

### Navigating the 3D View

- **Rotate View**: Left-click and drag
- **Pan View**: Right-click and drag
- **Zoom**: Scroll wheel or pinch gesture
- **Reset View**: Click the "Reset Camera" button

### Selecting and Transforming Volumes

1. Click on a volume in the 3D view or Geometry Tree to select it
2. Use the transform controls to manipulate the selected volume:
   - **Translate**: Click and drag the colored arrows
   - **Rotate**: Click and drag the colored circles
   - **Scale**: Click and drag the colored cubes

### Using the Geometry Tree

- **Expand/Collapse**: Click the arrow icons to expand or collapse branches
- **Select Volume**: Click on a volume name to select it
- **Toggle Visibility**: Click the eye icon to show/hide a volume

## Integration

The Viewer3D integrates with other components:

- **Geometry Editor**: Changes made in the Geometry Editor are reflected in the 3D view
- **Property Editor**: Selection in the 3D view updates the Property Editor
- **Material Editor**: Materials assigned to volumes affect their appearance in the 3D view

## Technical Details

### Rendering Technology

The Viewer3D uses Three.js for 3D rendering:

- **WebGL-based**: Utilizes hardware acceleration for smooth performance
- **Scene Graph**: Hierarchical organization of 3D objects
- **Custom Shaders**: Special effects for material visualization
- **Raycasting**: For precise object selection

### Performance Optimization

For complex geometries, several optimizations are applied:

- **Level of Detail**: Simplified representations for distant objects
- **Frustum Culling**: Only rendering objects in the camera's view
- **Instancing**: Efficient rendering of repeated geometries
- **Lazy Loading**: Loading geometry details as needed
