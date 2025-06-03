# Geometry Utilities API

This document describes the utility modules that support the Geant4 Geometry Editor's geometry-related functionality.

## geometryIcons.js

`src/components/geometry-editor/utils/geometryIcons.js`

A centralized module for defining and retrieving icons for different geometry types. This ensures consistent icon usage across all components.

### Exported Constants

#### `icons`

An object mapping geometry types to their icon representations.

```javascript
export const icons = {
  box: {
    regular: '▢', // Square
    filled: '■'    // Filled square
  },
  sphere: {
    regular: '◯', // Circle
    filled: '●'    // Filled circle
  },
  // ... other geometry types
};
```

### Exported Functions

#### `getGeometryIcon(type, isActive = false)`

Returns the appropriate icon for a geometry type.

**Parameters:**
- `type` (string): The geometry type (e.g., 'box', 'sphere')
- `isActive` (boolean, optional): Whether the volume is active

**Returns:**
- (string): The icon character

#### `getVolumeIcon(volume, isActive = false)`

Returns the icon for a specific volume object.

**Parameters:**
- `volume` (Object): The volume object
- `isActive` (boolean, optional): Whether the volume is active

**Returns:**
- (string): The icon character

## motherVolumeUtils.jsx

`src/components/geometry-editor/components/motherVolumeUtils.jsx`

A utility module for rendering hierarchical mother volume selection trees. Used by both PropertyEditor and AddNewTab components.

### Exported Functions

#### `renderMotherVolumeTree({ geometries, expandedNodes, toggleNodeExpansion, handleSelect, selectedValue, currentVolumeKey })`

Renders a hierarchical tree of volumes for mother volume selection.

**Parameters:**
- `geometries` (Object): The geometry data
- `expandedNodes` (Object): Map of expanded node keys
- `toggleNodeExpansion` (Function): Function to toggle node expansion
- `handleSelect` (Function): Function to handle volume selection
- `selectedValue` (string): Currently selected volume name
- `currentVolumeKey` (string): Key of the current volume (to prevent circular references)

**Returns:**
- (JSX.Element): The rendered tree

**Implementation Details:**
1. Creates a map of volume names to indices for quick lookup
2. Groups volumes by their parent to create the hierarchy
3. Recursively renders tree items with proper indentation and expand/collapse controls
4. Prevents circular references by excluding the current volume and its descendants
5. Sorts volumes alphabetically for consistent display
6. Displays volume icons based on geometry type

## UnitConverter.js

`src/components/geometry-editor/utils/UnitConverter.js`

Handles unit conversions for measurements in the geometry editor.

### Exported Functions

#### `toInternalUnit(value, unit, type = 'length')`

Converts a value from a display unit to the internal unit.

**Parameters:**
- `value` (number): The value to convert
- `unit` (string): The unit to convert from (e.g., 'mm', 'cm')
- `type` (string, optional): The type of measurement ('length', 'angle', etc.)

**Returns:**
- (number): The converted value in internal units

#### `fromInternalUnit(value, unit, type = 'length')`

Converts a value from internal units to a display unit.

**Parameters:**
- `value` (number): The value to convert
- `unit` (string): The unit to convert to (e.g., 'mm', 'cm')
- `type` (string, optional): The type of measurement ('length', 'angle', etc.)

**Returns:**
- (number): The converted value in the specified unit

#### `getAvailableUnits(type = 'length')`

Returns the available units for a given measurement type.

**Parameters:**
- `type` (string, optional): The type of measurement ('length', 'angle', etc.)

**Returns:**
- (Array): An array of available unit strings

## geometryUtils.js

`src/components/viewer3D/utils/geometryUtils.js`

Provides utility functions for geometry manipulation and organization.

### Exported Functions

#### `groupVolumesByParent(geometries)`

Groups volumes by their parent to create a hierarchical structure.

**Parameters:**
- `geometries` (Object): The geometry data containing volumes

**Returns:**
- (Object): An object mapping parent keys to arrays of child volumes

#### `getParentKey(volume, volumeNameToIndex)`

Computes the parent key for a volume.

**Parameters:**
- `volume` (Object): The volume object
- `volumeNameToIndex` (Object): Map of volume names to indices

**Returns:**
- (string): The parent key

#### `calculateWorldPosition(volume, geometries)`

Calculates the absolute world position of a volume.

**Parameters:**
- `volume` (Object): The volume object
- `geometries` (Object): The geometry data

**Returns:**
- (Object): The world position coordinates

#### `worldToLocalCoordinates(worldCoords, parentWorldCoords)`

Converts world coordinates to local coordinates relative to a parent.

**Parameters:**
- `worldCoords` (Object): World coordinates
- `parentWorldCoords` (Object): Parent's world coordinates

**Returns:**
- (Object): Local coordinates relative to the parent
