/**
 * Import/Export Handlers for Geometry Editor
 * 
 * This module contains handler functions for importing and exporting geometry objects.
 */

// Import the assemblyManager utility
import { ensureStableAssemblyId } from './assemblyManager';

/**
 * Creates import/export handler functions with access to state and setState
 * 
 * @param {Object} props - Object containing props and functions
 * @param {Function} props.handleImportPartialFromAddNew - Function to handle importing partial geometry
 * @param {Function} props.extractObjectWithDescendants - Function to extract an object with its descendants
 * @param {Object} props.geometries - Object containing all geometries
 * @param {string} props.selectedGeometry - ID of currently selected geometry
 * @param {Function} props.setObjectToSave - Function to set the object to save
 * @param {Function} props.setSaveObjectDialogOpen - Function to open the save dialog
 * @param {Function} props.setImportAlert - Function to set import alerts
 * @returns {Object} Object containing handler functions
 */
export const createImportExportHandlers = (props) => {
  const { 
    handleImportPartialFromAddNew, 
    extractObjectWithDescendants, 
    geometries, 
    selectedGeometry,
    setObjectToSave,
    setSaveObjectDialogOpen,
    setImportAlert
  } = props;

  /**
   * Get the currently selected geometry object based on the selectedGeometry ID
   * 
   * @returns {Object|null} The selected geometry object or null if no geometry is selected
   */
  const getSelectedGeometryObject = () => {
    // Return null if no geometry is selected
    if (!selectedGeometry) return null;
    
    // Return the world volume if 'world' is selected
    if (selectedGeometry === 'world') return geometries.world;
    
    // Return the volume at the specified index if a volume is selected
    if (selectedGeometry.startsWith('volume-')) {
      const index = parseInt(selectedGeometry.split('-')[1]);
      return geometries.volumes[index];
    }
    
    return null;
  };

  /**
   * Process a standardized format object to internal format
   * 
   * This function converts objects from a standardized format to the internal format
   * used by the geometry editor. It handles conversion of placement and dimensions properties
   * to the specific properties used by each geometry type in the editor.
   * 
   * @param {Object} objectData - The object data to process
   * @returns {Object} The processed object data in internal format
   */
  const processStandardizedFormat = (objectData) => {
    if (!objectData) return objectData;
    
    // Create a deep copy to avoid modifying the original
    const processedData = JSON.parse(JSON.stringify(objectData));
    
    // Process the main object
    if (processedData.object) {
      // We require the placement property to be present
      if (!processedData.object.placement) {
        throw new Error('Object is missing required placement property');
      }
      
      // Convert placement to position and rotation
      processedData.object.position = {
        x: processedData.object.placement.x || 0,
        y: processedData.object.placement.y || 0,
        z: processedData.object.placement.z || 0
      };
      
      processedData.object.rotation = {
        x: processedData.object.placement.rotation?.x || 0,
        y: processedData.object.placement.rotation?.y || 0,
        z: processedData.object.placement.rotation?.z || 0
      };
      
      // Remove the placement property
      delete processedData.object.placement;
      
      // We require the dimensions property to be present
      if (!processedData.object.dimensions) {
        throw new Error('Object is missing required dimensions property');
      }
      
      const { dimensions, type } = processedData.object;
      
      // Convert dimensions to the appropriate properties based on object type
      if (type === 'box') {
        processedData.object.size = {
          x: dimensions.x || 10,
          y: dimensions.y || 10,
          z: dimensions.z || 10
        };
      } else if (type === 'sphere') {
        processedData.object.radius = dimensions.radius;
      } else if (type === 'cylinder') {
        processedData.object.radius = dimensions.radius;
        // Only use the snake_case version from the standardized format
        processedData.object.innerRadius = dimensions.inner_radius || 0;
        processedData.object.height = dimensions.height;
      } else if (type === 'trapezoid') {
        processedData.object.dx1 = dimensions.dx1;
        processedData.object.dx2 = dimensions.dx2;
        processedData.object.dy1 = dimensions.dy1;
        processedData.object.dy2 = dimensions.dy2;
        processedData.object.dz = dimensions.dz;
      } else if (type === 'torus') {
        processedData.object.majorRadius = dimensions.major_radius;
        processedData.object.minorRadius = dimensions.minor_radius;
      } else if (type === 'ellipsoid') {
        processedData.object.xRadius = dimensions.x_radius;
        processedData.object.yRadius = dimensions.y_radius;
        processedData.object.zRadius = dimensions.z_radius;
      }
      
      // Remove the dimensions property
      delete processedData.object.dimensions;
      
      // Convert parent to mother_volume if needed
      if (processedData.object.parent && !processedData.object.mother_volume) {
        processedData.object.mother_volume = processedData.object.parent;
        delete processedData.object.parent;
      }
    }
    
    // Process all descendants
    if (processedData.descendants && Array.isArray(processedData.descendants)) {
      processedData.descendants = processedData.descendants.map(descendant => {
        // We require the placement property to be present
        if (!descendant.placement) {
          throw new Error('Descendant is missing required placement property');
        }
        
        // Convert placement to position and rotation
        descendant.position = {
          x: descendant.placement.x || 0,
          y: descendant.placement.y || 0,
          z: descendant.placement.z || 0
        };
        
        descendant.rotation = {
          x: descendant.placement.rotation?.x || 0,
          y: descendant.placement.rotation?.y || 0,
          z: descendant.placement.rotation?.z || 0
        };
        
        // Remove the placement property
        delete descendant.placement;
        
        // We require the dimensions property to be present
        if (!descendant.dimensions) {
          throw new Error('Descendant is missing required dimensions property');
        }
        
        const { dimensions, type } = descendant;
        
        // Convert dimensions to the appropriate properties based on object type
        if (type === 'box') {
          descendant.size = {
            x: dimensions.x || 10,
            y: dimensions.y || 10,
            z: dimensions.z || 10
          };
        } else if (type === 'sphere') {
          descendant.radius = dimensions.radius;
        } else if (type === 'cylinder') {
          descendant.radius = dimensions.radius;
          // Only use the snake_case version from the standardized format
          descendant.innerRadius = dimensions.inner_radius || 0;
          descendant.height = dimensions.height;
        } else if (type === 'trapezoid') {
          descendant.dx1 = dimensions.dx1;
          descendant.dx2 = dimensions.dx2;
          descendant.dy1 = dimensions.dy1;
          descendant.dy2 = dimensions.dy2;
          descendant.dz = dimensions.dz;
        } else if (type === 'torus') {
          descendant.majorRadius = dimensions.major_radius;
          descendant.minorRadius = dimensions.minor_radius;
        } else if (type === 'ellipsoid') {
          descendant.xRadius = dimensions.x_radius;
          descendant.yRadius = dimensions.y_radius;
          descendant.zRadius = dimensions.z_radius;
        }
        
        // Remove the dimensions property
        delete descendant.dimensions;
        
        // Convert parent to mother_volume if needed
        if (descendant.parent && !descendant.mother_volume) {
          descendant.mother_volume = descendant.parent;
          delete descendant.parent;
        }
        
        return descendant;
      });
    }
    
    return processedData;
  };

  /**
   * Handle loading an object from the library
   * 
   * @param {Object} objectData - The object data to load
   * @returns {Object} Result of the load operation
   */
  const handleLoadObject = (objectData) => {
    try {
      // Process the loaded object data
      console.log('Loaded object data:', objectData);
      
      // Process the object to convert from standardized format to internal format
      const processedData = processStandardizedFormat(objectData);
      console.log('Processed standardized format to internal format');
      
      // Apply structured naming convention to the object and its descendants
      const structuredObjectData = applyStructuredNaming(processedData);
      
      // Add the object to the scene
      handleImportPartialFromAddNew(structuredObjectData);
      
      setImportAlert({
        show: true,
        message: `Loaded ${structuredObjectData.object.name} with ${structuredObjectData.descendants.length} descendants.`,
        severity: 'success'
      });
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error loading object:', error);
      setImportAlert({
        show: true,
        message: `Error loading object: ${error.message}`,
        severity: 'error'
      });
      return {
        success: false,
        error: error.message
      };
    }
  };

  /**
   * Apply structured naming to imported objects
   * 
   * This function ensures consistent naming of imported objects by applying a structured
   * naming convention in the format: BaseName_ComponentName_ID. This helps maintain
   * organization and prevents naming conflicts when importing objects.
   * 
   * It also preserves assembly IDs to maintain stable identities for assemblies.
   * 
   * @param {Object} objectData - The object data to process
   * @returns {Object} The processed object data with structured naming applied
   */
  const applyStructuredNaming = (objectData) => {
    // Create a copy of the object data to avoid mutating the original
    const processedData = JSON.parse(JSON.stringify(objectData));
    
    // Generate a unique ID for this import operation
    const importId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    
    // Get the base name from the main object
    const baseName = processedData.object.name || 'ImportedObject';
    
    // Create a map to store the original name to new name mapping
    const nameMap = new Map();
    
    // Process the main object
    // If it's an assembly, ensure it has a stable ID and consistent naming
    if (processedData.object.type === 'assembly') {
      // Generate a timestamp and random suffix for consistent naming
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      
      // Always use assembly_<timestamp>_<randomSuffix> format for the name
      processedData.object.name = `assembly_${timestamp}_${randomSuffix}`;
      
      // Preserve the existing _compoundId if it exists, otherwise create a new one
      if (!processedData.object._compoundId) {
        // Generate a stable compound ID based on the display name or name
        const typeName = processedData.object.displayName || baseName;
        processedData.object._compoundId = `${typeName}_${timestamp}_${randomSuffix}`;
      }
      
      console.log(`Imported assembly with name: ${processedData.object.name} and ID: ${processedData.object._compoundId}`);
    } else {
      // For non-assembly objects, use the standard naming convention
      processedData.object.name = `${baseName}_${importId}`;
    }
    
    // Store the name mapping
    nameMap.set(objectData.object.name, processedData.object.name);
    
    // Process all descendants
    if (processedData.descendants && processedData.descendants.length > 0) {
      processedData.descendants.forEach(descendant => {
        const originalName = descendant.name;
        const componentName = originalName || 'Component';
        
        // Generate a new structured name
        const newName = `${baseName}_${componentName}_${importId}`;
        
        // Update the descendant's name
        descendant.name = newName;
        
        // Store the mapping
        nameMap.set(originalName, newName);
      });
      
      // Update all mother_volume references
      processedData.descendants.forEach(descendant => {
        if (descendant.mother_volume && nameMap.has(descendant.mother_volume)) {
          descendant.mother_volume = nameMap.get(descendant.mother_volume);
        }
      });
    }
    
    return processedData;
  };

  /**
   * Export the selected geometry object and its descendants
   * 
   * This function extracts the selected geometry object along with all its descendants
   * and prepares them for export. It adds debug information and opens the save dialog
   * to allow the user to save the exported data to a file.
   * 
   * It also ensures that assembly objects maintain their stable IDs.
   */
  const handleExportObject = () => {
    // Get the currently selected geometry object
    const selectedObject = getSelectedGeometryObject();
    if (!selectedObject) {
      alert('Please select a geometry object to export');
      return;
    }
    
    // Extract the object and its descendants
    const exportData = extractObjectWithDescendants(selectedGeometry);
    
    // Ensure assembly objects have stable IDs and consistent naming
    if (exportData.object && exportData.object.type === 'assembly') {
      // Generate a timestamp and random suffix for consistent naming
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      
      // Always use assembly_<timestamp>_<randomSuffix> format for the name
      const originalName = exportData.object.name;
      exportData.object.name = `assembly_${timestamp}_${randomSuffix}`;
      
      // If it's an assembly, ensure it has a stable ID
      if (!exportData.object._compoundId) {
        // Generate a stable compound ID based on the display name or name
        const typeName = exportData.object.displayName || originalName || 'assembly';
        exportData.object._compoundId = `${typeName}_${timestamp}_${randomSuffix}`;
      }
      
      console.log(`Exporting assembly with name: ${exportData.object.name} and ID: ${exportData.object._compoundId}`);
    }
    
    // Add debug information
    exportData._debug = {
      exportedAt: new Date().toISOString(),
      sourceApplication: 'Geant4 Geometry Editor',
      version: '1.0.0'
    };
    
    // Store the export data and open the save dialog
    setObjectToSave(exportData);
    setSaveObjectDialogOpen(true);
    
    // Create a global variable to make the export data accessible in the console for debugging
    window.lastExportedObject = exportData;
    console.log('Export data saved to window.lastExportedObject for debugging');
  };

  /**
   * Import geometry objects from a JSON file using the FileSystemManager
   * 
   * This function allows users to import previously exported geometry objects
   * from JSON files. It validates the imported content, adds the objects to the
   * scene with the selected mother volume, and displays appropriate notifications.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const handleImportFromFileSystem = async () => {
    try {
      // Import the FileSystemManager
      const { FileSystemManager } = await import('../../../utils/FileSystemManager');
      
      // Open the file picker dialog
      const result = await FileSystemManager.openFilePicker({
        multiple: false,
        accept: {
          'application/json': ['.json']
        }
      });
      
      if (!result || !result.files || result.files.length === 0) {
        console.log('No file selected');
        return;
      }
      
      // Get the selected file
      const file = result.files[0];
      
      // Read the file content
      const content = await FileSystemManager.readTextFile(file);
      
      // Parse the JSON content
      const objectData = JSON.parse(content);
      
      // Apply structured naming to the imported objects
      const structuredObjectData = applyStructuredNaming(objectData);
      
      // Import the object into the scene
      const importResult = handleImportPartialFromAddNew(structuredObjectData, 'World');
      
      if (importResult && importResult.success) {
        setImportAlert({
          show: true,
          message: `Imported ${objectData.object.name} successfully`,
          severity: 'success'
        });
      } else {
        throw new Error(importResult?.message || 'Failed to import object');
      }
    } catch (error) {
      console.error('Error importing from file system:', error);
      setImportAlert({
        show: true,
        message: `Error importing object: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  /**
   * Handle importing an object JSON file using the standard file input or direct object data
   * 
   * @param {Object|Event} eventOrData - Either a file input change event or direct object data
   */
  const handleImportObjectFile = async (eventOrData) => {
    try {
      // Check if we received direct object data instead of an event
      if (!eventOrData.target) {
        // We received direct object data
        const content = eventOrData;
        console.log('Loading object data directly:', content);
        
        // Process the object to convert from standardized format to internal format
        const processedData = processStandardizedFormat(content);
        console.log('Processed standardized format to internal format');
        
        // Apply structured naming convention to the object and its descendants
        const structuredObjectData = applyStructuredNaming(processedData);
        
        // Add the object to the scene
        const result = handleImportPartialFromAddNew(structuredObjectData);
        
        if (result && result.success) {
          setImportAlert({
            show: true,
            message: `Loaded ${structuredObjectData.object.name} with ${structuredObjectData.descendants.length} descendants.`,
            severity: 'success'
          });
        }
        
        return result;
      }
      
      // Handle file input event
      const file = eventOrData.target.files[0];
      if (!file) return;
      
      // Create a FileReader to read the file content
      const reader = new FileReader();
      
      // Define what happens when the file is loaded
      reader.onload = async (e) => {
        try {
          // Parse the JSON content
          const content = JSON.parse(e.target.result);
          console.log('Loaded object data from file:', content);
          
          // Process the object to convert from standardized format to internal format
          const processedData = processStandardizedFormat(content);
          console.log('Processed standardized format to internal format');
          
          // Apply structured naming convention to the object and its descendants
          const structuredObjectData = applyStructuredNaming(processedData);
          
          // Add the object to the scene
          const result = handleImportPartialFromAddNew(structuredObjectData);
          
          if (result && result.success) {
            setImportAlert({
              show: true,
              message: `Loaded ${structuredObjectData.object.name} with ${structuredObjectData.descendants.length} descendants.`,
              severity: 'success'
            });
          } else {
            throw new Error(result?.message || 'Failed to import object');
          }
        } catch (error) {
          console.error('Error importing object:', error);
          setImportAlert({
            show: true,
            message: `Error importing object: ${error.message}`,
            severity: 'error'
          });
        }
      };
      
      // Read the file as text
      reader.readAsText(file);
      
      // Reset the file input so the same file can be selected again
      eventOrData.target.value = '';
    } catch (error) {
      console.error('Error handling file import:', error);
      setImportAlert({
        show: true,
        message: `Error importing object: ${error.message}`,
        severity: 'error'
      });
    }
  };

  return {
    applyStructuredNaming,
    handleExportObject,
    handleImportFromFileSystem,
    handleImportObjectFile,
    processStandardizedFormat,
    handleLoadObject
  };
};
