# User Interface Guide

The Geant4 Geometry Editor interface is divided into several key sections, each serving a specific purpose in the geometry creation process.

## Main Tabs

The application has three main tabs:

1. **Geometry Tab**: For creating and editing geometry objects
2. **Materials Tab**: For managing materials used in your geometries
3. **JSON Tab**: For viewing and exporting the JSON representation of your work

## Geometry Tab

The Geometry tab is divided into two main sections:

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

#### Properties Tab

When a geometry is selected, this tab shows its properties:

- **Basic Properties**:
  - Name: Identifier for the geometry
  - Material: Material assigned to the geometry

- **Position**:
  - X, Y, Z coordinates (in cm)
  - Unit selector

- **Rotation**:
  - X, Y, Z rotation angles (in degrees)
  - Unit selector (degrees or radians)

- **Dimensions** (shape-specific):
  - Box: X, Y, Z size
  - Cylinder: Radius, Height, Inner Radius
  - Sphere: Radius

- **Remove Geometry** button (not available for World volume)

#### Add New Tab

This tab allows you to create new geometry objects:

- **Geometry Type** dropdown: Select Box, Cylinder, or Sphere
- **Add Geometry** button: Creates a new geometry with default properties

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
