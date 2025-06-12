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
  
  // Ensure dimensions object is not empty for different shape types
  if (standardizedVolume.type === 'cylinder') {
    // If dimensions is empty but we have radius and height directly on the object, use those
    if (Object.keys(standardizedVolume.dimensions).length === 0) {
      if (standardizedVolume.radius !== undefined) {
        standardizedVolume.dimensions.radius = Number(standardizedVolume.radius);
      }
      if (standardizedVolume.height !== undefined) {
        standardizedVolume.dimensions.height = Number(standardizedVolume.height);
      }
    }
  } else if (standardizedVolume.type === 'box') {
    // If dimensions is empty but we have size directly on the object, use those
    if (Object.keys(standardizedVolume.dimensions).length === 0) {
      if (standardizedVolume.size) {
        standardizedVolume.dimensions.x = Number(standardizedVolume.size.x || 0);
        standardizedVolume.dimensions.y = Number(standardizedVolume.size.y || 0);
        standardizedVolume.dimensions.z = Number(standardizedVolume.size.z || 0);
        console.log(`Set box dimensions from size for ${standardizedVolume.name}:`, standardizedVolume.dimensions);
      }
    }
  }
  
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

/**
 * Restore the original format of an object loaded from the library
 * @param {Object} standardizedData - The standardized object data
 * @returns {Object} - The object data in the original format
 */
/* export const restoreOriginalFormat = (standardizedData) => {
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

        case 'polycone':
          if (restoredVolume.dimensions.z !== undefined) restoredVolume.z = restoredVolume.dimensions.z;
          if (restoredVolume.dimensions.rmax !== undefined) restoredVolume.rmax = restoredVolume.dimensions.rmax;
          if (restoredVolume.dimensions.rmin !== undefined) restoredVolume.rmin = restoredVolume.dimensions.rmin;
          break;

        case 'polyhedra':
          if (restoredVolume.dimensions.z !== undefined) restoredVolume.z = restoredVolume.dimensions.z;
          if (restoredVolume.dimensions.rmax !== undefined) restoredVolume.rmax = restoredVolume.dimensions.rmax;
          if (restoredVolume.dimensions.rmin !== undefined) restoredVolume.rmin = restoredVolume.dimensions.rmin;
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
 */
/**
 * Standardize project data for storage
 * @param {Object} geometries - The geometries object
 * @param {Object} materials - The materials object
 * @param {Array} hitCollections - The hit collections array
 * @returns {Object} - The standardized project data
 */
/* export const standardizeProjectData = (geometries, materials, hitCollections) => {
  // Create a deep copy to avoid modifying the original objects
  const standardizedGeometries = JSON.parse(JSON.stringify(geometries));
  const standardizedMaterials = JSON.parse(JSON.stringify(materials));
  
  // Convert world volume to use placement and dimensions
  if (standardizedGeometries.world) {
    const worldVolume = standardizedGeometries.world;
    
    // Create placement object for world
    worldVolume.placement = createPlacementObject(worldVolume);
    
    // Create dimensions object for world
    worldVolume.dimensions = createDimensionsObject(worldVolume);
    
    // Remove old position, rotation, and size properties
    delete worldVolume.position;
    delete worldVolume.rotation;
    delete worldVolume.size;
  }
  
  // Convert each volume to use placement and dimensions
  const standardizedVolumes = standardizedGeometries.volumes.map(volume => {
    // Create a copy of the volume with all properties
    const standardizedVolume = JSON.parse(JSON.stringify(volume));
    
    // Set parent property (consistent naming)
    if (volume.mother_volume) {
      standardizedVolume.parent = volume.mother_volume;
      delete standardizedVolume.mother_volume;
    }
    
    // Create placement object
    standardizedVolume.placement = createPlacementObject(volume);
    
    // Create dimensions object based on volume type
    standardizedVolume.dimensions = createDimensionsObject(volume);
    
    // Copy any additional properties that should be preserved
    if (volume.visible !== undefined) standardizedVolume.visible = volume.visible;
    if (volume.color) standardizedVolume.color = volume.color;
    if (volume.isActive) standardizedVolume.isActive = volume.isActive;
    if (volume.hitsCollectionName) standardizedVolume.hitsCollectionName = volume.hitsCollectionName;
    
    // Remove old position, rotation, and size properties
    delete standardizedVolume.position;
    delete standardizedVolume.rotation;
    delete standardizedVolume.size;
    
    // Remove shape-specific properties that are now in dimensions
    switch(volume.type) {
      case 'box':
        // Already handled by dimensions
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
      case 'sphere':
        delete standardizedVolume.rmin;
        delete standardizedVolume.rmax;
        delete standardizedVolume.startphi;
        delete standardizedVolume.deltaphi;
        delete standardizedVolume.starttheta;
        delete standardizedVolume.deltatheta;
        break;
      case 'cylinder':
        delete standardizedVolume.inner_radius;
        delete standardizedVolume.outer_radius;
        delete standardizedVolume.height;
        break;
      // Add other shape types as needed
    }
    
    // For debugging
    console.log(`Standardized volume ${volume.name}:`, standardizedVolume);
    
    return standardizedVolume;
  });
  
  // Create the standardized project data structure
  return {
    geometries: {
      world: standardizedGeometries.world,
      volumes: standardizedVolumes
    },
    materials: standardizedMaterials,
    hitCollections: hitCollections || []
  };
};
 */
/**
 * Restore volume format from standardized format
 * @param {Object} standardizedVolume - The standardized volume object
 * @returns {Object} - The restored volume object
 */
/* export const restoreVolumeFormat = (standardizedVolume) => {
  // Create a deep copy to avoid modifying the original object
  const restoredVolume = JSON.parse(JSON.stringify(standardizedVolume));
  
  // For debugging
  console.log(`Restoring volume ${restoredVolume.name}:`, restoredVolume);
  
  // Restore position and rotation from placement
  if (restoredVolume.placement) {
    restoredVolume.position = {
      x: Number(restoredVolume.placement.x || 0),
      y: Number(restoredVolume.placement.y || 0),
      z: Number(restoredVolume.placement.z || 0)
    };
    
    if (restoredVolume.placement.rotation) {
      restoredVolume.rotation = {
        x: Number(restoredVolume.placement.rotation.x || 0),
        y: Number(restoredVolume.placement.rotation.y || 0),
        z: Number(restoredVolume.placement.rotation.z || 0)
      };
    } else {
      restoredVolume.rotation = { x: 0, y: 0, z: 0 };
    }
    
    // Remove placement property
    delete restoredVolume.placement;
  } else {
    // Ensure position and rotation exist even if placement doesn't
    restoredVolume.position = restoredVolume.position || { x: 0, y: 0, z: 0 };
    restoredVolume.rotation = restoredVolume.rotation || { x: 0, y: 0, z: 0 };
  }
  
  // Restore size and shape-specific properties from dimensions
  if (restoredVolume.dimensions) {
    switch(restoredVolume.type) {
      case 'box':
        restoredVolume.size = {
          x: Number(restoredVolume.dimensions.x || 0),
          y: Number(restoredVolume.dimensions.y || 0),
          z: Number(restoredVolume.dimensions.z || 0)
        };
        break;
      case 'sphere':
        restoredVolume.radius = Number(restoredVolume.dimensions.radius || 0);
        break;
      case 'cylinder':
        restoredVolume.radius = Number(restoredVolume.dimensions.radius || 0);
        restoredVolume.inner_radius = Number(restoredVolume.dimensions.innerRadius || 0);
        restoredVolume.height = Number(restoredVolume.dimensions.height || 0);
        break;
      case 'trapezoid':
        restoredVolume.dx1 = Number(restoredVolume.dimensions.dx1 || 0);
        restoredVolume.dx2 = Number(restoredVolume.dimensions.dx2 || 0);
        restoredVolume.dy1 = Number(restoredVolume.dimensions.dy1 || 0);
        restoredVolume.dy2 = Number(restoredVolume.dimensions.dy2 || 0);
        restoredVolume.dz = Number(restoredVolume.dimensions.dz || 0);
        break;
      case 'ellipsoid':
        restoredVolume.xRadius = Number(restoredVolume.dimensions.x_radius || 0);
        restoredVolume.yRadius = Number(restoredVolume.dimensions.y_radius || 0);
        restoredVolume.zRadius = Number(restoredVolume.dimensions.z_radius || 0);
        break;
      case 'torus':
        restoredVolume.majorRadius = Number(restoredVolume.dimensions.major_radius || 0);
        restoredVolume.minorRadius = Number(restoredVolume.dimensions.minor_radius || 0);
        break;
      case 'polycone':
  
        // Get the arrays from dimensions
        const { z, rmin, rmax } = restoredVolume.dimensions;
  
        // Make sure all arrays have the same length
        if (!z || !rmin || !rmax || z.length !== rmin.length || z.length !== rmax.length) {
          console.error('Invalid dimensions format for polycone');
          return [];
        }
        
        // Create zSections array by mapping corresponding values from each array
        const zSections = z.map((zValue, index) => ({
          z: Number(zValue),
          rMin: Number(rmin[index]),
          rMax: Number(rmax[index])
        }));
        restoredVolume.zSections = zSections;
        break;
    }
    
    // Remove dimensions property
    delete restoredVolume.dimensions;
  } 
  
  // Restore mother_volume from parent
  if (restoredVolume.parent) {
    restoredVolume.mother_volume = restoredVolume.parent;
    delete restoredVolume.parent;
  }
  
  // Ensure other required properties exist
  if (!restoredVolume.name) restoredVolume.name = 'Volume';
  if (!restoredVolume.material) restoredVolume.material = 'G4_AIR';
  if (restoredVolume.visible === undefined) restoredVolume.visible = true;
  
  // For debugging
  console.log(`Restored volume ${restoredVolume.name}:`, restoredVolume);
  
  return restoredVolume;
};
 */
/**
 * Restore project data from standardized format
 * @param {Object} standardizedData - The standardized project data
 * @returns {Object} - The restored project data
 */
/* export const restoreProjectData = (standardizedData) => {
  if (!standardizedData || !standardizedData.geometries) {
    return {
      geometries: { world: {}, volumes: [] },
      materials: {},
      hitCollections: ['MyHitsCollection']
    };
  }
  
  // Create a deep copy to avoid modifying the original object
  const geometriesData = JSON.parse(JSON.stringify(standardizedData.geometries));
  const materialsData = JSON.parse(JSON.stringify(standardizedData.materials || {}));
  const hitCollectionsData = standardizedData.hitCollections || ['MyHitsCollection'];
  
  // Restore world volume format
  if (geometriesData.world) {
    geometriesData.world = restoreVolumeFormat(geometriesData.world);
  }
  
  // Restore each volume format
  const restoredVolumes = (geometriesData.volumes || []).map(volume => {
    return restoreVolumeFormat(volume);
  });
  
  // Return the restored project data
  return {
    geometries: {
      world: geometriesData.world || {},
      volumes: restoredVolumes
    },
    materials: materialsData,
    hitCollections: hitCollectionsData
  };
}; */

export default {
  standardizeObjectFormat,
  // restoreOriginalFormat,
  // standardizeProjectData,
  //restoreProjectData
};
