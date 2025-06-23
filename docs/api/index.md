# API Reference

This section provides detailed API documentation for developers who want to extend or integrate with the Geant4 Geometry Editor.

## Overview

The Geant4 Geometry Editor is built with a modular architecture that makes it easy to extend and customize. This API documentation covers the key components, classes, and functions that you can use to:

- Create custom geometry types
- Add new material definitions
- Extend the user interface
- Integrate with external tools
- Create plugins and extensions

## Core Components

The Geant4 Geometry Editor consists of several core components:

- [Geometry Editor](geometry-editor.md): The main editor component
- [3D Viewer](viewer3d.md): The 3D visualization component
- [Material Editor](material-editor.md): The material management component
- [JSON Utilities](json-utilities.md): Utilities for working with JSON data

## Key Classes and Interfaces

### Geometry Classes

- `GeometryObject`: Base class for all geometry objects
- `Box`, `Sphere`, `Cylinder`: Basic shape classes
- `Assembly`, `Union`, `Subtraction`: Complex geometry classes
- `GeometryTree`: Manages the hierarchy of geometry objects

### Material Classes

- `Material`: Base class for all materials
- `NistMaterial`: Predefined NIST materials
- `ElementBasedMaterial`: Custom materials defined by elements
- `Compound`: Materials composed of other materials

### Utility Classes

- `ObjectStorage`: Manages saving and loading of objects
- `GeometryUtils`: Utility functions for geometry operations
- `ImportExportHandlers`: Handles import and export operations
- `UnitConverter`: Converts between different unit systems

## Extension Points

The Geant4 Geometry Editor provides several extension points:

- **Custom Geometry Types**: Create new geometry types by extending `GeometryObject`
- **Custom Material Types**: Create new material types by extending `Material`
- **UI Components**: Add new UI components to the editor
- **Import/Export Formats**: Add support for new file formats

## Usage Examples

### Creating a Custom Geometry Type

```javascript
import { GeometryObject } from '../geometry-editor/utils/GeometryObject';

class CustomShape extends GeometryObject {
  constructor(props) {
    super(props);
    this.type = 'custom-shape';
    // Custom initialization
  }
  
  // Override methods as needed
  createThreeObject() {
    // Create Three.js representation
  }
  
  toJSON() {
    // Convert to JSON representation
  }
}
```

### Using the ObjectStorage API

```javascript
import { ObjectStorage } from '../geometry-editor/utils/ObjectStorage';

// Save an object
ObjectStorage.saveObject('my-geometry', geometryData);

// Load an object
const loadedGeometry = ObjectStorage.loadObject('my-geometry');

// List all saved objects
const savedObjects = ObjectStorage.listObjects();
```

## API Stability

The API is versioned to ensure compatibility:

- **Stable APIs**: Core classes and interfaces are stable and will maintain backward compatibility
- **Experimental APIs**: New features may be marked as experimental and subject to change
- **Deprecated APIs**: APIs scheduled for removal will be marked as deprecated

## Contributing to the API

If you want to contribute to the API:

1. Follow the coding standards and conventions
2. Add comprehensive JSDoc comments to your code
3. Write unit tests for new functionality
4. Update the API documentation

## Next Steps

Explore the detailed documentation for each component:

- [Geometry Editor API](geometry-editor.md)
- [3D Viewer API](viewer3d.md)
- [Material Editor API](material-editor.md)
- [JSON Utilities API](json-utilities.md)
