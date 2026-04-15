import React, { useState } from 'react';
import { getParentKey } from './utils/geometryUtils';
import { isVolumeKey, findFlatIndex } from '../../utils/expandToFlat';
import { getVolumeIcon } from '../geometry-editor/utils/geometryIcons';
import SaveObjectDialog from '../geometry-editor/components/SaveObjectDialog';
import { getSelectedGeometryObject, findAllDescendants } from '../geometry-editor/utils/GeometryUtils';
import { saveObject } from '../geometry-editor/utils/ObjectStorage';
import { extractSubtreeFromJson } from '../../utils/jsonOperations';
import { useAppContext } from '../../contexts/useAppContext';
import { debugLog } from '../../utils/logger.js';

// GeometryTree component for the left panel
export default function GeometryTree({ geometries, selectedGeometry, onSelect, onUpdateGeometry }) {
  const { jsonData, materials, handleBatchSetVisibility, handleAddPlacement, refreshView } = useAppContext();
  // State for save object dialog
  const [saveObjectDialogOpen, setSaveObjectDialogOpen] = useState(false);
  const [objectToSave, setObjectToSave] = useState(null);

  // Extract the selected volume's subtree directly from jsonData
  const handleExportObject = (objectKey = selectedGeometry) => {
    debugLog('handleExportObject:: from jsonData');
    
    const selectedObject = getSelectedGeometryObject(objectKey, geometries);
    if (!selectedObject) {
      alert('Please select a geometry object to export');
      return;
    }

    if (!jsonData) {
      alert('No JSON data available');
      return;
    }

    // Find the volume name to extract. For compound components, use the
    // compound root name if available; otherwise use the volume's own name.
    const volumeName = selectedObject._compoundId && 
      !selectedObject._is_boolean_component &&
      !selectedObject._componentId
        ? selectedObject._compoundId
        : selectedObject.name;

    // Extract the subtree directly from the hierarchical JSON, including used materials
    const subtree = extractSubtreeFromJson(jsonData, volumeName, materials);
    if (!subtree || subtree.volumes.length === 0) {
      alert('Failed to extract object from JSON data');
      return;
    }

    debugLog('handleExportObject:: subtree', subtree);
    setObjectToSave(subtree);
    setSaveObjectDialogOpen(true);
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
  
  // Function to confirm adding to assembly
  const handleConfirmAddToAssembly = (assemblyIndex) => {
    const volumeIndex = assemblyDialog.volumeIndex;
    const assembly = geometries.volumes[assemblyIndex];
    const originalVolume = geometries.volumes[volumeIndex];
    
    // Get the volume key for updating
    const volumeKey = originalVolume._id;
    
    // Update using a full object to avoid dropping existing properties
    const updatedVolume = {
      ...originalVolume,
      mother_volume: assembly.name
    };
    
    // Update the geometry using onUpdateGeometry
    onUpdateGeometry(volumeKey, updatedVolume);
    
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
    return getParentKey(volume, volumeNameToIndex, geometries.volumes);
  };
  
  // Group volumes by their parent
  const volumesByParent = {
    world: [] // Volumes with World as parent
  };
  
  // Initialize volume groups for all volumes
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    const key = volume._id;
    volumesByParent[key] = []; // Initialize empty array for each volume
  });
  
  // Collect display groups: volumes whose parent is World and that have a _displayGroup
  // will be placed under virtual folder nodes instead of directly under World.
  const displayGroupKeys = new Set();

  // Populate the groups
  geometries.volumes && geometries.volumes.forEach((volume, index) => {
    const key = volume._id;
    const parentKey = getParentKeyWrapper(volume);
    
    // Check if this is a boolean component
    if (volume._is_boolean_component === true && volume._boolean_parent) {
      // Find the parent union's index
      const parentUnionIndex = geometries.volumes.findIndex(v => v.name === volume._boolean_parent);
      
      if (parentUnionIndex !== -1) {
        // Create a special key for the "Parts" folder of this union
        const parentUnionVol = geometries.volumes[parentUnionIndex];
        const unionPartsKey = `union-parts-${parentUnionVol._id}`;
        
        // Make sure the parts folder exists for this union
        if (!volumesByParent[unionPartsKey]) {
          volumesByParent[unionPartsKey] = [];
          
          // Add the parts folder to the union's children
          const unionKey = parentUnionVol._id;
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
      // If this volume has a _displayGroup, place it under a virtual
      // display-group folder at its parent level — but only if the parent
      // volume does NOT already have the same _displayGroup (to avoid
      // duplicate folders at every level of the hierarchy).
      const parentFlatIdx = isVolumeKey(parentKey) ? findFlatIndex(geometries.volumes, parentKey) : -1;
      const parentVolume = parentFlatIdx >= 0 ? geometries.volumes[parentFlatIdx] : null;
      const parentHasSameGroup = parentVolume && parentVolume._displayGroup === volume._displayGroup;
      if (volume._displayGroup && volumesByParent[parentKey] && !parentHasSameGroup) {
        const groupKey = `display-group-${parentKey}-${volume._displayGroup}`;
        if (!volumesByParent[groupKey]) {
          volumesByParent[groupKey] = [];
          displayGroupKeys.add(groupKey);
          // Add the folder entry to the parent's children
          volumesByParent[parentKey].push({
            isDisplayGroupFolder: true,
            key: groupKey,
            groupName: volume._displayGroup,
          });
        }
        volumesByParent[groupKey].push({ volume, key, index });
      } else if (volumesByParent[parentKey]) {
        volumesByParent[parentKey].push({
          volume,
          key,
          index
        });
      }
    }
  });
  
  // Helper to toggle visibility for all volumes inside a display-group folder
  // (including all their descendants)
  const toggleGroupVisibility = (groupKey) => {
    const members = volumesByParent[groupKey];
    if (!members || members.length === 0) return;
    // Determine new visibility: if any member is visible, hide all; otherwise show all
    const anyVisible = members.some(m => m.volume && m.volume.visible !== false);
    const newVisible = !anyVisible;
    const updates = [];
    members.forEach(m => {
      if (!m.volume) return;
      updates.push({ id: m.key, visible: newVisible });
      // Also include all descendants of this member
      const descendants = findAllDescendants(m.volume.name, geometries.volumes);
      descendants.forEach(desc => {
        const descVol = geometries.volumes.find(v => v.name === desc.name);
        if (descVol) {
          updates.push({ id: descVol._id, visible: newVisible });
        }
      });
    });
    handleBatchSetVisibility(updates);
  };

  // Helper to toggle visibility for a volume and all its descendants
  const toggleCascadeVisibility = (volume, key) => {
    const newVisible = volume.visible === false ? true : false;
    const updates = [{ id: key, visible: newVisible }];
    // Toggle all descendants
    const descendants = findAllDescendants(volume.name, geometries.volumes);
    descendants.forEach(desc => {
      const descVol = geometries.volumes.find(v => v.name === desc.name);
      if (descVol) {
        updates.push({ id: descVol._id, visible: newVisible });
      }
    });
    handleBatchSetVisibility(updates);
  };
  
  // Recursive function to render a volume and its children in the tree
  const renderVolumeTree = (parentKey, level = 0) => {
    // If this parent has no children, return null
    if (!volumesByParent[parentKey] || volumesByParent[parentKey].length === 0) {
      return null;
    }
    
    // Sort volumes alphabetically by g4name (if available) or name
    const sortedVolumes = [...volumesByParent[parentKey]].sort((a, b) => {
      // Special case: Display group folders come first (alphabetically among themselves)
      if (a.isDisplayGroupFolder && b.isDisplayGroupFolder) return a.groupName.localeCompare(b.groupName);
      if (a.isDisplayGroupFolder) return -1;
      if (b.isDisplayGroupFolder) return 1;
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
      // Special handling for Display Group folder
      if (item.isDisplayGroupFolder) {
        const groupKey = item.key;
        return (
          <React.Fragment key={groupKey}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpansion(groupKey, e);
              }}
              style={{
                padding: '8px',
                backgroundColor: '#f5f0e8',
                color: '#333',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '5px',
                marginLeft: `${15 + level * 20}px`,
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold',
                borderLeft: '3px solid #e6a817'
              }}
            >
              <span
                onClick={(e) => toggleNodeExpansion(groupKey, e)}
                style={{
                  marginRight: '5px',
                  cursor: 'pointer',
                  color: '#555',
                  fontSize: '14px',
                  width: '16px',
                  textAlign: 'center'
                }}
              >
                {expandedNodes[groupKey] ? '▼' : '►'}
              </span>
              <span style={{ marginRight: '5px', color: '#e6a817' }}>📁</span>
              <span style={{ flex: 1 }}>{item.groupName}</span>
              <span
                title="Toggle visibility of all items in this group"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGroupVisibility(groupKey);
                }}
                style={{
                  marginLeft: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  opacity: volumesByParent[groupKey]?.some(m => m.volume && m.volume.visible !== false) ? 0.9 : 0.4
                }}
              >
                👁️
              </span>
            </div>
            {expandedNodes[groupKey] && renderVolumeTree(groupKey, level + 1)}
          </React.Fragment>
        );
      }

      // Special handling for Parts folder
      if (item.isPartsFolder) {
        const partsKey = item.key;
        
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
      
      // Check if volume is active (has a hits collection connected)
      const isActive = Boolean(volume.hitsCollectionName);
      
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
            }}>{getVolumeIcon(volume)}</span>
            <span style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {/* Display the Geant4 name (g4name) if available, otherwise fall back to internal name */}
              {volume.g4name || volume.name || `${volume.type.charAt(0).toUpperCase() + volume.type.slice(1)} ${index + 1}`}
              
              {/* Active elements are now indicated by the green icon outline */}
            </span>
            {/* Cascade visibility toggle - only for volumes with children */}
            {hasChildren && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCascadeVisibility(volume, key);
                }}
                style={{
                  marginLeft: 'auto',
                  cursor: 'pointer',
                  opacity: 0.6,
                  fontSize: '12px',
                  padding: '0 2px',
                }}
                title={volume.visible === false ? 'Show this and all children' : 'Hide this and all children'}
              >
                ⬇
              </span>
            )}
            {/* Visibility toggle eye icon */}
            <span
              onClick={(e) => {
                e.stopPropagation();
                const updatedVolume = { ...volume, visible: volume.visible === false ? true : false };
                onUpdateGeometry(key, updatedVolume);
              }}
              style={{
                marginLeft: hasChildren ? '0' : 'auto',
                cursor: 'pointer',
                opacity: volume.visible === false ? 0.3 : 0.7,
                fontSize: '14px',
                padding: '0 4px',
              }}
              title={volume.visible === false ? 'Show' : 'Hide'}
            >
              {volume.visible === false ? '👁️‍🗨️' : '👁️'}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 10px 0' }}>
        <h3 style={{ margin: 0 }}>Geometry Tree</h3>
        <button
          onClick={() => refreshView()}
          title="Re-derive 3D view from current JSON data"
          style={{
            padding: '4px 10px',
            backgroundColor: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Update View
        </button>
      </div>
      
      {/* SaveObjectDialog for saving objects with a nicer interface - using the same component as GeometryEditor */}
      <SaveObjectDialog
        open={saveObjectDialogOpen}
        onClose={() => setSaveObjectDialogOpen(false)}
        onSave={async (name, description, objectToSave, preserveComponentIds) => {
          if (!objectToSave) {
            return { success: false, message: 'No object selected' };
          }
          
          try {
            // Generate a default file name if none is provided
            const fileName = name || objectToSave?.volumes?.[0]?.name || 'geometry';
            
            // Rename the root volume (first volume) to match the save name
            const dataToSave = structuredClone(objectToSave);
            if (dataToSave.volumes && dataToSave.volumes.length > 0) {
              const oldRootName = dataToSave.volumes[0].name;
              const newRootName = fileName;
              if (oldRootName !== newRootName) {
                dataToSave.volumes[0].name = newRootName;
                if (dataToSave.volumes[0].g4name) {
                  dataToSave.volumes[0].g4name = newRootName;
                }
                // Rename placement names that start with the old root name
                // (e.g. assembly_xxx_000 → PMT_dummy_000)
                const oldPlacementNames = new Map();
                for (const pl of (dataToSave.volumes[0].placements || [])) {
                  if (pl.name && pl.name.startsWith(oldRootName)) {
                    const suffix = pl.name.slice(oldRootName.length);
                    const newPlName = newRootName + suffix;
                    oldPlacementNames.set(pl.name, newPlName);
                    pl.name = newPlName;
                    if (pl.g4name) pl.g4name = newPlName;
                  }
                }
                // Update parent references in other volumes (by volume name or placement name)
                for (const vol of dataToSave.volumes) {
                  for (const pl of (vol.placements || [])) {
                    if (pl.parent === oldRootName) pl.parent = newRootName;
                    const renamedParent = oldPlacementNames.get(pl.parent);
                    if (renamedParent) pl.parent = renamedParent;
                  }
                  // Also update parent references inside compound components
                  for (const comp of (vol.components || [])) {
                    for (const pl of (comp.placements || [])) {
                      if (pl.parent === oldRootName) pl.parent = newRootName;
                      const renamedParent = oldPlacementNames.get(pl.parent);
                      if (renamedParent) pl.parent = renamedParent;
                    }
                  }
                }
                // Update _compoundId if it matched the old name
                if (dataToSave.volumes[0]._compoundId === oldRootName) {
                  dataToSave.volumes[0]._compoundId = newRootName;
                }
              }
            }

            debugLog('GeometryTree:: dataToSave', dataToSave);
            debugLog('GeometryTree:: preserveComponentIds', preserveComponentIds);
            
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
        defaultName={objectToSave?.volumes?.[0]?.name || ''}
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
          {/* Show save option for any volume */}
          {geometries.volumes[contextMenu.volumeIndex] && (
              <div
                onClick={() => {
                  // Set the selected geometry to the current context menu item
                  const volumeKey = geometries.volumes[contextMenu.volumeIndex]?._id;
                  onSelect(volumeKey);
                  // Export explicitly using the clicked object key to avoid stale selection races
                  handleExportObject(volumeKey);
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
          )}

          {/* Add another placement of the same volume definition */}
          {geometries.volumes[contextMenu.volumeIndex] &&
           !geometries.volumes[contextMenu.volumeIndex]._componentIndex &&
           geometries.volumes[contextMenu.volumeIndex]._componentIndex === undefined && (
              <div
                onClick={() => {
                  const volumeKey = geometries.volumes[contextMenu.volumeIndex]?._id;
                  handleAddPlacement(volumeKey);
                  handleCloseContextMenu();
                }}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  hover: { backgroundColor: '#f5f5f5' }
                }}
              >
                Add Placement
              </div>
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
