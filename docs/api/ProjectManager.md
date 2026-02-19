# Project Manager API

Save/load workflow for projects and reusable geometry objects.

<a name="ProjectManager"></a>

## `ProjectManager(props)` ⇒ <code>JSX.Element</code>
Toolbar actions and dialogs for project/object persistence.

**Kind**: global function  
**Returns**: <code>JSX.Element</code> - Project manager UI.  
**Params**

- props <code>Object</code> - Component props.
    - .geometries <code>Object</code> - Current geometry state.
    - .materials <code>Object</code> - Current material definitions.
    - .hitCollections <code>Array</code> - Current hit collection definitions.
    - .onLoadProject <code>function</code> - Callback invoked after loading a project.
    - [.compactMode] <code>boolean</code> <code> = false</code> - Whether to render compact controls.

