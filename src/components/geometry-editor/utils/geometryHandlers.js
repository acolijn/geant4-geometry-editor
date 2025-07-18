/**
 * Geometry Handlers for Geometry Editor
 * 
 * This module contains handler functions for creating and managing geometry objects.
 */

// Import the assemblyManager utility
import { generateAssemblyId } from './assemblyManager';

export const generateUniqueName = (type) => {
  return `${type}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
};

/**
 * Creates geometry handler functions with access to state and setState
 * 
 * @param {Object} props - Object containing props and functions
 * @param {Function} props.onAddGeometry - Function to add new geometry
 * @param {Function} props.onUpdateGeometry - Function to update geometry
 * @param {Object} props.geometries - Object containing all geometries
 * @param {Array} props.materials - Array of available materials
 * @param {Function} props.setImportAlert - Function to set import alerts
 * @param {Object} state - Object containing current state values
 * @param {string} state.newGeometryType - Type of new geometry to create
 * @param {string} state.newMotherVolume - Mother volume for new geometry
 * //@param {string} state.firstSolid - First solid for union
 * //@param {string} state.secondSolid - Second solid for union
 * //@param {number} state.additionalComponents - Number of additional components
 * //@param {Array} state.additionalComponentsValues - Values of additional components
 * @returns {Object} Object containing handler functions
 */
export const createGeometryHandlers = (props, state) => {
  const { 
    onAddGeometry, 
    onUpdateGeometry, 
    geometries, 
    materials,
    setImportAlert
  } = props;
  
  const {
    newGeometryType,
    newMotherVolume
    ////firstSolid,
    ////secondSolid,
    ////additionalComponents,
    ////additionalComponentsValues
  } = state;

  /**
   * Generate a unique name for an object, ensuring it doesn't conflict with existing objects
   * 
   * @param {string} baseName - Base name for the object
   * @param {string} type - Type of the object
   * @returns {string} A unique name for the object
   */
/*   const generateInternalName = (baseName, type) => {
    // Start with the base name and type
    console.log('generateInternalName:', baseName, type);
    let name = `${baseName}_${type}`;
    let counter = 1;
    
    // Check if the name already exists in world or volumes
    const nameExists = (testName) => {
      if (geometries.world.name === testName) return true;
      
      return geometries.volumes.some(volume => volume.name === testName);
    };
    
    // Add a counter to the name until it's unique
    while (nameExists(name)) {
      name = `${baseName}_${type}_${counter}`;
      counter++;
    }
    
    return name;
  }; */

  /**
   * Add a new geometry object to the scene
   * 
   * This function creates a new geometry object based on the selected type and mother volume.
   * It handles special cases for union solids, which require combining two existing solids.
   * For basic geometries, it creates objects with default properties based on the type.
   */
  const handleAddGeometry = () => {
    // Default material (use the first available material or a placeholder)
    const defaultMaterial = materials.length > 0 ? materials[0].name : 'G4_AIR';
    // For basic geometries, create a new object with default properties
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    
    // Generate a unique component ID that will persist throughout the object's lifecycle
    const componentId = `component_${timestamp}_${randomSuffix}`;
    const uniqueName = generateUniqueName(newGeometryType);

    const newObject = {
      //name: generateInternalName(newGeometryType.charAt(0).toUpperCase() + newGeometryType.slice(1), 'volume'),
      name: uniqueName,
      type: newGeometryType,
      material: defaultMaterial,
      mother_volume: newMotherVolume,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      visible: true,
      _compoundId: uniqueName,
      _componentId: componentId  // Add a stable component ID at creation time
    };
    
    // We no longer automatically make volumes boolean components when their mother is a union
    // This will be done explicitly through the PropertyEditor
    
    console.log('newObject:', newObject.name);
    
    // Add type-specific properties
    switch (newGeometryType) {
      case 'box':
        newObject.size = { x: 100, y: 100, z: 100 };
        break;
        
      case 'cylinder':
        newObject.radius = 50;
        newObject.height = 100;
        newObject.innerRadius = 0;
        newObject.startAngle = 0;
        newObject.spanningAngle = 2 * Math.PI;  // Use radians (2π) instead of 360 degrees
        break;
        
      case 'sphere':
        newObject.radius = 50;
        newObject.innerRadius = 0;
        newObject.startPhi = 0;
        newObject.spanningPhi = 2 * Math.PI;  // Use radians (2π) instead of 360 degrees
        newObject.startTheta = 0;
        newObject.spanningTheta = Math.PI;    // Use radians (π) instead of 180 degrees
        break;
        
      case 'cone':
        newObject.radiusTop = 0;
        newObject.radiusBottom = 50;
        newObject.height = 100;
        newObject.innerRadiusTop = 0;
        newObject.innerRadiusBottom = 0;
        newObject.startAngle = 0;
        newObject.spanningAngle = 2 * Math.PI;  // Use radians (2π) instead of 360 degrees
        break;
        
      case 'torus':
        newObject.majorRadius = 50;
        newObject.minorRadius = 10;
        newObject.startAngle = 0;
        newObject.spanningAngle = 2 * Math.PI;  // Use radians (2π) instead of 360 degrees
        break;
        
      case 'ellipsoid':
        newObject.xRadius = 50;
        newObject.yRadius = 30;
        newObject.zRadius = 40;
        break;
        
      case 'polycone':
        newObject.startAngle = 0;
        newObject.spanningAngle = 2 * Math.PI;  // Use radians (2π) instead of 360 degrees
        newObject.zSections = [
          { z: -50, rMin: 0, rMax: 30 },
          { z: 0, rMin: 0, rMax: 50 },
          { z: 50, rMin: 0, rMax: 30 }
        ];
        break;
        
      case 'trapezoid':
        newObject.dx1 = 50; // Half-length in x at -z/2
        newObject.dx2 = 50; // Half-length in x at +z/2
        newObject.dy1 = 50; // Half-length in y at -z/2
        newObject.dy2 = 50; // Half-length in y at +z/2
        newObject.dz = 50;  // Half-length in z
        break;
        
      case 'assembly':
        // Use the standard name generation format for consistency
        const typeName = newObject.g4name || 'assembly';
        // Use the standard name generation format: type_timestamp_random
        //newObject.name = generateUniqueNameInline('assembly');
        console.log('newObject.name:', newObject.name);
        
        // Store the typeName in the _compoundId for type identification
        // Use the same format but with the display name for type identification
        newObject._compoundId = newObject.name;
        
        console.log(`Created new assembly with name: ${newObject.name} and ID: ${newObject._compoundId}`);
        break;
      case 'union':
        // Use the standard name generation format for consistency
        const unionName = newObject.g4name || 'union';
        // Use the standard name generation format: type_timestamp_random
        //newObject.name = generateUniqueNameInline('union');
        console.log('newObject.name:', newObject.name);
        
        // Store the typeName in the _compoundId for type identification
        // Use the same format but with the display name for type identification
        newObject._compoundId = newObject.name;
        
        console.log(`Created new union with name: ${newObject.name} and ID: ${newObject._compoundId}`);
        break;
        
      default:
        // Print a warning for unknown geometry types
        console.warn(`Unknown geometry type: ${newGeometryType}`);
    }
    
    // Add the new object to the scene
    onAddGeometry(newObject);
  };

  /**
   * Handle updating objects in the scene
   * 
   * @param {Array} instanceIds - Array of instance IDs to update
   * @param {Object} objectData - Object data to use for the update
   * @returns {Object} Result of the update operation
   */
  const handleUpdateObjects = (instanceIds, objectData) => {
    try {
      // Basic validation
      if (!instanceIds || !instanceIds.length) {
        console.error('No instances selected');
        return { success: false, message: 'No instances selected' };
      }
      
      if (!objectData || !objectData.object) {
        console.error('No object data provided');
        return { success: false, message: 'No object data provided' };
      }
      
      // Count of updated objects
      let updatedCount = 0;
      
      // Process each instance
      instanceIds.forEach(instanceId => {
        // Get the instance to update
        let instance;
        
        if (instanceId === 'world') {
          instance = geometries.world;
        } else if (instanceId.startsWith('volume-')) {
          const volumeIndex = parseInt(instanceId.split('-')[1]);
          instance = geometries.volumes[volumeIndex];
        }
        
        if (!instance) {
          console.warn(`Instance ${instanceId} not found`);
          return;
        }
        
        // Create updated object with properties from template
        const updatedObject = { ...objectData.object };
        
        // Preserve critical properties
        updatedObject.position = { ...instance.position };
        updatedObject.rotation = { ...instance.rotation };
        updatedObject.name = instance.name;
        updatedObject.mother_volume = instance.mother_volume;
        
        // Preserve compound ID if this is an assembly
        if (instance.type === 'assembly' && instance._compoundId) {
          updatedObject._compoundId = instance._compoundId;
          console.log(`Preserving compound ID during update: ${instance._compoundId}`);
        }
        
        // Update the instance
        onUpdateGeometry(instanceId, updatedObject, true, false);
        updatedCount++;
        
        // If this is an assembly and has descendants, update them too
        if (instance.type === 'assembly' && objectData.descendants && objectData.descendants.length > 0) {
          // Find all components that belong to this assembly
          const components = [];
          
          for (let i = 0; i < geometries.volumes.length; i++) {
            const volume = geometries.volumes[i];
            if (volume.mother_volume === instance.name) {
              components.push({
                index: i,
                id: `volume-${i}`,
                object: volume
              });
            }
          }
          
          // Match components with descendants by type or name
          objectData.descendants.forEach(descendant => {
            // Find a matching component
            const matchingComponent = components.find(c => 
              c.object.type === descendant.type || 
              c.object.name === descendant.name
            );
            
            if (matchingComponent) {
              // Create updated component with properties from descendant
              const updatedComponent = { ...descendant };
              
              // Preserve critical properties
              updatedComponent.name = matchingComponent.object.name;
              updatedComponent.mother_volume = instance.name;
              
              // Update the component
              onUpdateGeometry(matchingComponent.id, updatedComponent, true, false);
            }
          });
        }
      });
      
      // Return success without showing an alert message
      return {
        success: true,
        updatedCount
      };
    } catch (error) {
      console.error('Error updating objects:', error);
      setImportAlert({
        show: true,
        message: `Error updating objects: ${error.message}`,
        severity: 'error'
      });
      
      return {
        success: false,
        message: `Error updating objects: ${error.message}`
      };
    }
  };

  return {
    // generateInternalName,
    handleAddGeometry,
    handleUpdateObjects
  };
};
