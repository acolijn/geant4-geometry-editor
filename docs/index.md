# Geant4 Geometry Editor

A web-based visual editor for creating and modifying Geant4 detector geometries. This tool allows you to create complex 3D geometries through an intuitive interface and export them to JSON format for use in Geant4 simulations.

## Overview

The Geant4 Geometry Editor provides a user-friendly interface for creating and editing detector geometries for Geant4 simulations. Key capabilities:

- Create and modify 3D geometries visually (Box, Cylinder, Sphere, Ellipsoid, Torus, Trapezoid, Polycone)
- Build compound volumes: Assemblies and Boolean / Union solids
- Define and customise materials (NIST, element-based, compounds)
- Mark volumes as sensitive detectors with hits-collection names
- Export geometries as JSON files compatible with [geant4-simulation](https://github.com/acolijn/geant4-simulation)
- Save and load projects to a server or as local JSON files

## Documentation Sections

- [Installation and Setup](installation.md) — how to install and run the editor
- [3D View](3d-view/index.md) — working with the 3D viewer and geometry tree
- [Materials](materials/index.md) — creating and managing materials
- [JSON Formats](json/index.md) — understanding the JSON output formats
- [Save/Load](save-load.md) — saving and loading your work
- [API Reference](api/index.md) — reference documentation for developers

## Quick Start

```bash
git clone https://github.com/acolijn/geant4-geometry-editor.git
cd geant4-geometry-editor
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

## Technology Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 + Material UI 7 |
| 3D rendering | Three.js / React Three Fiber / Drei |
| Build tool | Vite 6 |
| Testing | Vitest (116 unit tests) |
| State management | Custom React Context (`useAppContext`) |
| Backend | Express 4 (production server + JSON storage API) |
| Documentation | MkDocs with ReadTheDocs theme |
