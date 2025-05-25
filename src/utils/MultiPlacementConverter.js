/**
 * MultiPlacementConverter.js
 * 
 * This utility converts the standard geometry format to a multiple placements format
 * that's optimized for Geant4 simulation. It identifies compound objects based on
 * _compoundId tags and converts them to a more efficient representation.
 */

/**
 * Converts the standard geometry format to a multiple placements format
 * @param {Object} geometry - The standard geometry object with world and volumes
 * @returns {Object} - The converted geometry with multiple placements
 */
export function convertToMultiplePlacements(geometry) {
  console.log('Converting to multiple placements format...');
  
  // Create a new geometry object
  const convertedGeometry = {
    world: convertWorldVolume(geometry.world),
    volumes: []
  };
  
  // Group volumes by compound ID
  const compoundGroups = {};
  const standaloneVolumes = [];
  
  // First pass: identify compound objects and standalone volumes
  geometry.volumes.forEach(volume => {
    if (volume._compoundId) {
      if (!compoundGroups[volume._compoundId]) {
        compoundGroups[volume._compoundId] = {
          rootVolumes: [],
          components: []
        };
      }
      
      // Check if this is a root volume (parent is World)
      if (volume.mother_volume === 'World' || !volume.mother_volume) {
        compoundGroups[volume._compoundId].rootVolumes.push(volume);
      } else {
        compoundGroups[volume._compoundId].components.push(volume);
      }
    } else {
      // This is a standalone volume
      standaloneVolumes.push(volume);
    }
  });
  
  console.log(`Found ${Object.keys(compoundGroups).length} compound groups and ${standaloneVolumes.length} standalone volumes`);
  
  // Process standalone volumes
  standaloneVolumes.forEach(volume => {
    convertedGeometry.volumes.push(convertStandardVolume(volume));
  });
  
  // Process compound objects
  Object.entries(compoundGroups).forEach(([compoundId, group]) => {
    if (group.rootVolumes.length > 0) {
      // Create a compound object
      const compoundObject = createCompoundObject(group.rootVolumes[0], group.rootVolumes, group.components);
      convertedGeometry.volumes.push(compoundObject);
    }
  });
  
  // Add hits collections if they exist
  const activeVolumes = geometry.volumes.filter(vol => vol.isActive || vol.hitsCollectionName);
  if (activeVolumes.length > 0) {
    // Get unique hits collection names
    const collectionNames = new Set();
    activeVolumes.forEach(vol => {
      if (vol.hitsCollectionName) {
        collectionNames.add(vol.hitsCollectionName);
      }
    });
    
    // Create hits collections entries
    if (collectionNames.size > 0) {
      convertedGeometry.hitsCollections = Array.from(collectionNames).map(name => {
        return {
          name,
          description: name === "MyHitsCollection" ? "Default hits collection for energy deposits" : ""
        };
      });
    }
  }
  
  return convertedGeometry;
}

/**
 * Converts the world volume to the new format
 * @param {Object} world - The world volume
 * @returns {Object} - The converted world volume
 */
function convertWorldVolume(world) {
  return {
    type: world.type || 'box',
    name: world.name || 'World',
    material: world.material || 'G4_AIR',
    visible: world.visible !== undefined ? world.visible : true,
    color: convertColor(world.color),
    wireframe: true,
    dimensions: convertDimensions(world),
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
    ]
  };
}

/**
 * Converts a standard volume to the new format
 * @param {Object} volume - The standard volume
 * @returns {Object} - The converted volume
 */
function convertStandardVolume(volume) {
  return {
    type: volume.type,
    name: volume.name,
    material: volume.material,
    color: convertColor(volume.color),
    visible: volume.visible !== undefined ? volume.visible : true,
    ...(volume.isActive && { hitCollection: volume.hitsCollectionName || "DefaultHitCollection" }),
    dimensions: convertDimensions(volume),
    placements: [
      {
        x: volume.position?.x || 0,
        y: volume.position?.y || 0,
        z: volume.position?.z || 0,
        rotation: {
          x: volume.rotation?.x || 0,
          y: volume.rotation?.y || 0,
          z: volume.rotation?.z || 0
        },
        parent: volume.mother_volume || 'World'
      }
    ]
  };
}

/**
 * Creates a compound object from a root volume and its components
 * @param {Object} rootVolume - The root volume of the compound object
 * @param {Array} rootInstances - All instances of the root volume
 * @param {Array} components - The components of the compound object
 * @returns {Object} - The compound object
 */
function createCompoundObject(rootVolume, rootInstances, components) {
  // Get the name for the compound object from the _compoundId
  // The _compoundId now contains the original object name from the save dialog
  // Format is: compound-{savedName}-{type}
  let compoundName;
  
  if (rootVolume._compoundId) {
    // Extract the original object name from the compound ID
    const match = rootVolume._compoundId.match(/^compound-(.+?)-[^-]+$/);
    if (match && match[1]) {
      compoundName = match[1];
      console.log(`Using saved object name from _compoundId: ${compoundName}`);
    } else {
      // If the pattern doesn't match, just use the first part after 'compound-'
      compoundName = rootVolume._compoundId.replace('compound-', '').split('-')[0];
      console.log(`Extracted name from _compoundId: ${compoundName}`);
    }
  } else {
    // Fall back to the base name without index if no compound ID is available
    compoundName = rootVolume.name.replace(/_\d+$/, '');
    console.log(`Falling back to instance name: ${compoundName}`);
  }
  
  // Create the compound object
  const compoundObject = {
    type: 'compound',
    name: compoundName,
    placements: rootInstances.map(instance => ({
      x: instance.position?.x || 0,
      y: instance.position?.y || 0,
      z: instance.position?.z || 0,
      rotation: {
        x: instance.rotation?.x || 0,
        y: instance.rotation?.y || 0,
        z: instance.rotation?.z || 0
      },
      parent: instance.mother_volume || 'World'
    })),
    components: []
  };
  
  // First, add the root volume itself as a component
  const rootComponent = {
    type: rootVolume.type,
    name: rootVolume.name.replace(/_\d+$/, ''),
    material: rootVolume.material,
    color: convertColor(rootVolume.color),
    visible: rootVolume.visible !== undefined ? rootVolume.visible : true,
    ...(rootVolume.isActive && { hitCollection: rootVolume.hitsCollectionName || "DefaultHitCollection" }),
    dimensions: convertDimensions(rootVolume),
    placements: [
      {
        x: 0,
        y: 0,
        z: 0,
        rotation: {
          x: 0,
          y: 0,
          z: 0
        }
      }
    ]
  };
  
  compoundObject.components.push(rootComponent);
  
  // For a compound object, we only need to consider a single instance of the PMT
  // First, find all the unique component types that belong to this compound
  const componentTypes = new Set();
  components.forEach(component => {
    if (component._compoundId === rootVolume._compoundId) {
      const baseName = component.name.replace(/_\d+$/, '');
      componentTypes.add(baseName);
    }
  });
  
  // Find the first instance of each component
  // We'll use these as templates for the component definitions
  const templateComponents = new Map();
  componentTypes.forEach(baseName => {
    // Find the first component with this base name
    const component = components.find(c => 
      c._compoundId === rootVolume._compoundId && 
      c.name.replace(/_\d+$/, '') === baseName
    );
    
    if (component) {
      templateComponents.set(baseName, component);
    }
  });
  
  // Build a hierarchy of components
  const hierarchy = new Map();
  templateComponents.forEach((component, baseName) => {
    const parentBaseName = component.mother_volume.replace(/_\d+$/, '');
    if (!hierarchy.has(parentBaseName)) {
      hierarchy.set(parentBaseName, []);
    }
    hierarchy.get(parentBaseName).push(baseName);
  });
  
  // Process direct children of the root
  const rootBaseName = rootVolume.name.replace(/_\d+$/, '');
  const directChildren = hierarchy.get(rootBaseName) || [];
  
  directChildren.forEach(childName => {
    const template = templateComponents.get(childName);
    if (!template) return;
    
    // Create the component object with a single placement
    const componentObject = {
      type: template.type,
      name: childName,
      material: template.material,
      color: convertColor(template.color),
      visible: template.visible !== undefined ? template.visible : true,
      ...(template.isActive && { hitCollection: template.hitsCollectionName || "DefaultHitCollection" }),
      dimensions: convertDimensions(template),
      placements: [{
        x: template.position?.x || 0,
        y: template.position?.y || 0,
        z: template.position?.z || 0,
        rotation: {
          x: template.rotation?.x || 0,
          y: template.rotation?.y || 0,
          z: template.rotation?.z || 0
        },
        parent: rootComponent.name
      }]
    };
    
    compoundObject.components.push(componentObject);
    
    // Process children of this component (grandchildren of root)
    const grandchildren = hierarchy.get(childName) || [];
    grandchildren.forEach(grandchildName => {
      const grandchildTemplate = templateComponents.get(grandchildName);
      if (!grandchildTemplate) return;
      
      const grandchildObject = {
        type: grandchildTemplate.type,
        name: grandchildName,
        material: grandchildTemplate.material,
        color: convertColor(grandchildTemplate.color),
        visible: grandchildTemplate.visible !== undefined ? grandchildTemplate.visible : true,
        ...(grandchildTemplate.isActive && { hitCollection: grandchildTemplate.hitsCollectionName || "DefaultHitCollection" }),
        dimensions: convertDimensions(grandchildTemplate),
        placements: [{
          x: grandchildTemplate.position?.x || 0,
          y: grandchildTemplate.position?.y || 0,
          z: grandchildTemplate.position?.z || 0,
          rotation: {
            x: grandchildTemplate.rotation?.x || 0,
            y: grandchildTemplate.rotation?.y || 0,
            z: grandchildTemplate.rotation?.z || 0
          },
          parent: childName
        }]
      };
      
      compoundObject.components.push(grandchildObject);
    });
  });
  
  return compoundObject;
}

/**
 * Converts a color array or object to the standard format
 * @param {Array|Object} color - The color to convert
 * @returns {Object} - The converted color
 */
function convertColor(color) {
  if (!color) {
    return { r: 0.7, g: 0.7, b: 0.7, a: 1.0 };
  }
  
  if (Array.isArray(color)) {
    return {
      r: color[0] || 0.7,
      g: color[1] || 0.7,
      b: color[2] || 0.7,
      a: color[3] || 1.0
    };
  }
  
  return {
    r: color.r || 0.7,
    g: color.g || 0.7,
    b: color.b || 0.7,
    a: color.opacity || color.a || 1.0
  };
}

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
      dimensions.x_radius = volume.x_radius || 5;
      dimensions.y_radius = volume.y_radius || 3;
      dimensions.z_radius = volume.z_radius || 4;
      break;
      
    case 'trapezoid':
      dimensions.dx1 = volume.dx1 || 2;
      dimensions.dx2 = volume.dx2 || 5;
      dimensions.dy1 = volume.dy1 || 1;
      dimensions.dy2 = volume.dy2 || 5;
      dimensions.dz = volume.dz || 9;
      break;
      
    case 'torus':
      dimensions.major_radius = volume.major_radius || volume.dimensions?.major_radius || 5;
      dimensions.minor_radius = volume.minor_radius || volume.dimensions?.minor_radius || 1;
      break;
      
    case 'polycone':
    case 'polyhedra':
      if (volume.dimensions) {
        dimensions.z = volume.dimensions.z || [];
        dimensions.rmin = volume.dimensions.rmin || [];
        dimensions.rmax = volume.dimensions.rmax || [];
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
