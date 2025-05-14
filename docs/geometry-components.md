# Geometry Components

The Geant4 Geometry Editor supports several basic geometry shapes that correspond to Geant4's solid types. This guide explains the available shapes and their properties.

## Component Organization

The geometry components are organized into two main categories:

1. **3D Viewer Components** (`src/components/viewer3D/`): These components handle the 3D rendering and transformation of geometry objects:
   - `BoxObject.jsx`: Renders 3D box geometry
   - `CylinderObject.jsx`: Renders 3D cylinder geometry
   - `SphereObject.jsx`: Renders 3D sphere geometry
   - `EllipsoidObject.jsx`: Renders 3D ellipsoid geometry
   - `PolyconeObject.jsx`: Renders 3D polycone geometry
   - `TorusObject.jsx`: Renders 3D torus geometry
   - `TrapezoidObject.jsx`: Renders 3D trapezoid geometry
   - `UnionObject.jsx`: Renders 3D boolean union geometry
   - `TransformableObject.jsx`: Wrapper component that adds transformation controls

2. **Editor Components** (`src/components/geometry-editor/`): These components handle the property editing and UI:
   - `PropertyEditor.jsx`: Edits properties of selected geometry objects
   - `AddNewTab.jsx`: Interface for adding new geometry objects
   - Dialog components for saving, loading, and updating objects

## Available Shapes

### Box

A rectangular box defined by its dimensions along the x, y, and z axes.

**Properties:**
- **Size**: Width (x), Height (y), and Depth (z) dimensions
- **Position**: Center position (x, y, z)
- **Rotation**: Rotation angles around x, y, and z axes

**Geant4 Equivalent**: `G4Box`

### Cylinder

A cylinder defined by its radius and height.

**Properties:**
- **Radius**: Outer radius of the cylinder
- **Height**: Height of the cylinder along the z-axis
- **Inner Radius**: Optional inner radius (for hollow cylinders)
- **Position**: Center position (x, y, z)
- **Rotation**: Rotation angles around x, y, and z axes

**Orientation**: 
- The circular face lies in the x-y plane
- The height extends along the z-axis

**Geant4 Equivalent**: `G4Tubs`

### Sphere

A sphere defined by its radius.

**Properties:**
- **Radius**: Radius of the sphere
- **Position**: Center position (x, y, z)
- **Rotation**: Rotation angles around x, y, and z axes

**Geant4 Equivalent**: `G4Sphere`

### Ellipsoid

An ellipsoid defined by three radii along the x, y, and z axes.

**Properties:**
- **X Radius**: Radius along the x-axis
- **Y Radius**: Radius along the y-axis
- **Z Radius**: Radius along the z-axis
- **Position**: Center position (x, y, z)
- **Rotation**: Rotation angles around x, y, and z axes

**Geant4 Equivalent**: `G4Ellipsoid`

### Torus

A torus (ring) defined by its major and minor radii.

**Properties:**
- **Major Radius**: Distance from the center of the torus to the center of the tube
- **Minor Radius**: Radius of the tube
- **Position**: Center position (x, y, z)
- **Rotation**: Rotation angles around x, y, and z axes

**Geant4 Equivalent**: `G4Torus`

### Trapezoid

A trapezoid with varying dimensions along the z-axis.

**Properties:**
- **dx1**: Half-length along x at -z/2
- **dx2**: Half-length along x at +z/2
- **dy1**: Half-length along y at -z/2
- **dy2**: Half-length along y at +z/2
- **dz**: Half-length along z-axis
- **Position**: Center position (x, y, z)
- **Rotation**: Rotation angles around x, y, and z axes

**Geant4 Equivalent**: `G4Trap`

### Polycone

A polycone is a solid constructed from multiple cylindrical sections stacked along the z-axis.

**Properties:**
- **Z Sections**: An array of sections, each with:
  - **z**: Z-position of the section
  - **rMin**: Inner radius at this z-position
  - **rMax**: Outer radius at this z-position
- **Position**: Center position (x, y, z)
- **Rotation**: Rotation angles around x, y, and z axes

**Geant4 Equivalent**: `G4Polycone`

## Common Properties

All geometry components share these common properties:

### Name

A unique identifier for the geometry object. This name is used:
- In the Geant4 simulation to identify the volume
- In the JSON export
- In the 3D viewer's object selection

### Material

The material assigned to the geometry. Materials define:
- Physical properties (density, state, temperature)
- Composition (elements and their proportions)
- Optical properties (for certain simulations)

See the [Materials](materials.md) documentation for more details.

### Position

The position of the geometry's center relative to its mother volume's center, specified as (x, y, z) coordinates.

**Units**: Centimeters (cm) by default

### Rotation

The rotation of the geometry around the x, y, and z axes, applied in sequence:
1. First rotation around x-axis
2. Then rotation around the new y-axis
3. Finally rotation around the new z-axis

**Units**: Degrees (deg) by default

### Mother Volume

Every volume (except the World volume) must have a mother volume. The mother volume:
- Contains the child volume
- Provides the reference coordinate system for the child's position and rotation
- Must be large enough to fully contain the child volume

## World Volume

The World volume is a special box that serves as the top-level container for all other geometries. It has the following characteristics:

- Always present and cannot be deleted
- Serves as the root of the geometry hierarchy
- Usually filled with air or vacuum
- Should be large enough to contain all other volumes

In Geant4, the World volume is the top-level physical volume returned by the `DetectorConstruction::Construct()` method.
