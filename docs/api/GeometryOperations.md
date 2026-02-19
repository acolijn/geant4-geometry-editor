# Geometry Operations API

Core add/update/remove geometry state operations used by the editor.

## Constants

<dl>
<dt><a href="#updateGeometry">`updateGeometry`</a> ⇒ <code>void</code></dt>
<dd><p>Update a geometry object</p>
</dd>
<dt><a href="#addGeometry">`addGeometry`</a> ⇒ <code>string</code></dt>
<dd><p>Add a new geometry</p>
</dd>
<dt><a href="#removeGeometry">`removeGeometry`</a> ⇒ <code>void</code></dt>
<dd><p>Remove a geometry</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#mergeGeometryObject">`mergeGeometryObject(baseObject, patchObject)`</a> ⇒ <code>Object</code></dt>
<dd><p>Merge a partial geometry patch into an existing geometry object.
Nested transform/dimension fields are merged deeply for known keys.</p>
</dd>
</dl>

<a name="updateGeometry"></a>

## `updateGeometry` ⇒ <code>void</code>
Update a geometry object

**Kind**: global constant  
**Params**

- geometries <code>Object</code> - The current geometries state
- id <code>string</code> - The ID of the geometry to update
- updatedObject <code>Object</code> - The updated geometry object
- keepSelected <code>boolean</code> - Whether to keep the object selected after update
- isLiveUpdate <code>boolean</code> - Whether this is a live update
- extraData <code>Object</code> - Extra data for special updates
- setGeometries <code>function</code> - Function to update geometries state
- setSelectedGeometry <code>function</code> - Function to update selected geometry
- selectedGeometry <code>string</code> - Currently selected geometry
- updateAssembliesFunc <code>function</code> - Function to update assemblies
- propagateCompoundIdToDescendants <code>function</code> - Function to propagate compound ID

<a name="addGeometry"></a>

## `addGeometry` ⇒ <code>string</code>
Add a new geometry

**Kind**: global constant  
**Returns**: <code>string</code> - The name of the added geometry  
**Params**

- newGeometry <code>Object</code> - The new geometry to add
- geometries <code>Object</code> - The current geometries state
- setGeometries <code>function</code> - Function to update geometries state
- setSelectedGeometry <code>function</code> - Function to update selected geometry
- propagateCompoundIdToDescendants <code>function</code> - Function to propagate compound ID

<a name="removeGeometry"></a>

## `removeGeometry` ⇒ <code>void</code>
Remove a geometry

**Kind**: global constant  
**Params**

- id <code>string</code> - The ID of the geometry to remove
- geometries <code>Object</code> - The current geometries state
- setGeometries <code>function</code> - Function to update geometries state
- setSelectedGeometry <code>function</code> - Function to update selected geometry
- selectedGeometry <code>string</code> - Currently selected geometry

<a name="mergeGeometryObject"></a>

## `mergeGeometryObject(baseObject, patchObject)` ⇒ <code>Object</code>
Merge a partial geometry patch into an existing geometry object.
Nested transform/dimension fields are merged deeply for known keys.

**Kind**: global function  
**Returns**: <code>Object</code> - Merged geometry object.  
**Params**

- baseObject <code>Object</code> - Existing geometry object.
- patchObject <code>Object</code> - Partial update patch.

