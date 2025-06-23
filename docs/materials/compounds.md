# Compounds

Compounds in the Geant4 Geometry Editor are materials composed of other materials in specific proportions. This approach allows you to create complex materials by combining existing materials rather than defining them from scratch at the elemental level.

## Overview

Compound materials are particularly useful for:

- Creating layered or composite materials
- Defining mixtures of other materials
- Representing complex materials with known component materials
- Creating materials with varying compositions for sensitivity studies

## Creating Compound Materials

To create a new compound material:

1. Go to the Materials Tab
2. Click "Create New Material"
3. Select "Compound" as the type
4. Fill in the basic properties:
   - Name: A unique identifier for the compound
   - Density: The mass per unit volume (can be calculated automatically)
   - State: Solid, liquid, or gas
   - Temperature: Default is 293.15 K (20°C)
   - Pressure: For gases, default is 1 atmosphere

5. Add component materials:
   - Click "Add Component"
   - Select a material from your material library
   - Specify the proportion (by volume fraction or by mass fraction)
   - Repeat for each component material

6. Click "Create" to add the compound to your material library

## Composition Methods

There are two ways to specify the composition of a compound:

### By Mass Fraction

This method specifies the fraction of the total mass contributed by each component material:

- For concrete: 70% aggregate, 25% cement, 5% water by mass
- For tissue-equivalent material: 40% muscle tissue, 40% fat tissue, 20% bone tissue by mass

### By Volume Fraction

This method specifies the fraction of the total volume occupied by each component material:

- For a composite: 60% epoxy resin, 40% carbon fiber by volume
- For a sandwich material: 80% foam core, 10% upper skin, 10% lower skin by volume

## Density Calculation

When creating a compound material, you can:

1. **Specify the density directly**: Use this when the density of the compound is known
2. **Calculate the density automatically**: Based on the component materials and their proportions

For automatic calculation:

- With mass fractions: The density is calculated using the weighted harmonic mean
- With volume fractions: The density is calculated using the weighted arithmetic mean

## Example: Creating a Scintillator Mixture

Here's an example of creating a plastic scintillator compound:

1. Basic properties:
   - Name: MyScintillator
   - State: Solid
   - Temperature: 293.15 K

2. Composition (by mass fraction):
   - Material 1: Polystyrene (95%)
   - Material 2: PPO (2,5-diphenyloxazole) (4.5%)
   - Material 3: POPOP (1,4-bis(5-phenyloxazol-2-yl)benzene) (0.5%)

3. The density is calculated automatically based on the component materials

## Advanced Properties

For compound materials, you can specify additional properties:

- **Optical Properties**: Refractive index, absorption length, etc.
- **Scintillation Properties**: Light yield, decay time, etc.
- **Birks Constant**: For scintillation materials

These properties can either be:
- Inherited from the component materials (weighted by their proportions)
- Specified explicitly for the compound

## Visualization

Compound materials are assigned default colors in the 3D Viewer based on their composition. You can customize the color of a compound:

1. Select the compound in the Materials Tab
2. Click on the color swatch
3. Choose a new color from the color picker
4. Click "Apply" to update the visualization

## Best Practices

When creating compound materials:

- Use accurate component proportions from reliable sources
- Consider whether mass or volume fractions are more appropriate for your material
- Verify the calculated density against known values when possible
- Document the composition and source of your compound materials
- Use meaningful names that indicate the composition or purpose of the compound
