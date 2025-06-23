# Installation and Setup

This guide will walk you through the process of installing and setting up the Geant4 Geometry Editor.

## Prerequisites

Before installing the Geant4 Geometry Editor, ensure you have the following:

- [Node.js](https://nodejs.org/) (v14.0.0 or higher)
- [npm](https://www.npmjs.com/) (v6.0.0 or higher)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

## Installation

### Option 1: Clone from GitHub

1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/geant4-geometry-editor.git
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

4. Open your browser and navigate to `http://localhost:3000` (or the port shown in your terminal).

### Option 2: Using npm

1. Install the package globally:
   ```bash
   npm install -g geant4-geometry-editor
   ```

2. Run the editor:
   ```bash
   geant4-geometry-editor
   ```

## Building for Production

To build the application for production:

```bash
npm run build
```

The built files will be in the `dist` directory and can be served using any static file server.

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

For more help, please [open an issue](https://github.com/your-organization/geant4-geometry-editor/issues) on our GitHub repository.