/**
 * Update Handlers for Geometry Editor
 * 
 * This module contains handler functions for updating assemblies and their components.
 */

// Import the assemblyManager utility
import { isSameAssemblyType } from './assemblyManager';

/**
 * Creates update handler functions with access to state and setState
 * 
 * @param {Object} props - Object containing props and functions
 * @param {Function} props.onUpdateGeometry - Function to update geometry
 * @param {Object} props.geometries - Object containing all geometries
 * @returns {Object} Object containing handler functions
 */
export const createUpdateHandlers = (props) => {
  const { onUpdateGeometry, geometries } = props;

  /**
   * Update assemblies with properties from a template assembly
   * 
   * @param {Object} updateData - Data about which assemblies to update
   * @param {Object} objectData - Template object data to use for the update
   * @returns {Object} Result of the update operation
   */
  const updateAssemblies = (updateData, objectData) => {
    // Get the selected volume
    const selectedVolume = geometries.volumes[updateData.sourceIndex];
    
    // Only proceed if the selected volume is an assembly
    if (selectedVolume.type !== 'assembly') {
      console.log('Only assemblies can be updated. Please select an assembly.');
      return { success: false, message: 'Only assemblies can be updated' };
    }
    
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
    for (const index of updateData.selectedIndices) {
      // Skip invalid indices
      if (index < 0 || index >= geometries.volumes.length) continue;
      
      const volume = geometries.volumes[index];
      
      // Skip non-assemblies
      if (volume.type !== 'assembly') continue;
      
      // Skip assemblies that are not of the same type as the source assembly
      // Use the _assemblyId to determine if they are the same type
      if (!isSameAssemblyType(selectedVolume, volume)) {
        console.log(`Assembly ${volume.name} is not the same type as ${selectedVolume.name}, skipping`);
        continue;
      }
      
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
      
      // Preserve assembly ID to maintain stable identity
      if (volume._assemblyId) {
        updatedAssembly._assemblyId = volume._assemblyId;
      }
      
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
      console.log(`Updating assembly at index ${index}:`, {
        sourceAssembly: selectedVolume,
        targetAssembly: volume,
        updatedAssembly: updatedAssembly
      });
      
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
    
    return { success: true, updatedCount };
  };

  return {
    updateAssemblies
  };
};
