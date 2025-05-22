# JSON Format

The Geant4 Geometry Editor exports geometry and material configurations in JSON format. This guide explains the structure and format of these JSON files.

## Geometry JSON

The geometry JSON file contains the complete definition of your detector geometry, including the world volume and all other volumes. The volumes are automatically sorted to ensure parent volumes are defined before their children, which is essential for proper Geant4 geometry construction.

### Structure

```json
{
  "world": {
    // World volume properties
  },
  "volumes": [
    // Array of volume objects (sorted by hierarchy)
  ]
}
```

### World Volume

The world volume is defined as a JSON object with the following properties:

```json
"world": {
  "type": "box",
  "name": "World",
  "material": "G4_AIR",
  "dimensions": {
    "x": 200.0,
    "y": 200.0,
    "z": 200.0
  },
  "placement": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "rotation": {
      "x": 0.0,
      "y": 0.0,
      "z": 0.0
    }
  }
}
```

### Volume Objects

Each volume in the `volumes` array is defined as a JSON object with properties depending on its type. All volumes use the standardized format with `dimensions` and `placement` objects. Volumes are automatically sorted to ensure parent volumes are defined before their children.

#### Box

```json
{
  "type": "box",
  "name": "DetectorBox",
  "material": "G4_Si",
  "dimensions": {
    "x": 10.0,
    "y": 10.0,
    "z": 1.0
  },
  "placement": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "rotation": {
      "x": 0.0,
      "y": 0.0,
      "z": 0.0
    }
  },
  "parent": "World"
}
```

#### Cylinder

```json
{
  "type": "cylinder",
  "name": "DetectorCylinder",
  "material": "G4_Si",
  "dimensions": {
    "radius": 5.0,
    "height": 10.0,
    "inner_radius": 0.0
  },
  "placement": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "rotation": {
      "x": 0.0,
      "y": 0.0,
      "z": 0.0
    }
  },
  "parent": "World"
}
```

#### Sphere

```json
{
  "type": "sphere",
  "name": "DetectorSphere",
  "material": "G4_Si",
  "dimensions": {
    "radius": 5.0
  },
  "placement": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "rotation": {
      "x": 0.0,
      "y": 0.0,
      "z": 0.0
    }
  },
  "parent": "World"
}
```

#### Ellipsoid

```json
{
  "type": "ellipsoid",
  "name": "DetectorEllipsoid",
  "material": "G4_Si",
  "dimensions": {
    "x_radius": 5.0,
    "y_radius": 3.0,
    "z_radius": 7.0
  },
  "placement": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "rotation": {
      "x": 0.0,
      "y": 0.0,
      "z": 0.0
    }
  },
  "parent": "World"
}
```

#### Torus

```json
{
  "type": "torus",
  "name": "DetectorTorus",
  "material": "G4_Si",
  "dimensions": {
    "major_radius": 10.0,
    "minor_radius": 2.0
  },
  "placement": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "rotation": {
      "x": 0.0,
      "y": 0.0,
      "z": 0.0
    }
  },
  "parent": "World"
}
```

#### Trapezoid

```json
{
  "type": "trapezoid",
  "name": "DetectorTrapezoid",
  "material": "G4_Si",
  "dimensions": {
    "dx1": 5.0,
    "dx2": 7.0,
    "dy1": 3.0,
    "dy2": 4.0,
    "dz": 6.0
  },
  "placement": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "rotation": {
      "x": 0.0,
      "y": 0.0,
      "z": 0.0
    }
  },
  "parent": "World"
}
```

#### Polycone

```json
{
  "type": "polycone",
  "name": "DetectorPolycone",
  "material": "G4_Si",
  "dimensions": {
    "z": [0.0, 5.0, 10.0],
    "rmin": [0.0, 1.0, 2.0],
    "rmax": [5.0, 7.0, 8.0]
  },
  "placement": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "rotation": {
      "x": 0.0,
      "y": 0.0,
      "z": 0.0
    }
  },
  "parent": "World"
}
```

#### Polyhedra

```json
{
  "type": "polyhedra",
  "name": "DetectorPolyhedra",
  "material": "G4_Si",
  "dimensions": {
    "z": [0.0, 5.0, 10.0],
    "rmin": [0.0, 1.0, 2.0],
    "rmax": [5.0, 7.0, 8.0]
  },
  "placement": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "rotation": {
      "x": 0.0,
      "y": 0.0,
      "z": 0.0
    }
  },
  "parent": "World"
}
```


```

### Common Properties

All volume objects share these common properties:

- **type**: The shape type ("box", "cylinder", "sphere", "ellipsoid", "torus", "trapezoid", "polycone", "polyhedra")
- **name**: A unique identifier for the volume
- **material**: The material name (must be defined in the materials JSON)
- **dimensions**: An object containing dimension properties specific to the volume type
- **placement**: The position and rotation of the volume relative to its parent
  - **x, y, z**: Position coordinates
  - **rotation**: Rotation angles around the x, y, and z axes (applied sequentially in Geant4 order)
- **parent**: The name of the parent volume (except for the world volume)

### Hierarchical Ordering

The volumes in the JSON output are automatically sorted to ensure that parent volumes are defined before their children. This is essential for proper geometry construction in Geant4, as a volume must exist before another volume can be placed inside it.

### Units

All measurements in the JSON file use standard units:

- Length: millimeters (mm) for all dimensions and positions
- Angle: radians (rad) for all rotations

The standardized format eliminates the need for explicit unit specifications, as all values are automatically converted to these standard units during export and import.

## Materials JSON

The materials JSON file contains definitions for all materials used in your geometry.

### Structure

```json
{
  "materials": {
    // Material objects keyed by name
  }
}
```

### NIST Material

```json
"G4_AIR": {
  "type": "nist",
  "name": "G4_AIR"
}
```

### Element-Based Material

```json
"LXe": {
  "type": "element_based",
  "density": 3.02,
  "density_unit": "g/cm3",
  "state": "liquid",
  "temperature": 165.0,
  "temperature_unit": "kelvin",
  "composition": {
    "Xe": 1
  }
}
```

### Compound Material

```json
"Scintillator": {
  "type": "compound",
  "density": 1.032,
  "density_unit": "g/cm3",
  "state": "solid",
  "temperature": 293.15,
  "temperature_unit": "kelvin",
  "composition": {
    "C": 9,
    "H": 10,
    "O": 1
  }
}
```

## Using the JSON Files with Geant4

The JSON files exported from the Geant4 Geometry Editor can be used with a Geant4 simulation that includes a JSON parser. See the [Integration with Geant4](integration-with-geant4.md) guide for details on how to use these files in your simulation.
