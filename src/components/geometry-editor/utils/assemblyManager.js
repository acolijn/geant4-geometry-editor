/**
 * Assembly Manager Utility
 * 
 * This utility provides functions for managing assembly IDs and names.
 * It ensures that assemblies maintain stable, unique identifiers throughout
 * their lifecycle, including save/load operations.
 */

/**
 * Generate a unique assembly ID
 * 
 * @param {string} typeName - Optional type name for the assembly
 * @returns {string} A unique assembly ID
 */
export const generateAssemblyId = (typeName = 'assembly') => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return `${typeName}_${timestamp}_${randomSuffix}`;
};

/**
 * Ensure an assembly has a stable ID
 * 
 * @param {Object} assembly - The assembly object
 * @returns {Object} The assembly with a stable ID
 */
export const ensureStableAssemblyId = (assembly) => {
  if (!assembly) return assembly;
  
  // Create a copy to avoid mutating the original
  const processedAssembly = { ...assembly };
  
  // If the assembly doesn't have an _assemblyId, generate one
  if (!processedAssembly._assemblyId) {
    processedAssembly._assemblyId = generateAssemblyId(
      processedAssembly.displayName || processedAssembly.name || 'assembly'
    );
  }
  
  return processedAssembly;
};

/**
 * Get the assembly type from an assembly ID
 * 
 * @param {string} assemblyId - The assembly ID
 * @returns {string} The assembly type
 */
export const getAssemblyType = (assemblyId) => {
  if (!assemblyId) return 'assembly';
  
  // Extract the type portion (everything before the first underscore)
  const parts = assemblyId.split('_');
  return parts[0] || 'assembly';
};

/**
 * Check if two assemblies are of the same type
 * 
 * @param {Object} assembly1 - The first assembly
 * @param {Object} assembly2 - The second assembly
 * @returns {boolean} True if the assemblies are of the same type
 */
export const isSameAssemblyType = (assembly1, assembly2) => {
  if (!assembly1 || !assembly2) return false;
  
  // If both have _assemblyId, compare the type portion
  if (assembly1._assemblyId && assembly2._assemblyId) {
    return getAssemblyType(assembly1._assemblyId) === getAssemblyType(assembly2._assemblyId);
  }
  
  // If no _assemblyId, fall back to comparing names
  return assembly1.name === assembly2.name;
};
