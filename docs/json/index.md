# JSON Formats

The Geant4 Geometry Editor uses JSON (JavaScript Object Notation) as the format for exporting and importing geometries and materials. This section provides detailed information about the different JSON formats used in the application.

## Overview

JSON is a lightweight data-interchange format that is easy for humans to read and write and easy for machines to parse and generate. The Geant4 Geometry Editor uses JSON to represent:

- Geometry definitions
- Material properties
- Complete project configurations

These JSON formats are designed to be compatible with Geant4 simulation tools, allowing for seamless integration.

## JSON Format Types

The current JSON workflow in the app is centered on a combined document that includes:

- `geometries`: the `world` object and `volumes` array
- `materials`: material definitions keyed by material name
- optional `hitCollections`: detector hit collection definitions

## JSON Viewer

The application includes a [JSON Viewer](json-viewer.md) that allows you to:

- View the generated combined JSON in real time
- Download the current JSON to a file
- Import a JSON file back into the editor state

## Next Steps

See [JSON Viewer](json-viewer.md) for import/export behavior and practical usage.
