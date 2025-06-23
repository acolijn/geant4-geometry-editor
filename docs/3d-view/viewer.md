# 3D Viewer

The 3D Viewer is the central component of the Geant4 Geometry Editor, providing an interactive visualization of your geometry.

## Overview

The 3D Viewer renders your geometry in three dimensions, allowing you to visualize, inspect, and interact with your design. It uses Three.js to provide a high-performance WebGL-based rendering of complex geometries.

## Features

### Visualization

- **Real-time Rendering**: See your geometry in 3D as you build it
- **Materials Visualization**: Different materials are displayed with distinct colors
- **Wireframe Mode**: Toggle between solid and wireframe display
- **Axes Display**: Optional coordinate axes to help with orientation
- **Grid**: Optional reference grid to help with positioning

### Navigation

The 3D Viewer provides intuitive controls for navigating your 3D scene:

- **Rotate**: Click and drag with the left mouse button
- **Pan**: Click and drag with the middle mouse button or use Shift + left mouse button
- **Zoom**: Use the mouse wheel or right mouse button drag up/down
- **Reset View**: Button to reset the camera to the default position
- **Focus**: Double-click on an object to center the view on it

### Selection

- Click on any object in the 3D Viewer to select it
- The selected object will be highlighted
- The properties of the selected object will be displayed in the Properties Tab
- Multiple selection is possible by holding the Ctrl key while clicking

### Transformation Controls

When an object is selected, transformation controls appear in the 3D Viewer:

- **Translation**: Move the object along the X, Y, or Z axis
- **Rotation**: Rotate the object around the X, Y, or Z axis
- **Scaling**: Resize the object along the X, Y, or Z axis (for certain geometry types)

These controls provide visual feedback as you manipulate objects, making it easy to position and orient them precisely.

### Clipping Planes

The 3D Viewer supports clipping planes to see inside complex geometries:

- **X, Y, Z Clipping**: Slice the geometry along any axis
- **Adjustable Position**: Control the position of the clipping plane
- **Toggle On/Off**: Enable or disable clipping as needed

## Display Options

The 3D Viewer provides several options to customize the display:

- **Background Color**: Change the background color of the 3D scene
- **Lighting**: Adjust the lighting to enhance visibility
- **Shadows**: Toggle shadows on or off
- **Transparency**: Control the transparency of objects
- **Edge Highlighting**: Emphasize the edges of geometry objects

## Performance Tips

For complex geometries with many objects, consider these tips to improve performance:

- **Level of Detail**: Use simpler geometries for distant or less important objects
- **Visibility Toggle**: Hide complex parts of the geometry when not needed
- **Instance Reuse**: Use instances for repeated objects instead of duplicating geometry
- **Wireframe Mode**: Switch to wireframe mode when working with very complex scenes
