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
  
  // Create a map of volume names to their base names (without indices)
  // This will help us maintain parent-child relationships even if names change
  const nameToBaseNameMap = new Map();
  geometry.volumes.forEach(volume => {
    const baseName = volume.name.replace(/_\d+$/, '');
    nameToBaseNameMap.set(volume.name, baseName);
  });
  
  // Group volumes by compound ID
  const compoundGroups = {};
  const standaloneVolumes = [];
  
  // First pass: identify compound objects and standalone volumes
  geometry.volumes.forEach(volume => {
    if (volume._compoundId) {
      if (!compoundGroups[volume._compoundId]) {
        compoundGroups[volume._compoundId] = {
          volumes: []
        };
      }
      
      compoundGroups[volume._compoundId].volumes.push(volume);
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
    // Find the root volumes of this compound (those that are either top-level or have a parent from a different compound)
    const rootVolumes = group.volumes.filter(volume => {
      if (!volume.mother_volume) return true;
      if (volume.mother_volume === 'World') return true;
      
      // Check if the mother volume is part of the same compound
      const motherVolume = geometry.volumes.find(v => v.name === volume.mother_volume);
      return !motherVolume || motherVolume._compoundId !== compoundId;
    });
    
    // If no root volumes found, use the first volume as the root
    // This handles the case where all volumes in the compound are daughters of other objects
    if (rootVolumes.length === 0 && group.volumes.length > 0) {
      rootVolumes.push(group.volumes[0]);
    }
    
    // Group root volumes by their base name (without indices)
    const rootGroups = {};
    rootVolumes.forEach(volume => {
      const baseName = volume.name.replace(/_\d+$/, '');
      if (!rootGroups[baseName]) {
        rootGroups[baseName] = [];
      }
      rootGroups[baseName].push(volume);
    });
    
    // Process each root group
    Object.entries(rootGroups).forEach(([baseName, instances]) => {
      // Create a compound object for this group
      const compoundObject = createCompoundObject(
        instances[0],  // Use the first instance as the template
        instances,      // All instances of this root
        group.volumes,   // All volumes in this compound
        nameToBaseNameMap  // Pass the name mapping
      );
      
      // Set the parent for the compound object based on the mother_volume of the first instance
      // This ensures that compound objects that are daughters of other objects are placed correctly
      const firstInstance = instances[0];
      if (firstInstance.mother_volume && firstInstance.mother_volume !== 'World') {
        // Get the base name of the parent from our map
        const parentBaseName = nameToBaseNameMap.get(firstInstance.mother_volume) || 
                              firstInstance.mother_volume.replace(/_\d+$/, '');
        
        // Update all placements to have the correct parent
        compoundObject.placements.forEach(placement => {
          placement.parent = parentBaseName;
        });
        
        // Log that we're setting a non-World parent for this compound object
        console.log(`Setting parent '${parentBaseName}' for compound object '${compoundObject.name}'`);
      }
      
      // Add the compound object to the result
      convertedGeometry.volumes.push(compoundObject);
    });
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
 * @param {Map} nameToBaseNameMap - Map of volume names to their base names
 * @returns {Object} - The compound object
 */
function createCompoundObject(rootVolume, rootInstances, components, nameToBaseNameMap) {
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
  
  // First, define the root component name (needed for placements)
  const rootComponentName = rootVolume.name.replace(/_\d+$/, '');
  
  // Create the compound object
  const compoundObject = {
    type: 'compound',
    name: compoundName,
    placements: rootInstances.map((instance, index) => ({
      name: `${compoundName}_${index}`,
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
  
  // Add the root volume itself as a component
  const rootComponent = {
    type: rootVolume.type,
    name: rootComponentName,
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
    // Skip the root component itself
    if (baseName === rootComponentName) return;
    
    // Get the parent base name using our map
    let parentBaseName;
    if (component.mother_volume) {
      // Try to get the mapped base name first
      parentBaseName = nameToBaseNameMap.get(component.mother_volume);
      // Fall back to regex replacement if not in the map
      if (!parentBaseName) {
        parentBaseName = component.mother_volume.replace(/_\d+$/, '');
      }
    }
    
    // If the parent isn't in this compound, set the parent to the root
    if (!parentBaseName || !templateComponents.has(parentBaseName)) {
      parentBaseName = rootComponentName;
    }
    
    if (!hierarchy.has(parentBaseName)) {
      hierarchy.set(parentBaseName, []);
    }
    hierarchy.get(parentBaseName).push(baseName);
  });
  
  // Process all components recursively, starting with direct children of the root
  const rootBaseName = rootVolume.name.replace(/_\d+$/, '');
  
  // Function to recursively process components and their children
  const processComponentHierarchy = (parentName, parentBaseName) => {
    const children = hierarchy.get(parentBaseName) || [];
    
    children.forEach(childName => {
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
          parent: parentName
        }]
      };
      
      compoundObject.components.push(componentObject);
      
      // Recursively process children of this component
      processComponentHierarchy(childName, childName);
    });
  };
  
  // Start the recursive processing with the root component
  processComponentHierarchy(rootComponentName, rootBaseName);
  
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
