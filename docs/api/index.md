# API Reference

This section contains automatically generated documentation from JSDoc comments in the codebase. The documentation is generated using JSDoc and jsdoc-to-markdown, which extracts the comments from the source code and converts them to Markdown format.

## How to Use This Documentation

The API documentation provides detailed information about the components, functions, and methods in the Geant4 Geometry Editor. It is particularly useful for:

- Understanding the internal structure of the application
- Learning how to extend or modify the existing functionality
- Finding the parameters and return values of specific functions
- Discovering the relationships between different components

## Components

- **GeometryEditor** - The main component for editing and managing geometry objects
  - Handles object selection, transformation, and property editing
  - Implements toggle selection behavior (click selected object to unselect it)
  - Ensures objects remain selected after transformation with transform controls visible

- **ProjectManager** - Handles project management functionality
  - Manages saving and loading of projects
  - Handles file import/export operations

## Key Features Documented

- **Transform Controls** - The 3D movement arrows that allow manipulating objects
  - Objects stay selected after moving them
  - Transform controls remain visible and attached to the object
  - No visual glitches or jumping of controls to the origin

- **Selection System** - How object selection works in the editor
  - Toggle selection behavior in the geometry tree
  - Proper parent-child relationships for nested volumes
  - Unselect objects by clicking them again

## Contributing to Documentation

To improve the API documentation, add or enhance JSDoc comments in the source code. The documentation will be automatically updated when the `npm run docs:api` command is run.

Follow these guidelines for writing effective JSDoc comments:

```javascript
/**
 * Description of the function or component
 * 
 * @param {Type} paramName - Description of the parameter
 * @returns {Type} Description of the return value
 */
```
