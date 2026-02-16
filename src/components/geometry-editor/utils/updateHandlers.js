/**
 * Update Handlers for Geometry Editor
 * 
 * This module contains handler functions for updating assemblies and their components.
 */

// Import the assemblyManager utility
import { isSameAssemblyType } from './assemblyManager';
import { syncAssembliesFromSource } from './assemblyUpdateUtils';

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
  const updateAssemblies = (updateData) => {
    return syncAssembliesFromSource({
      volumes: geometries.volumes,
      sourceIndex: updateData.sourceIndex,
      targetIndices: updateData.selectedIndices,
      onUpdateGeometry,
      isTargetEligible: (sourceAssembly, targetAssembly) =>
        targetAssembly.type === 'assembly' && isSameAssemblyType(sourceAssembly, targetAssembly)
    });
  };

  return {
    updateAssemblies
  };
};
