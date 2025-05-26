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
    convertedGeometry.volumes.push(convertStandardVolume(volume, geometry));
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
        nameToBaseNameMap,  // Pass the name mapping
        geometry  // Pass the original geometry for parent name lookup
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
 * @param {Object} originalGeometry - The original geometry object with all volumes
 * @returns {Object} - The converted volume
 */
function convertStandardVolume(volume, originalGeometry) {
  // Use the Geant4 name (displayName) if available, otherwise use the regular name
  const geant4Name = volume.displayName || volume.name;
  
  // Get the parent name (mother_volume) and use its Geant4 name if available
  let parentName = 'World';
  if (volume.mother_volume && volume.mother_volume !== 'World') {
    // Find the mother volume in the original geometry to get its displayName
    const motherVolume = originalGeometry.volumes.find(vol => vol.name === volume.mother_volume);
    if (motherVolume && motherVolume.displayName) {
      // Use the Geant4 name (displayName) of the mother volume
      parentName = motherVolume.displayName;
    } else {
      // Fallback: extract the Geant4 name from the mother_volume name if it has underscores
      parentName = volume.mother_volume;
      /*if (parentName.includes('_')) {
        const parts = parentName.split('_');
        if (parts.length > 1) {
          parentName = parts[1];
        }
      }*/
    }
  }
  
  return {
    type: volume.type,
    name: geant4Name,  // Use the Geant4 name
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
        parent: parentName  // Use the Geant4 parent name
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
function createCompoundObject(rootVolume, rootInstances, components, nameToBaseNameMap, geometry) {
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
  // Use the original name from the object's first component
  const rootComponentName = rootVolume.name;
  
  // Create the compound object
  const compoundObject = {
    type: 'compound',
    name: compoundName,
    placements: rootInstances.map((instance, index) => {
      // Use displayName if available, otherwise fall back to compoundName
      const displayName = instance.displayName || compoundName;
      
      // Get the parent name (mother_volume) and use its Geant4 name if available
      let parentName = 'World';
      if (instance.mother_volume && instance.mother_volume !== 'World') {
        // Find the mother volume in the original geometry to get its displayName
        const motherVolume = geometry.volumes.find(vol => vol.name === instance.mother_volume);
        if (motherVolume && motherVolume.displayName) {
          // Use the Geant4 name (displayName) of the mother volume
          parentName = motherVolume.displayName;
        } else {
          // Fallback: extract the Geant4 name from the mother_volume name if it has underscores
          parentName = instance.mother_volume;
          /*if (parentName.includes('_')) {
            const parts = parentName.split('_');
            if (parts.length > 1) {
              parentName = parts[1];
            }
          }*/
        }
      }
      
      return {
        name: displayName, // Use the Geant4 name for identification
        x: instance.position?.x || 0,
        y: instance.position?.y || 0,
        z: instance.position?.z || 0,
        rotation: {
          x: instance.rotation?.x || 0,
          y: instance.rotation?.y || 0,
          z: instance.rotation?.z || 0
        },
        parent: parentName // Use the Geant4 parent name
      };
    }),
    components: []
  };
  
  // Create a clean components array using ONLY the first instance as a template
  // This ensures we don't get duplicate definitions when we have multiple objects
  const templateComponents = [];
  
  // Get only the components from the first instance
  // First, identify the first instance by its _instanceId if available
  const firstInstanceId = rootInstances[0]._instanceId;
  
  // Start with the root component from the first instance
  templateComponents.push({
    type: rootVolume.type,
    // split on _ and keep only middle part
    name: rootVolume.name.split('_')[1],
    material: rootVolume.material,
    color: convertColor(rootVolume.color),
    visible: rootVolume.visible !== undefined ? rootVolume.visible : true,
    ...(rootVolume.isActive && { hitCollection: rootVolume.hitsCollectionName || "DefaultHitCollection" }),
    dimensions: convertDimensions(rootVolume),
    placements: [{
      x: 0,
      y: 0,
      z: 0,
      rotation: {
        x: 0,
        y: 0,
        z: 0
      }
    }]
  });
  
  // Find child components that belong ONLY to the first instance
  const firstInstanceComponents = firstInstanceId
    ? components.filter(c => 
        c._compoundId === rootVolume._compoundId && 
        c._instanceId === firstInstanceId && 
        c.name !== rootVolume.name
      )
    : components.filter(c => 
        c._compoundId === rootVolume._compoundId && 
        c.name !== rootVolume.name
      ).slice(0, 2); // If no instanceId, just take the first 2 components as a fallback
  
  console.log(`Using ${firstInstanceComponents.length} components from the first instance as templates`);
  
  // Process each component from the first instance only
  firstInstanceComponents.forEach(component => {
    // Get the parent name
    const parentName = component.mother_volume || rootVolume.name;
    
    // Add this component to the template components
    templateComponents.push({
      type: component.type,
      name: component.name.split('_')[1],
      //g4Name: component.g4Name,
      material: component.material,
      color: convertColor(component.color),
      visible: component.visible !== undefined ? component.visible : true,
      ...(component.isActive && { hitCollection: component.hitsCollectionName || "DefaultHitCollection" }),
      dimensions: convertDimensions(component),
      placements: [{
        x: component.position?.x || 0,
        y: component.position?.y || 0,
        z: component.position?.z || 0,
        rotation: {
          x: component.rotation?.x || 0,
          y: component.rotation?.y || 0,
          z: component.rotation?.z || 0
        },
        parent: parentName
      }]
    });
  });
  
  // Add the template components to the compound object
  compoundObject.components = templateComponents;
  
  // We've already processed all components in the loop above
  // No need for additional component processing
  console.log('All components processed with their original names and relationships');
  
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
