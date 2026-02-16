/**
 * ObjectStorage.js
 * 
 * Utility for managing the storage and retrieval of compound objects
 * using either FileSystemManager or IndexedDBManager (whichever is initialized).
 * 
 * Objects are stored in a standardized format consistent with the main output JSON file,
 * using 'placement' for position/rotation and 'dimensions' for object dimensions.
 */

// Import the storage managers
import FileSystemManager from '../../../utils/FileSystemManager';
import IndexedDBManager from '../../../utils/IndexedDBManager';

/**
 * Get the active storage manager (whichever is initialized)
 * @returns {Object|null} The active storage manager or null
 */
const getStorageManager = () => {
  if (FileSystemManager.initialized) {
    return FileSystemManager;
  }
  if (IndexedDBManager.initialized) {
    return IndexedDBManager;
  }
  return null;
};

// Import the ObjectFormatStandardizer
//import { standardizeObjectFormat } from './ObjectFormatStandardizer';

// Import the geometryToJson
//import { generateJson } from '../../json-viewer/utils/geometryToJson';

/**
 * Save a compound object to the objects directory
 * @param {string} name - The name of the object
 * @param {string} description - A description of the object
 * @param {Object} objectData - The object data to save
 * @param {boolean} preserveComponentIds - Whether to preserve existing component IDs
 * @returns {Promise<Object>} - Result of the save operation
 */
export const saveObject = async (name, description, objectData, preserveComponentIds = false) => {
  console.log('ObjectStorage::saveObject:: name', name);
  console.log('ObjectStorage::saveObject:: description', description);
  console.log('ObjectStorage::saveObject:: objectData', objectData);
  console.log('ObjectStorage::saveObject:: preserveComponentIds', preserveComponentIds);
  try {
    // Get the active storage manager
    let storageManager = getStorageManager();
    
    // If no storage manager is initialized, try to initialize one
    if (!storageManager) {
      // Try FileSystem first, fall back to IndexedDB
      try {
        if ('showDirectoryPicker' in window) {
          await FileSystemManager.initialize();
          storageManager = FileSystemManager;
        } else {
          await IndexedDBManager.initialize();
          storageManager = IndexedDBManager;
        }
      } catch (error) {
        console.error('Failed to initialize storage:', error);
        throw new Error('No storage manager available. Please initialize storage first.');
      }
    }
    
    // Sanitize the file name
    const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Check if we have a templateJson from geometryToJson
    let dataToProcess;
    if (objectData.templateJson) {
      console.log('ObjectStorage::saveObject:: Using templateJson for old formatting');
      dataToProcess = {
        object: objectData.object,
        descendants: objectData.descendants || [],
        templateJson: objectData.templateJson
      };
    } else {
      dataToProcess = objectData;
      console.log('ObjectStorage::saveObject:: dataToProcess', dataToProcess);
      console.log('ObjectStorage::saveObject:: objectData', objectData.descendants);
    }
    
    // If preserveComponentIds is true, check if the object already exists and preserve component IDs
    let dataToSave;
    
    if (preserveComponentIds) {
      console.log(`ObjectStorage::saveObject:: Preserving component IDs for "${name}"`);
      try {
        // Try to load the existing object
        const existingObject = await storageManager.loadObject(sanitizedName);
        
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
          if (dataToProcess.descendants && Array.isArray(dataToProcess.descendants)) {
            dataToProcess.descendants.forEach(component => {
              if (component.name) {
                newComponentsByName.set(component.name, component);
              }
            });
          }
          
          // Process each component in the new data
          if (dataToProcess.descendants && Array.isArray(dataToProcess.descendants)) {
            // First, try to match by _componentId if it exists
            dataToProcess.descendants.forEach(component => {
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
      ...dataToProcess,
      metadata: {
        name,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        formatVersion: '2.0' // Add format version to track the standardized format
      }
    };
    
    // Save the object using the storage manager
    // IndexedDBManager requires a category parameter, FileSystemManager doesn't
    let success;
    if (storageManager === IndexedDBManager) {
      success = await storageManager.saveObject(sanitizedName, dataToSave, 'common');
    } else {
      success = await storageManager.saveObject(sanitizedName, dataToSave);
    }
    
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
    // Get the active storage manager
    let storageManager = getStorageManager();
    
    // If no storage manager is initialized, return empty array
    if (!storageManager) {
      console.warn('No storage manager initialized');
      return [];
    }
    
    // IndexedDB can contain duplicate object names across categories.
    // Build category-aware entries to keep load/delete deterministic.
    if (storageManager === IndexedDBManager) {
      const categories = await storageManager.listCategories();
      const objectEntries = [];

      for (const category of categories) {
        const namesInCategory = await storageManager.listObjects(category);
        for (const name of namesInCategory) {
          objectEntries.push({ name, category });
        }
      }

      // Fallback for older data where categories may be unavailable.
      if (objectEntries.length === 0) {
        const names = await storageManager.listObjects(null);
        for (const name of names) {
          objectEntries.push({ name, category: null });
        }
      }

      const objects = await Promise.all(objectEntries.map(async ({ name, category }) => {
        try {
          const objectData = category
            ? await storageManager.loadObject(name, category)
            : await storageManager.loadObject(name);
          const fileName = category ? `${category}/${name}.json` : `${name}.json`;
          return {
            name: objectData?.metadata?.name || name,
            description: objectData?.metadata?.description || '',
            updatedAt: objectData?.metadata?.updatedAt || '',
            fileName,
            category: category || 'unknown'
          };
        } catch (err) {
          console.warn(`Error reading object ${name}${category ? ` in ${category}` : ''}:`, err);
          return {
            name,
            description: 'Error reading metadata',
            fileName: category ? `${category}/${name}.json` : `${name}.json`,
            category: category || 'unknown'
          };
        }
      }));

      return objects;
    }

    const objectNames = await storageManager.listObjects();

    const objects = await Promise.all(objectNames.map(async (name) => {
      try {
        const objectData = await storageManager.loadObject(name);
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
    // Get the active storage manager
    let storageManager = getStorageManager();
    
    // If no storage manager is initialized, throw error
    if (!storageManager) {
      throw new Error('No storage manager initialized. Please initialize storage first.');
    }
    
    // Extract the object name from the filename
    const objectName = fileName.replace('.json', '');

    // Load the object using storage manager
    // IndexedDB entries may be category-qualified: "category/name.json"
    let data = null;
    if (storageManager === IndexedDBManager) {
      if (objectName.includes('/')) {
        const separatorIndex = objectName.indexOf('/');
        const category = objectName.slice(0, separatorIndex);
        const name = objectName.slice(separatorIndex + 1);
        data = await storageManager.loadObject(name, category);
      } else {
        // Backward-compatible lookup for legacy file names without category.
        data = await storageManager.loadObject(objectName);
        if (!data) {
          const categories = await storageManager.listCategories();
          for (const category of categories) {
            data = await storageManager.loadObject(objectName, category);
            if (data) break;
          }
        }
      }
    } else {
      data = await storageManager.loadObject(objectName);
    }
    
    if (!data) {
      throw new Error(`Object "${fileName}" not found`);
    }
    
    // We assume all objects are in the standardized format
    console.log(`Object "${fileName}" loaded successfully in standardized format`);
    console.log('Object data:', data);
    
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

/**
 * Delete a compound object by filename
 * @param {string} fileName - The name of the file to delete
 * @returns {Promise<Object>} - Result of the delete operation
 */
export const deleteObject = async (fileName) => {
  try {
    // Get the active storage manager
    let storageManager = getStorageManager();
    
    // If no storage manager is initialized, throw error
    if (!storageManager) {
      throw new Error('No storage manager initialized. Please initialize storage first.');
    }
    
    // Extract the object name from the filename
    const objectName = fileName.replace('.json', '');
    
    // Delete the object using storage manager
    let success;
    if (storageManager === IndexedDBManager) {
      if (objectName.includes('/')) {
        // Deterministic delete path for category-qualified IDs.
        const separatorIndex = objectName.indexOf('/');
        const category = objectName.slice(0, separatorIndex);
        const name = objectName.slice(separatorIndex + 1);
        success = await storageManager.deleteObject(name, category);
      } else {
        // Backward-compatible fallback: probe all known categories dynamically.
        success = false;
        const categories = await storageManager.listCategories();
        for (const category of categories) {
          const exists = await storageManager.loadObject(objectName, category);
          if (exists) {
            success = await storageManager.deleteObject(objectName, category);
            if (success) break;
          }
        }
      }
    } else {
      success = await storageManager.deleteObject(objectName);
    }
    
    if (!success) {
      throw new Error(`Failed to delete object "${fileName}"`);
    }
    
    console.log(`Object "${fileName}" deleted successfully`);
    
    return {
      success: true,
      message: `Object "${fileName}" deleted successfully`
    };
  } catch (error) {
    console.error(`Error deleting object ${fileName}:`, error);
    return {
      success: false,
      message: `Error deleting object: ${error.message}`
    };
  }
};

export default {
  saveObject,
  listObjects,
  loadObject,
  deleteObject
};
