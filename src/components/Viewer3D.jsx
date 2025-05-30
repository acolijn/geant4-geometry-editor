import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { calculateWorldPosition, worldToLocalCoordinates, getParentKey, groupVolumesByParent } from './viewer3D/utils/geometryUtils';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
// Instance tracking functionality has been removed for a cleaner implementation
import Scene from './viewer3D/components/Scene';

// GeometryTree component for the left panel
const GeometryTree = ({ geometries, selectedGeometry, onSelect, onUpdateGeometry }) => {
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
  
  // Function to update all similar assemblies
  const handleUpdateAllAssemblies = (volumeIndex) => {
    handleCloseContextMenu();
    
    // Get the selected volume
    const selectedVolume = geometries.volumes[volumeIndex];
    
    // Only proceed if the selected volume is an assembly
    if (selectedVolume.type !== 'assembly') {
      alert('Only assemblies can be updated. Please select an assembly.');
      return;
    }
    
    // Count of updated assemblies
    let updatedCount = 0;
    
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
    
    // Update all assemblies except the selected one
    for (let i = 0; i < geometries.volumes.length; i++) {
      const volume = geometries.volumes[i];
      
      // Skip the source assembly itself
      if (i === volumeIndex) continue;
      
      // Only update assemblies
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
      
      // Preserve displayName and g4name if they exist
      if (volume.displayName) {
        updatedAssembly.displayName = volume.displayName;
      }
      if (volume.g4name) {
        updatedAssembly.g4name = volume.g4name;
      }
      
      // Debug logs
      console.log(`Updating assembly at index ${i}:`, {
        sourceAssembly: selectedVolume,
        targetAssembly: volume,
        updatedAssembly: updatedAssembly
      });
      
      // Update this specific assembly
      // Use the volume ID format: 'volume-index'
      onUpdateGeometry(`volume-${i}`, updatedAssembly, true, false);
      
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
          
          // Preserve displayName and g4name if they exist
          if (matchingTargetComponent.volume.displayName) {
            updatedComponent.displayName = matchingTargetComponent.volume.displayName;
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
      console.log('No other assemblies found to update.');
    }
  };
  
  // Function to update selected assemblies
  const handleUpdateSelectedAssemblies = (volumeIndex) => {
    handleCloseContextMenu();
    
    // Get the selected volume
    const selectedVolume = geometries.volumes[volumeIndex];
    
    // Only proceed if the selected volume is an assembly
    if (selectedVolume.type !== 'assembly') {
      alert('Only assemblies can be updated. Please select an assembly.');
      return;
    }
    
    // Find all assemblies in the scene
    const allAssemblies = geometries.volumes
      .map((volume, index) => ({ volume, index }))
      .filter(item => item.volume.type === 'assembly' && item.index !== volumeIndex);
    
    if (allAssemblies.length === 0) {
      console.log('No other assemblies found to update.');
      return;
    }
    
    // Open the update assemblies dialog
    setUpdateAssembliesDialog({
      open: true,
      sourceIndex: volumeIndex,
      selectedIndices: [],
      allAssemblies: allAssemblies
    });
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
      
      // Preserve displayName and g4name if they exist
      if (volume.displayName) {
        updatedAssembly.displayName = volume.displayName;
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
          
          // Preserve displayName and g4name if they exist
          if (matchingTargetComponent.volume.displayName) {
            updatedComponent.displayName = matchingTargetComponent.volume.displayName;
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
    
    // Add this volume to its parent's children list
    if (volumesByParent[parentKey]) {
      volumesByParent[parentKey].push({
        volume,
        key,
        index
      });
    }
  });
  
  // Recursive function to render a volume and its children in the tree
  const renderVolumeTree = (parentKey, level = 0) => {
    // If this parent has no children, return null
    if (!volumesByParent[parentKey] || volumesByParent[parentKey].length === 0) {
      return null;
    }
    
    // Sort volumes alphabetically by name
    const sortedVolumes = [...volumesByParent[parentKey]].sort((a, b) => {
      const nameA = a.volume.name || `${a.volume.type.charAt(0).toUpperCase() + a.volume.type.slice(1)} ${a.index + 1}`;
      const nameB = b.volume.name || `${b.volume.type.charAt(0).toUpperCase() + b.volume.type.slice(1)} ${b.index + 1}`;
      return nameA.localeCompare(nameB);
    });
    
    // Render all children of this parent (now sorted alphabetically)
    return sortedVolumes.map(({ volume, key, index }) => {
      let icon = '📦'; // Default box icon
      if (volume.type === 'sphere') icon = '🔴';
      if (volume.type === 'cylinder') icon = '🧪';
      if (volume.type === 'ellipsoid') icon = '🥚';
      if (volume.type === 'torus') icon = '🍩';
      if (volume.type === 'polycone') icon = '🏆';
      if (volume.type === 'trapezoid') icon = '🔷';
      if (volume.type === 'assembly') icon = '📁'; // Folder icon for assemblies
      
      // Check if this node has children
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
              alignItems: 'center'
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
            <span style={{ marginRight: '5px' }}>{icon}</span>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {/* Display the Geant4 name (displayName) if available, otherwise fall back to internal name */}
              {volume.displayName || volume.name || `${volume.type.charAt(0).toUpperCase() + volume.type.slice(1)} ${index + 1}`}
              
              {isActive && (
                <span 
                  style={{ 
                    marginLeft: '8px', 
                    backgroundColor: '#4caf50', 
                    color: 'white', 
                    fontSize: '0.7rem', 
                    padding: '2px 6px', 
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '16px'
                  }}
                  title={`Active: ${volume.hitsCollectionName}`}
                >
                  {volume.hitsCollectionName}
                </span>
              )}
            </span>
          </div>
          {/* Only render children if node is expanded */}
          {expandedNodes[key] && renderVolumeTree(key, level + 1)}
        </React.Fragment>
      );
    });
  };
  
  return (
    <div style={{ padding: '10px', backgroundColor: '#f5f5f5', height: '100%', overflowY: 'auto' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Geometry Tree</h3>
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
          <div
            onClick={() => handleAddToAssembly(contextMenu.volumeIndex)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              hover: { backgroundColor: '#f5f5f5' }
            }}
          >
            Add to Assembly
          </div>
          
          {/* Only show update options for assemblies */}
          {geometries.volumes[contextMenu.volumeIndex]?.type === 'assembly' && (
            <>
              <div
                onClick={() => handleUpdateAllAssemblies(contextMenu.volumeIndex)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  hover: { backgroundColor: '#f5f5f5' }
                }}
              >
                Update All Similar Assemblies
              </div>
              <div
                onClick={() => handleUpdateSelectedAssemblies(contextMenu.volumeIndex)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  hover: { backgroundColor: '#f5f5f5' }
                }}
              >
                Update Selected Assemblies
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
                    {item.volume.displayName || item.volume.name}
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
                <span>{volume.displayName || volume.name}</span>
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

const Viewer3D = ({ geometries, selectedGeometry, onSelect, onUpdateGeometry }) => {
  const [transformMode, setTransformMode] = useState('translate');
  const [frontViewCamera, setFrontViewCamera] = useState(null);
  
  // Register update handler with the InstanceTracker
  // Instance tracking functionality has been removed for a cleaner implementation
  // The update handler will be reimplemented in a simpler way
  
  // Calculate camera distance based on world size
  const calculateCameraDistance = () => {
    // Get the maximum dimension of the world volume
    const maxDimension = Math.max(
      geometries.world.size?.x || 2000,
      geometries.world.size?.y || 2000,
      geometries.world.size?.z || 2000
    );
    
    // Set camera distance to be 2x the maximum dimension to ensure everything is visible
    // This allows the camera to scale properly with larger world volumes
    return -2 * maxDimension;
  };

  // Function to set front view
  const setFrontView = () => {
    if (frontViewCamera) {
      const cameraDistance = calculateCameraDistance();
      frontViewCamera.position.set(0, cameraDistance, 0);
      frontViewCamera.lookAt(0, 0, 0);
      frontViewCamera.up.set(0, 0, 1); // Maintain z-axis as up direction
      frontViewCamera.updateProjectionMatrix();
    }
  };
  
  // Handle canvas click to deselect
  const handleCanvasClick = (e) => {
    if (selectedGeometry && e.target === e.currentTarget) {
      onSelect(null);
    }
  };
  
  // Handle transform end - completely rewritten to fix selection issues
  const handleTransformEnd = (objectKey, updates, keepSelected = true, isSourceUpdate = false) => {
    console.log(`Transform end for ${objectKey}, keepSelected: ${keepSelected}, isSourceUpdate: ${isSourceUpdate}`);
    
    // CRITICAL: Force selection of the object being transformed
    // This must happen BEFORE any geometry updates to ensure it takes effect
    if (keepSelected && objectKey !== selectedGeometry) {
      console.log(`Forcing selection to ${objectKey} before update`);
      onSelect(objectKey);
    }
    
    // Get the current object
    let currentObject;
    if (objectKey === 'world') {
      currentObject = { ...geometries.world };
    } else if (objectKey.startsWith('volume-')) {
      const index = parseInt(objectKey.split('-')[1]);
      currentObject = { ...geometries.volumes[index] };
    } else {
      return;
    }
    
    // Apply updates to the current object
    const updatedObject = { ...currentObject };
    
    // Update position - ensure we're not losing any properties
    if (updates.position) {
      updatedObject.position = {
        ...(updatedObject.position || {}),
        ...updates.position,
        // Ensure unit is preserved
        unit: updates.position.unit || updatedObject.position?.unit || 'cm'
      };
    }
    
    // Update rotation - all values are now in radians
    if (updates.rotation) {
      updatedObject.rotation = {
        ...(updatedObject.rotation || {}),
        ...updates.rotation
        // No unit needed as all rotation values are in radians
      };
    }
    
    // Update size for box
    if (updates.size && updatedObject.type === 'box') {
      updatedObject.size = {
        ...updatedObject.size,
        ...updates.size
      };
    }
    
    // Update radius and height for cylinder
    if (updatedObject.type === 'cylinder') {
      if (updates.radius !== undefined) updatedObject.radius = updates.radius;
      if (updates.height !== undefined) updatedObject.height = updates.height;
      if (updates.innerRadius !== undefined) updatedObject.innerRadius = updates.innerRadius;
    }
    
    // Update radius for sphere
    if (updatedObject.type === 'sphere' && updates.radius !== undefined) {
      updatedObject.radius = updates.radius;
    }
    
    // Update properties for ellipsoid
    if (updatedObject.type === 'ellipsoid') {
      if (updates.xRadius !== undefined) updatedObject.xRadius = updates.xRadius;
      if (updates.yRadius !== undefined) updatedObject.yRadius = updates.yRadius;
      if (updates.zRadius !== undefined) updatedObject.zRadius = updates.zRadius;
    }
    
    // Update properties for torus
    if (updatedObject.type === 'torus') {
      if (updates.majorRadius !== undefined) updatedObject.majorRadius = updates.majorRadius;
      if (updates.minorRadius !== undefined) updatedObject.minorRadius = updates.minorRadius;
    }
    
    // Update properties for trapezoid
    if (updatedObject.type === 'trapezoid') {
      if (updates.dx1 !== undefined) updatedObject.dx1 = updates.dx1;
      if (updates.dx2 !== undefined) updatedObject.dx2 = updates.dx2;
      if (updates.dy1 !== undefined) updatedObject.dy1 = updates.dy1;
      if (updates.dy2 !== undefined) updatedObject.dy2 = updates.dy2;
      if (updates.dz !== undefined) updatedObject.dz = updates.dz;
    }
    
    // Update properties for polycone
    if (updatedObject.type === 'polycone' && updates.zSections) {
      updatedObject.zSections = updates.zSections;
    }
    
    // Update the geometry WITHOUT changing selection
    // The third parameter (false) is critical - it tells onUpdateGeometry not to change selection
    onUpdateGeometry(objectKey, updatedObject, false);
    
    // CRITICAL: Force selection of the object again AFTER the update
    // This ensures it stays selected even if something in the update process changed it
    if (keepSelected) {
      // Use requestAnimationFrame to ensure this happens after the current render cycle
      requestAnimationFrame(() => {
        console.log(`Forcing selection to ${objectKey} after update`);
        onSelect(objectKey);
      });
    }
    
    // Instance tracking functionality has been removed for a cleaner implementation
    // Source object tracking and updating will be reimplemented in a simpler way
    if (isSourceUpdate) {
      console.log('Source update from transform operation - functionality will be reimplemented');
    }
    
    // If this is a parent object, handle parent-child relationships
    if (updates.position || updates.rotation) {
      if (objectKey === 'world') {
        // World volume updates don't need special handling for children
      } else if (objectKey.startsWith('volume-')) {
        const parentIndex = parseInt(objectKey.split('-')[1]);
        const parentVolume = geometries.volumes[parentIndex];
        
        // Only proceed if we have a valid parent volume name
        if (parentVolume && parentVolume.name) {
          // Find all volumes that have this volume as their mother
          // We don't need to update their positions since they're already positioned relative to parent
          // in the Three.js scene graph, but we do need to maintain selection state
          geometries.volumes.forEach((volume, index) => {
            if (volume.mother_volume === parentVolume.name) {
              // Just maintain the data model relationships
              // No need to change selection for child volumes
            }
          });
        }
      }
    }
  };
  
  // Check if geometries is valid
  if (!geometries || !geometries.world) {
    return <div>Loading geometries...</div>;
  }
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex' }}>
      {/* Left panel - Geometry Tree */}
      <div style={{ width: '25%', height: '100%', borderRight: '1px solid #ccc' }}>
        <GeometryTree 
          geometries={geometries} 
          selectedGeometry={selectedGeometry} 
          onSelect={onSelect}
          onUpdateGeometry={onUpdateGeometry}
        />
      </div>
      
      {/* 3D Viewer */}
      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        {/* Transform mode buttons - top left */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 100,
          display: 'flex',
          gap: '5px'
        }}>
          <button 
            onClick={() => setTransformMode('translate')}
            style={{
              backgroundColor: transformMode === 'translate' ? '#1976d2' : '#f1f1f1',
              color: transformMode === 'translate' ? 'white' : 'black',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Move
          </button>
          <button 
            onClick={() => setTransformMode('rotate')}
            style={{
              backgroundColor: transformMode === 'rotate' ? '#1976d2' : '#f1f1f1',
              color: transformMode === 'rotate' ? 'white' : 'black',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Rotate
          </button>
          <button 
            onClick={() => setTransformMode('scale')}
            style={{
              backgroundColor: transformMode === 'scale' ? '#1976d2' : '#f1f1f1',
              color: transformMode === 'scale' ? 'white' : 'black',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Scale
          </button>
        </div>
        
        {/* Front view button - bottom left */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          zIndex: 100
        }}>
          <button 
            onClick={setFrontView}
            style={{
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Front View
          </button>
        </div>
        
        <Canvas 
          style={{ background: '#f0f0f0' }} 
          onClick={handleCanvasClick}
          camera={{
            position: [0, calculateCameraDistance(), 0], 
            fov: 50, 
            near: 0.1, 
            far: Math.abs(calculateCameraDistance()) * 4
          }}
        >
          <Scene 
            geometries={geometries} 
            selectedGeometry={selectedGeometry} 
            onSelect={onSelect}
            setFrontViewCamera={setFrontViewCamera}
            transformMode={transformMode}
            onTransformEnd={handleTransformEnd}
            worldSize={geometries.world.size}
          />
          <OrbitControls 
            makeDefault 
            enableDamping={false} 
            maxDistance={Math.abs(calculateCameraDistance()) * 10} // Scale maxDistance with world size
          />
        </Canvas>
      </div>
    </div>
  );
};

export default Viewer3D;
