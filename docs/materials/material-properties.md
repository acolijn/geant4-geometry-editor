# Material Properties

Material properties in the Geant4 Geometry Editor define how particles interact with materials in your simulation. Properly configured material properties are essential for accurate simulation results.

## Overview

The Geant4 Geometry Editor allows you to define various properties for materials, including:

- Basic physical properties (density, state, temperature, pressure)
- Elemental or material composition
- Electromagnetic properties
- Optical properties
- Nuclear properties

## Basic Physical Properties

### Density

Density is the mass per unit volume of the material. In the Geant4 Geometry Editor, you can specify density with different units:

- g/cm³ (grams per cubic centimeter)
- kg/m³ (kilograms per cubic meter)
- mg/cm³ (milligrams per cubic centimeter)

The density affects how particles lose energy when traversing the material.

### State

Materials can be in one of three states:

- **Solid**: Rigid materials with fixed shape
- **Liquid**: Fluid materials that take the shape of their container
- **Gas**: Fluid materials that expand to fill their container

The state affects certain physical processes in the simulation.

### Temperature

Temperature is specified in Kelvin (K) by default. The temperature can affect:

- Material density (especially for gases)
- Certain physical processes (like thermal neutron scattering)
- Doppler broadening of cross-sections

### Pressure

Pressure is relevant mainly for gases and is specified in atmospheres (atm) by default. Other units include:

- Pascal (Pa)
- Bar
- Torr

## Electromagnetic Properties

### Mean Excitation Energy

The mean excitation energy (I-value) affects the energy loss of charged particles in the material. It is specified in eV (electron volts).

### Radiation Length

The radiation length is the mean distance over which a high-energy electron loses all but 1/e of its energy by bremsstrahlung. It is specified in length units (mm, cm, m).

### Nuclear Interaction Length

The nuclear interaction length is the mean free path for nuclear interactions. It is specified in length units (mm, cm, m).

## Optical Properties

For simulations involving light, you can define optical properties:

### Refractive Index

The refractive index can be specified as:

- A constant value
- A function of photon energy (wavelength)

### Absorption Length

The absorption length determines how far light travels before being absorbed. It can be specified as:

- A constant value
- A function of photon energy

### Scintillation Properties

For scintillating materials, you can define:

- Light yield (photons per MeV)
- Fast and slow time constants
- Emission spectrum

### Reflectivity

For surface materials, you can define:

- Reflectivity coefficient
- Type of reflection (specular, diffuse)
- Surface roughness

## Editing Material Properties

To edit the properties of a material:

1. Go to the Materials Tab
2. Select the material from the list
3. The properties panel will display all editable properties
4. Modify the values as needed
5. Click "Apply" to save the changes

## Advanced Properties

For specialized simulations, you can define additional properties:

### Birks Constant

For scintillators, the Birks constant affects the non-linear light yield for heavily ionizing particles.

### Stopping Power

Custom stopping power tables can be defined for specific particle types.

### Cross-Sections

Custom cross-section data can be imported for specific nuclear interactions.

## Validation

The Geant4 Geometry Editor validates material properties to ensure they are physically realistic:

- Density must be positive and within a reasonable range
- Temperature must be positive
- Pressure must be positive
- Optical properties must be physically consistent

## Best Practices

When defining material properties:

- Use accurate values from reliable sources
- Consider the temperature and pressure conditions of your simulation
- For optical simulations, ensure the refractive index and absorption length cover the relevant wavelength range
- Document the source of your material property data
- Verify critical properties against experimental data when possible
