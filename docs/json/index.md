# JSON Formats

The Geant4 Geometry Editor uses JSON (JavaScript Object Notation) as the format for exporting and importing geometries and materials. This section provides detailed information about the different JSON formats used in the application.

## Overview

JSON is a lightweight data-interchange format that is easy for humans to read and write and easy for machines to parse and generate. The Geant4 Geometry Editor uses JSON to represent:

- Geometry definitions
- Material properties
- Complete project configurations

These JSON formats are designed to be compatible with Geant4 simulation tools, allowing for seamless integration.

## JSON Format Types

The Geant4 Geometry Editor supports several JSON format types:

- [Geometry JSON](geometry-json.md): Defines the geometry objects and their properties
- [Materials JSON](materials-json.md): Defines materials and their properties
- [Combined JSON](combined-json.md): Includes both geometry and materials in a single file
- [Template JSON](template-json.md): Reusable templates for common geometries

## JSON Viewer

The application includes a [JSON Viewer](json-viewer.md) that allows you to:

- View the JSON representation of your current design
- Copy JSON to clipboard
- Download JSON files
- Validate JSON against the expected schema

## JSON Schema

Each JSON format follows a specific schema that defines the structure and required fields. Understanding these schemas is important for:

- Creating valid JSON files manually
- Parsing JSON files in external applications
- Extending the functionality of the Geant4 Geometry Editor

## Next Steps

Explore the detailed documentation for each JSON format:

- [Geometry JSON](geometry-json.md)
- [Materials JSON](materials-json.md)
