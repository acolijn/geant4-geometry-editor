# JSON Viewer

The JSON Viewer component provides a way to view, edit, and export the JSON representation of the geometry configuration in the Geant4 Geometry Editor.

## Overview

The JSON Viewer offers a direct interface to the underlying data structure of the geometry configuration. It allows users to:
- View the complete JSON representation of the geometry
- Edit the JSON directly for advanced customization
- Export the JSON for use in other applications or for backup purposes

## Component Structure

The JSON Viewer consists of:
- **JSON Editor** - A syntax-highlighted editor for viewing and modifying JSON
- **Export Controls** - Buttons for exporting the JSON to a file
- **Format Controls** - Options for formatting the JSON display

## Key Features

### JSON Representation

The JSON Viewer displays the complete geometry configuration in JSON format:

- **Volumes**: All volume definitions with their properties
- **Materials**: Material definitions used in the geometry
- **Hierarchy**: Parent-child relationships between volumes
- **Transformations**: Position and rotation information
- **Properties**: All configurable properties of each volume

### Direct Editing

For advanced users, the JSON Viewer allows direct editing of the geometry configuration:

- **Syntax Highlighting**: Color-coded syntax for easier editing
- **Validation**: Real-time validation of JSON syntax
- **Error Highlighting**: Visual indication of syntax errors
- **Auto-formatting**: Option to automatically format the JSON for readability

### Export Options

The JSON Viewer provides several ways to export the geometry configuration:

- **Download as File**: Save the JSON to a local file
- **Copy to Clipboard**: Copy the JSON for pasting elsewhere
- **Export Selected**: Export only selected parts of the configuration

## Usage

### Viewing JSON

1. Navigate to the "JSON" tab in the main interface
2. The complete JSON representation of the current geometry will be displayed
3. Use the formatting controls to adjust the display (indentation, line breaks, etc.)

### Editing JSON

1. Navigate to the "JSON" tab
2. Make changes directly in the JSON editor
3. Syntax errors will be highlighted in real-time
4. Click "Apply Changes" to update the geometry based on the edited JSON

### Exporting JSON

1. Navigate to the "JSON" tab
2. Click the "Export" button
3. Choose the export format and destination
4. The JSON will be exported according to your selection

## Integration

The JSON Viewer integrates with other components:

- **Geometry Editor**: Changes made in the Geometry Editor are reflected in the JSON
- **Material Editor**: Material definitions are included in the JSON representation
- **Viewer3D**: The 3D visualization is based on the geometry defined in the JSON

## Technical Details

### JSON Schema

The JSON representation follows a specific schema:

```json
{
  "volumes": [
    {
      "name": "World",
      "type": "box",
      "dimensions": { "x": 1000, "y": 1000, "z": 1000 },
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "material": "G4_AIR"
    },
    // Other volumes...
  ],
  "materials": [
    // Material definitions...
  ]
}
```

### Performance Considerations

For large geometry configurations, the JSON representation can become quite large. The JSON Viewer includes optimizations to handle large JSON structures:

- **Virtualized Rendering**: Only visible parts of the JSON are rendered
- **Lazy Parsing**: JSON is parsed incrementally as needed
- **Efficient Updates**: Only changed parts of the JSON are re-rendered
