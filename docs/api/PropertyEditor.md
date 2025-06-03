# PropertyEditor Component API

The PropertyEditor component provides a user interface for editing the properties of selected geometry objects in the Geant4 Geometry Editor.

## Overview

PropertyEditor dynamically renders appropriate form fields based on the type of the selected geometry object. It supports all geometry types and provides specialized inputs for different property types including position, rotation, dimensions, and material properties.

## Component Location

`src/components/geometry-editor/components/PropertyEditor.jsx`

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `selectedGeometry` | string | Yes | Key of the currently selected geometry |
| `geometries` | object | Yes | Object containing all geometry data |
| `updateGeometry` | function | Yes | Function to update geometry properties |
| `deleteGeometry` | function | Yes | Function to delete the selected geometry |
| `setSelectedGeometry` | function | Yes | Function to change the selected geometry |
| `materials` | array | Yes | Array of available materials |
| `showSnackbar` | function | Yes | Function to display notification messages |

## Key Features

### Dynamic Property Fields

The PropertyEditor renders different sets of form fields based on the type of the selected geometry:

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

The PropertyEditor includes a hierarchical dropdown for selecting mother volumes:

- Uses the custom TreeSelect component
- Displays volumes in a tree structure reflecting the geometry hierarchy
- Shows appropriate icons for each volume type
- Prevents circular references by excluding the current volume and its descendants
- Allows expanding/collapsing branches for better navigation

### Unit Conversion

All dimension inputs support unit conversion:

- Uses the NumericInput component with unit selection
- Automatically converts between different units (mm, cm, m, etc.)
- Maintains precision during conversion

### Property Validation

The PropertyEditor validates inputs to ensure they meet requirements:

- Checks for required fields
- Validates numeric inputs for proper ranges
- Prevents invalid configurations

### Context Menu

Provides a context menu for additional actions:

- Delete geometry
- Duplicate geometry
- Set as active volume
- Configure hit collection

## Usage Example

```jsx
<PropertyEditor
  selectedGeometry="volume-1"
  geometries={geometriesData}
  updateGeometry={handleUpdateGeometry}
  deleteGeometry={handleDeleteGeometry}
  setSelectedGeometry={handleSetSelectedGeometry}
  materials={materialsList}
  showSnackbar={handleShowSnackbar}
/>
```

## Internal State

The PropertyEditor manages several internal states:

- `editedGeometry`: A working copy of the geometry being edited
- `menuAnchorEl`: Anchor element for the context menu
- `isMenuOpen`: Boolean flag indicating if the context menu is open
- `hitCollectionsDialogOpen`: Boolean flag for the hit collections dialog
- `errors`: Object tracking validation errors for various fields

## Methods

### handleInputChange

Handles changes to input fields and updates the edited geometry.

```jsx
const handleInputChange = (field, value) => {
  setEditedGeometry(prev => ({
    ...prev,
    [field]: value
  }));
};
```

### handleUnitChange

Handles changes to unit selection for numeric inputs.

```jsx
const handleUnitChange = (field, unit) => {
  setEditedGeometry(prev => ({
    ...prev,
    [`${field}_unit`]: unit
  }));
};
```

### handleSave

Validates inputs and saves changes to the geometry.

```jsx
const handleSave = () => {
  // Validation logic
  updateGeometry(selectedGeometry, editedGeometry);
};
```

### handleMotherVolumeChange

Handles selection of a new mother volume.

```jsx
const handleMotherVolumeChange = (value) => {
  setEditedGeometry(prev => ({
    ...prev,
    mother_volume: value
  }));
};
```

## Integration with Other Components

The PropertyEditor integrates with several other components:

- **TreeSelect**: For hierarchical mother volume selection
- **NumericInput**: For dimension inputs with unit conversion
- **HitCollectionsDialog**: For configuring hit collections
- **motherVolumeUtils**: For rendering the mother volume selection tree
