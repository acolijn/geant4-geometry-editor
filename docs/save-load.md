# Save and Load

The Geant4 Geometry Editor provides save and load functionality through the **Project Manager** (accessible via the button in the top-right header).

## Overview

Your work can be saved and loaded in two ways:

- **Server storage** — save to / load from the Express backend (persisted on disk as JSON files)
- **JSON file export / import** — download the geometry + materials as a JSON file, or import a previously exported file

## Server Storage

The Project Manager dialog lets you:

- **Save** — saves the current geometry, materials, and hit-collection settings to the server under a project name
- **Load** — lists all projects saved on the server and loads the selected one
- **Delete** — removes a saved project from the server

Projects are stored in the `server-data/` directory on the backend.

## JSON Export / Import

From the **JSON tab** you can:

- **Download Geometry JSON** — exports the full geometry (world + volumes) and materials as a single JSON file compatible with the [geant4-simulation](https://github.com/acolijn/geant4-simulation) geometry parser
- **Import JSON** — upload a previously exported JSON file to replace the current geometry and/or materials

## Automatic Local Storage

The editor automatically saves the current state to the browser's `localStorage` after each change. If you close the browser and re-open the editor, your most recent work is restored automatically.

> **Note:** localStorage is per-browser and per-origin. To share work across machines, use server storage or JSON export.

## Best Practices

- **Save regularly** to the server for important design milestones
- **Export JSON** before large changes so you can revert if needed
- **Use descriptive project names** to keep track of different detector versions
