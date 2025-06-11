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

    // check if json has world: if so a completly new geometry is to be created
    if (json.world) {
        geometry = createNewGeometry(json);
    }

    // check if json has volumes: if so add them to the geometry
    if (json.volumes) {
        createVolumes(json.volumes, geometry);
    }

    // check if json has assemblies: if so add them to the geometry
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
    const geometry = {}
    geometry.geometries.world = json.world;

    return geometry;
}

function createVolumes(json, geometry) {
    // loop over the volumes
    json.volumes.forEach(volume => {
        geometry.geometries.volumes.push(createVolume(volume));
    });
}

function createVolume(volume) {
    // convert the volume to the standard geometry format
 
    
    const volume = {
        name: volume.name,
        type: volume.type,
        material: volume.material,
        placements: volume.placements
    };
    return volume;
}

function createMaterials(json, geometry) {
    // loop over the materials
    json.materials.forEach(material => {
        geometry.materials.push(createMaterial(material));
    });
}

function createMaterial(material) {
    // convert the material to the standard geometry format
    const material = {
        name: material.name,
        density: material.density,
        components: material.components
    };
    return material;
}

