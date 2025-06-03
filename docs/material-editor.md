# Material Editor

The Material Editor component provides a comprehensive interface for creating, managing, and assigning materials to geometry volumes in the Geant4 Geometry Editor.

## Overview

Materials are a crucial part of Geant4 simulations, as they define how particles interact with geometry volumes. The Material Editor allows users to:
- Create custom materials with specific properties
- Import predefined Geant4 materials
- Assign materials to geometry volumes
- Define complex material compositions

## Component Structure

The Material Editor consists of:
- **Material List** - A list of all available materials
- **Material Properties Panel** - Interface for editing material properties
- **Element Composition Editor** - For defining material compositions
- **Material Import Panel** - For importing predefined Geant4 materials

## Key Features

### Material Management

The Material Editor provides comprehensive material management capabilities:

- **Create Materials**: Define new materials from scratch
- **Edit Materials**: Modify properties of existing materials
- **Delete Materials**: Remove unused materials
- **Duplicate Materials**: Create variations of existing materials
- **Import Materials**: Import predefined materials from Geant4's database

### Material Properties

For each material, the following properties can be configured:

- **Basic Properties**:
  - Name: Unique identifier for the material
  - Display Name: User-friendly name shown in the interface
  - State: Solid, liquid, or gas
  - Density: Material density with unit selection

- **Composition**:
  - Elements: Chemical elements that make up the material
  - Fractions: Mass or atomic fractions of each element
  - Compounds: Inclusion of other materials as components

- **Physical Properties**:
  - Temperature: Operating temperature
  - Pressure: Operating pressure
  - Refractive Index: Optical property for light interactions

### Material Assignment

Materials can be assigned to geometry volumes:

- **Direct Assignment**: Assign materials directly from the Property Editor
- **Bulk Assignment**: Apply the same material to multiple volumes
- **Material Preview**: Preview how materials will appear in the 3D view

### Predefined Materials

The Material Editor includes access to Geant4's predefined materials:

- **Elements**: Basic chemical elements (H, He, C, O, etc.)
- **Simple Materials**: Common materials like water, air, aluminum
- **NIST Materials**: Standard materials from the NIST database
- **Compounds**: Common chemical compounds

## Usage

### Creating a New Material

1. Navigate to the "Materials" tab
2. Click "Create New Material"
3. Enter a name and basic properties
4. Define the composition by adding elements
5. Set additional properties as needed
6. Click "Save" to add the material to the list

### Editing a Material

1. Select the material from the list
2. Modify properties in the Material Properties Panel
3. Changes are applied automatically

### Assigning Materials to Volumes

1. Select a volume in the Geometry Editor
2. In the Property Editor, select a material from the dropdown
3. The material is applied to the selected volume

## Integration

The Material Editor integrates with other components:

- **Geometry Editor**: Materials created in the Material Editor are available for assignment to volumes
- **Viewer3D**: Materials affect the appearance of volumes in the 3D view
- **JSON Viewer**: Material definitions are included in the JSON representation

## Technical Details

### Material Definition Format

Materials are defined in a structured format:

```json
{
  "name": "Water",
  "displayName": "Water (H₂O)",
  "state": "liquid",
  "density": {
    "value": 1.0,
    "unit": "g/cm³"
  },
  "composition": {
    "type": "compound",
    "elements": [
      {
        "symbol": "H",
        "fraction": 0.111894,
        "type": "massFraction"
      },
      {
        "symbol": "O",
        "fraction": 0.888106,
        "type": "massFraction"
      }
    ]
  },
  "temperature": {
    "value": 293.15,
    "unit": "K"
  },
  "pressure": {
    "value": 101.325,
    "unit": "kPa"
  }
}
```

### Geant4 Integration

The Material Editor is designed to generate material definitions compatible with Geant4:

- **G4Material Format**: Materials are structured to match Geant4's G4Material class
- **NIST Database**: Access to Geant4's NIST material database
- **Custom Materials**: Support for defining materials not available in standard databases
