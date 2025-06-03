# AddNewTab Component API

The AddNewTab component provides a user interface for creating new geometry objects in the Geant4 Geometry Editor.

## Overview

AddNewTab allows users to create new geometry objects by selecting the type, specifying dimensions and other properties, and placing them in the geometry hierarchy. It supports all available geometry types and provides appropriate form fields for each type.

## Component Location

`src/components/geometry-editor/components/AddNewTab.jsx`

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `geometries` | object | Yes | Object containing all geometry data |
| `addGeometry` | function | Yes | Function to add a new geometry object |
| `materials` | array | Yes | Array of available materials |
| `showSnackbar` | function | Yes | Function to display notification messages |

## Key Features

### Geometry Type Selection

Users can select from various geometry types:

- Box
- Sphere
- Cylinder
- Ellipsoid
- Torus
- Polycone
- Trapezoid
- Assembly (container for other volumes)

### Dynamic Property Fields

The component renders different sets of form fields based on the selected geometry type:

- **Common Properties**: Name, display name, material, position, rotation, mother volume
- **Type-Specific Properties**: 
  - Box: width, height, depth
  - Sphere: radius
  - Cylinder: radius, height
  - Ellipsoid: x radius, y radius, z radius
  - Torus: inner radius, outer radius
  - Polycone: complex parameters for z-planes
  - Trapezoid: dimensions for both faces

### Mother Volume Selection

The AddNewTab includes a hierarchical dropdown for selecting mother volumes:

- Uses the custom TreeSelect component
- Displays volumes in a tree structure reflecting the geometry hierarchy
- Shows appropriate icons for each volume type
- Allows expanding/collapsing branches for better navigation

### Unit Conversion

All dimension inputs support unit conversion:

- Uses the NumericInput component with unit selection
- Automatically converts between different units (mm, cm, m, etc.)
- Maintains precision during conversion

### Property Validation

The AddNewTab validates inputs to ensure they meet requirements:

- Checks for required fields
- Validates numeric inputs for proper ranges
- Prevents invalid configurations
- Shows validation errors with appropriate messages

## Usage Example

```jsx
<AddNewTab
  geometries={geometriesData}
  addGeometry={handleAddGeometry}
  materials={materialsList}
  showSnackbar={handleShowSnackbar}
/>
```

## Internal State

The AddNewTab manages several internal states:

- `newGeometry`: Object containing properties of the geometry being created
- `selectedType`: The selected geometry type
- `errors`: Object tracking validation errors for various fields

## Methods

### handleTypeChange

Handles selection of a new geometry type and resets the form with appropriate defaults.

```jsx
const handleTypeChange = (event) => {
  const type = event.target.value;
  setSelectedType(type);
  setNewGeometry({
    type,
    name: '',
    displayName: '',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: materials[0]?.name || '',
    mother_volume: 'World',
    // Type-specific defaults are added here
  });
};
```

### handleInputChange

Handles changes to input fields and updates the new geometry object.

```jsx
const handleInputChange = (field, value) => {
  setNewGeometry(prev => ({
    ...prev,
    [field]: value
  }));
};
```

### handleCreate

Validates inputs and creates a new geometry object.

```jsx
const handleCreate = () => {
  // Validation logic
  addGeometry(newGeometry);
  // Reset form
};
```

### handleMotherVolumeChange

Handles selection of a mother volume.

```jsx
const handleMotherVolumeChange = (value) => {
  setNewGeometry(prev => ({
    ...prev,
    mother_volume: value
  }));
};
```

## Integration with Other Components

The AddNewTab integrates with several other components:

- **TreeSelect**: For hierarchical mother volume selection
- **NumericInput**: For dimension inputs with unit conversion
- **motherVolumeUtils**: For rendering the mother volume selection tree
