# Geometry Editor API

Main editor panel for creating, selecting, and editing geometry objects.

<a name="RefactoredGeometryEditor"></a>

## `RefactoredGeometryEditor(props)`
Main GeometryEditor component - Refactored Version

This component provides a comprehensive interface for creating, editing, and managing
geometries for Geant4 simulations.

**Kind**: global function  
**Params**

- props <code>Object</code> - Component props
    - .geometries <code>Object</code> - The geometry objects (world and volumes)
    - .materials <code>Array</code> - List of available materials
    - .selectedGeometry <code>string</code> - ID of the currently selected geometry
    - .hitCollections <code>Array</code> - List of hit collections for the detector
    - .onUpdateHitCollections <code>function</code> - Callback to update hit collections
    - .onUpdateGeometry <code>function</code> - Callback to update a geometry object
    - .onAddGeometry <code>function</code> - Callback to add a new geometry object
    - .onRemoveGeometry <code>function</code> - Callback to remove a geometry object
    - .updateDialogData <code>Object</code> - Data for the update dialog
    - .updateDialogOpen <code>boolean</code> - State of the update dialog
    - .setUpdateDialogOpen <code>function</code> - Callback to set the update dialog state

