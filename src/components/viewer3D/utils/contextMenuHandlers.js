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

// Import the findAllDescendants function from GeometryUtils
import { findAllDescendants } from '../../geometry-editor/utils/GeometryUtils';

// Function to update all similar assemblies
export const handleUpdateAllAssemblies = (volumeIndex, geometries, onUpdateGeometry, setContextMenu) => {
  // Close the context menu first
  setContextMenu(null);
  
  // Get the selected volume
  const selectedVolume = geometries.volumes[volumeIndex];

  //console.log(`Selected volume:`, selectedVolume);
  //return;
  
  // Only proceed if the selected volume is an assembly
  //if (selectedVolume.type !== 'assembly') {
  //  alert('Only assemblies can be updated. Please select an assembly.');
  //  return;
  //}
  
  // Count of updated assemblies
  let updatedCount = 0;
  
  // Get the source assembly name
  const sourceAssemblyName = selectedVolume.name;
  
  // Find all descendants (direct and indirect children) of the source assembly recursively
  const sourceDescendants = findAllDescendants(sourceAssemblyName, geometries.volumes);
  
  // Map the source descendants by their _componentId for easier lookup
  const sourceDescendantsMap = new Map();
  sourceDescendants.forEach(desc => {
    if (desc._componentId) {
      sourceDescendantsMap.set(desc._componentId, desc);
    }
  });
  
  console.log(`Found ${sourceDescendants.length} descendants in source assembly ${sourceAssemblyName}:`, sourceDescendants);
  
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
    
    // Find all descendants of the target assembly recursively
    const targetDescendants = findAllDescendants(targetAssemblyName, geometries.volumes);
    
    console.log(`Found ${targetDescendants.length} descendants in target assembly ${targetAssemblyName}:`, targetDescendants);
    
    // Create a map of all volumes by name for quick lookup
    const volumesByName = new Map();
    geometries.volumes.forEach((vol, idx) => {
      if (vol.name) {
        volumesByName.set(vol.name, { volume: vol, index: idx });
      }
    });
    
    // Process the target assembly's descendants
    // First, create a map of parent-child relationships for the target assembly
    const parentChildMap = new Map();
    targetDescendants.forEach(desc => {
      if (!parentChildMap.has(desc.mother_volume)) {
        parentChildMap.set(desc.mother_volume, []);
      }
      parentChildMap.get(desc.mother_volume).push(desc);
    });
    
    // Function to recursively update descendants
    const updateDescendantsRecursively = (parentName, newParentName) => {
      // Get children of this parent
      const children = parentChildMap.get(parentName) || [];
      
      for (const child of children) {
        // Find the corresponding source component by _componentId
        const sourceComponent = child._componentId ? sourceDescendantsMap.get(child._componentId) : null;
        
        // Find the volume index in the geometries array
        const volumeInfo = volumesByName.get(child.name);
        if (!volumeInfo) continue;
        
        const childIndex = volumeInfo.index;
        
        // If we found a matching source component, update this component with its properties
        if (sourceComponent) {
          // Create updated component with properties from source but preserve critical identifiers
          const updatedComponent = {
            ...sourceComponent,
            // CRITICAL: Preserve these identifiers
            name: child.name, // Preserve internal name
            mother_volume: newParentName, // Use the new parent name
            _componentId: child._componentId, // Preserve component ID
            _compoundId: child._compoundId // Preserve compound ID for correct grouping
          };
          
          // Preserve displayName and g4name if they exist
          if (child.displayName) {
            updatedComponent.displayName = child.displayName;
          }
          if (child.g4name) {
            updatedComponent.g4name = child.g4name;
          }
          
          console.log(`Updating component at index ${childIndex}:`, {
            sourceComponent,
            targetComponent: child,
            updatedComponent
          });
          
          // Update this specific component
          onUpdateGeometry(`volume-${childIndex}`, updatedComponent, true, false);
          
          // Recursively update this component's children
          updateDescendantsRecursively(child.name, child.name);
        } else {
          console.log(`No matching source component found for target component ${child.name}`);
        }
      }
    };
    
    // Start the recursive update from the target assembly
    updateDescendantsRecursively(targetAssemblyName, targetAssemblyName);
    
    updatedCount++;
  }
  
  // Log success message instead of showing an alert
  if (updatedCount > 0) {
    console.log(`Updated ${updatedCount} assemblies successfully.`);
  } else {
    console.log('No other assemblies found to update.');
  }
};