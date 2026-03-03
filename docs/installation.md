# Installation and Setup

This guide will walk you through the process of installing and setting up the Geant4 Geometry Editor.

## Prerequisites

Before installing the Geant4 Geometry Editor, ensure you have the following:

- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/acolijn/geant4-geometry-editor.git
   cd geant4-geometry-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

## Building for Production

To build the application for production and serve it:

```bash
npm run build
npm start
```

The production server runs on port 3001 by default and serves the built app plus a JSON file-storage API.

## Running Tests

```bash
npm test
```

This runs all Vitest unit tests (116 tests across 8 test files covering unit conversion, material colours, geometry icons, geometry operations, compound-ID propagation, property handlers, geometry handlers, and JSON import / export).

## Troubleshooting

### Common Issues

1. **Dependency errors during installation**
   - Try clearing npm cache: `npm cache clean --force`
   - Update npm: `npm install -g npm`
   - Then reinstall: `npm install`

2. **Application doesn't start**
   - Check if the port is already in use
   - Verify Node.js version: `node --version`
   - Check for errors in the console

3. **3D viewer doesn't render properly**
   - Ensure your graphics drivers are up to date
   - Try a different browser
   - Check if WebGL is enabled in your browser

For more help, please [open an issue](https://github.com/acolijn/geant4-geometry-editor/issues) on our GitHub repository.