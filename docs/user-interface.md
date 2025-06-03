# User Interface Guide

This guide explains the main components of the Geant4 Geometry Editor user interface and how to interact with them effectively. The Geant4 Geometry Editor interface is divided into several key sections, each serving a specific purpose in the geometry creation process.

## Component Organization

The user interface is built from several modular components:

- **Main Editor Components** (`src/components/`)
  - `GeometryEditor.jsx`: Main component that orchestrates the editor functionality
  - `Viewer3D.jsx`: Handles the 3D visualization of geometry objects

- **Property Editing Components** (`src/components/geometry-editor/`)
  - `PropertyEditor.jsx`: Edits properties of selected geometry objects
  - `AddNewTab.jsx`: Interface for adding new geometry objects
  - Dialog components for saving, loading, and updating objects

- **3D Geometry Components** (`src/components/viewer3D/`)
  - `TransformableObject.jsx`: Wrapper component that adds transformation controls
  - Various shape objects (Box, Cylinder, Sphere, etc.) for 3D rendering

## Main Tabs

The application has three main tabs:

1. **Geometry Tab**: For creating and editing geometry objects
2. **Materials Tab**: For managing materials used in your geometries
3. **JSON Tab**: For viewing and exporting the JSON representation of your work

## Geometry Tab

The Geometry tab is divided into two main sections:

### Geometry Tree

The Geometry Tree panel shows the hierarchy of all geometry objects:

- World volume at the top
- Child volumes nested underneath their parents
- Click on any volume to select it
- Toggle visibility using the eye icon
- **Hierarchical Display**: Volumes are organized in a tree structure with proper indentation
- **Collapsible Nodes**: Click the arrow icons to expand or collapse branches
- **Visual Icons**: Each geometry type has a distinctive icon:
  - Box: ▢ (square)
  - Sphere: ◯ (circle)
  - Cylinder: ⌭ (cylinder symbol)
  - Ellipsoid: ⬭ (oval)
  - Torus: ◎ (circle with dot)
  - Polycone: ⏣ (stacked shape)
  - Trapezoid: ⏢ (trapezoid)
  - Assembly: 📁 (folder)
- **Active Volume Indication**: Volumes with hit collections are highlighted in green
- **Alphabetical Sorting**: Volumes are sorted alphabetically within each level

### 3D Viewer (Left Side)

The 3D viewer provides an interactive visualization of your geometry:

- **Camera Controls**:
  - Left-click and drag: Rotate the view
  - Right-click and drag: Pan the view
  - Scroll wheel: Zoom in/out
  - Buttons at the bottom: Reset view, toggle grid, etc.

- **Object Selection**:
  - Click on any object to select it for editing
  - Selected objects are highlighted with a yellow outline

- **Transform Controls**:
  - When an object is selected, transform controls appear
  - Use the buttons at the bottom to switch between:
    - Translate mode (move)
    - Rotate mode
    - Scale mode (for boxes only)

### Properties Panel (Right Side)

The properties panel has two tabs:

#### Property Editor (Right Side)

The Property Editor panel allows you to modify the selected geometry:

- **Basic Properties**:
  - Name: Internal identifier for the geometry
  - Display Name: User-friendly name shown in the interface
  - Material: Material assigned to the geometry

- **Positioning**:
  - Position (X, Y, Z): Coordinates in 3D space
  - Rotation (X, Y, Z): Rotation angles in degrees
  - Mother Volume: Parent volume that contains this geometry
    - **Hierarchical Selection**: Mother volumes are displayed in a collapsible tree structure
    - **Visual Icons**: Each volume type has a distinctive icon for easy identification
    - **Expandable Branches**: Click the arrow icons to expand/collapse branches
    - **Circular Reference Prevention**: The current volume and its descendants are excluded

- **Dimensions** (shape-specific):
  - Box: X, Y, Z size
  - Cylinder: Radius, Height, Inner Radius
  - Sphere: Radius

- **Remove Geometry** button (not available for World volume)

#### Add New Tab

This tab allows you to create new geometry objects:

1. Select the geometry type (Box, Sphere, etc.)
2. Fill in the required properties:
   - Basic information (name, display name)
   - Position and rotation
   - Mother volume (using the hierarchical TreeSelect dropdown)
   - Shape-specific dimensions
3. Click "Create" to add it to the scene

### TreeSelect Component

The TreeSelect component is used for hierarchical selection of mother volumes in both the Property Editor and Add New tab:

- **Dropdown Interface**: Click to open a dropdown with a tree structure
- **Hierarchical Display**: Volumes are shown in their proper hierarchy
- **Expandable Nodes**: Click arrow icons to expand/collapse branches
- **Visual Icons**: Each volume type has its distinctive icon
- **Selection**: Click on any volume to select it as the mother volume
- **Current Selection**: The currently selected volume is highlighted
- **Display Names**: Shows user-friendly display names instead of internal names

## Materials Tab

The Materials tab provides an interface for managing materials:

- **Materials List**: Shows all defined materials
- **Add Material** button: Create a new material
- **Edit Material** panel:
  - Material type (NIST, element-based, compound)
  - Physical properties (density, state, temperature)
  - Composition (for custom materials)

## JSON Tab

The JSON tab shows the JSON representation of your geometry and materials:

- **Geometry JSON** tab: Shows the geometry configuration
- **Materials JSON** tab: Shows the materials configuration
- **Download JSON** button: Save the JSON to a file
- **Copy to Clipboard** button: Copy the JSON to your clipboard
