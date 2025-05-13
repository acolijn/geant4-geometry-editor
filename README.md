# Geant4 Geometry Editor

A web-based visual editor for creating and modifying Geant4 detector geometries. This tool allows you to create complex 3D geometries through an intuitive interface and export them to JSON format for use in Geant4 simulations.

[![Documentation Status](https://readthedocs.org/projects/geant4-geometry-editor/badge/?version=latest)](https://geant4-geometry-editor.readthedocs.io/en/latest/?badge=latest)

## Documentation

Comprehensive documentation is available at [geant4-geometry-editor.readthedocs.io](https://geant4-geometry-editor.readthedocs.io/en/latest/), including:

- [Getting Started Guide](https://geant4-geometry-editor.readthedocs.io/en/latest/getting-started/)
- [User Interface Guide](https://geant4-geometry-editor.readthedocs.io/en/latest/user-interface/)
- [Geometry Components](https://geant4-geometry-editor.readthedocs.io/en/latest/geometry-components/)
- [API Reference](https://geant4-geometry-editor.readthedocs.io/en/latest/api/)

The API reference is automatically generated from JSDoc comments in the codebase.

## Features

- 3D visualization of Geant4 geometries using Three.js
- Support for basic shapes: Box, Cylinder, and Sphere
- Material editor for defining custom materials
- Real-time JSON preview and export
- Automatic saving of work in progress to localStorage.

## Usage

### Geometry Tab

The Geometry tab is divided into two sections:

1. **3D Viewer** (left side): Visualizes your geometry in 3D. You can:
   - Rotate, pan, and zoom using mouse controls
   - Click on objects to select them for editing
   - View the world volume and all defined geometries

2. **Properties Panel** (right side): Edit properties of the selected geometry or add new shapes.
   - When a geometry is selected, you can modify its properties (position, rotation, size, material)
   - Use the "Add New" tab to create new geometry objects

### Materials Tab

The Materials tab allows you to manage materials for your geometries:

- View and edit existing materials
- Create new materials (NIST materials, element-based materials, or compounds)
- Define physical properties like density, state, and temperature
- Specify elemental composition for custom materials

### JSON Tab

The JSON tab provides a view of the generated JSON for both geometries and materials:

- View the JSON representation of your current design
- Copy JSON to clipboard
- Download JSON files for use with Geant4

## JSON Format

The application generates JSON files in the format expected by Geant4 JSON parsers:

### Geometry JSON

```json
{
  "world": {
    "type": "box",
    "name": "World",
    "material": "G4_AIR",
    "size": { "x": 2.0, "y": 2.0, "z": 2.0, "unit": "m" },
    "position": { "x": 0.0, "y": 0.0, "z": 0.0, "unit": "m" },
    "rotation": { "x": 0.0, "y": 0.0, "z": 0.0, "unit": "deg" }
  },
  "volumes": [
    {
      "type": "box",
      "name": "DetectorVolume",
      "material": "G4_Si",
      "size": { "x": 10.0, "y": 10.0, "z": 1.0, "unit": "cm" },
      "position": { "x": 0.0, "y": 0.0, "z": 0.0, "unit": "cm" },
      "rotation": { "x": 0.0, "y": 0.0, "z": 0.0, "unit": "deg" },
      "mother_volume": "World"
    }
  ]
}
```

### Materials JSON

```json
{
  "materials": {
    "G4_AIR": {
      "type": "nist",
      "name": "G4_AIR"
    },
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
  }
}
```

## Documentation

Comprehensive documentation is available at [geant4-geometry-editor.readthedocs.io](https://geant4-geometry-editor.readthedocs.io/).

The documentation covers:
- Getting started guide
- User interface overview
- Geometry components reference
- Materials configuration
- Coordinate system explanation
- JSON format specification
- Integration with Geant4 simulations

## Development

This application is built with React and Vite, using Three.js for 3D visualization and Material UI for the user interface.

### Running the Application

```bash
# Navigate to the project directory
cd geant4-geometry-editor

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Building for Production

```bash
npm run build
```

## Documentation

The project documentation is built using MkDocs and is available on ReadTheDocs. The documentation includes:

- User guides
- Feature documentation
- Integration guides
- API reference (automatically generated from JSDoc comments)

### Viewing Documentation Locally

To view the documentation locally:

```bash
# Generate API documentation and serve the docs site
./scripts/serve-docs.sh

# Or use npm scripts
npm run docs:api    # Generate API docs only
npm run docs:serve  # Generate API docs and serve the site
```

Then open your browser to http://localhost:8000

### Contributing to Documentation

The documentation is stored in the `docs/` directory. To add or update documentation:

1. Edit the Markdown files in the `docs/` directory
2. For API documentation, add or update JSDoc comments in the source code

JSDoc comments should follow this format:

```javascript
/**
 * Description of the function or component
 * 
 * @param {Type} paramName - Description of the parameter
 * @returns {Type} Description of the return value
 */
```

The API documentation is automatically generated from these comments when building the documentation.
