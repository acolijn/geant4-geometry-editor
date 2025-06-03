# Geant4 Geometry Editor Documentation

Welcome to the documentation for the Geant4 Geometry Editor, a web-based tool for creating and editing geometries for Geant4 simulations.

## Overview

The Geant4 Geometry Editor provides a graphical interface for designing detector geometries that can be exported as JSON files and used with Geant4-based simulations. This tool bridges the gap between visual design and simulation code, making it easier to create and modify complex detector geometries.

## Contents

### Main Components

- [Geometry Editor](geometry-editor.md) - Core component for creating and editing geometry objects
- [Material Editor](material-editor.md) - Interface for creating and managing materials
- [JSON Viewer](json-viewer.md) - View and export the JSON representation of geometries
- [Viewer3D](viewer3D.md) - Interactive 3D visualization of geometries

### Additional Resources

- [Getting Started](getting-started.md) - Quick start guide
- [User Interface](user-interface.md) - Overview of the user interface
- [Coordinate System](coordinate-system.md) - Explanation of the coordinate system
- [Integration with Geant4](integration-with-geant4.md) - Using the editor with Geant4
- [API Reference](api/index.md) - Detailed API documentation

## Key Features

- 3D visualization of Geant4 geometries using Three.js
- Support for multiple shapes: Box, Cylinder, Sphere, Ellipsoid, Torus, Trapezoid, and Polycone
- Interactive 3D transform controls for positioning and rotating objects
- Material editor for defining custom materials
- Real-time JSON preview and export
- Object library for saving and reusing geometry components
- Consistent coordinate system with Geant4 (sequential rotations)
- Alphabetically sorted geometry tree for easier navigation

## Development

This application is built with:
- React for UI components
- Three.js for 3D visualization
- Material UI for the user interface components
- Vite as the build tool and development server
