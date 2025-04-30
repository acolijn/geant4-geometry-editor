# Materials

The Geant4 Geometry Editor allows you to define and manage materials for your geometry components. This guide explains how to work with materials in the editor.

## Material Types

The editor supports three types of materials:

### 1. NIST Materials

Pre-defined materials from the Geant4 NIST database.

**Properties:**
- **Name**: The NIST material name (e.g., "G4_AIR", "G4_WATER", "G4_Si")
- **Type**: Set to "nist"

**Example JSON:**
```json
"G4_AIR": {
  "type": "nist",
  "name": "G4_AIR"
}
```

### 2. Element-Based Materials

Simple materials composed of a single element.

**Properties:**
- **Density**: Material density value
- **Density Unit**: Unit for density (e.g., "g/cm3")
- **State**: Physical state ("solid", "liquid", "gas")
- **Temperature**: Temperature value
- **Temperature Unit**: Unit for temperature (e.g., "kelvin")
- **Composition**: The element and its proportion (usually 1)

**Example JSON:**
```json
"LXe": {
  "type": "element_based",
  "density": 3.02,
  "density_unit": "g/cm3",
  "state": "liquid",
  "temperature": 165.0,
  "temperature_unit": "kelvin",
  "composition": {
    "Xe": 1
  }
}
```

### 3. Compound Materials

Complex materials composed of multiple elements or other materials.

**Properties:**
- **Density**: Material density value
- **Density Unit**: Unit for density (e.g., "g/cm3")
- **State**: Physical state ("solid", "liquid", "gas")
- **Temperature**: Temperature value
- **Temperature Unit**: Unit for temperature (e.g., "kelvin")
- **Composition**: Elements/materials and their proportions

**Example JSON:**
```json
"Scintillator": {
  "type": "compound",
  "density": 1.032,
  "density_unit": "g/cm3",
  "state": "solid",
  "temperature": 293.15,
  "temperature_unit": "kelvin",
  "composition": {
    "C": 9,
    "H": 10,
    "O": 1
  }
}
```

## Managing Materials in the Editor

### Viewing Materials

1. Click on the "Materials" tab in the main navigation
2. The left panel shows a list of all defined materials
3. Select a material to view its properties in the right panel

### Creating a New Material

1. Click on the "Materials" tab
2. Click the "Add Material" button
3. Enter a unique name for the material
4. Select the material type (NIST, element-based, or compound)
5. Fill in the required properties based on the material type
6. For compounds, add elements and their proportions
7. Click "Save Material"

### Editing a Material

1. Select the material from the list
2. Modify the properties in the right panel
3. Click "Update Material" to save changes

### Deleting a Material

1. Select the material from the list
2. Click the "Delete Material" button
3. Confirm the deletion

## Material Properties in Geant4

When the geometry is exported to JSON and used in a Geant4 simulation, the materials are created using:

- For NIST materials: `G4NistManager::FindOrBuildMaterial()`
- For element-based materials: `G4Element` and `G4Material`
- For compounds: Multiple `G4Element` objects combined in a `G4Material`

The physical properties (density, state, temperature) and composition are used to define the material's behavior in the simulation.
