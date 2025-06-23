# JSON Viewer

The JSON Viewer in the Geant4 Geometry Editor provides a user-friendly interface for viewing, editing, and validating the JSON representation of your geometry and materials.

## Overview

The JSON Viewer offers:

- Real-time JSON representation of your current design
- Syntax highlighting for better readability
- Validation of JSON against expected schemas
- Tools for copying, downloading, and importing JSON
- Support for different JSON formats

## Accessing the JSON Viewer

The JSON Viewer is available in the JSON Tab of the Geant4 Geometry Editor. To access it:

1. Click on the "JSON" tab in the main navigation
2. Select the desired JSON format from the dropdown menu:
   - Geometry JSON
   - Materials JSON
   - Combined JSON
   - Template JSON

## Features

### JSON Display

The JSON Viewer displays the JSON representation of your current design with:

- Syntax highlighting for different JSON elements (strings, numbers, keys, etc.)
- Collapsible sections for better navigation of complex structures
- Line numbers for easy reference
- Automatic formatting for readability

### Format Selection

You can view different JSON formats:

- **Geometry JSON**: Shows only the geometry objects and their properties
- **Materials JSON**: Shows only the material definitions
- **Combined JSON**: Shows both geometry and materials in a single view
- **Template JSON**: Shows parameterized templates for reusable geometries

### JSON Actions

The JSON Viewer provides several actions:

- **Copy to Clipboard**: Copy the entire JSON or selected portions
- **Download JSON**: Save the JSON to a file on your computer
- **Format JSON**: Reformat the JSON for better readability
- **Validate JSON**: Check the JSON against the expected schema
- **Import JSON**: Load JSON from a file or paste it directly

### Search and Navigation

To find specific content in the JSON:

1. Use the search box to find text within the JSON
2. Use keyboard shortcuts (Ctrl+F) for standard search functionality
3. Use the collapse/expand buttons to focus on specific sections

### Validation

The JSON Viewer validates the JSON against the expected schema:

- **Syntax Validation**: Checks for proper JSON syntax
- **Schema Validation**: Ensures the JSON follows the expected structure
- **Reference Validation**: Verifies that all references (like material names) are valid
- **Error Highlighting**: Highlights errors in the JSON with clear messages

## Editing JSON

While the primary way to create geometry is through the visual editor, you can also edit the JSON directly:

1. Make changes to the JSON in the viewer
2. Click "Validate" to check for errors
3. Click "Apply Changes" to update the geometry based on the edited JSON

This is particularly useful for:
- Making bulk changes
- Copying and pasting similar structures
- Fine-tuning numerical values
- Adding advanced properties not available in the UI

## Import and Export

### Exporting JSON

To export the current design as JSON:

1. Select the desired format from the dropdown
2. Click "Download JSON"
3. Choose a location and filename
4. The JSON file will be saved to your computer

### Importing JSON

To import JSON:

1. Click "Import JSON"
2. Select a JSON file or paste JSON directly
3. The JSON will be validated
4. Click "Apply" to load the imported JSON

## JSON Diff

The JSON Viewer includes a diff tool to compare different versions of your JSON:

1. Click "Compare JSON"
2. Select or paste the JSON to compare with the current JSON
3. The differences will be highlighted:
   - Added content in green
   - Removed content in red
   - Modified content in yellow

## Best Practices

When working with the JSON Viewer:

- Use the visual editor for creating and modifying geometry when possible
- Use the JSON Viewer for advanced operations and fine-tuning
- Always validate JSON after manual editing
- Keep backups of important JSON files
- Use meaningful names and consistent formatting in your JSON
- Document any non-standard or custom properties you add to the JSON
