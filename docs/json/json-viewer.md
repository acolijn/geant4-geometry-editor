# JSON Viewer

The JSON Viewer provides a live, read-only view of the combined geometry and materials JSON used by the editor.

## Overview

The JSON Viewer offers:

- Real-time combined JSON output
- JSON file download
- JSON file import into the current editor session
- Status feedback for import success/failure
- Quick scroll-to-top for long documents

## Accessing the JSON Viewer

The JSON Viewer is available in the **JSON** tab.

1. Open the `JSON` tab from the main interface.
2. Review the generated JSON shown in the panel.

## Features

### JSON Display

The panel shows combined JSON generated from the current in-memory state:

- geometry (`world` + `volumes`)
- material definitions
- related metadata used by import/export handlers

### JSON Actions

The JSON Viewer provides several actions:

- **Download JSON**: writes the current combined JSON to `geometry.json`
- **Import JSON**: loads a `.json` file and applies parsed geometry/material updates
- **Top**: scrolls the JSON panel back to the beginning

## Import and Export

### Exporting JSON

To export the current state:

2. Click "Download JSON"
3. Save the generated `geometry.json` file

### Importing JSON

To import from file:

1. Click "Import JSON"
2. Select a valid `.json` file
3. The app parses and imports geometry/material data
4. A success or error alert is shown at the bottom of the screen

## Best Practices

When working with the JSON Viewer:

- Keep versioned backups of exported files
- Use import to migrate geometry/material snapshots between sessions
- Prefer editing geometry in the Geometry tab unless a bulk JSON update is required
