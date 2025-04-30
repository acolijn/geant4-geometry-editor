# Geant4 Geometry Editor Documentation

Welcome to the documentation for the Geant4 Geometry Editor, a web-based tool for creating and editing geometries for Geant4 simulations.

## Overview

The Geant4 Geometry Editor provides a graphical interface for designing detector geometries that can be exported as JSON files and used with Geant4-based simulations. This tool bridges the gap between visual design and simulation code, making it easier to create and modify complex detector geometries.

## Contents

- [Getting Started](getting-started.md)
- [User Interface](user-interface.md)
- [Geometry Components](geometry-components.md)
- [Materials](materials.md)
- [Coordinate System](coordinate-system.md)
- [JSON Format](json-format.md)
- [Integration with Geant4](integration-with-geant4.md)

## Key Features

- 3D visualization of Geant4 geometries using Three.js
- Support for basic shapes: Box, Cylinder, and Sphere
- Material editor for defining custom materials
- Real-time JSON preview and export
- Automatic saving of work in progress to localStorage
- Consistent coordinate system with Geant4

## Development

This application is built with:
- React for UI components
- Three.js for 3D visualization
- Material UI for the user interface components
- Vite as the build tool and development server
