# GeometryTree Component API

The GeometryTree component provides a hierarchical tree view of all geometry objects in the Geant4 Geometry Editor, allowing for navigation and selection of volumes.

## Overview

GeometryTree displays the complete geometry hierarchy as a collapsible tree structure, with visual indicators for volume types, active status, and selection state. It allows users to interact with the geometry by selecting volumes, toggling visibility, and navigating the hierarchy.

## Component Location

`src/components/viewer3D/GeometryTree.jsx`

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `geometries` | object | Yes | Object containing all geometry data |
| `selectedGeometry` | string | Yes | Key of the currently selected geometry |
| `setSelectedGeometry` | function | Yes | Function to change the selected geometry |
| `toggleGeometryVisibility` | function | Yes | Function to toggle visibility of a geometry |
| `setActiveVolume` | function | Yes | Function to set a volume as active for hit collection |
| `showContextMenu` | function | No | Function to show a context menu for a geometry |

## Key Features

### Hierarchical Display

The GeometryTree organizes volumes in a hierarchical structure:

- Parent-child relationships are visually represented through indentation
- Collapsible nodes allow for expanding/collapsing branches
- Volumes are sorted alphabetically within each level for easy navigation

### Visual Indicators

Each tree item includes visual indicators:

- Type-specific icons for each geometry type (box, sphere, cylinder, etc.)
- Special highlighting for the currently selected volume
- Visual indication of active volumes (those with hit collections)
- Visibility toggle buttons for each volume

### Interactive Features

Users can interact with the tree in several ways:

- Click on a volume to select it for editing
- Toggle the expansion state of nodes with children
- Toggle visibility of individual volumes
- Right-click for additional context menu options

### Integration with Centralized Icon System

The GeometryTree uses the centralized icon system:

- Icons are imported from the shared `geometryIcons.js` utility
- Consistent icon representation across the application
- Support for both regular and active state icons

## Usage Example

```jsx
<GeometryTree
  geometries={geometriesData}
  selectedGeometry="volume-1"
  setSelectedGeometry={handleSetSelectedGeometry}
  toggleGeometryVisibility={handleToggleVisibility}
  setActiveVolume={handleSetActiveVolume}
  showContextMenu={handleShowContextMenu}
/>
```

## Internal State

The GeometryTree manages several internal states:

- `expandedNodes`: Object mapping node keys to boolean values indicating expansion state
- `volumesByParent`: Cached grouping of volumes by their parent for efficient rendering
- `volumeNameToIndex`: Mapping of volume names to their indices for quick lookup

## Methods

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

### handleVolumeClick

Handles selection of a volume when clicked.

```jsx
const handleVolumeClick = (key, event) => {
  if (event) {
    event.stopPropagation();
  }
  setSelectedGeometry(key === selectedGeometry ? null : key);
};
```

### renderVolumeTree

Recursively renders the tree structure.

```jsx
const renderVolumeTree = (parentKey = 'world', level = 0) => {
  // Sorting and rendering logic for volumes
  return sortedVolumes.map(({ volume, key, index }) => {
    // Rendering of tree items with appropriate styling and event handlers
  });
};
```

## Integration with Other Components

The GeometryTree integrates with several other components and utilities:

- **geometryIcons.js**: For consistent icon representation
- **geometryUtils.js**: For grouping volumes by parent and other utility functions
- **PropertyEditor**: Selected volumes in the tree are edited in the PropertyEditor
- **Viewer3D**: Selection state is synchronized with the 3D view
