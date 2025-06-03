/**
 * ObjectStorage.js
 * 
 * Utility for managing the storage and retrieval of compound objects
 * using the FileSystemManager to save to the <working_directory>/objects directory.
 * 
 * Objects are stored in a standardized format consistent with the main output JSON file,
 * using 'placement' for position/rotation and 'dimensions' for object dimensions.
 */

// Import the FileSystemManager
import FileSystemManager from '../../../utils/FileSystemManager';

// Import the ObjectFormatStandardizer
import { standardizeObjectFormat, restoreOriginalFormat } from './ObjectFormatStandardizer';

/**
 * Save a compound object to the objects directory
 * @param {string} name - The name of the object
 * @param {string} description - A description of the object
 * @param {Object} objectData - The object data to save
 * @param {boolean} preserveComponentIds - Whether to preserve existing component IDs
 * @returns {Promise<Object>} - Result of the save operation
 */
export const saveObject = async (name, description, objectData, preserveComponentIds = false) => {
  try {
    // Check if FileSystemManager is initialized
    if (!FileSystemManager.initialized) {
      await FileSystemManager.initialize();
    }
    
    // Sanitize the file name
    const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Standardize the object format to be consistent with the main output JSON file
    const standardizedObjectData = standardizeObjectFormat(objectData);
    // Remove 'placement' ONLY from the top-level object before saving
    if (standardizedObjectData.object && standardizedObjectData.object.placement) {
      delete standardizedObjectData.object.placement;
    }
    
    // If preserveComponentIds is true, check if the object already exists and preserve component IDs
    let dataToSave;
    
    if (preserveComponentIds) {
      try {
        // Try to load the existing object
        const existingObject = await FileSystemManager.loadObject(sanitizedName);
        
        if (existingObject) {
          console.log(`Existing object found. Preserving component IDs for "${name}"`);
          
          // Create maps of components by _componentId for both existing and new data
          const existingComponentsMap = new Map();
          if (existingObject.descendants && Array.isArray(existingObject.descendants)) {
            existingObject.descendants.forEach(component => {
              if (component._componentId) {
                existingComponentsMap.set(component._componentId, component);
              }
            });
          }
          
          // Create a map of new components by name for easier matching
          const newComponentsByName = new Map();
          if (standardizedObjectData.descendants && Array.isArray(standardizedObjectData.descendants)) {
            standardizedObjectData.descendants.forEach(component => {
              if (component.name) {
                newComponentsByName.set(component.name, component);
              }
            });
          }
          
          // Process each component in the new data
          if (standardizedObjectData.descendants && Array.isArray(standardizedObjectData.descendants)) {
            // First, try to match by _componentId if it exists
            standardizedObjectData.descendants.forEach(component => {
              if (component._componentId && existingComponentsMap.has(component._componentId)) {
                console.log(`Matched component by ID: ${component.name} (${component._componentId})`);
                // Component already has a matching ID, no need to do anything
              } else {
                // If component doesn't have an ID or it's not in the existing map,
                // generate a new unique ID
                const timestamp = Date.now();
                const randomSuffix = Math.random().toString(36).substring(2, 10);
                component._componentId = `component_${timestamp}_${randomSuffix}`;
                console.log(`Generated new _componentId ${component._componentId} for component ${component.name}`);
              }
            });
          }
        }
      } catch (error) {
        console.warn(`No existing object found for "${name}". Creating new object with fresh component IDs.`, error);
        // If there's an error loading the existing object, just continue with the new data
      }
    }
    
    // Add metadata to the object data
    dataToSave = {
      ...standardizedObjectData,
      metadata: {
        name,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        formatVersion: '2.0' // Add format version to track the standardized format
      }
    };
    
    // Save the object using FileSystemManager
    const success = await FileSystemManager.saveObject(sanitizedName, dataToSave);
    
    if (!success) {
      throw new Error('Failed to save object to file system');
    }
    
    console.log(`Object "${name}" saved successfully to objects/${sanitizedName}.json in standardized format`);
    
    return {
      success: true,
      message: `Object "${name}" saved successfully`,
      fileName: `${sanitizedName}.json`
    };
  } catch (error) {
    console.error('Error saving object:', error);
    return {
      success: false,
      message: `Error saving object: ${error.message}`
    };
  }
};

/**
 * Get a list of all available objects
 * @returns {Promise<Array>} - List of available objects with metadata
 */
export const listObjects = async () => {
  try {
    // Check if FileSystemManager is initialized
    if (!FileSystemManager.initialized) {
      await FileSystemManager.initialize();
    }
    
    // Get list of object names from FileSystemManager
    const objectNames = await FileSystemManager.listObjects();
    
    // Load metadata for each object
    const objects = await Promise.all(objectNames.map(async (name) => {
      try {
        const objectData = await FileSystemManager.loadObject(name);
        return {
          name: objectData?.metadata?.name || name,
          description: objectData?.metadata?.description || '',
          updatedAt: objectData?.metadata?.updatedAt || '',
          fileName: `${name}.json`
        };
      } catch (err) {
        console.warn(`Error reading object ${name}:`, err);
        return {
          name,
          description: 'Error reading metadata',
          fileName: `${name}.json`
        };
      }
    }));
    
    return objects;
  } catch (error) {
    console.error('Error listing objects:', error);
    return [];
  }
};

/**
 * Load a compound object by filename
 * @param {string} fileName - The name of the file to load
 * @returns {Promise<Object>} - The loaded object data
 */
export const loadObject = async (fileName) => {
  try {
    // Check if FileSystemManager is initialized
    if (!FileSystemManager.initialized) {
      await FileSystemManager.initialize();
    }
    
    // Extract the object name from the filename
    const objectName = fileName.replace('.json', '');
    
    // Load the object using FileSystemManager
    const data = await FileSystemManager.loadObject(objectName);
    
    if (!data) {
      throw new Error(`Object "${fileName}" not found`);
    }
    
    // We assume all objects are in the standardized format
    console.log(`Object "${fileName}" loaded successfully in standardized format`);
    
    return {
      success: true,
      data,
      message: `Object "${fileName}" loaded successfully`
    };
  } catch (error) {
    console.error(`Error loading object ${fileName}:`, error);
    return {
      success: false,
      message: `Error loading object: ${error.message}`
    };
  }
};

export default {
  saveObject,
  listObjects,
  loadObject
};
