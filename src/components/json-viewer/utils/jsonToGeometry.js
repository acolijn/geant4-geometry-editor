/**
 * 
 * This utility converts the json format to a standard geometry format that 
 * is used by the geometry editor.
 * 
 * @param {Object} json - The json object to convert
 * @returns {Object} The standard geometry format
 */


/**
 * 
 * @param {*} json 
 */

export function jsonToGeometry(json, geometry) {
    console.log('jsonToGeometry:: json', json);
    console.log('jsonToGeometry:: geometry', geometry);

    // check if json has world: if so update the world in geometry
    if (json.world) {
        console.log('jsonToGeometry:: json has world - create new geometry');
        geometry = createNewGeometry(json);
    }

    // check if json has volumes: if so add them to the geometry
    if (json.volumes) {
        createVolumes(json.volumes, geometry);
    }

    // check if json has materials: if so add them to the geometry
    if (json.materials) {
        createMaterials(json.materials, geometry);
    }

    console.log('jsonToGeometry:: created/updated geometry::', geometry);

    return geometry;
}

/**
 * 
 * @param {*} json 
 * @returns {Object} The standard geometry format
 */
function createNewGeometry(json) {
    console.log('createNewGeometry:: json', json.world);
    const geometry = {
        geometries: {
            world: json.world,
            volumes: []
        },
        materials: []
    };

    // I need to set the size of the world to the dimensions of the world
    geometry.geometries.world.size = {
        x: json.world.dimensions.x,
        y: json.world.dimensions.y,
        z: json.world.dimensions.z
    };
    return geometry;
}

function createVolumes(volumes, geometry) {
    // Make sure volumes array exists
    if (!geometry.geometries.volumes) {
        geometry.geometries.volumes = [];
    }
    
    // loop over the volumes
    volumes.forEach(volume => {
        if (volume.type === 'assembly' ){
            createAssembly(volume, geometry);
        } else if (volume.type === 'union') {
            createAssembly(volume, geometry);
        } else {
            // loop through the placements and create a volume for each placement
            volume.placements.forEach(placement => {
                geometry.geometries.volumes.push(createVolume(volume, placement));
            });
        }
    });
}

function createAssembly(volume, geometry) {
    // convert the assembly to the standard geometry format
    console.log('createAssembly:: volume', volume);
    console.log('createAssembly:: volume.type', volume.type);
    console.log('createAssembly:: volume.placements', volume.placements);

    // loop through the placements and create an assembly for each placement
    let iPlacement = 0;
    volume.placements.forEach(placement => {
        // create the assembly
        let assemblyName = placement.name;
        const assembly = {
            name: assemblyName,
            g4name: placement.g4name,
            type: volume.type,
            material: volume.material || undefined,
            position: {x: placement.x, y: placement.y, z: placement.z},
            rotation: {x: placement.rotation.x, y: placement.rotation.y, z: placement.rotation.z},
            _compoundId: volume._compoundId,
            _componentId: volume._componentId,
            mother_volume: placement.parent
        };
        console.log('createAssembly:: assembly', assembly);
        geometry.geometries.volumes.push(assembly);

        // add the components
        console.log('createAssembly:: volume.components', volume.components);
        volume.components.forEach(component => {
            // create the component
            let placement = component.placements[0];
            let newName = nextName(placement.name, iPlacement);
            console.log('createAssembly:: newName', newName);
            console.log('createAssembly:: placement', placement);
            const newComponent = {
                name: newName,
                g4name: newName,
                type: component.type,
                position: {x: placement.x, y: placement.y, z: placement.z},
                rotation: {x: placement.rotation.x, y: placement.rotation.y, z: placement.rotation.z},
                material: component.material || undefined,
                _compoundId: volume._compoundId,
                _componentId: component._componentId,
                // if parent name not "" then use it as mother_volume else use assemblyName
                mother_volume: placement.parent !== '' ? nextName(placement.parent, iPlacement) : assemblyName
            };

            if (component.boolean_operation) {
                newComponent.boolean_operation = component.boolean_operation;
                newComponent._is_boolean_component = true;
                newComponent._boolean_parent = assemblyName;
            }

            setDimensions(newComponent, component);

            geometry.geometries.volumes.push(newComponent);
            console.log('createAssembly:: done');     
        });

        iPlacement++;
    });
    
}

/**
 * Generate the next name by adding a specified increment to the last number after the last underscore
 * 
 * @param {string} name - The original name with format like "part1_part2_number"
 * @param {number} increment - The amount to add to the last number
 * @returns {string} - The new name with the incremented number
 */
function nextName(name, increment) {
// Split the name by underscores
const parts = name.split('_');

// Get the last part which should be the number
const lastPart = parts[parts.length - 1];

// Check if the last part is a number
if (/^\d+$/.test(lastPart)) {
    // Convert to number, add the increment
    const currentNumber = parseInt(lastPart, 10);
    const nextNumber = currentNumber + increment;
    
    // Pad with leading zeros to maintain the same length
    const paddedNumber = nextNumber.toString().padStart(lastPart.length, '0');
    
    // Replace the last part with the new number
    parts[parts.length - 1] = paddedNumber;
    
    // Join the parts back with underscores
    return parts.join('_');
}

// If the last part is not a number, append the increment with an underscore
return `${name}_${increment}`;
}

function createUnion(volume, geometry) {
    // convert the union to the standard geometry format
    console.log('createUnion:: volume', volume);
    console.log('createUnion:: volume.type', volume.type);
    console.log('createUnion:: volume.placements', volume.placements);
    console.log('createUnion:: volume.material', volume.material);
}

function createVolume(volume, placement) {
    // convert the volume to the standard geometry format
    console.log('createVolume:: volume', volume);
    console.log('createVolume:: volume.type', volume.type);
    console.log('createVolume:: volume.placements', volume.placements);
    console.log('createVolume:: volume.material', volume.material);
    console.log('createVolume:: volume.dimensions', volume.dimensions);

    const newVolume = {
        name: volume.name,
        g4name: volume.g4name || volume.name,
        type: volume.type,
        material: volume.material,
        position: {x: placement.x, y: placement.y, z: placement.z},
        rotation: {x: placement.rotation.x, y: placement.rotation.y, z: placement.rotation.z},
        mother_volume: placement.parent
    };


    // set the dimensions of the new volume
    setDimensions(newVolume, volume);
    
    return newVolume;
}

function setDimensions(newVolume, volume) {
    // Inverse operation of convertDimensions from geometryToJson.js
    // Map dimensions from JSON format to internal geometry format
    console.log('setDimensions:: volume', volume);
    
    if (!volume.dimensions) {
        console.warn('setDimensions:: No dimensions found for volume:', volume.name);
        return;
    }
    
    switch (volume.type) {
        case 'box':
            newVolume.size = {
                x: volume.dimensions.x,
                y: volume.dimensions.y,
                z: volume.dimensions.z
            };
            break;
            
        case 'cylinder':
            newVolume.radius = volume.dimensions.radius;
            newVolume.height = volume.dimensions.height;
            if (volume.dimensions.inner_radius !== undefined) {
                newVolume.innerRadius = volume.dimensions.inner_radius;
            }
            break;
            
        case 'sphere':
            newVolume.radius = volume.dimensions.radius;
            break;
            
        case 'ellipsoid':
            newVolume.xRadius = volume.dimensions.x_radius;
            newVolume.yRadius = volume.dimensions.y_radius;
            newVolume.zRadius = volume.dimensions.z_radius;
            break;
            
        case 'trapezoid':
            newVolume.dx1 = volume.dimensions.dx1;
            newVolume.dx2 = volume.dimensions.dx2;
            newVolume.dy1 = volume.dimensions.dy1;
            newVolume.dy2 = volume.dimensions.dy2;
            newVolume.dz = volume.dimensions.dz;
            break;
            
        case 'torus':
            newVolume.majorRadius = volume.dimensions.major_radius;
            newVolume.minorRadius = volume.dimensions.minor_radius;
            break;
            
        case 'polycone':
        case 'polyhedra':
            if (volume.dimensions.z && 
                volume.dimensions.rmin && 
                volume.dimensions.rmax) {
                
                newVolume.zSections = volume.dimensions.z.map((z, index) => ({
                    z: z,
                    rMin: volume.dimensions.rmin[index],
                    rMax: volume.dimensions.rmax[index]
                }));
            }
            break;
            
        default:
            // For any other geometry types, copy all dimension properties
            if (volume.dimensions) {
                Object.keys(volume.dimensions).forEach(key => {
                    newVolume[key] = volume.dimensions[key];
                });
            }
    }
    
    console.log('setDimensions:: newVolume after setting dimensions', newVolume);
}
    

function createMaterials(materials, geometry) {
    // Make sure materials object exists
    console.log('createMaterials:: geometry', geometry);
    console.log('createMaterials:: materials', materials);
    
    // Initialize materials as an object, not an array
    geometry.materials = {};
    
    // Process materials object where keys are material names
    Object.entries(materials).forEach(([materialName, materialData]) => {
        // Create the material and add it to the materials object with the name as key
        const processedMaterial = createMaterial({
            ...materialData,
            name: materialName
        });
        
        // Remove the name property since it's redundant as a key
        const { name, ...materialWithoutName } = processedMaterial;
        
        // Add to materials object with name as key
        geometry.materials[materialName] = materialWithoutName;
    });
}

function createMaterial(material) {
    // convert the material to the standard geometry format
    console.log('createMaterial:: material', material);
    
    const newMaterial = {
        name: material.name,
        density: material.density,
        // Map composition to components if it exists
        components: material.components || material.composition
    };
    
    // Add additional properties if they exist
    if (material.density_unit) newMaterial.density_unit = material.density_unit;
    if (material.state) newMaterial.state = material.state;
    if (material.temperature) newMaterial.temperature = material.temperature;
    if (material.temperature_unit) newMaterial.temperature_unit = material.temperature_unit;
    if (material.type) newMaterial.type = material.type;
    if (material.color) newMaterial.color = material.color;
    
    return newMaterial;
}

