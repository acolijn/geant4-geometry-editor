import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { calculateWorldPosition, worldToLocalCoordinates, getParentKey, groupVolumesByParent } from './utils/geometryUtils';
import { getVolumeIcon } from '../geometry-editor/utils/geometryIcons';
import { createImportExportHandlers } from '../geometry-editor/utils/importExportHandlers';
import { extractObjectWithDescendants } from '../geometry-editor/utils/GeometryUtils';
import SaveObjectDialog from '../geometry-editor/components/SaveObjectDialog';
import { handleUpdateAllAssemblies } from './utils/contextMenuHandlers';


// GeometryTree component for the left panel
export default function GeometryTree({ geometries, selectedGeometry, onSelect, onUpdateGeometry }) {
  // State for save object dialog
  const [saveObjectDialogOpen, setSaveObjectDialogOpen] = useState(false);
  const [objectToSave, setObjectToSave] = useState(null);

  // We'll use the existing extractObjectWithDescendants function from GeometryUtils
  // but we need to adapt our geometries structure to match what it expects
  
  // Get the importExportHandlers functions
  const importExportHandlers = createImportExportHandlers({
    geometries: {
      volumes: geometries.volumes,
      world: geometries.world || { name: 'world' } // Provide a default world if not available
    },
    selectedGeometry,
    onUpdateGeometry,
    extractObjectWithDescendants, // Use the original function
    setObjectToSave,
    setSaveObjectDialogOpen,
    getSelectedGeometryObjectLocal: () => {
      // If we have a volumeIndex from context menu, use that
      if (contextMenu && contextMenu.volumeIndex !== undefined) {
        return geometries.volumes[contextMenu.volumeIndex];
      }
      // Otherwise use the currently selected geometry
      if (selectedGeometry && selectedGeometry !== 'world') {
        const volumeIndex = parseInt(selectedGeometry.split('-')[1]);
        return geometries.volumes[volumeIndex];
      }
      return null;
    }
  });
  
  // Create a wrapper for handleExportObject that uses generateTemplateJson for consistent formatting
  const handleExportObject = async () => {
    console.log('handleExportObject:: geometries');
    
    // Get the currently selected geometry object
    const selectedObject = importExportHandlers.getSelectedGeometryObjectLocal();
    console.log('handleExportObject:: selectedObject', selectedObject);
    
    if (!selectedObject) {
      alert('Please select a geometry object to export');
      return;
    }
    
    // Create a proper geometries structure
    const geometriesForExport = {
      volumes: geometries.volumes,
      world: geometries.world || { name: 'world' }
    };
    
    // Get the compound ID and object ID
    //let objectId;
    let compoundId = selectedObject._compoundId;
    
/*     if (contextMenu && contextMenu.volumeIndex !== undefined) {
      objectId = `volume-${contextMenu.volumeIndex}`;
    } else {
      objectId = selectedGeometry;
    }
     */
    // If this is an assembly or union, use generateTemplateJson
    //if (selectedObject.type === 'assembly' || selectedObject.type === 'union') {
    try {
      // Import the generateTemplateJson function
      const { generateTemplateJson } = await import('../../components/json-viewer/utils/geometryToJson');
      
      // Generate a template JSON for this compound object
      const templateJson = generateTemplateJson(geometriesForExport, compoundId);
      
      if (!templateJson) {
        console.error('Failed to generate template JSON');
        return;
      }
      
      console.log('templateJson::', templateJson);
      
      // Set the object to save and open the dialog
      setObjectToSave(templateJson);
      setSaveObjectDialogOpen(true);
      return;
    } catch (error) {
      console.error('Error generating template JSON:', error);
    }
    //}
/*     
    // Fallback to the original method for non-compound objects
    const exportData = extractObjectWithDescendants(objectId, geometriesForExport);
    if (!exportData) {
      console.error('Failed to extract object data');
      return;
    }
    
    console.log('exportData::', exportData);
    
    // Set the object to save and open the dialog
    setObjectToSave(exportData);
    setSaveObjectDialogOpen(true); */
  };
  // State to track expanded nodes - initially only World is expanded
  const [expandedNodes, setExpandedNodes] = useState({ world: true });
  
  // State for context menu
  const [contextMenu, setContextMenu] = useState(null);
  
  // State for assembly dialog
  const [assemblyDialog, setAssemblyDialog] = useState({
    open: false,
    volumeIndex: null,
    assemblies: []
  });
  
  // State for update assemblies dialog
  const [updateAssembliesDialog, setUpdateAssembliesDialog] = useState({
    open: false,
    sourceIndex: null,
    selectedIndices: [],
    allAssemblies: []
  });
  
  // Function to toggle node expansion
  const toggleNodeExpansion = (nodeKey, event) => {
    // Stop the click event from bubbling up to the parent div
    // which would trigger selection
    event.stopPropagation();
    
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };
  
  // Function to handle right-click for context menu
  const handleContextMenu = (event, volumeIndex) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      volumeIndex
    });
  };
  
  // Function to close context menu
  const handleCloseContextMenu = () => {
    // Close the context menu
    setContextMenu(null);
  };
  
  // Function to handle the update assemblies dialog confirmation
  const handleUpdateAssembliesConfirm = () => {
    const { sourceIndex, selectedIndices } = updateAssembliesDialog;
    
    if (selectedIndices.length === 0) {
      console.log('No assemblies selected for update.');
      return;
    }
    
    // Close the dialog
    setUpdateAssembliesDialog(prev => ({
      ...prev,
      open: false
    }));
    
    // Get the selected volume from the sourceIndex
    const selectedVolume = geometries.volumes[sourceIndex];
    
    // First, find all components in the source assembly
    const sourceComponents = [];
    const sourceAssemblyName = selectedVolume.name;
    
    // Find all components that belong to the source assembly
    for (let i = 0; i < geometries.volumes.length; i++) {
      const volume = geometries.volumes[i];
      if (volume.mother_volume === sourceAssemblyName) {
        sourceComponents.push({
          index: i,
          volume: volume,
          _componentId: volume._componentId
        });
      }
    }
    
    console.log(`Found ${sourceComponents.length} components in source assembly ${sourceAssemblyName}:`, sourceComponents);
    
    // Count of successfully updated assemblies
    let updatedCount = 0;
    
    // Update the selected assemblies
    for (const index of selectedIndices) {
      // Skip invalid indices
      if (index < 0 || index >= geometries.volumes.length) continue;
      
      const volume = geometries.volumes[index];
      
      // Skip non-assemblies
      if (volume.type !== 'assembly') continue;
      
      const targetAssemblyName = volume.name;
      
      // Create a new object with properties from the selected assembly
      // but preserve position, rotation, name, and identifiers of the target assembly
      const updatedAssembly = {
        ...selectedVolume,
        // CRITICAL: Preserve these properties
        position: { ...volume.position },
        rotation: { ...volume.rotation },
        name: targetAssemblyName, // Preserve assembly name
        mother_volume: volume.mother_volume
      };
      
      // If the assembly has an instance ID, preserve it
      if (volume._instanceId) {
        updatedAssembly._instanceId = volume._instanceId;
      }
      
      // Preserve g4name and g4name if they exist
      if (volume.g4name) {
        updatedAssembly.g4name = volume.g4name;
      }
      if (volume.g4name) {
        updatedAssembly.g4name = volume.g4name;
      }
      
      // Update this specific assembly
      // Use the volume ID format: 'volume-index'
      onUpdateGeometry(`volume-${index}`, updatedAssembly, true, false);
      
      // Now update all components of this assembly
      // First, find all components that belong to this target assembly
      const targetComponents = [];
      for (let j = 0; j < geometries.volumes.length; j++) {
        const component = geometries.volumes[j];
        if (component.mother_volume === targetAssemblyName) {
          targetComponents.push({
            index: j,
            volume: component,
            _componentId: component._componentId
          });
        }
      }
      
      console.log(`Found ${targetComponents.length} components in target assembly ${targetAssemblyName}:`, targetComponents);
      
      // For each source component, find matching target component by _componentId
      // and update it with the source component's properties
      for (const sourceComponent of sourceComponents) {
        // Find matching target component by _componentId
        const matchingTargetComponent = targetComponents.find(tc => 
          tc._componentId && sourceComponent._componentId && tc._componentId === sourceComponent._componentId
        );
        
        if (matchingTargetComponent) {
          // Create updated component with properties from source but preserve critical identifiers
          const updatedComponent = {
            ...sourceComponent.volume,
            // CRITICAL: Preserve these identifiers
            name: matchingTargetComponent.volume.name, // Preserve internal name
            mother_volume: targetAssemblyName, // Preserve parent relationship
            _componentId: matchingTargetComponent.volume._componentId // Preserve component ID
          };
          
          // Preserve g4name and g4name if they exist
          if (matchingTargetComponent.volume.g4name) {
            updatedComponent.g4name = matchingTargetComponent.volume.g4name;
          }
          if (matchingTargetComponent.volume.g4name) {
            updatedComponent.g4name = matchingTargetComponent.volume.g4name;
          }
          
          console.log(`Updating component at index ${matchingTargetComponent.index}:`, {
            sourceComponent: sourceComponent.volume,
            targetComponent: matchingTargetComponent.volume,
            updatedComponent: updatedComponent
          });
          
          // Update this specific component
          onUpdateGeometry(`volume-${matchingTargetComponent.index}`, updatedComponent, true, false);
        } else {
          console.log(`No matching component found for source component with ID ${sourceComponent._componentId}`);
        }
      }
      
      updatedCount++;
    }
    
    // Log success message instead of showing an alert
    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} assemblies successfully.`);
    } else {
      console.log('No assemblies were updated.');
    }
  };
  
  // Function to handle Add to Assembly option
  const handleAddToAssembly = (volumeIndex) => {
    // Close the context menu
    handleCloseContextMenu();
    
    // Find all assemblies in the geometry
    const assemblies = geometries.volumes
      .map((volume, index) => ({ volume, index }))
      .filter(item => item.volume.type === 'assembly');
    
    if (assemblies.length === 0) {
      console.log('No assemblies available. Create an assembly first.');
      return;
    }
    
    // Open the assembly selection dialog
    setAssemblyDialog({
      open: true,
      volumeIndex,
      assemblies
    });
  };
  
  // Function to confirm adding to assembly
  const handleConfirmAddToAssembly = (assemblyIndex) => {
    const volumeIndex = assemblyDialog.volumeIndex;
    const volume = geometries.volumes[volumeIndex];
    const assembly = geometries.volumes[assemblyIndex];
    
    // Get the volume key for updating
    const volumeKey = `volume-${volumeIndex}`;
    
    // Update the volume's mother_volume to the assembly
    const updatedVolume = {
      mother_volume: assembly.name
    };
    
    // Update the geometry using onUpdateGeometry
    onUpdateGeometry(volumeKey, updatedVolume);
    
    // Log the update
    console.log('Adding volume to assembly:', {
      volume: geometries.volumes[volumeIndex],
      assembly,
      updatedVolume
    });
    
    // Close the dialog
    setAssemblyDialog({
      open: false,
      volumeIndex: null,
      assemblies: []
    });
  };
  // Create a map of volume names to their indices for easy lookup
  const volumeNameToIndex = {};
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    if (volume.name) {
      volumeNameToIndex[volume.name] = index;
    }
  });
  
  // Function to get a volume's parent object key using the imported function
  const getParentKeyWrapper = (volume) => {
    return getParentKey(volume, volumeNameToIndex);
  };
  
  // Group volumes by their parent
  const volumesByParent = {
    world: [] // Volumes with World as parent
  };
  
  // Initialize volume groups for all volumes
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    const key = `volume-${index}`;
    volumesByParent[key] = []; // Initialize empty array for each volume
  });
  
  // Populate the groups
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    const key = `volume-${index}`;
    const parentKey = getParentKeyWrapper(volume);
    
    // Check if this is a boolean component
    if (volume._is_boolean_component === true && volume._boolean_parent) {
      // Find the parent union's index
      const parentUnionIndex = geometries.volumes.findIndex(v => v.name === volume._boolean_parent);
      
      if (parentUnionIndex !== -1) {
        // Create a special key for the "Parts" folder of this union
        const unionPartsKey = `union-parts-${parentUnionIndex}`;
        
        // Make sure the parts folder exists for this union
        if (!volumesByParent[unionPartsKey]) {
          volumesByParent[unionPartsKey] = [];
          
          // Add the parts folder to the union's children
          const unionKey = `volume-${parentUnionIndex}`;
          if (!volumesByParent[unionKey]) {
            volumesByParent[unionKey] = [];
          }
          
          // Add a special entry for the parts folder
          volumesByParent[unionKey].push({
            isPartsFolder: true,
            key: unionPartsKey,
            parentUnionName: geometries.volumes[parentUnionIndex].name,
            parentUniong4name: geometries.volumes[parentUnionIndex].g4name || geometries.volumes[parentUnionIndex].name
          });
        }
        
        // Add this volume to the parts folder
        volumesByParent[unionPartsKey].push({
          volume,
          key,
          index,
          isBooleanComponent: true
        });
      } else {
        // If parent union not found, add to regular parent
        if (volumesByParent[parentKey]) {
          volumesByParent[parentKey].push({
            volume,
            key,
            index,
            isBooleanComponent: true
          });
        }
      }
    } else {
      // Regular volume - add to its parent's children list
      if (volumesByParent[parentKey]) {
        volumesByParent[parentKey].push({
          volume,
          key,
          index
        });
      }
    }
  });
  
  // Recursive function to render a volume and its children in the tree
  const renderVolumeTree = (parentKey, level = 0) => {
    // If this parent has no children, return null
    if (!volumesByParent[parentKey] || volumesByParent[parentKey].length === 0) {
      return null;
    }
    
    // Sort volumes alphabetically by g4name (if available) or name
    const sortedVolumes = [...volumesByParent[parentKey]].sort((a, b) => {
      // Special case: Parts folder should always come first
      if (a.isPartsFolder) return -1;
      if (b.isPartsFolder) return 1;
      
      // Use g4name if available, otherwise fall back to name or generate a default name
      const nameA = a.volume ? (a.volume.g4name || a.volume.name || `${a.volume.type.charAt(0).toUpperCase() + a.volume.type.slice(1)} ${a.index + 1}`) : a.parentUniong4name;
      const nameB = b.volume ? (b.volume.g4name || b.volume.name || `${b.volume.type.charAt(0).toUpperCase() + b.volume.type.slice(1)} ${b.index + 1}`) : b.parentUniong4name;
      return nameA.localeCompare(nameB);
    });
    
    // Render all children of this parent (now sorted alphabetically)
    return sortedVolumes.map((item) => {
      // Special handling for Parts folder
      if (item.isPartsFolder) {
        const partsKey = item.key;
        const hasChildren = volumesByParent[partsKey] && volumesByParent[partsKey].length > 0;
        
        return (
          <React.Fragment key={partsKey}>
            <div 
              onClick={(e) => {
                // For parts folder, just toggle expansion
                e.stopPropagation();
                toggleNodeExpansion(partsKey, e);
              }}
              style={{
                padding: '8px',
                backgroundColor: '#f0f0f0',
                color: '#333',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '5px',
                marginLeft: `${15 + level * 20}px`, // Indent based on hierarchy level
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold',
                borderLeft: '3px solid #1976d2' // Blue border to indicate special folder
              }}
            >
              {/* Expand/collapse icon */}
              <span 
                onClick={(e) => toggleNodeExpansion(partsKey, e)} 
                style={{ 
                  marginRight: '5px', 
                  cursor: 'pointer',
                  color: '#555',
                  fontSize: '14px',
                  width: '16px',
                  textAlign: 'center'
                }}
              >
                {expandedNodes[partsKey] ? '▼' : '►'}
              </span>
              
              {/* Parts folder icon */}
              <span style={{ marginRight: '5px', color: '#1976d2' }}>📁</span>
              
              {/* Parts folder name */}
              <span>parts</span>
            </div>
            
            {/* Render parts if expanded */}
            {expandedNodes[partsKey] && renderVolumeTree(partsKey, level + 1)}
          </React.Fragment>
        );
      }
      
      // Regular volume handling
      const { volume, key, index, isBooleanComponent } = item;
      const hasChildren = volumesByParent[key] && volumesByParent[key].length > 0;
      
      // Check if volume is active (has isActive flag and hitsCollectionName)
      const isActive = volume.isActive && volume.hitsCollectionName;
      
      return (
        <React.Fragment key={key}>
          <div 
            onClick={() => {
              // If this object is already selected, unselect it by setting selection to null
              // Otherwise, select this object
              onSelect(selectedGeometry === key ? null : key);
            }}
            onContextMenu={(e) => handleContextMenu(e, index)}
            style={{
              padding: '8px',
              backgroundColor: selectedGeometry === key ? '#1976d2' : '#fff',
              color: selectedGeometry === key ? '#fff' : '#000',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '5px',
              marginLeft: `${15 + level * 20}px`, // Indent based on hierarchy level
              display: 'flex',
              alignItems: 'center',
              // Special styling for boolean components
              ...(isBooleanComponent && {
                borderLeft: '2px solid #1976d2',
                backgroundColor: selectedGeometry === key ? '#1976d2' : '#f0f8ff'
              })
            }}
          >
            {/* Expand/collapse icon - only show if node has children */}
            {hasChildren && (
              <span 
                onClick={(e) => toggleNodeExpansion(key, e)} 
                style={{ 
                  marginRight: '5px', 
                  cursor: 'pointer',
                  color: selectedGeometry === key ? '#fff' : '#555',
                  fontSize: '14px',
                  width: '16px',
                  textAlign: 'center'
                }}
              >
                {expandedNodes[key] ? '▼' : '►'}
              </span>
            )}
            {/* If no children, add spacing to align with nodes that have the toggle */}
            {!hasChildren && <span style={{ width: '16px', marginRight: '5px' }}></span>}
            <span style={{ 
              marginRight: '5px',
              color: isActive ? '#4caf50' : (selectedGeometry === key ? '#fff' : 'inherit'),
              textShadow: isActive ? '0 0 1px #4caf50, 0 0 1px #4caf50, 0 0 2px #4caf50, 0 0 2px #4caf50' : 'none', // Much thicker green outline for active elements
              fontSize: '16px'
            }}>{getVolumeIcon(volume, isActive)}</span>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {/* Display the Geant4 name (g4name) if available, otherwise fall back to internal name */}
              {volume.g4name || volume.name || `${volume.type.charAt(0).toUpperCase() + volume.type.slice(1)} ${index + 1}`}
              
              {/* Active elements are now indicated by the green icon outline */}
            </span>
          </div>
          {/* Only render children if node is expanded */}
          {expandedNodes[key] && renderVolumeTree(key, level + 1)}
        </React.Fragment>
      );
    });
  };
  
  // State for import alert
  const [importAlert, setImportAlert] = useState({ show: false, message: '', severity: 'info' });

  return (
    <div style={{ padding: '10px', backgroundColor: '#f5f5f5', height: '100%', overflowY: 'auto' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Geometry Tree</h3>
      
      {/* SaveObjectDialog for saving objects with a nicer interface - using the same component as GeometryEditor */}
      <SaveObjectDialog
        open={saveObjectDialogOpen}
        onClose={() => setSaveObjectDialogOpen(false)}
        onSave={async (name, description, objectToSave, preserveComponentIds) => {
          if (!objectToSave) {
            return { success: false, message: 'No object selected' };
          }
          
          try {
            // Import the ObjectStorage utility
            const { saveObject } = await import('../geometry-editor/utils/ObjectStorage');
            
            // Generate a default file name if none is provided
            const fileName = name || objectToSave.object.name || 'geometry';
            
            // Apply structured naming if needed
            console.log('GeometryTree::applyStructuredNaming:: objectToSave', objectToSave);
            console.log('GeometryTree::applyStructuredNaming:: preserveComponentIds', preserveComponentIds);
            // const dataToSave = preserveComponentIds ? objectToSave : applyStructuredNaming(objectToSave);
            const dataToSave = objectToSave;
            // Save the object to the library
            
            await saveObject(fileName, description, dataToSave);
            
            // Show success message in our component
            setImportAlert({
              show: true,
              message: `Object saved as ${fileName}`,
              severity: 'success'
            });
            
            // Hide the alert after 5 seconds
            setTimeout(() => {
              setImportAlert({ show: false, message: '', severity: 'info' });
            }, 5000);
            
            // Return success result for the SaveObjectDialog component
            return { 
              success: true, 
              message: `Object saved as ${fileName}` 
            };
          } catch (error) {
            console.error('Error saving object:', error);
            
            // Show error message in our component
            setImportAlert({
              show: true,
              message: `Error saving object: ${error.message}`,
              severity: 'error'
            });
            
            // Hide the alert after 5 seconds
            setTimeout(() => {
              setImportAlert({ show: false, message: '', severity: 'info' });
            }, 5000);
            
            // Return error result for the SaveObjectDialog component
            return { 
              success: false, 
              message: `Error saving object: ${error.message}` 
            };
          }
        }}
        objectData={objectToSave}
        defaultName={objectToSave?.object?.name || ''}
      />
      
      {/* Alert message */}
      {importAlert.show && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 20px',
          backgroundColor: importAlert.severity === 'success' ? '#4caf50' : '#f44336',
          color: 'white',
          borderRadius: '4px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          {importAlert.message}
        </div>
      )}
      <div style={{ marginBottom: '5px' }}>
        {/* World volume - selectable but not movable */}
        <div 
          onClick={() => {
            // Allow selecting/unselecting World volume in the tree
            onSelect(selectedGeometry === 'world' ? null : 'world');
          }}
          style={{
            padding: '8px',
            backgroundColor: selectedGeometry === 'world' ? '#1976d2' : '#fff',
            color: selectedGeometry === 'world' ? '#fff' : '#000',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '5px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {/* Expand/collapse icon for World */}
          <span 
            onClick={(e) => toggleNodeExpansion('world', e)} 
            style={{ 
              marginRight: '5px', 
              cursor: 'pointer',
              color: selectedGeometry === 'world' ? '#fff' : '#555',
              fontSize: '14px',
              width: '16px',
              textAlign: 'center'
            }}
          >
            {expandedNodes['world'] ? '▼' : '►'}
          </span>
          <span style={{ marginRight: '5px' }}>🌐</span>
          <strong>World</strong>
          <span style={{ marginLeft: '5px', fontSize: '0.8em', color: selectedGeometry === 'world' ? '#ddd' : '#777' }}></span>
        </div>
        
        {/* Render volumes with World as parent and their children recursively, but only if World is expanded */}
        {expandedNodes['world'] && renderVolumeTree('world')}
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.mouseY,
            left: contextMenu.mouseX,
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 1000
          }}
        >
          {/* Show update possibility for assemblies and objects with parent World */}
          {/* only for top level objects-> mother_volume eitehr has no _compoundId or _motehr _compoundId is different from the selected object */}
          {(geometries.volumes[contextMenu.volumeIndex]?.mother_volume === 'World' || 
            (typeof geometries.volumes[contextMenu.volumeIndex]?.mother_volume === 'object' && 
             geometries.volumes[contextMenu.volumeIndex]?.mother_volume._compoundId !== geometries.volumes[contextMenu.volumeIndex]?._compoundId)) && (
            <>
              <div
                onClick={() => handleUpdateAllAssemblies(contextMenu.volumeIndex, geometries, onUpdateGeometry, setContextMenu)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  hover: { backgroundColor: '#f5f5f5' }
                }}
              >
                Update All
              </div>
              <div
                onClick={() => {
                  // Set the selected geometry to the current context menu item
                  // This ensures handleExportObject gets the right object
                  const volumeKey = `volume-${contextMenu.volumeIndex}`;
                  onSelect(volumeKey);
                  // Call our custom handleExportObject and close the context menu
                  handleExportObject();
                  handleCloseContextMenu();
                }}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  hover: { backgroundColor: '#f5f5f5' }
                }}
              >
                Save to Library
              </div>
            </>
          )}
          
          <div
            onClick={handleCloseContextMenu}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              hover: { backgroundColor: '#f5f5f5' }
            }}
          >
            Cancel
          </div>
        </div>
      )}
      
      {/* Update Assemblies Dialog */}
      {updateAssembliesDialog.open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '80%',
              maxHeight: '80%',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <h3 style={{ margin: 0 }}>Select Assemblies to Update</h3>
            <p>Select which assemblies should be updated with properties from the source assembly.</p>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '8px' }}>
              {updateAssembliesDialog.allAssemblies.map(item => (
                <div 
                  key={item.index}
                  style={{
                    padding: '8px',
                    marginBottom: '4px',
                    backgroundColor: updateAssembliesDialog.selectedIndices.includes(item.index) ? '#e3f2fd' : '#f5f5f5',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onClick={() => {
                    setUpdateAssembliesDialog(prev => {
                      const newSelectedIndices = [...prev.selectedIndices];
                      const indexPosition = newSelectedIndices.indexOf(item.index);
                      
                      if (indexPosition === -1) {
                        // Add to selection
                        newSelectedIndices.push(item.index);
                      } else {
                        // Remove from selection
                        newSelectedIndices.splice(indexPosition, 1);
                      }
                      
                      return {
                        ...prev,
                        selectedIndices: newSelectedIndices
                      };
                    });
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={updateAssembliesDialog.selectedIndices.includes(item.index)}
                    onChange={() => {}} // Handled by the parent div's onClick
                    style={{ marginRight: '8px' }}
                  />
                  <span>
                    {item.volume.g4name || item.volume.name}
                  </span>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => setUpdateAssembliesDialog(prev => ({ ...prev, open: false }))}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={handleUpdateAssembliesConfirm}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Assembly Selection Dialog */}
      {assemblyDialog.open && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 1001,
            padding: '16px',
            minWidth: '300px'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
            Select Assembly
          </div>
          
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {assemblyDialog.assemblies.map(({ volume, index }) => (
              <div
                key={index}
                onClick={() => handleConfirmAddToAssembly(index)}
                style={{
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  hover: { backgroundColor: '#f5f5f5' },
                  marginBottom: '4px'
                }}
              >
                <span style={{ marginRight: '5px' }}>📁</span>
                <span>{volume.g4name || volume.name}</span>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              onClick={() => setAssemblyDialog({ open: false, volumeIndex: null, assemblies: [] })}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginRight: '8px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
