# NIST Materials

NIST materials are predefined materials from the National Institute of Standards and Technology (NIST) database that are built into Geant4. These materials have well-defined properties and compositions, making them ideal for standard simulation scenarios.

## Overview

The Geant4 Geometry Editor provides access to the complete set of NIST materials available in Geant4. These materials are ready to use without requiring manual definition of their properties or composition.

## Available NIST Materials

The NIST database includes a wide range of materials:

- **Elements**: H, He, Li, Be, B, C, N, O, F, Ne, etc.
- **Simple Materials**: Water, Carbon Dioxide, Quartz, etc.
- **Compounds**: Various plastics, glasses, biological materials, etc.

All NIST materials are prefixed with "G4_" in their names (e.g., G4_AIR, G4_WATER, G4_Si).

## Using NIST Materials

To use a NIST material in your geometry:

1. Select an object in the 3D Viewer or Geometry Tree
2. In the Properties Tab, click on the Material dropdown
3. Select the "NIST Materials" category
4. Choose the desired material from the list

## Common NIST Materials

Some commonly used NIST materials include:

| Material Name | Description | Density (g/cm³) |
|---------------|-------------|-----------------|
| G4_AIR | Dry air at sea level | 0.00120479 |
| G4_WATER | Water (H₂O) | 1.0 |
| G4_CONCRETE | Standard concrete | 2.3 |
| G4_Al | Aluminum | 2.699 |
| G4_Fe | Iron | 7.874 |
| G4_Pb | Lead | 11.35 |
| G4_PLASTIC_SC_VINYLTOLUENE | Plastic scintillator | 1.032 |
| G4_SILICON_DIOXIDE | Silicon dioxide (SiO₂) | 2.32 |
| G4_TISSUE_SOFT_ICRP | Soft tissue (ICRP) | 1.03 |

## Material Properties

When you select a NIST material, the following properties are automatically defined:

- **Density**: Mass per unit volume
- **State**: Solid, liquid, or gas
- **Temperature**: Default is 293.15 K (20°C)
- **Pressure**: Default is 1 atmosphere
- **Elemental Composition**: The elements that make up the material and their proportions

## Customizing NIST Materials

While NIST materials have predefined properties, you can create a custom material based on a NIST material:

1. Select a NIST material from the list
2. Click "Create Custom Copy"
3. Modify the properties as needed
4. Save the custom material with a new name

This allows you to maintain the basic composition while adjusting specific properties like density or temperature.

## Visualization

NIST materials are assigned default colors in the 3D Viewer based on their composition. You can customize the color of a material:

1. Select the material in the Materials Tab
2. Click on the color swatch
3. Choose a new color from the color picker
4. Click "Apply" to update the visualization

## Best Practices

When working with NIST materials:

- Use NIST materials whenever possible for standardization
- Document which NIST materials are used in your geometry
- Be aware of the physical properties of the materials you select
- Consider temperature and pressure effects for gases and some liquids
