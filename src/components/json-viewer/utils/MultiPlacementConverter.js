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
  
  // Group volumes by compound ID and identify assemblies
  const compoundGroups = {};
  const assemblies = {};
  const assemblyTypes = {}; // Group assemblies by their _compoundId
  const standaloneVolumes = [];
  
  // First pass: identify compound objects, assemblies, and standalone volumes
  geometry.volumes.forEach(volume => {
    if (volume.type === 'assembly') {
      // This is an assembly
      assemblies[volume.name] = {
        volume: volume,
        children: []
      };
      
      // Group assemblies by their _compoundId - this is the unique identifier for assembly types
      const assemblyTypeId = volume._compoundId;
      
      if (!assemblyTypeId) {
        console.warn(`Assembly ${volume.name} has no _compoundId - this will cause issues with identification`);
        return;
      }
      
      console.log(`Processing assembly ${volume.name} with _compoundId: ${assemblyTypeId}`);
      
      // Add to the appropriate type group based on _compoundId only
      if (!assemblyTypes[assemblyTypeId]) {
        assemblyTypes[assemblyTypeId] = {
          template: volume,
          instances: []
        };
        console.log(`Created new assembly type with _compoundId: ${assemblyTypeId}`);
      }
      
      assemblyTypes[assemblyTypeId].instances.push(volume);
      console.log(`Added assembly ${volume.name} to type group with _compoundId: ${assemblyTypeId}`);
    } else if (volume._compoundId) {
      // This is part of a compound object
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
  
  // Second pass: identify children of assemblies
  geometry.volumes.forEach(volume => {
    if (volume.mother_volume && assemblies[volume.mother_volume]) {
      // This volume is a child of an assembly
      assemblies[volume.mother_volume].children.push(volume);
    }
  });
  
  console.log(`Found ${Object.keys(compoundGroups).length} compound groups and ${standaloneVolumes.length} standalone volumes`);
  
  // Process standalone volumes (excluding assemblies)
  standaloneVolumes.forEach(volume => {
    // Skip assemblies completely - they'll be handled by assembly types
    if (volume.type === 'assembly') {
      console.log(`Skipping assembly ${volume.name} from direct output - will be handled by assembly types`);
      return;
    }
    
    // Skip volumes that are children of assemblies, as they'll be handled as compound objects
    if (volume.mother_volume && Object.keys(assemblies).includes(volume.mother_volume)) {
      console.log(`Skipping ${volume.name} as it's a child of assembly ${volume.mother_volume}`);
      return;
    }
    
    convertedGeometry.volumes.push(convertStandardVolume(volume, geometry));
  });
  
  // Debug info
  console.log(`Found ${Object.keys(assemblyTypes).length} assembly types with ${Object.keys(assemblies).length} total instances`);
  
  // Keep track of processed assembly types to avoid duplicates
  const processedAssemblyTypes = new Set();
  
  // Process all assembly types and create compound objects for them
  Object.keys(assemblyTypes).forEach(assemblyTypeId => {
    // Skip if we've already processed this assembly type
    if (processedAssemblyTypes.has(assemblyTypeId)) {
      console.log(`Skipping duplicate assembly type with ID: ${assemblyTypeId} - already processed`);
      return;
    }
    
    // Mark this assembly type as processed
    processedAssemblyTypes.add(assemblyTypeId);
    
    const typeData = assemblyTypes[assemblyTypeId];
    const templateVolume = typeData.template;
    
    console.log(`Processing assembly type with ID: ${assemblyTypeId}`);
    console.log(`Template volume: ${templateVolume.name}`);
    console.log(`Number of instances: ${typeData.instances.length}`);
    
    // Get the template assembly
    const templateAssembly = assemblies[templateVolume.name];
    
    if (!templateAssembly) {
      console.warn(`Template assembly ${templateVolume.name} not found - skipping`);
      return;
    }
    
    // Log all instances in this type group to verify they're correctly grouped
    typeData.instances.forEach((instance, index) => {
      console.log(`  Instance ${index}: ${instance.name}, _compoundId: ${instance._compoundId}`);
    });
    
    if (!templateAssembly || templateAssembly.children.length === 0) {
      // Skip empty assemblies
      console.log(`Skipping empty assembly type: ${assemblyTypeId}`);
      return;
    }
    
    // Create a compound object for this assembly type
    // Assembly is just a container - no material, color, or dimensions
    
    // Extract the assembly type name from the _compoundId or use the name
    // Remove any trailing numbers (e.g., "PMT_1" -> "PMT")
    let compoundName = templateVolume.displayName || templateVolume.name;
    compoundName = compoundName.replace(/_\d+$/, '');
    
    console.log(`Using compound name: ${compoundName} for assembly type with ID: ${assemblyTypeId}`);
    
    const compoundObject = {
      type: 'assembly',
      // Use the clean name without trailing numbers
      name: compoundName,
      components: [],
      placements: []
    };
    
    console.log(`Created compound object with name: ${compoundObject.name}`);
    
    // No hitCollection at the assembly level
    
    // Helper function to recursively process all descendants
    const processComponentWithDescendants = (volume, parentName) => {
      // Get the Geant4 name for this volume
      const geant4Name = volume.displayName || volume.name;
      
      // Create a component for this volume
      const component = {
        type: volume.type,
        // Use the internal name for components
        name: volume.name,
        // Store the Geant4 name as g4name
        g4name: volume.displayName || volume.name,
        material: volume.material,
        //color: Array.isArray(volume.color) ? volume.color : 
        //       (volume.color ? [volume.color.r, volume.color.g, volume.color.b, volume.color.a] : [0.7, 0.7, 0.7, 1.0]),
        dimensions: convertDimensions(volume),

        // if isActive is true, add it to the object
        isActive: volume.isActive || false,
        // if hitsColectionName is not empty, add it to the object
        ...(volume.hitsCollectionName && { hitsCollectionName: volume.hitsCollectionName }),
        
        // No individual hitCollection tags for components in assemblies
        // For top-level components in an assembly, we need special handling
        // If this is a direct child of the assembly (parentName is empty), we should NOT include
        // the rotation in the placement, as the rotation will be applied at the assembly level
        placements: [{
          x: volume.position?.x || 0,
          y: volume.position?.y || 0,
          z: volume.position?.z || 0,
          // Only include rotation for non-top-level components
          // For top-level components, rotation should be applied at the assembly level
          ...(parentName ? {
            rotation: {
              x: volume.rotation?.x || 0,
              y: volume.rotation?.y || 0,
              z: volume.rotation?.z || 0
            }
          } : {
            // For top-level components, set rotation to zero
            // The assembly's rotation will be applied to all components
            rotation: { x: 0, y: 0, z: 0 }
          }),
          // For top-level components in assembly, use empty parent
          // For components with internal parent-child relationships, use the internal name of the parent
          parent: parentName || ""
        }]
      };
      
      // Add this component to the compound object
      compoundObject.components.push(component);
      
      // Find all children of this volume
      const children = geometry.volumes.filter(vol => 
        vol.mother_volume === volume.name
      );
      
      // Process each child recursively
      children.forEach(child => {
        // Pass the internal name as the parent name, NOT the Geant4 name
        processComponentWithDescendants(child, volume.name);
      });
    };
    
    // Process all direct children of the assembly
    templateAssembly.children.forEach(child => {
      // Process this child and all its descendants
      processComponentWithDescendants(child, child.mother_volume === templateVolume.name ? "" : child.mother_volume);
    });
    
    // Add placements for all instances of this assembly type
    console.log(`Adding placements for assembly type: ${compoundObject.name}, ID: ${assemblyTypeId}`);
    console.log(`Number of instances to process: ${typeData.instances.length}`);
    
    typeData.instances.forEach((instance, index) => {
      // Log detailed information about each instance
      console.log(`Processing instance ${index}: ${instance.name}, _compoundId: ${instance._compoundId}`);
      console.log(`  Position: x=${instance.position?.x || 0}, y=${instance.position?.y || 0}, z=${instance.position?.z || 0}`);
      console.log(`  Rotation: x=${instance.rotation?.x || 0}, y=${instance.rotation?.y || 0}, z=${instance.rotation?.z || 0}`);
      console.log(`  Parent: ${instance.mother_volume || 'World'}`);
      
      // Add a placement for each instance - no units (all in mm and rad)
      const placement = {
        // Use the Geant4 name (displayName) as g4name for identification in placements
        g4name: instance.displayName || instance.name,
        x: instance.position?.x || 0,
        y: instance.position?.y || 0,
        z: instance.position?.z || 0,
        rotation: {
          x: instance.rotation?.x || 0,
          y: instance.rotation?.y || 0,
          z: instance.rotation?.z || 0
        },
        // The parent is where this instance will be placed - use internal name for parent reference
        // For top-level assemblies, this is typically 'World'
        parent: instance.mother_volume || 'World'
      };
      
      compoundObject.placements.push(placement);
      console.log(`  Added placement for instance ${instance.name} to compound object ${compoundObject.name}`);
    });
    
    console.log(`Total placements added for ${compoundObject.name}: ${compoundObject.placements.length}`);
    if (compoundObject.placements.length === 0) {
      console.warn(`WARNING: No placements were added for assembly type: ${compoundObject.name}`);
    }
    
    // Add the compound object to the converted geometry
    convertedGeometry.volumes.push(compoundObject);
  });
  
  // Process compound objects (but skip those that are part of assemblies)
  Object.entries(compoundGroups).forEach(([compoundId, group]) => {
    // Check if any volume in this group is part of an assembly
    const isPartOfAssembly = group.volumes.some(volume => 
      volume.mother_volume && Object.keys(assemblies).includes(volume.mother_volume)
    );
    
    // Skip this compound group if it's part of an assembly (already processed)
    if (isPartOfAssembly) {
      console.log(`Skipping compound group ${compoundId} as it's part of an assembly`);
      return;
    }
    
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
    // Use the internal name for consistency
    name: world.name || 'World',
    // Store the Geant4 name as g4name
    g4name: world.displayName || world.name || 'World',
    material: world.material || 'G4_AIR',
    visible: world.visible !== undefined ? world.visible : true,
    //color: convertColor(world.color),
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
  let isChildOfAssembly = false;

  if (volume.mother_volume && volume.mother_volume !== 'World') {
    // Find the mother volume in the original geometry to get its displayName
    const motherVolume = originalGeometry.volumes.find(vol => vol.name === volume.mother_volume);
    
    if (motherVolume) {
      // Check if the mother volume is an assembly
      if (motherVolume.type === 'assembly') {
        isChildOfAssembly = true;
      }
      
      if (motherVolume.displayName) {
        // Use the Geant4 name (displayName) of the mother volume
        //parentName = motherVolume.displayName;
        parentName = volume.mother_volume;
      } else {
        // Fallback: use the mother_volume name
        parentName = volume.mother_volume;
      }
    } else {
      // Fallback: use the mother_volume name
      parentName = volume.mother_volume;
    }
  }

  return {
    type: volume.type,
    // Use the internal name for consistency
    name: volume.name,
    // Store the Geant4 name as g4name
    g4name: geant4Name,
    material: volume.material,
    //color: convertColor(volume.color),
    visible: volume.visible !== undefined ? volume.visible : true,
    // if hitsColectionName is not empty, add it to the object
    // add isActive to all and if it is true also add teh hitsCollectionName
    isActive: volume.isActive,
    ...(volume.hitsCollectionName && { hitsCollectionName: volume.hitsCollectionName }),

    // 
    dimensions: convertDimensions(volume),
    placements: [
      {
        // No units - all values in mm and rad
        x: volume.position?.x || 0,
        y: volume.position?.y || 0,
        z: volume.position?.z || 0,
        rotation: {
          x: volume.rotation?.x || 0,
          y: volume.rotation?.y || 0,
          z: volume.rotation?.z || 0
        },
        // Use g4name for parent reference for consistency
        parent: parentName
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
 * @param {Object} geometry - The original geometry object with all volumes
 * @returns {Object} - The compound object
 */
function createCompoundObject(rootVolume, rootInstances, components, nameToBaseNameMap, geometry) {
  
  console.log(`Creating compound object from root volume: ${rootVolume.name}`);
  console.log(`Root volume: ${JSON.stringify(rootVolume)}`);
  console.log(`Root instances: ${JSON.stringify(rootInstances)}`);
  console.log(`Components: ${JSON.stringify(components)}`);
  console.log(`Name to base name map: ${JSON.stringify(nameToBaseNameMap)}`);
  console.log(`Geometry: ${JSON.stringify(geometry)}`);
  
  // Get the name for the compound object from the _compoundId
  // The _compoundId now contains the original object name from the save dialog
  // Format is: compound-{savedName}-{type}
  let compoundName;
  
  if (rootVolume._compoundId) {
    // Use the _compoundId directly as the unique identifier
    compoundName = rootVolume.displayName || rootVolume.name;
    console.log(`Using name ${compoundName} for compound with ID: ${rootVolume._compoundId}`);
  } else {
    // Fall back to the base name without index if no compound ID is available
    compoundName = rootVolume.name.replace(/_\d+$/, '');
    console.log(`Falling back to instance name: ${compoundName} (no _compoundId found)`);
  }
  
  // First, define the root component name (needed for placements)
  // Use the internal name from the object's first component
  const rootComponentName = rootVolume.name;
  
  // Clean the compound name by removing any trailing _number pattern
  compoundName = compoundName.replace(/_\d+$/, '');
  
  // Create the compound object
  const compoundObject = {
    type: 'assembly',
    name: compoundName,
    placements: rootInstances.map((instance, index) => {
      // Use displayName if available, otherwise fall back to compoundName
      const displayName = instance.displayName || compoundName;
      
      // Get the parent name (mother_volume) and use it directly without splitting
      let parentName = 'World';
      if (instance.mother_volume && instance.mother_volume !== 'World') {
        // Find the mother volume in the original geometry to get its displayName
        const motherVolume = geometry.volumes.find(vol => vol.name === instance.mother_volume);
        if (motherVolume && motherVolume.displayName) {
          // Use the Geant4 name (displayName) of the mother volume
          parentName = instance.mother_volume; //motherVolume.displayName;
        } else {
          // Fallback: use the mother_volume name
          parentName = instance.mother_volume;
        }
      }
      
      return {
        // Use the Geant4 name (displayName) as g4name for identification in placements
        g4name: instance.displayName || instance.name,
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
  
  console.log(`First instance ID: ${firstInstanceId}`);
  console.log(`Root instances: ${JSON.stringify(rootInstances)}`);
  
  // Start with the root component from the first instance
  templateComponents.push({
    type: rootVolume.type,
    // Use internal name for components
    name: rootVolume.name,
    // Store the Geant4 name as g4name
    g4name: rootVolume.displayName || rootVolume.name,
    material: rootVolume.material,
    color: convertColor(rootVolume.color),
    visible: rootVolume.visible !== undefined ? rootVolume.visible : true,
    // if hitsColectionName is not empty, add it to the object
    isActive: rootVolume.isActive,
    ...(rootVolume.hitsCollectionName && { hitsCollectionName: rootVolume.hitsCollectionName }),

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
    console.log(`YOOOOOOOO: ${component.name}`);
    // Get the parent name
    const parentName = component.mother_volume || rootVolume.name;
    
    // Add this component to the template components
    templateComponents.push({
      type: component.type,
      // Use the internal name for components
      name: component.name,
      // Store the Geant4 name as g4name
      g4name: component.displayName || component.name,
      material: component.material,
      color: convertColor(component.color),
      visible: component.visible !== undefined ? component.visible : true,
      // if hitsColectionName is not empty, add it to the object
      isActive: component.isActive,
      ...(component.hitsCollectionName && { hitsCollectionName: component.hitsCollectionName }),
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
        // Use the internal parent name
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
    return [0.7, 0.7, 0.7, 1.0];
  }
  
  if (Array.isArray(color)) {
    return [
      color[0] || 0.7,
      color[1] || 0.7,
      color[2] || 0.7,
      color[3] || 1.0
    ];
  }
  
  return [
    color.r || 0.7,
    color.g || 0.7,
    color.b || 0.7,
    color.opacity || color.a || 1.0
  ];
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
