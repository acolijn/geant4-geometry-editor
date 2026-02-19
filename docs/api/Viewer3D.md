# 3D Viewer API

Three.js-based scene viewer and transform interaction layer....

<a name="Viewer3D"></a>

## `Viewer3D(props)` ⇒ <code>JSX.Element</code>
3D viewer and geometry tree panel.

**Kind**: global function  
**Returns**: <code>JSX.Element</code> - Viewer3D UI.  
**Params**

- props <code>Object</code> - Component props.
    - .geometries <code>Object</code> - Geometry state with `world` and `volumes`.
    - .selectedGeometry <code>string</code> | <code>null</code> - Currently selected geometry id.
    - .onSelect <code>function</code> - Selection callback.
    - .onUpdateGeometry <code>function</code> - Geometry update callback.
    - .materials <code>Object</code> - Material map used for rendering.

