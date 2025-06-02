// Function to handle right-click for context menu
export const handleContextMenu = (event, volumeIndex, setContextMenu) => {
  event.preventDefault();
  setContextMenu({
    mouseX: event.clientX,
    mouseY: event.clientY,
    volumeIndex
  });
};

// Function to close context menu
export const handleCloseContextMenu = (setContextMenu) => {
  // Close the context menu
  setContextMenu(null);
};

// Function to update all similar assemblies
export const handleUpdateAllAssemblies = (volumeIndex, geometries, onUpdateGeometry, setContextMenu) => {
  // Close the context menu first
  setContextMenu(null);
  
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
      mother_volume: volume.mother_volume,
      // CRITICAL: Preserve the _compoundId which is essential for grouping assemblies
      _compoundId: volume._compoundId
    };
    
    // If the assembly has an instance ID, preserve it
    if (volume._instanceId) {
      updatedAssembly._instanceId = volume._instanceId;
    }
    
    // Log the compoundId preservation
    console.log(`Preserving _compoundId: ${volume._compoundId} for assembly ${targetAssemblyName}`);
    
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
          _componentId: matchingTargetComponent.volume._componentId, // Preserve component ID
          _compoundId: matchingTargetComponent.volume._compoundId // Preserve compound ID for correct grouping
        };
        
        // Log the compoundId preservation
        console.log(`Preserving _compoundId: ${matchingTargetComponent.volume._compoundId} for component ${matchingTargetComponent.volume.name}`);
        
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
export const handleUpdateSelectedAssemblies = (volumeIndex, geometries, setUpdateAssembliesDialog, setContextMenu) => {
  // Close the context menu
  setContextMenu(null);
  
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
