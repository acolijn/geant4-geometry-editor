# Element-Based Materials

Element-based materials are custom materials defined by their elemental composition. This approach allows you to create materials that are not available in the NIST database or to modify existing materials to match specific requirements.

## Overview

In the Geant4 Geometry Editor, you can create element-based materials by specifying:

- The elements that make up the material
- The proportion of each element (by number of atoms or by mass fraction)
- The overall physical properties of the material

## Creating Element-Based Materials

To create a new element-based material:

1. Go to the Materials Tab
2. Click "Create New Material"
3. Select "Element-Based Material" as the type
4. Fill in the basic properties:
   - Name: A unique identifier for the material
   - Density: The mass per unit volume
   - State: Solid, liquid, or gas
   - Temperature: Default is 293.15 K (20°C)
   - Pressure: For gases, default is 1 atmosphere

5. Add elements to the composition:
   - Click "Add Element"
   - Select an element from the periodic table
   - Specify the proportion (by number of atoms or by mass fraction)
   - Repeat for each element in the material

6. Click "Create" to add the material to your library

## Composition Methods

There are two ways to specify the elemental composition:

### By Number of Atoms

This method specifies the number of atoms of each element in the compound, similar to a chemical formula:

- For water (H₂O): 2 atoms of hydrogen, 1 atom of oxygen
- For calcium carbonate (CaCO₃): 1 atom of calcium, 1 atom of carbon, 3 atoms of oxygen

### By Mass Fraction

This method specifies the fraction of the total mass contributed by each element:

- For an alloy like brass: 70% copper, 30% zinc by mass
- For a mixture like soil: various elements with specific mass percentages

## Example: Creating Liquid Xenon

Here's an example of creating liquid xenon (LXe) as an element-based material:

1. Basic properties:
   - Name: LXe
   - Density: 3.02 g/cm³
   - State: Liquid
   - Temperature: 165 K

2. Composition:
   - Element: Xenon (Xe)
   - Proportion: 1 (single element material)

3. The JSON representation would be:
   ```json
   {
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
   }
   ```

## Advanced Properties

For more complex simulations, you can specify additional properties:

- **Mean Excitation Energy**: Affects energy loss calculations
- **Radiation Length**: Important for electromagnetic processes
- **Nuclear Interaction Length**: Relevant for hadronic processes
- **Optical Properties**: For simulations involving light

## Validation

The Geant4 Geometry Editor validates your material definition to ensure it is physically realistic:

- Density must be positive and within a reasonable range
- The sum of mass fractions must equal 1 (if using mass fractions)
- All required elements must be specified
- Temperature and pressure must be within valid ranges

## Best Practices

When creating element-based materials:

- Use accurate density values from reliable sources
- Consider the state of the material at your simulation temperature
- For compounds with known formulas, use the "By Number of Atoms" method
- For mixtures without fixed composition, use the "By Mass Fraction" method
- Document the source of your material properties for reproducibility
