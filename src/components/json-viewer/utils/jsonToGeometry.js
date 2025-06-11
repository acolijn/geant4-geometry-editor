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
        geometry.geometries.volumes.push(createVolume(volume));
    });
}

function createVolume(volume) {
    // convert the volume to the standard geometry format
    console.log('createVolume:: volume', volume);
    console.log('createVolume:: volume.type', volume.type);
    const newVolume = {
        name: volume.name,
        displayName: volume.g4name || volume.name,
        type: volume.type,
        material: volume.material,
        placements: volume.placements,
        majorRadius: 50,
        minorRadius: 10
    };
    return newVolume;
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

