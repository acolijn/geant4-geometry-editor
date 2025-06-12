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
export const createPlacementObject = (volume) => {
  if (!volume.position) return null;
  
  // Create placement object - no units, all values in mm and rad
  const placement = {
    x: Number(volume.position.x || 0),
    y: Number(volume.position.y || 0),
    z: Number(volume.position.z || 0)
  };
  
  // Add rotation if present - no units, all values in rad
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
export const createDimensionsObject = (volume) => {
  const dimensions = {};
  
  switch(volume.type) {
    case 'box':
      // Check for dimensions in both size and dimensions objects
      if (volume.size) {
        dimensions.x = Number(volume.size.x || 0);
        dimensions.y = Number(volume.size.y || 0);
        dimensions.z = Number(volume.size.z || 0);
      } else if (volume.dimensions) {
        // If dimensions already exist, use those
        if (volume.dimensions.x !== undefined) dimensions.x = Number(volume.dimensions.x);
        if (volume.dimensions.y !== undefined) dimensions.y = Number(volume.dimensions.y);
        if (volume.dimensions.z !== undefined) dimensions.z = Number(volume.dimensions.z);
      }
      break;
      
    case 'sphere':
      if (volume.radius !== undefined) {
        dimensions.radius = Number(volume.radius);
      }
      break;
      
    case 'cylinder':
      // Check all possible property names for radius and height
      if (volume.radius !== undefined) {
        dimensions.radius = Number(volume.radius);
      } else if (volume.dimensions?.radius !== undefined) {
        dimensions.radius = Number(volume.dimensions.radius);
      }
      
      // Handle inner radius (use innerRadius property only)
      if (volume.innerRadius !== undefined) {
        dimensions.inner_radius = Number(volume.innerRadius);
      } else if (volume.dimensions?.inner_radius !== undefined) {
        dimensions.inner_radius = Number(volume.dimensions.inner_radius);
      }
      
      if (volume.height !== undefined) {
        dimensions.height = Number(volume.height);
      } else if (volume.dimensions?.height !== undefined) {
        dimensions.height = Number(volume.dimensions.height);
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

    case 'polycone':
      if (volume.zSections && Array.isArray(volume.zSections)) {
        // Extract z_sections from the zSections array
        const zSections = volume.zSections;
        
        // Create arrays for z, rmin, and rmax
        const zValues = [];
        const rminValues = [];
        const rmaxValues = [];
        
        // Extract values from each section and convert to mm
        zSections.forEach(section => {
          zValues.push(section.z);
          // Use rMin and rMax (capital M) as in the PropertyEditor
          rminValues.push(section.rMin || 0);
          rmaxValues.push(section.rMax || 0);
        });
        
        // Add the arrays to dimensions
        dimensions.z = zValues;
        dimensions.rmin = rminValues;
        dimensions.rmax = rmaxValues;
      }
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
  
  // Remove empty size object if it exists
  if (standardizedVolume.size && Object.keys(standardizedVolume.size).length === 0) {
    delete standardizedVolume.size;
  }
  
  // Log the dimensions object for debugging
  console.log(`Dimensions for ${volume.name}:`, standardizedVolume.dimensions);
  
  // Remove dimension properties that are now in the dimensions object
  // Make sure to delete all properties, regardless of their case style
  switch(volume.type) {
    case 'box':
      delete standardizedVolume.size;
      break;
    case 'sphere':
      delete standardizedVolume.radius;
      delete standardizedVolume.rmin;
      delete standardizedVolume.rmax;
      delete standardizedVolume.startphi;
      delete standardizedVolume.deltaphi;
      delete standardizedVolume.starttheta;
      delete standardizedVolume.deltatheta;
      break;
    case 'cylinder':
      delete standardizedVolume.radius;
      delete standardizedVolume.innerRadius;
      delete standardizedVolume.inner_radius;
      delete standardizedVolume.outer_radius;
      delete standardizedVolume.height;
      break;
    case 'tube':
      delete standardizedVolume.rmin;
      delete standardizedVolume.rmax;
      delete standardizedVolume.height;
      delete standardizedVolume.startphi;
      delete standardizedVolume.deltaphi;
      break;
    case 'cone':
      delete standardizedVolume.rmin1;
      delete standardizedVolume.rmax1;
      delete standardizedVolume.rmin2;
      delete standardizedVolume.rmax2;
      delete standardizedVolume.height;
      delete standardizedVolume.startphi;
      delete standardizedVolume.deltaphi;
      break;
    case 'trapezoid':
      delete standardizedVolume.dx1;
      delete standardizedVolume.dx2;
      delete standardizedVolume.dy1;
      delete standardizedVolume.dy2;
      delete standardizedVolume.dz;
      break;
    case 'torus':
      delete standardizedVolume.majorRadius;
      delete standardizedVolume.minorRadius;
      break;
    case 'ellipsoid':
      delete standardizedVolume.xRadius;
      delete standardizedVolume.yRadius;
      delete standardizedVolume.zRadius;
      break;
    case 'polycone':
      delete standardizedVolume.zSections;
      delete standardizedVolume.z;
      delete standardizedVolume.rmin;
      delete standardizedVolume.rmax;
      break;
  }
  
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

export default {
  standardizeObjectFormat,
  // restoreOriginalFormat,
  // standardizeProjectData,
  //restoreProjectData
};
