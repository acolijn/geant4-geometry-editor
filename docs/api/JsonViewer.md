# JSON Viewer API

Displays and imports combined geometry/material JSON.

<a name="JsonViewer"></a>

## `JsonViewer(props)` ⇒ <code>JSX.Element</code>
JSON viewer for exporting and importing combined geometry/material state.

**Kind**: global function  
**Returns**: <code>JSX.Element</code> - JSON viewer UI.  
**Params**

- props <code>Object</code> - Component props.
    - .geometries <code>Object</code> - Current geometry state.
    - .materials <code>Object</code> - Current material definitions.
    - .onImportGeometries <code>function</code> - Callback to replace geometries after import.
    - .onImportMaterials <code>function</code> - Callback to replace materials after import.

