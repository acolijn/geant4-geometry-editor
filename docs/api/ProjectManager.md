# ProjectManager Component API

The ProjectManager component handles project management functionality in the Geant4 Geometry Editor. It provides features for saving, loading, importing, and exporting geometry projects.

## Key Features

### Project Management
- Save projects to JSON format
- Load existing projects
- Create new projects
- Manage project metadata

### Import/Export
- Import geometry from various formats
- Export geometry to Geant4-compatible JSON
- Validate imported geometry

### File System Integration
- Browse local file system
- Select files and directories
- Handle file operations safely

## Constants

<dl>
<dt><a href="#saveObject">`saveObject`</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Save a compound object to the objects directory</p></dd>
<dt><a href="#listObjects">`listObjects`</a> ⇒ <code>Promise.&lt;Array&gt;</code></dt>
<dd><p>Get a list of all available objects</p></dd>
<dt><a href="#loadObject">`loadObject`</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Load a compound object by filename</p></dd>
</dl>

## Constants

<dl>
<dt><a href="#createPlacementObject">`createPlacementObject`</a> ⇒ <code>Object</code></dt>
<dd><p>Create a placement object from position and rotation</p></dd>
<dt><a href="#createDimensionsObject">`createDimensionsObject`</a> ⇒ <code>Object</code></dt>
<dd><p>Create a dimensions object based on the volume type</p></dd>
<dt><a href="#standardizeObjectFormat">`standardizeObjectFormat`</a> ⇒ <code>Object</code></dt>
<dd><p>Standardize an object and all its descendants to use the consistent format</p></dd>
<dt><a href="#restoreOriginalFormat">`restoreOriginalFormat`</a> ⇒ <code>Object</code></dt>
<dd><p>Restore the original format of an object loaded from the library</p></dd>
<dt><a href="#saveObject">`saveObject`</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Save a compound object to the objects directory</p></dd>
<dt><a href="#listObjects">`listObjects`</a> ⇒ <code>Promise.&lt;Array&gt;</code></dt>
<dd><p>Get a list of all available objects</p></dd>
<dt><a href="#loadObject">`loadObject`</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Load a compound object by filename</p></dd>
<dt><a href="#toInternalUnit">`toInternalUnit`</a> ⇒ <code>number</code></dt>
<dd><p>Convert a value from a display unit to the internal unit (mm or rad)</p></dd>
<dt><a href="#fromInternalUnit">`fromInternalUnit`</a> ⇒ <code>number</code></dt>
<dd><p>Convert a value from the internal unit (mm or rad) to a display unit</p></dd>
<dt><a href="#getAvailableUnits">`getAvailableUnits`</a> ⇒ <code>Array.&lt;string&gt;</code></dt>
<dd><p>Get the available units for a specific type</p></dd>
<dt><a href="#formatValueWithUnit">`formatValueWithUnit`</a> ⇒ <code>string</code></dt>
<dd><p>Format a value with its unit for display</p></dd>
</dl>

## Functions

<dl>
<dt><a href="#GeometryEditor">`GeometryEditor(props)`</a></dt>
<dd><p>Main GeometryEditor component</p></dd>
<dt><a href="#AddNewTab">`AddNewTab()`</a></dt>
<dd><p>AddNewTab Component</p>
<p>This component renders the UI for adding new geometry objects to the scene.
It includes options for importing existing objects, creating new primitive shapes,
and creating union solids by combining two or more existing objects.</p></dd>
<dt><a href="#HitCollectionsDialog">`HitCollectionsDialog(props)`</a></dt>
<dd><p>Dialog component for managing hit collections</p></dd>
<dt><a href="#LoadObjectDialog">`LoadObjectDialog()`</a></dt>
<dd><p>Dialog for loading a compound object from the objects directory</p></dd>
<dt><a href="#PropertyEditor">`PropertyEditor()`</a></dt>
<dd><p>PropertyEditor Component</p>
<p>This component renders the property editor panel for the selected geometry object.
It handles different types of geometries (world, volumes) and displays
the relevant properties for each type. The property editor allows users to modify
properties like position, rotation, dimensions, and material.</p></dd>
<dt><a href="#SaveObjectDialog">`SaveObjectDialog()`</a></dt>
<dd><p>Dialog for saving a compound object with name and description</p></dd>
<dt><a href="#UpdateObjectsDialog">`UpdateObjectsDialog()`</a></dt>
<dd><p>Dialog for updating instances of objects in the scene</p></dd>
<dt><a href="#radToDeg">`radToDeg(r)`</a> ⇒ <code>number</code></dt>
<dd><p>Convert radians to degrees</p></dd>
<dt><a href="#degToRad">`degToRad(d)`</a> ⇒ <code>number</code></dt>
<dd><p>Convert degrees to radians</p></dd>
<dt><a href="#debugObject">`debugObject(prefix, object)`</a></dt>
<dd><p>Debug helper function to log object details
Useful for diagnosing positioning and rotation issues</p></dd>
<dt><a href="#standardizeVolumeFormat">`standardizeVolumeFormat(volume)`</a> ⇒ <code>Object</code></dt>
<dd><p>Standardize a volume object to use the consistent format</p></dd>
</dl>

<a name="createPlacementObject"></a>

## `createPlacementObject` ⇒ <code>Object</code>
<p>Create a placement object from position and rotation</p>

**Kind**: global constant  
**Returns**: <code>Object</code> - <ul>
<li>The standardized placement object</li>
</ul>  
**Params**

- volume <code>Object</code> - <p>The volume object containing position and rotation</p>

<a name="createDimensionsObject"></a>

## `createDimensionsObject` ⇒ <code>Object</code>
<p>Create a dimensions object based on the volume type</p>

**Kind**: global constant  
**Returns**: <code>Object</code> - <ul>
<li>The standardized dimensions object</li>
</ul>  
**Params**

- volume <code>Object</code> - <p>The volume object</p>

<a name="standardizeObjectFormat"></a>

## `standardizeObjectFormat` ⇒ <code>Object</code>
<p>Standardize an object and all its descendants to use the consistent format</p>

**Kind**: global constant  
**Returns**: <code>Object</code> - <ul>
<li>The standardized object data</li>
</ul>  
**Params**

- objectData <code>Object</code> - <p>The object data containing the main object and its descendants</p>

<a name="restoreOriginalFormat"></a>

## `restoreOriginalFormat` ⇒ <code>Object</code>
<p>Restore the original format of an object loaded from the library</p>

**Kind**: global constant  
**Returns**: <code>Object</code> - <ul>
<li>The object data in the original format</li>
</ul>  
**Params**

- standardizedData <code>Object</code> - <p>The standardized object data</p>

<a name="saveObject"></a>

## `saveObject` ⇒ <code>Promise.&lt;Object&gt;</code>
<p>Save a compound object to the objects directory</p>

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Object&gt;</code> - <ul>
<li>Result of the save operation</li>
</ul>  
**Params**

- name <code>string</code> - <p>The name of the object</p>
- description <code>string</code> - <p>A description of the object</p>
- objectData <code>Object</code> - <p>The object data to save</p>

<a name="listObjects"></a>

## `listObjects` ⇒ <code>Promise.&lt;Array&gt;</code>
<p>Get a list of all available objects</p>

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Array&gt;</code> - <ul>
<li>List of available objects with metadata</li>
</ul>  
<a name="loadObject"></a>

## `loadObject` ⇒ <code>Promise.&lt;Object&gt;</code>
<p>Load a compound object by filename</p>

**Kind**: global constant  
**Returns**: <code>Promise.&lt;Object&gt;</code> - <ul>
<li>The loaded object data</li>
</ul>  
**Params**

- fileName <code>string</code> - <p>The name of the file to load</p>

<a name="toInternalUnit"></a>

## `toInternalUnit` ⇒ <code>number</code>
<p>Convert a value from a display unit to the internal unit (mm or rad)</p>

**Kind**: global constant  
**Returns**: <code>number</code> - <p>The converted value in the internal unit (mm or rad)</p>  
**Params**

- value <code>number</code> - <p>The value to convert</p>
- fromUnit <code>string</code> - <p>The unit to convert from</p>
- type <code>string</code> - <p>The type of unit ('length' or 'angle')</p>

<a name="fromInternalUnit"></a>

## `fromInternalUnit` ⇒ <code>number</code>
<p>Convert a value from the internal unit (mm or rad) to a display unit</p>

**Kind**: global constant  
**Returns**: <code>number</code> - <p>The converted value in the specified unit</p>  
**Params**

- value <code>number</code> - <p>The value to convert (in mm or rad)</p>
- toUnit <code>string</code> - <p>The unit to convert to</p>
- type <code>string</code> - <p>The type of unit ('length' or 'angle')</p>

<a name="getAvailableUnits"></a>

## `getAvailableUnits` ⇒ <code>Array.&lt;string&gt;</code>
<p>Get the available units for a specific type</p>

**Kind**: global constant  
**Returns**: <code>Array.&lt;string&gt;</code> - <p>Array of available unit names</p>  
**Params**

- type <code>string</code> - <p>The type of unit ('length' or 'angle')</p>

<a name="formatValueWithUnit"></a>

## `formatValueWithUnit` ⇒ <code>string</code>
<p>Format a value with its unit for display</p>

**Kind**: global constant  
**Returns**: <code>string</code> - <p>The formatted value with unit</p>  
**Params**

- value <code>number</code> - <p>The value to format (in internal units)</p>
- unit <code>string</code> - <p>The unit to display</p>
- type <code>string</code> - <p>The type of unit ('length' or 'angle')</p>
- precision <code>number</code> - <p>The number of decimal places to show</p>

<a name="GeometryEditor"></a>

## `GeometryEditor(props)`
<p>Main GeometryEditor component</p>

**Kind**: global function  
**Params**

- props <code>Object</code> - <p>Component props</p>
    - .geometries <code>Object</code> - <p>The geometry objects (world and volumes)</p>
    - .materials <code>Array</code> - <p>List of available materials</p>
    - .selectedGeometry <code>string</code> - <p>ID of the currently selected geometry</p>
    - .hitCollections <code>Array</code> - <p>List of hit collections for the detector</p>
    - .onUpdateHitCollections <code>function</code> - <p>Callback to update hit collections</p>
    - .onUpdateGeometry <code>function</code> - <p>Callback to update a geometry object</p>
    - .onAddGeometry <code>function</code> - <p>Callback to add a new geometry object</p>
    - .onRemoveGeometry <code>function</code> - <p>Callback to remove a geometry object</p>
    - .extractObjectWithDescendants <code>function</code> - <p>Function to extract an object with its descendants</p>
    - .handleImportPartialFromAddNew <code>function</code> - <p>Function to handle importing partial geometry</p>


* [`GeometryEditor(props)`](#GeometryEditor)
    * [`~handleCloseAlert`](#GeometryEditor..handleCloseAlert)
    * [`~handleTabChange(event, newValue)`](#GeometryEditor..handleTabChange)
    * [`~handleMenuOpen(event)`](#GeometryEditor..handleMenuOpen)
    * [`~simplifyObjectNames(objectData)`](#GeometryEditor..simplifyObjectNames) ⇒ <code>Object</code>
        * [`~extractComponentName(structuredName)`](#GeometryEditor..simplifyObjectNames..extractComponentName) ⇒ <code>string</code>
    * [`~processStandardizedFormat(objectData)`](#GeometryEditor..processStandardizedFormat) ⇒ <code>Object</code>
    * [`~handleLoadObject(objectData)`](#GeometryEditor..handleLoadObject) ⇒ <code>Object</code>
    * [`~applyStructuredNaming(objectData)`](#GeometryEditor..applyStructuredNaming) ⇒ <code>Object</code>
    * [`~handleMenuClose(event)`](#GeometryEditor..handleMenuClose)
    * [`~handleExportObject()`](#GeometryEditor..handleExportObject)
    * [`~getSelectedGeometryObject()`](#GeometryEditor..getSelectedGeometryObject) ⇒ <code>Object</code> \| <code>null</code>
    * [`~handleRotationChange(axis, value)`](#GeometryEditor..handleRotationChange)
    * [`~handleRelativePositionChange(axis, value)`](#GeometryEditor..handleRelativePositionChange)
    * [`~handleRelativeRotationChange(axis, value)`](#GeometryEditor..handleRelativeRotationChange)
    * [`~handlePropertyChange(property, value, allowNegative, isStringProperty)`](#GeometryEditor..handlePropertyChange)
        * [`~processedValue`](#GeometryEditor..handlePropertyChange..processedValue)
    * [`~handleAddGeometry()`](#GeometryEditor..handleAddGeometry)
    * [`~handleImportFromFileSystem()`](#GeometryEditor..handleImportFromFileSystem) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="GeometryEditor..handleCloseAlert"></a>

### `GeometryEditor~handleCloseAlert`
<p>Handle closing of alert notifications</p>
<p>This function closes the alert notification by setting its show property to false
while preserving other properties like message and severity.</p>

**Kind**: inner constant of [<code>GeometryEditor</code>](#GeometryEditor)  
<a name="GeometryEditor..handleTabChange"></a>

### `GeometryEditor~handleTabChange(event, newValue)`
<p>Handle tab changes between Properties and Add New tabs</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Params**

- event <code>Object</code> - <p>The event object (unused)</p>
- newValue <code>number</code> - <p>The index of the new tab (0 for Properties, 1 for Add New)</p>

<a name="GeometryEditor..handleMenuOpen"></a>

### `GeometryEditor~handleMenuOpen(event)`
<p>Open the context menu</p>
<p>This function opens the context menu at the location of the clicked element.
It prevents event propagation to avoid unintended side effects like selecting
objects underneath the menu button.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Params**

- event <code>Object</code> - <p>The click event that triggered the menu opening</p>

<a name="GeometryEditor..simplifyObjectNames"></a>

### `GeometryEditor~simplifyObjectNames(objectData)` ⇒ <code>Object</code>
<p>Simplify object names by removing the structured naming pattern before saving</p>
<p>This function processes an object and its descendants to simplify their names
by extracting the component name from structured names (BaseName_ComponentName_ID).
It also updates all references to maintain the correct relationships between objects.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Returns**: <code>Object</code> - <p>The processed object data with simplified names</p>  
**Params**

- objectData <code>Object</code> - <p>The object data to process, containing object and descendants</p>

<a name="GeometryEditor..simplifyObjectNames..extractComponentName"></a>

#### `simplifyObjectNames~extractComponentName(structuredName)` ⇒ <code>string</code>
<p>Extract the component name from a structured name format</p>
<p>Structured names follow the pattern: BaseName_ComponentName_ID
This function extracts just the ComponentName part for cleaner exports.</p>

**Kind**: inner method of [<code>simplifyObjectNames</code>](#GeometryEditor..simplifyObjectNames)  
**Returns**: <code>string</code> - <p>The extracted component name or the original name if not in expected format</p>  
**Params**

- structuredName <code>string</code> - <p>The structured name to process</p>

<a name="GeometryEditor..processStandardizedFormat"></a>

### `GeometryEditor~processStandardizedFormat(objectData)` ⇒ <code>Object</code>
<p>Process an object with standardized format (placement and dimensions)</p>
<p>This function converts an object with standardized format (using placement and dimensions)
to the internal format used by the application (using position, rotation, and direct dimension properties).</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Returns**: <code>Object</code> - <p>The processed object data</p>  
**Params**

- objectData <code>Object</code> - <p>The object data to process</p>

<a name="GeometryEditor..handleLoadObject"></a>

### `GeometryEditor~handleLoadObject(objectData)` ⇒ <code>Object</code>
<p>Handle loading an object from the library</p>
<p>This function processes object data loaded from the library, applies structured naming
to ensure consistency, and adds the object to the scene. It handles objects in the
standardized format with 'placement' and 'dimensions' properties.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Returns**: <code>Object</code> - <p>An object indicating success or failure of the operation</p>  
**Params**

- objectData <code>Object</code> - <p>The object data to load, including the main object and its descendants</p>

<a name="GeometryEditor..applyStructuredNaming"></a>

### `GeometryEditor~applyStructuredNaming(objectData)` ⇒ <code>Object</code>
<p>Apply structured naming to imported objects</p>
<p>This function ensures consistent naming of imported objects by applying a structured
naming convention in the format: BaseName_ComponentName_ID. This helps maintain
organization and prevents naming conflicts when importing objects.</p>
<p>The function creates a mapping between original names and new structured names,
and updates all mother_volume references to maintain proper relationships.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Returns**: <code>Object</code> - <p>The processed object data with structured naming applied</p>  
**Params**

- objectData <code>Object</code> - <p>The object data to process, including the main object and its descendants</p>

<a name="GeometryEditor..handleMenuClose"></a>

### `GeometryEditor~handleMenuClose(event)`
<p>Close the context menu</p>
<p>This function closes the context menu and prevents event propagation
to avoid unintended side effects like selecting objects underneath.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Params**

- event <code>Object</code> - <p>The event object (may be undefined if called programmatically)</p>

<a name="GeometryEditor..handleExportObject"></a>

### `GeometryEditor~handleExportObject()`
<p>Export the selected geometry object and its descendants</p>
<p>This function extracts the selected geometry object along with all its descendants
and prepares them for export. It adds debug information and opens the save dialog
to allow the user to save the exported data to a file.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
<a name="GeometryEditor..getSelectedGeometryObject"></a>

### `GeometryEditor~getSelectedGeometryObject()` ⇒ <code>Object</code> \| <code>null</code>
<p>Get the currently selected geometry object based on the selectedGeometry ID</p>
<p>This function retrieves the geometry object that corresponds to the currently
selected geometry ID. The ID can be 'world' for the world volume or 'volume-X'
where X is the index of the volume in the geometries.volumes array.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Returns**: <code>Object</code> \| <code>null</code> - <p>The selected geometry object or null if no geometry is selected</p>  
<a name="GeometryEditor..handleRotationChange"></a>

### `GeometryEditor~handleRotationChange(axis, value)`
<p>Handle rotation changes for the selected geometry object</p>
<p>This function updates the rotation of the selected geometry along a specified axis.
Rotations in Geant4 follow a sequential system: rotateX, then rotateY around the new Y axis,
then rotateZ around the new Z axis.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Params**

- axis <code>string</code> - <p>The rotation axis ('x', 'y', or 'z')</p>
- value <code>number</code> - <p>The rotation value in degrees</p>

<a name="GeometryEditor..handleRelativePositionChange"></a>

### `GeometryEditor~handleRelativePositionChange(axis, value)`
<p>Handle relative position changes for union solids</p>
<p>This function updates the relative position of the second solid in a union
with respect to the first solid. This affects how the two solids are combined
in the union operation.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Params**

- axis <code>string</code> - <p>The position axis ('x', 'y', or 'z')</p>
- value <code>number</code> - <p>The position value in centimeters</p>

<a name="GeometryEditor..handleRelativeRotationChange"></a>

### `GeometryEditor~handleRelativeRotationChange(axis, value)`
<p>Handle relative rotation changes for union solids</p>
<p>This function updates the relative rotation of the second solid in a union
with respect to the first solid. Rotations follow Geant4's sequential system:
rotateX, then rotateY around the new Y axis, then rotateZ around the new Z axis.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Params**

- axis <code>string</code> - <p>The rotation axis ('x', 'y', or 'z')</p>
- value <code>number</code> - <p>The rotation value in degrees</p>

<a name="GeometryEditor..handlePropertyChange"></a>

### `GeometryEditor~handlePropertyChange(property, value, allowNegative, isStringProperty)`
<p>Handle changes to geometry properties</p>
<p>This function handles changes to any property of the selected geometry object.
It provides special handling for different types of properties (strings, arrays, numbers)
and ensures proper validation and formatting of values.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
**Params**

- property <code>string</code> - <p>The name of the property to change (can be nested like 'position.x')</p>
- value <code>any</code> - <p>The new value for the property</p>
- allowNegative <code>boolean</code> <code> = true</code> - <p>Whether to allow negative values for numeric properties</p>
- isStringProperty <code>boolean</code> <code> = false</code> - <p>Whether the property is a string (no numeric conversion)</p>

<a name="GeometryEditor..handlePropertyChange..processedValue"></a>

#### `handlePropertyChange~processedValue`
<p>Process and validate the input value</p>
<p>For numeric properties, we need to validate the input and convert strings to numbers.
This includes handling special cases like empty inputs, minus signs, and decimal points.</p>

**Kind**: inner property of [<code>handlePropertyChange</code>](#GeometryEditor..handlePropertyChange)  
<a name="GeometryEditor..handleAddGeometry"></a>

### `GeometryEditor~handleAddGeometry()`
<p>Add a new geometry object to the scene</p>
<p>This function creates a new geometry object based on the selected type and mother volume.
It handles special cases for union solids, which require combining two existing solids.
For basic geometries, it creates objects with default properties based on the type.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
<a name="GeometryEditor..handleImportFromFileSystem"></a>

### `GeometryEditor~handleImportFromFileSystem()` ⇒ <code>Promise.&lt;void&gt;</code>
<p>Import geometry objects from a JSON file using the FileSystemManager</p>
<p>This function allows users to import previously exported geometry objects
from JSON files. It validates the imported content, adds the objects to the
scene with the selected mother volume, and displays appropriate notifications.</p>

**Kind**: inner method of [<code>GeometryEditor</code>](#GeometryEditor)  
<a name="AddNewTab"></a>

## `AddNewTab()`
<p>AddNewTab Component</p>
<p>This component renders the UI for adding new geometry objects to the scene.
It includes options for importing existing objects, creating new primitive shapes,
and creating union solids by combining two or more existing objects.</p>

**Kind**: global function  
<a name="HitCollectionsDialog"></a>

## `HitCollectionsDialog(props)`
<p>Dialog component for managing hit collections</p>

**Kind**: global function  
**Params**

- props <code>Object</code> - <p>Component props</p>
    - .open <code>boolean</code> - <p>Whether the dialog is open</p>
    - .onClose <code>function</code> - <p>Function to call when the dialog is closed</p>
    - .hitCollections <code>Array.&lt;string&gt;</code> - <p>Array of hit collection names</p>
    - .onUpdateHitCollections <code>function</code> - <p>Function to call when hit collections are updated</p>


* [`HitCollectionsDialog(props)`](#HitCollectionsDialog)
    * [`~handleAddCollection()`](#HitCollectionsDialog..handleAddCollection)
    * [`~handleRemoveCollection(index)`](#HitCollectionsDialog..handleRemoveCollection)
    * [`~handleSave()`](#HitCollectionsDialog..handleSave)

<a name="HitCollectionsDialog..handleAddCollection"></a>

### `HitCollectionsDialog~handleAddCollection()`
<p>Handle adding a new hit collection
Validates the collection name before adding</p>

**Kind**: inner method of [<code>HitCollectionsDialog</code>](#HitCollectionsDialog)  
<a name="HitCollectionsDialog..handleRemoveCollection"></a>

### `HitCollectionsDialog~handleRemoveCollection(index)`
<p>Handle removing a hit collection
Prevents removal of the default collection</p>

**Kind**: inner method of [<code>HitCollectionsDialog</code>](#HitCollectionsDialog)  
**Params**

- index <code>number</code> - <p>Index of the collection to remove</p>

<a name="HitCollectionsDialog..handleSave"></a>

### `HitCollectionsDialog~handleSave()`
<p>Handle saving changes to hit collections
Updates the parent component with the new collections and closes the dialog</p>

**Kind**: inner method of [<code>HitCollectionsDialog</code>](#HitCollectionsDialog)  
<a name="LoadObjectDialog"></a>

## `LoadObjectDialog()`
<p>Dialog for loading a compound object from the objects directory</p>

**Kind**: global function  
<a name="PropertyEditor"></a>

## `PropertyEditor()`
<p>PropertyEditor Component</p>
<p>This component renders the property editor panel for the selected geometry object.
It handles different types of geometries (world, volumes) and displays
the relevant properties for each type. The property editor allows users to modify
properties like position, rotation, dimensions, and material.</p>

**Kind**: global function  
<a name="SaveObjectDialog"></a>

## `SaveObjectDialog()`
<p>Dialog for saving a compound object with name and description</p>

**Kind**: global function  
<a name="UpdateObjectsDialog"></a>

## `UpdateObjectsDialog()`
<p>Dialog for updating instances of objects in the scene</p>

**Kind**: global function  
<a name="radToDeg"></a>

## `radToDeg(r)` ⇒ <code>number</code>
<p>Convert radians to degrees</p>

**Kind**: global function  
**Returns**: <code>number</code> - <p>Angle in degrees</p>  
**Params**

- r <code>number</code> - <p>Angle in radians</p>

<a name="degToRad"></a>

## `degToRad(d)` ⇒ <code>number</code>
<p>Convert degrees to radians</p>

**Kind**: global function  
**Returns**: <code>number</code> - <p>Angle in radians</p>  
**Params**

- d <code>number</code> - <p>Angle in degrees</p>

<a name="debugObject"></a>

## `debugObject(prefix, object)`
<p>Debug helper function to log object details
Useful for diagnosing positioning and rotation issues</p>

**Kind**: global function  
**Params**

- prefix <code>string</code> - <p>Descriptive prefix for the log</p>
- object <code>Object</code> - <p>The object to debug</p>

<a name="standardizeVolumeFormat"></a>

## `standardizeVolumeFormat(volume)` ⇒ <code>Object</code>
<p>Standardize a volume object to use the consistent format</p>

**Kind**: global function  
**Returns**: <code>Object</code> - <ul>
<li>The standardized volume object</li>
</ul>  
**Params**

- volume <code>Object</code> - <p>The volume object to standardize</p>


## Usage Example

```jsx
import { ProjectManager } from './components/ProjectManager'

function App() {
  return (
    <ProjectManager 
      // Add appropriate props here
    />
  );
}
```
