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
  
  // Create a map of all source components by _componentId for quick lookup
  const sourceComponentsMap = new Map();
  sourceDescendants.forEach(desc => {
    if (desc._componentId) {
      sourceComponentsMap.set(desc._componentId, desc);
    }
  });
  
  // Update all volumes in a single pass
  console.log(`Updating all volumes with matching _compoundId and _componentId:`, geometries);
  
  for (let i = 0; i < geometries.volumes.length; i++) {
    const volume = geometries.volumes[i];
    
    // Skip the selected volume (we're updating everything else)
    if (i === volumeIndex) continue;
    
    // Skip World
    if (volume.name === 'World') continue;
    
    // Only update objects with the same _compoundId as the source object
    if (volume._compoundId !== selectedVolume._compoundId) continue;
    
    // Find the corresponding source component by _componentId
    // We need to match components by their _componentId, not compare with the selected volume's _componentId
    const sourceComponent = sourceComponentsMap.get(volume._componentId);
    
    // Skip if we can't find a matching source component
    if (!sourceComponent) continue;
    
    // Determine if this is a top-level object (parent has different _compoundId)
    const motherVolume = geometries.volumes.find(vol => vol.name === volume.mother_volume);
    const isTopLevel = !motherVolume || motherVolume._compoundId !== volume._compoundId;
    
    // Create updated component with properties from source but preserve critical identifiers
    const updatedComponent = {
      ...sourceComponent,
      // CRITICAL: Preserve these identifiers
      name: volume.name, // Preserve internal name
      mother_volume: volume.mother_volume, // Preserve mother volume
      _componentId: volume._componentId, // Preserve component ID
      _compoundId: volume._compoundId, // Preserve compound ID for correct grouping
      // For top-level objects, preserve position and rotation
      // For child objects, use the source component's position and rotation
      position: isTopLevel ? volume.position : sourceComponent.position,
      rotation: isTopLevel ? volume.rotation : sourceComponent.rotation
    };
    
    // Preserve g4name and g4name if they exist
    if (volume.g4name) {
      updatedComponent.g4name = volume.g4name;
    }
    if (volume.g4name) {
      updatedComponent.g4name = volume.g4name;
    }
    
    console.log(`Updating component at index ${i}:`, {
      sourceComponent,
      targetComponent: volume,
      updatedComponent,
      isTopLevel
    });
    
    // Update this specific component
    onUpdateGeometry(`volume-${i}`, updatedComponent, true, false);
    updatedCount++;
  }
  
  // Log success message instead of showing an alert
  if (updatedCount > 0) {
    console.log(`Updated ${updatedCount} assemblies successfully.`);
  } else {
    console.log('No other assemblies found to update.');
  }
};