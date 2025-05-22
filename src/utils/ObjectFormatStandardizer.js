/**
 * ObjectFormatStandardizer.js
 * 
 * Utility for standardizing the format of geometry objects to ensure consistency
 * between objects saved to the library and the main output JSON file.
 */

/**
 * Create a placement object from position and rotation
 * @param {Object} volume - The volume object containing position and rotation
 * @returns {Object} - The standardized placement object
 */
const createPlacementObject = (volume) => {
  if (!volume.position) return null;
  
  // Create placement object
  const placement = {
    x: Number(volume.position.x || 0),
    y: Number(volume.position.y || 0),
    z: Number(volume.position.z || 0)
  };
  
  // Add rotation if present
  if (volume.rotation) {
    placement.rotation = {
      x: Number(volume.rotation.x || 0),
      y: Number(volume.rotation.y || 0),
      z: Number(volume.rotation.z || 0)
    };
  }
  
  return placement;
};

/**
 * Create a dimensions object based on the volume type
 * @param {Object} volume - The volume object
 * @returns {Object} - The standardized dimensions object
 */
const createDimensionsObject = (volume) => {
  const dimensions = {};
  
  switch(volume.type) {
    case 'box':
      if (volume.size) {
        dimensions.x = Number(volume.size.x || 0);
        dimensions.y = Number(volume.size.y || 0);
        dimensions.z = Number(volume.size.z || 0);
      }
      break;
      
    case 'sphere':
      if (volume.radius !== undefined) {
        dimensions.radius = Number(volume.radius);
      }
      break;
      
    case 'cylinder':
      if (volume.radius !== undefined) {
        dimensions.radius = Number(volume.radius);
      }
      
      // Handle inner radius (use innerRadius property only)
      if (volume.innerRadius !== undefined) {
        dimensions.inner_radius = Number(volume.innerRadius);
      }
      
      if (volume.height !== undefined) {
        dimensions.height = Number(volume.height);
      }
      break;
      
    case 'trapezoid':
      if (volume.dx1 !== undefined) dimensions.dx1 = Number(volume.dx1);
      if (volume.dx2 !== undefined) dimensions.dx2 = Number(volume.dx2);
      if (volume.dy1 !== undefined) dimensions.dy1 = Number(volume.dy1);
      if (volume.dy2 !== undefined) dimensions.dy2 = Number(volume.dy2);
      if (volume.dz !== undefined) dimensions.dz = Number(volume.dz);
      break;
      
    case 'torus':
      if (volume.majorRadius !== undefined) dimensions.major_radius = Number(volume.majorRadius);
      if (volume.minorRadius !== undefined) dimensions.minor_radius = Number(volume.minorRadius);
      break;
      
    case 'ellipsoid':
      if (volume.xRadius !== undefined) dimensions.x_radius = Number(volume.xRadius);
      if (volume.yRadius !== undefined) dimensions.y_radius = Number(volume.yRadius);
      if (volume.zRadius !== undefined) dimensions.z_radius = Number(volume.zRadius);
      break;
  }
  
  return dimensions;
};

/**
 * Standardize a volume object to use the consistent format
 * @param {Object} volume - The volume object to standardize
 * @returns {Object} - The standardized volume object
 */
const standardizeVolumeFormat = (volume) => {
  // Create a deep copy to avoid modifying the original
  const standardizedVolume = JSON.parse(JSON.stringify(volume));
  
  // Convert position and rotation to placement
  if (standardizedVolume.position) {
    standardizedVolume.placement = createPlacementObject(standardizedVolume);
    delete standardizedVolume.position;
    delete standardizedVolume.rotation;
  }
  
  // Convert dimension properties to dimensions object
  standardizedVolume.dimensions = createDimensionsObject(standardizedVolume);
  
  // Remove dimension properties that are now in the dimensions object
  // Make sure to delete all properties, regardless of their case style
  
  // Box properties
  delete standardizedVolume.size;
  
  // Sphere and cylinder properties
  delete standardizedVolume.radius;
  
  // Cylinder specific properties
  delete standardizedVolume.innerRadius;
  delete standardizedVolume.inner_radius;
  delete standardizedVolume.height;
  
  // Trapezoid properties
  delete standardizedVolume.dx1;
  delete standardizedVolume.dx2;
  delete standardizedVolume.dy1;
  delete standardizedVolume.dy2;
  delete standardizedVolume.dz;
  
  // Torus properties
  delete standardizedVolume.majorRadius;
  delete standardizedVolume.minorRadius;
  
  // Ellipsoid properties
  delete standardizedVolume.xRadius;
  delete standardizedVolume.yRadius;
  delete standardizedVolume.zRadius;
  
  // Convert mother_volume to parent
  if (standardizedVolume.mother_volume) {
    standardizedVolume.parent = standardizedVolume.mother_volume;
    delete standardizedVolume.mother_volume;
  }
  
  // Remove any unit properties
  if (standardizedVolume.unit) delete standardizedVolume.unit;
  
  return standardizedVolume;
};

/**
 * Standardize an object and all its descendants to use the consistent format
 * @param {Object} objectData - The object data containing the main object and its descendants
 * @returns {Object} - The standardized object data
 */
export const standardizeObjectFormat = (objectData) => {
  // Create a deep copy to avoid modifying the original
  const standardizedData = JSON.parse(JSON.stringify(objectData));
  
  // Standardize the main object
  if (standardizedData.object) {
    standardizedData.object = standardizeVolumeFormat(standardizedData.object);
  }
  
  // Standardize all descendants
  if (standardizedData.descendants && Array.isArray(standardizedData.descendants)) {
    standardizedData.descendants = standardizedData.descendants.map(descendant => 
      standardizeVolumeFormat(descendant)
    );
  }
  
  return standardizedData;
};

/**
 * Restore the original format of an object loaded from the library
 * @param {Object} standardizedData - The standardized object data
 * @returns {Object} - The object data in the original format
 */
export const restoreOriginalFormat = (standardizedData) => {
  // Create a deep copy to avoid modifying the original
  const restoredData = JSON.parse(JSON.stringify(standardizedData));
  
  // Helper function to restore a volume to original format
  const restoreVolumeFormat = (volume) => {
    const restoredVolume = { ...volume };
    
    // Convert placement back to position and rotation
    if (restoredVolume.placement) {
      restoredVolume.position = {
        x: restoredVolume.placement.x || 0,
        y: restoredVolume.placement.y || 0,
        z: restoredVolume.placement.z || 0
      };
      
      if (restoredVolume.placement.rotation) {
        restoredVolume.rotation = {
          x: restoredVolume.placement.rotation.x || 0,
          y: restoredVolume.placement.rotation.y || 0,
          z: restoredVolume.placement.rotation.z || 0
        };
      }
      
      delete restoredVolume.placement;
    }
    
    // Convert dimensions back to individual properties
    if (restoredVolume.dimensions) {
      switch(restoredVolume.type) {
        case 'box':
          restoredVolume.size = {
            x: restoredVolume.dimensions.x || 0,
            y: restoredVolume.dimensions.y || 0,
            z: restoredVolume.dimensions.z || 0
          };
          break;
          
        case 'sphere':
          restoredVolume.radius = restoredVolume.dimensions.radius || 0;
          break;
          
        case 'cylinder':
          restoredVolume.radius = restoredVolume.dimensions.radius || 0;
          if (restoredVolume.dimensions.inner_radius !== undefined) {
            restoredVolume.innerRadius = restoredVolume.dimensions.inner_radius;
          }
          if (restoredVolume.dimensions.height !== undefined) {
            restoredVolume.height = restoredVolume.dimensions.height;
          }
          break;
          
        case 'trapezoid':
          if (restoredVolume.dimensions.dx1 !== undefined) restoredVolume.dx1 = restoredVolume.dimensions.dx1;
          if (restoredVolume.dimensions.dx2 !== undefined) restoredVolume.dx2 = restoredVolume.dimensions.dx2;
          if (restoredVolume.dimensions.dy1 !== undefined) restoredVolume.dy1 = restoredVolume.dimensions.dy1;
          if (restoredVolume.dimensions.dy2 !== undefined) restoredVolume.dy2 = restoredVolume.dimensions.dy2;
          if (restoredVolume.dimensions.dz !== undefined) restoredVolume.dz = restoredVolume.dimensions.dz;
          break;
          
        case 'torus':
          if (restoredVolume.dimensions.major_radius !== undefined) restoredVolume.majorRadius = restoredVolume.dimensions.major_radius;
          if (restoredVolume.dimensions.minor_radius !== undefined) restoredVolume.minorRadius = restoredVolume.dimensions.minor_radius;
          break;
          
        case 'ellipsoid':
          if (restoredVolume.dimensions.x_radius !== undefined) restoredVolume.xRadius = restoredVolume.dimensions.x_radius;
          if (restoredVolume.dimensions.y_radius !== undefined) restoredVolume.yRadius = restoredVolume.dimensions.y_radius;
          if (restoredVolume.dimensions.z_radius !== undefined) restoredVolume.zRadius = restoredVolume.dimensions.z_radius;
          break;
      }
      
      delete restoredVolume.dimensions;
    }
    
    // Convert parent back to mother_volume
    if (restoredVolume.parent) {
      restoredVolume.mother_volume = restoredVolume.parent;
      delete restoredVolume.parent;
    }
    
    return restoredVolume;
  };
  
  // Restore the main object
  if (restoredData.object) {
    restoredData.object = restoreVolumeFormat(restoredData.object);
  }
  
  // Restore all descendants
  if (restoredData.descendants && Array.isArray(restoredData.descendants)) {
    restoredData.descendants = restoredData.descendants.map(descendant => 
      restoreVolumeFormat(descendant)
    );
  }
  
  return restoredData;
};

export default {
  standardizeObjectFormat,
  restoreOriginalFormat
};
