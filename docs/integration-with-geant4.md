# Integration with Geant4

The Geant4 Geometry Editor is designed to work seamlessly with Geant4-based simulations. This guide explains how to use the geometries created in the editor with your Geant4 simulation code.

## JSON Export Format

The editor exports geometry configurations in a JSON format that can be parsed by a Geant4 application. The JSON structure includes:

- A `world` object defining the top-level volume
- A `volumes` array containing all other geometry objects
- Material definitions in a separate JSON file

## Using with Geant4 Simulation

### Prerequisites

To use the JSON geometry files with Geant4, your simulation must include:

1. A JSON parser library (such as nlohmann/json for C++)
2. A geometry parser that can interpret the JSON format and create Geant4 volumes

### Example Integration

The companion Geant4 simulation project includes a `GeometryParser` class that can load and parse the JSON files exported from this editor.

Basic usage:

```cpp
#include "GeometryParser.hh"

// In your DetectorConstruction class:
G4VPhysicalVolume* DetectorConstruction::Construct() {
    // Create a geometry parser
    GeometryParser parser;
    
    // Load the geometry and materials configurations
    parser.LoadGeometryConfig("path/to/geometry.json");
    parser.LoadMaterialsConfig("path/to/materials.json");
    
    // Construct the geometry
    return parser.ConstructGeometry();
}
```

### Coordinate System Consistency

The editor ensures that the coordinate system is consistent with Geant4:

- Z-axis points upward
- Cylinders have their circular face in the X-Y plane
- Rotations follow Geant4's sequential rotation system

This consistency ensures that what you see in the editor is what you get in your Geant4 simulation.

## Units

The JSON files include unit information for all dimensions:

- Length units (mm, cm, m)
- Angle units (deg, rad)

The `GeometryParser` correctly interprets these units and applies the appropriate Geant4 unit constants (G4Units).

## Handling Rotations

Rotations in the JSON files follow Geant4's convention:

1. First rotation around X-axis
2. Then rotation around the new Y-axis
3. Finally rotation around the new Z-axis

The `GeometryParser` applies these rotations in the correct sequence using:

```cpp
G4RotationMatrix* rotMatrix = new G4RotationMatrix();
rotMatrix->rotateX(rx*scale);
rotMatrix->rotateY(ry*scale);
rotMatrix->rotateZ(rz*scale);
```

## Troubleshooting

If your geometry doesn't appear as expected in Geant4:

1. Check that the units are consistent between the editor and your Geant4 application
2. Verify that rotations are being applied in the correct sequence
3. Ensure that the mother-daughter volume relationships are correctly defined
4. Check for overlapping volumes, which can cause visualization issues in Geant4
