/**
 * geometryToJson.js
 * 
 * This utility converts the standard geometry format to a json format
 * that's optimized for Geant4 simulation. 
 */

/**
 * 
 * @param {*} world 
 * @returns 
 */
function generateWorldVolume(world) {
  console.log('generateWorldVolume:: geometry.world', world);

  const worldJson = {
    name: world.name,
    g4name: world.g4name || world.name,
    type: world.type,
    placements: [
      {
        x: world.position?.x || 0,
        y: world.position?.y || 0,
        z: world.position?.z || 0,
        rotation: {
          x: world.rotation?.x || 0,
          y: world.rotation?.y || 0,
          z: world.rotation?.z || 0
        }
      }
    ],
    material: world.material,
    dimensions: world.size,
    visible: false,
    wireframe: true
  };

  return worldJson;
};

/**
 * Process an assembly volume
 * @param {*} assemblies 
 * @param {*} volume 
 * @returns 
 */
function processAssembly(assemblies, volume) {

  // append placement
  console.log('processAssembly:: volume', volume);
  console.log('processAssembly:: assemblies', assemblies);
  console.log('processAssembly:: assemblies[volume._compoundId]', assemblies[volume._compoundId]);
  assemblies[volume._compoundId].placements.push({
    name: volume.name,
    g4name: volume.g4name,
    x: volume.position?.x || 0,
    y: volume.position?.y || 0,
    z: volume.position?.z || 0,
    rotation: {
      x: volume.rotation?.x || 0,
      y: volume.rotation?.y || 0,
      z: volume.rotation?.z || 0
    },
    parent: volume.mother_volume
  });


  return assemblies;
}

/**
 * Process a standard volume
 * @param {*} volume 
 * @returns 
 */
function processVolume(volume) {
  console.log('processVolume:: add standard volume', volume);

  return {
    name: volume.name,
    g4name: volume.g4name,
    type: volume.type,
    material: volume.material,
    dimensions: convertDimensions(volume),
    placements: [
      {
        name: volume.name,
        g4name: volume.g4name,
        x: volume.position?.x || 0,
        y: volume.position?.y || 0,
        z: volume.position?.z || 0,
        rotation: {
          x: volume.rotation?.x || 0,
          y: volume.rotation?.y || 0,
          z: volume.rotation?.z || 0
        },
        parent: volume.mother_volume
      }
    ],

    visible: volume.visible !== undefined ? volume.visible : true,
    // if hitsColectionName is not empty, add it to the object
    ...(volume.hitsCollectionName && { hitsCollectionName: volume.hitsCollectionName }),
    //parent: volume.mother_volume
    ...(volume._componentId && { _componentId: volume._componentId }),
    ...(volume.boolean_operation !== undefined && { boolean_operation: volume.boolean_operation }),
    ...(volume._is_boolean_component!== undefined && { _is_boolean_component: volume._is_boolean_component }),
    ...(volume._boolean_parent !== undefined && { _boolean_parent: volume._boolean_parent })
  };
}

/**
 * Initialize assemblies & unions and their components
 * @param {*} assemblies 
 * @param {*} geometry 
 * @returns 
 */
function initializeAssemblies(assemblies, geometry) {
  console.log('initializeAssemblies:: geometry', geometry);

  // loop over the volumes
  geometry.volumes.forEach(volume => {
    // new assembly...... add it to the assemblies object
    if (!assemblies[volume._compoundId] && 
        (volume.type === 'assembly' || volume.type === 'union')) {
      console.log('processAssembly:: new assembly', volume);
      console.log('processAssembly::  g4name', volume.g4name);


      assemblies[volume._compoundId] = {
        name: volume.type === 'union' ? volume.name : volume.g4name.split('_')[0],
        g4name: volume.g4name,
        type: volume.type,
        material: volume.material,
        _compoundId: volume._compoundId,
        _componentId: volume._componentId,
        placements: []
      };

      if (volume.hitsCollectionName !== undefined) {
        assemblies[volume._compoundId].hitsCollectionName = volume.hitsCollectionName;
      }
    }
  });

  // add components: 
  // 1. loop over the assemblies...
  Object.keys(assemblies).forEach(_compoundId => {
    // 2. get a list of volumes with this _compoundId
    let selectedVolumes = geometry.volumes.filter(volume => volume._compoundId === _compoundId);
    // 3. exclude the type==assembly and type==union
    selectedVolumes = selectedVolumes.filter(volume => volume.type !== 'assembly' && volume.type !== 'union');
    // 4. from the list of volumes select the first one with each _componentId
    const seen = new Set();
    selectedVolumes = selectedVolumes.filter(volume => {
      if (seen.has(volume._componentId)) {
        return false;
      } else {
        seen.add(volume._componentId);
        return true;
      }
    });
    // 5. First collect all volumes to be added to the assembly
    const componentsToAdd = [];
    
    selectedVolumes.forEach(volume => {
      // skip assemblies
      if (volume.type === 'assembly' || volume.type === 'union') {
        return;
      }
      
      // Create the component object
      const componentObj = {
        //name: volume.name,
        //g4name: volume.g4name || volume.name,
        type: volume.type,
        dimensions: convertDimensions(volume),
        placements: [
          {
            name: volume.name,
            x: volume.position?.x || 0,
            y: volume.position?.y || 0,
            z: volume.position?.z || 0,
            rotation: {
              x: volume.rotation?.x || 0,
              y: volume.rotation?.y || 0,
              z: volume.rotation?.z || 0
            },
            parent: assemblies[_compoundId].type === 'union' ? "" : volume.mother_volume.startsWith('assembly') ? '' : volume.mother_volume
          }
        ],
        visible: volume.visible !== undefined ? volume.visible : true,
        // Include boolean_operation in the JSON output
        ...(volume._componentId && { _componentId: volume._componentId }),
        ...(volume.boolean_operation !== undefined && { boolean_operation: volume.boolean_operation }),
        ...(volume._is_boolean_component!== undefined && { _is_boolean_component: volume._is_boolean_component }),
        ...(volume._boolean_parent !== undefined && { _boolean_parent: volume._boolean_parent })
        //_boolean_parent: "",
        // For union components, the parent should be empty since they're part of the union
        // For assembly components, preserve the parent-child relationships
        //parent: assemblies[_compoundId].type === 'union' ? "" : volume.mother_volume.startsWith('assembly') ? '' : volume.mother_volume
      };
      
      // Only add material for non-union components or for assembly components
      if (assemblies[_compoundId].type !== 'union') {
        componentObj.material = volume.material;
      }
      
      // Only add hits collection for non-union components or for assembly components
      if (assemblies[_compoundId].type !== 'union' && volume.hitsCollectionName) {
        componentObj.hitsCollectionName = volume.hitsCollectionName;
      }
      
      componentsToAdd.push(componentObj);
    });
    
    // Sort components by boolean_operation: 'union' first, then 'subtract'
    componentsToAdd.sort((a, b) => {
      if (a.boolean_operation === 'union' && b.boolean_operation === 'subtract') {
        return -1; // a comes before b
      } else if (a.boolean_operation === 'subtract' && b.boolean_operation === 'union') {
        return 1; // b comes before a
      }
      return 0; // keep original order
    });
    
    // Add sorted components to the assembly
    assemblies[_compoundId].components = componentsToAdd;
  });

  return assemblies;
}

/**
 * Generates the JSON for the geometry
 * @param {Object} geometry - The geometry object
 * @returns {Object} - The generated JSON
 */
export function generateJson(geometry){
  console.log('generateJson:: geometry', geometry);
  // generate the world volume
  const worldJson = generateWorldVolume(geometry.world);

  const volumes = [];
  let assemblies = {};

  // initialize the assemblies and components
  assemblies = initializeAssemblies(assemblies,geometry)

  // loop over the volumes
  geometry.volumes.forEach(volume => {
    if (volume.type === 'assembly' || volume.type === 'union') {
      processAssembly(assemblies, volume); 
    } else {
      // standard volume
      // if _compoundId is not in the assemblies object, it is a standalone volume
      if (!assemblies[volume._compoundId]) {
        volumes.push(processVolume(volume));
      }
    }
  });

  // add the assemblies to the volumes
  Object.keys(assemblies).forEach(_compoundId => {
    volumes.push(assemblies[_compoundId]);
  });
  
  // create the output structure
  const outputStructure = {
    world: worldJson,
    volumes: volumes,
  };

  console.log('generateJson:: outputStructure', outputStructure);

  return outputStructure;
}; 

/**
 * Converts the standard geometry format to a multiple placements format
 * @param {Object} geometry - The standard geometry object with world and volumes
 * @returns {Object} - The converted geometry with multiple placements
 */
/* export function convertToMultiplePlacements(geometry) {
  // generate the output
  console.log('convertToMultiplePlacements:: geometry', geometry);

  const json = generateJson(geometry);

  return json;
} */

/**
 * Converts dimensions to the standard format
 * @param {Object} volume - The volume with dimensions
 * @returns {Object} - The converted dimensions
 */
function convertDimensions(volume) {
  const dimensions = {};
  
  switch (volume.type) {
    case 'box':
      if (volume.size) {
        dimensions.x = volume.size.x;
        dimensions.y = volume.size.y;
        dimensions.z = volume.size.z;
      } else {
        dimensions.x = 10;
        dimensions.y = 10;
        dimensions.z = 10;
      }
      break;
      
    case 'cylinder':
      dimensions.radius = volume.radius || 5;
      dimensions.height = volume.height || 10;
      if (volume.inner_radius || volume.innerRadius) {
        dimensions.inner_radius = volume.inner_radius || volume.innerRadius || 0;
      }
      break;
      
    case 'sphere':
      dimensions.radius = volume.radius || 5;
      break;
      
    case 'ellipsoid':
      dimensions.x_radius = volume.xRadius || 5;
      dimensions.y_radius = volume.yRadius || 3;
      dimensions.z_radius = volume.zRadius || 4;
      break;
      
    case 'trapezoid':
      dimensions.dx1 = volume.dx1 || 2;
      dimensions.dx2 = volume.dx2 || 5;
      dimensions.dy1 = volume.dy1 || 1;
      dimensions.dy2 = volume.dy2 || 5;
      dimensions.dz = volume.dz || 9;
      break;
      
    case 'torus':
      dimensions.major_radius = volume.majorRadius || volume.dimensions?.major_radius || 3;
      dimensions.minor_radius = volume.minorRadius || volume.dimensions?.minor_radius || 1;
      break;
      
    case 'polycone':
    case 'polyhedra':
      if (volume.zSections) {
        dimensions.z = volume.zSections.map(z => z.z);
        dimensions.rmin = volume.zSections.map(z => z.rMin);
        dimensions.rmax = volume.zSections.map(z => z.rMax);
      } else {
        // Default values if dimensions are missing
        dimensions.z = [-5, 0, 5];
        dimensions.rmin = [0, 0, 0];
        dimensions.rmax = [3, 5, 2];
      }
      break;
      
    default:
      // Copy all dimension properties as-is
      if (volume.dimensions) {
        Object.assign(dimensions, volume.dimensions);
      }
  }
  
  return dimensions;
}
