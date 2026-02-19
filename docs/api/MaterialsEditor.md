# Materials Editor API

Material creation and editing UI for NIST and custom materials.

<a name="MaterialsEditor"></a>

## `MaterialsEditor(props)` ⇒ <code>JSX.Element</code>
Material editor for browsing, creating, and updating material definitions.

**Kind**: global function  
**Returns**: <code>JSX.Element</code> - Materials editor UI.  
**Params**

- props <code>Object</code> - Component props.
    - .materials <code>Object</code> - Material map keyed by material name.
    - .onUpdateMaterials <code>function</code> - Callback that receives updated materials.

