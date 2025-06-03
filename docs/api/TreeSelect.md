# TreeSelect Component API

The TreeSelect component is a custom hierarchical dropdown selection component that provides a tree-like interface for selecting items from a nested structure. It's particularly useful for selecting volumes in a geometry hierarchy.

## Overview

TreeSelect extends the functionality of a standard dropdown by supporting hierarchical data with collapsible tree nodes. It's used in both the PropertyEditor and AddNewTab components for mother volume selection.

## Component Location

`src/components/geometry-editor/components/TreeSelect.jsx`

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | string | Yes | - | The currently selected value |
| `onChange` | function | Yes | - | Callback function called when selection changes |
| `label` | string | Yes | - | Label text for the dropdown |
| `renderValue` | function | No | (value) => value | Function to render the selected value display |
| `renderTree` | function | Yes | - | Function that renders the tree structure inside the dropdown |
| `placeholder` | string | No | "Select..." | Placeholder text when no value is selected |
| `fullWidth` | boolean | No | false | Whether the component should take up the full width of its container |
| `margin` | string | No | "none" | Margin setting (none, dense, normal) |
| `disabled` | boolean | No | false | Whether the dropdown is disabled |
| `error` | boolean | No | false | Whether to show error styling |
| `helperText` | string | No | "" | Helper text to display below the dropdown |
| `required` | boolean | No | false | Whether the field is required |

## Usage Example

```jsx
<TreeSelect
  value={motherVolume}
  onChange={handleMotherVolumeChange}
  label="Mother Volume"
  renderValue={(value) => {
    // Find the volume object that matches the selected value
    const motherVolume = geometries.volumes?.find(v => v.name === value);
    // Return the display name or the raw value
    return motherVolume ? (motherVolume.displayName || motherVolume.name) : value;
  }}
  renderTree={({ expandedNodes, toggleNodeExpansion, handleSelect, selectedValue }) => {
    return renderMotherVolumeTree({
      geometries,
      expandedNodes,
      toggleNodeExpansion,
      handleSelect,
      selectedValue,
      currentVolumeKey: selectedGeometry
    });
  }}
  fullWidth
  margin="normal"
  required
/>
```

## Internal State

The TreeSelect component manages several internal states:

- `anchorEl`: Tracks the DOM element that the dropdown should be anchored to
- `open`: Boolean flag indicating whether the dropdown is open
- `expandedNodes`: Object mapping node keys to boolean values indicating expansion state
- `width`: Width of the input element, used to size the dropdown appropriately

## Methods

### toggleOpen

Opens or closes the dropdown menu.

```jsx
const toggleOpen = (event) => {
  setAnchorEl(open ? null : event.currentTarget);
  setOpen(!open);
};
```

### toggleNodeExpansion

Expands or collapses a specific node in the tree.

```jsx
const toggleNodeExpansion = (key, event) => {
  if (event) {
    event.stopPropagation();
  }
  setExpandedNodes(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
};
```

### handleSelect

Handles selection of an item from the tree.

```jsx
const handleSelect = (value, event) => {
  if (event) {
    event.stopPropagation();
  }
  onChange(value);
  setAnchorEl(null);
  setOpen(false);
};
```

## Styling

The TreeSelect component uses Material-UI's styling system with the following key style elements:

- FormControl for the overall layout
- InputLabel for the dropdown label
- OutlinedInput for the input field
- Popper for the dropdown menu
- Custom styling for tree nodes including indentation, icons, and hover effects

## Accessibility

The component implements several accessibility features:

- Proper ARIA attributes for the dropdown
- Keyboard navigation support
- Focus management when opening/closing the dropdown
- Visual feedback for hover and selection states
