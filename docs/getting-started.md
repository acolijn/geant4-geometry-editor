# Getting Started

This guide will help you get started with the Geant4 Geometry Editor.

## Installation

The Geant4 Geometry Editor is a web application that can be run locally on your machine.

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/geant4-geometry-editor.git
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

4. Open your browser and navigate to `http://localhost:5173` (or the URL shown in your terminal).

## Quick Start Guide

### Creating Your First Geometry

1. **Start with the World Volume**:
   - When you first open the application, you'll see the World volume (a large box)
   - Select the World volume by clicking on it in the 3D viewer
   - Adjust its size in the Properties panel if needed

2. **Add a New Volume**:
   - Click on the "Add New" tab in the Properties panel
   - Select the geometry type (Box, Cylinder, or Sphere)
   - Click "Add Geometry"
   - The new volume will appear in the 3D viewer

3. **Edit Volume Properties**:
   - Select the volume in the 3D viewer
   - Use the Properties panel to adjust:
     - Name
     - Material
     - Position (x, y, z)
     - Rotation (x, y, z)
     - Size/dimensions

4. **Export Your Geometry**:
   - Switch to the JSON tab
   - Click "Download JSON" to save your geometry configuration
   - This file can be used with Geant4 simulations that support JSON geometry configuration

### Saving and Loading

- Your work is automatically saved to your browser's localStorage
- When you reopen the application, your latest geometry will be loaded automatically
