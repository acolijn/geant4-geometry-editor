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
import { isSameAssemblyType } from '../../geometry-editor/utils/assemblyManager';
import { syncAssembliesFromSource } from '../../geometry-editor/utils/assemblyUpdateUtils';

// Function to update all similar assemblies
export const handleUpdateAllAssemblies = (volumeIndex, geometries, onUpdateGeometry, setContextMenu) => {
  // Close the context menu first
  setContextMenu(null);
  
  // Get the selected volume
  const selectedVolume = geometries.volumes[volumeIndex];

  if (!selectedVolume) {
    return;
  }

  const sourceIsTopLevel = selectedVolume.mother_volume === 'World';
  const targetIndices = geometries.volumes
    .map((volume, index) => ({ volume, index }))
    .filter(({ volume, index }) => {
      if (index === volumeIndex) return false;
      if (volume.mother_volume !== 'World') return false;
      if (volume.type !== selectedVolume.type) return false;

      // For compound objects, compare type using _compoundId prefix semantics.
      // For non-compound objects, same type is enough.
      if (selectedVolume._compoundId || volume._compoundId) {
        return isSameAssemblyType(selectedVolume, volume);
      }

      return true;
    })
    .map(({ index }) => index);

  if (!sourceIsTopLevel || targetIndices.length === 0) {
    return;
  }

  syncAssembliesFromSource({
    volumes: geometries.volumes,
    sourceIndex: volumeIndex,
    targetIndices,
    onUpdateGeometry,
    isTargetEligible: (sourceVolume, targetVolume) => {
      if (!sourceVolume || !targetVolume) return false;
      if (targetVolume.mother_volume !== 'World') return false;
      if (targetVolume.type !== sourceVolume.type) return false;

      if (sourceVolume._compoundId || targetVolume._compoundId) {
        return isSameAssemblyType(sourceVolume, targetVolume);
      }

      return true;
    }
  });
};