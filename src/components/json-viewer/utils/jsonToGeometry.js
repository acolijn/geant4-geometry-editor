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
        if (volume.type === 'assembly' || volume.type === 'union') {
            console.log('createVolumes:: skipping volume', volume);
        } else {
            // loop through the placements and create a volume for each placement
            volume.placements.forEach(placement => {
                geometry.geometries.volumes.push(createVolume(volume, placement));
            });
        }
    });
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
        displayName: volume.g4name || volume.name,
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

