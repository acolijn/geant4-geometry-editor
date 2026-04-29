# Geant4 Geometry Editor

A web-based visual editor for creating and modifying Geant4 detector geometries. This tool allows you to create complex 3D geometries through an intuitive interface and export them to JSON format for use in Geant4 simulations.

[![Documentation Status](https://readthedocs.org/projects/geant4-geometry-editor/badge/?version=latest)](https://geant4-geometry-editor.readthedocs.io/en/latest/?badge=latest)

## Features

- **3D Visualization** — interactive Three.js viewer with orbit controls, selection, and transform gizmos
- **Shapes** — Box, Cylinder, Sphere, Ellipsoid, Torus, Trapezoid, Polycone
- **Compound volumes** — Assemblies (groups of volumes placed together) and Boolean / Union solids (CSG operations)
- **Material editor** — NIST materials, element-based, and compound material definitions with colour and opacity
- **Sensitive detectors** — mark volumes as active with a hits-collection name for simulation output
- **Multiple placements** — place the same volume definition at several positions in the geometry
- **Project management** — save / load projects to the server or download as JSON files
- **JSON preview** — live JSON viewer with import / export and round-trip fidelity with Geant4
- **Unit support** — mm / cm / m and deg / rad with automatic conversion
- **Testing** — 116 Vitest unit tests covering all pure-logic utility modules

## Project Structure

```
src/
├── contexts/               # React context (AppStateContext / useAppContext)
├── hooks/                  # useAppState — central state hook
├── components/
│   ├── app/                # App shell, header, tab layout
│   ├── geometry-editor/    # Property editor, geometry tree, handlers, utilities
│   ├── viewer3D/           # Three.js 3D viewer, shape objects, transform controls
│   ├── material-editor/    # Material creation / editing UI
│   ├── json-viewer/        # JSON display, import / export, conversion utilities
│   └── project-manager/    # Server save / load, file download
└── utils/                  # Logger, storage helpers
```

## Quick Start

```bash
git clone https://github.com/acolijn/geant4-geometry-editor.git
cd geant4-geometry-editor
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

### Production Build

```bash
npm run build
npm start          # serves the built app on port 3001
```

### Running Tests

```bash
npm test           # runs all 116 Vitest unit tests
```

## Usage

### Geometry Tab

The Geometry tab is divided into two panels:

1. **3D Viewer** (left) — rotate, pan, and zoom the geometry; click objects to select them; use transform gizmos to move / rotate.
2. **Properties Panel** (right) — edit position, rotation, dimensions, material, and visibility of the selected volume, or add new shapes via the "Add New" tab.

### Materials Tab

Create and edit materials: NIST presets, element-based compositions, or compounds with density, state, temperature, and colour.

### JSON Tab

Live JSON representation of the full geometry + materials document. Download files or import previously exported JSON.

## JSON Format

The editor reads and writes JSON files compatible with the [geant4-simulation](https://github.com/acolijn/geant4-simulation) geometry parser:

```json
{
  "world": {
    "name": "World",
    "type": "box",
    "material": "G4_AIR",
    "dimensions": { "x": 2000, "y": 2000, "z": 2000 },
    "placements": [{ "x": 0, "y": 0, "z": 0, "rotation": { "x": 0, "y": 0, "z": 0 } }]
  },
  "volumes": [ ... ],
  "materials": { ... }
}
```

## Documentation

Full documentation is available at [geant4-geometry-editor.readthedocs.io](https://geant4-geometry-editor.readthedocs.io/).

To build and serve the docs locally:

```bash
npm run docs:serve     # generates API docs, then serves on http://localhost:8000
```

## Development

Built with **React 19**, **Vite 6**, **Three.js / React Three Fiber**, **Material UI 7**, and **manifold-3d** (WASM CSG engine for boolean solids). State management uses a custom `AppStateContext` with `useAppContext` hook (no prop drilling). ESLint is configured with zero warnings.
