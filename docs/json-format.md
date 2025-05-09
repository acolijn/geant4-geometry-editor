# JSON Format

The Geant4 Geometry Editor exports geometry and material configurations in JSON format. This guide explains the structure and format of these JSON files.

## Geometry JSON

The geometry JSON file contains the complete definition of your detector geometry, including the world volume and all other volumes.

### Structure

```json
{
  "world": {
    // World volume properties
  },
  "volumes": [
    // Array of volume objects
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
  "size": {
    "x": 200.0,
    "y": 200.0,
    "z": 200.0,
    "unit": "cm"
  },
  "position": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "cm"
  },
  "rotation": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "deg"
  }
}
```

### Volume Objects

Each volume in the `volumes` array is defined as a JSON object with properties depending on its type:

#### Box

```json
{
  "type": "box",
  "name": "DetectorBox",
  "material": "G4_Si",
  "size": {
    "x": 10.0,
    "y": 10.0,
    "z": 1.0,
    "unit": "cm"
  },
  "position": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "cm"
  },
  "rotation": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "deg"
  },
  "mother_volume": "World"
}
```

#### Cylinder

```json
{
  "type": "cylinder",
  "name": "DetectorCylinder",
  "material": "G4_Si",
  "radius": 5.0,
  "height": 10.0,
  "inner_radius": 0.0,
  "unit": "cm",
  "position": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "cm"
  },
  "rotation": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "deg"
  },
  "mother_volume": "World"
}
```

#### Sphere

```json
{
  "type": "sphere",
  "name": "DetectorSphere",
  "material": "G4_Si",
  "radius": 5.0,
  "unit": "cm",
  "position": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "cm"
  },
  "rotation": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "deg"
  },
  "mother_volume": "World"
}
```

#### Ellipsoid

```json
{
  "type": "ellipsoid",
  "name": "DetectorEllipsoid",
  "material": "G4_Si",
  "xRadius": 5.0,
  "yRadius": 3.0,
  "zRadius": 7.0,
  "position": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "cm"
  },
  "rotation": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "deg"
  },
  "mother_volume": "World"
}
```

#### Torus

```json
{
  "type": "torus",
  "name": "DetectorTorus",
  "material": "G4_Si",
  "majorRadius": 10.0,
  "minorRadius": 2.0,
  "position": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "cm"
  },
  "rotation": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "deg"
  },
  "mother_volume": "World"
}
```

#### Trapezoid

```json
{
  "type": "trapezoid",
  "name": "DetectorTrapezoid",
  "material": "G4_Si",
  "dx1": 5.0,
  "dx2": 7.0,
  "dy1": 3.0,
  "dy2": 4.0,
  "dz": 6.0,
  "position": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "cm"
  },
  "rotation": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "deg"
  },
  "mother_volume": "World"
}
```

#### Polycone

```json
{
  "type": "polycone",
  "name": "DetectorPolycone",
  "material": "G4_Si",
  "zSections": [
    { "z": -10.0, "rMin": 0.0, "rMax": 5.0 },
    { "z": -5.0, "rMin": 0.0, "rMax": 7.0 },
    { "z": 5.0, "rMin": 0.0, "rMax": 7.0 },
    { "z": 10.0, "rMin": 0.0, "rMax": 5.0 }
  ],
  "position": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "cm"
  },
  "rotation": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "unit": "deg"
  },
  "mother_volume": "World"
}
```

### Common Properties

All volume objects share these common properties:

- **type**: The shape type ("box", "cylinder", "sphere", "ellipsoid", "torus", "trapezoid", "polycone")
- **name**: A unique identifier for the volume
- **material**: The material name (must be defined in the materials JSON)
- **position**: The position of the volume's center relative to its mother volume
- **rotation**: The rotation angles around the x, y, and z axes (applied sequentially in Geant4 order)
- **mother_volume**: The name of the parent volume (except for the world volume)

### Units

Units can be specified in two ways:

1. As a property of vectors (position, size):
   ```json
   "position": {
     "x": 0.0,
     "y": 0.0,
     "z": 0.0,
     "unit": "cm"
   }
   ```

2. As a direct property of the volume (for radius, height):
   ```json
   "radius": 5.0,
   "height": 10.0,
   "unit": "cm"
   ```

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
