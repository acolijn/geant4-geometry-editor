/**
 * GeometryImport.js
 * 
 * Utility functions for importing geometries in the Geant4 Geometry Editor
 * Contains functions for importing partial geometries and full geometries
 */

import { generateUniqueName } from './geometryHandlers';

/**
 * Import a partial geometry from the Add New tab
 * @param {Object} content - The content to import
 * @param {string} motherVolume - The mother volume to import into
 * @param {Object} geometries - The current geometries state
 * @param {Function} setGeometries - Function to update geometries state
 * @param {Function} setSelectedGeometry - Function to update selected geometry
 * @param {Function} propagateCompoundIdToDescendants - Function to propagate compound ID
 * @returns {Object} Result of the import operation
 */
export const importPartialFromAddNew = (
  content, 
  motherVolume, 
  geometries, 
  setGeometries, 
  setSelectedGeometry,
  propagateCompoundIdToDescendants
) => {
  if (!content || !content.object || !Array.isArray(content.descendants)) {
    console.error('Invalid partial geometry format');
    return { success: false, message: 'Invalid partial geometry format' };
  }
  
  // DETAILED DEBUG: Log the entire content being imported
  console.log('IMPORT - Full content being imported:', content);
  
  // Debug: Log any boolean components and their parents
  if (content.descendants) {
    const booleanComponents = content.descendants.filter(desc => desc._is_boolean_component === true);
    console.log('IMPORT - Boolean components before processing:', booleanComponents.map(comp => ({
      name: comp.name,
      _boolean_parent: comp._boolean_parent
    })));
  }
  
  // Create a new copy of the current geometries to work with
  const updatedGeometries = { 
    world: { ...geometries.world },
    volumes: [...geometries.volumes]
  };
  
  // Create a name mapping to track renamed objects
  const nameMapping = {};
  const existingNames = [
    geometries.world.name,
    ...geometries.volumes.map(vol => vol.name)
  ];
  
  // Process the main object
  const mainObject = { ...content.object };
  // Preserve the original name as the Geant4 name (g4name)
  // This ensures we keep the user-friendly name from the imported file
  const originalg4name = mainObject.g4name || mainObject.name;
  const originalMainName = mainObject.name;
  
  // Get the metadata name if available (for setting the g4name)
  const metadataName = content.metadata?.name;
  
  // Preserve the compound ID if it exists - this should be the same for all objects of the same type
  if (content._compoundId) {
    mainObject._compoundId = content._compoundId;
    console.log(`IMPORT - Preserved compound ID from import data: ${content._compoundId}`);
  } else if (mainObject._compoundId) {
    console.log(`IMPORT - Using existing compound ID from object: ${mainObject._compoundId}`);
  } else {
    // Generate a new compound ID if none exists
    mainObject._compoundId = `compound-${mainObject.name}-${mainObject.type}`;
    console.log(`IMPORT - Generated new compound ID: ${mainObject._compoundId}`);
  }
  
  // Generate a unique instance ID for this specific instance
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  mainObject._instanceId = `instance-${mainObject.name}-${timestamp}-${randomSuffix}`;
  console.log(`IMPORT - Generated unique instance ID: ${mainObject._instanceId}`);

  
  // Set the mother volume, defaulting to "World" if undefined
  mainObject.mother_volume = motherVolume || 'World';
  
  // Check if the name already exists and generate a unique name if needed
  if (existingNames.includes(originalMainName)) {
    // Generate a unique internal name for the main object
    const typeForNaming = mainObject.type || 'compound';
    mainObject.name = generateUniqueName(typeForNaming);
    
    // Set the g4name to preserve the Geant4 name
    // If importing into a specific object type, use that in the g4name
    if (metadataName) {
      // Extract just the base name for the object type (e.g., "PMT" from "PMT.json")
      const objectType = metadataName.split('.')[0];
      
      // Find existing objects with similar g4names to determine the next serial number
      const existingCount = updatedGeometries.volumes.filter(vol => 
        vol.g4name && vol.g4name.startsWith(`${objectType}_`)
      ).length;
      
      // Format: ObjectType_Number (e.g., PMT_1)
      mainObject.g4name = `${objectType}_${existingCount + 1}`;
    } else {
      // If no metadata name, preserve the original g4name
      mainObject.g4name = originalg4name;
    }
    
    // Add to the name mapping
    nameMapping[originalMainName] = mainObject.name;
    console.log(`IMPORT - Renamed main object from ${originalMainName} to ${mainObject.name}, g4name: ${mainObject.g4name}`);
  }
  
  // DETAILED DEBUG: Log the main object after processing
  console.log('IMPORT - Main object details after processing:', mainObject);
  
  // Define objectSerial in a wider scope so it's available for descendants
  let objectSerial;
  
  // Set the g4name based on metadata name with a serial number and the component name
  if (metadataName) {
    // Extract just the base name for the object type (e.g., "PMT" from "PMT.json")
    const objectType = metadataName.split('.')[0];
    
    // Find existing objects with similar g4names to determine the next serial number
    // Extract the serial numbers from existing g4names with the format "PMT_X"
    const existingSerialNumbers = updatedGeometries.volumes
      .filter(vol => vol.g4name && vol.g4name.startsWith(`${objectType}_`))
      .map(vol => {
        // Updated regex to match the new format without colon
        const match = vol.g4name.match(new RegExp(`^${objectType}_(\\d+)$`));
        return match ? parseInt(match[1], 10) : -1;
      })
      .filter(num => num >= 0);
    
    // Start numbering from zero
    let serialNumber = -1;
    let newg4name;
    do {
      serialNumber++;
      // Format: <object>_<serial>
      newg4name = `${objectType}_${serialNumber}`;
    } while (existingSerialNumbers.includes(serialNumber));
    
    // Set the g4name for the main object
    mainObject.g4name = newg4name;
    console.log(`IMPORT - Set g4name for main object to ${newg4name}`);
    
    // Store the serial number for use with descendants
    objectSerial = serialNumber;
  }
  
  // CRITICAL FIX: Directly add the main object to the volumes array
  // Ensure we preserve all metadata including _compoundId
  updatedGeometries.volumes.push(mainObject);
  const addedMainName = mainObject.name;
  const mainObjectIndex = updatedGeometries.volumes.length - 1;
  
  // Debug: Log the added object to verify _compoundId is present
  console.log('IMPORT - Added object with _compoundId:', updatedGeometries.volumes[mainObjectIndex]);
  
  // Register the main object with the instance tracker as a compound object
  const mainObjectId = `volume-${mainObjectIndex}`;
  
  // Create a compound object structure with the main object and its descendants
  const compoundData = {
    object: { ...mainObject },
    descendants: content.descendants,
    importedAt: new Date().toISOString()
  };
  
  console.log(`IMPORT - Added main object with name: ${addedMainName} at index: ${mainObjectIndex}`);
  
  // Process descendants
  if (content.descendants.length > 0) {
    // First pass: generate unique names for all descendants
    const processedDescendants = content.descendants.map(desc => {
      const processedDesc = { ...desc };
      const originalName = processedDesc.name;
      
      // Ensure position and rotation
      if (!processedDesc.position) {
        processedDesc.position = { x: 0, y: 0, z: 0 };
      }
      if (!processedDesc.rotation) {
        processedDesc.rotation = { x: 0, y: 0, z: 0 };
      }
      
      // Check if the name already exists and generate a unique name if needed
      if (existingNames.includes(originalName) || nameMapping[originalName]) {
        // Extract just the component part (box, sphere, etc.) with its timestamp and random string
        // This will match patterns like assembly_1748447699555_gsm4h2_box_1748447699556_2192
        // and extract just box_1748447699556_2192
        const componentMatch = originalName.match(/(?:assembly|compound)(?:_[^_]+){2,}_((box|sphere|cylinder|tube|cone)(?:_[^_]+)+)/);
        
        if (componentMatch && componentMatch[1]) {
          // If we found a pattern like assembly_123_abc_box_456_def, just use box_456_def
          processedDesc.name = componentMatch[1];
          console.log(`IMPORT - Extracted component name from ${originalName} to ${processedDesc.name}`);
        } else {
          // Otherwise generate a name using the type
          const typeForNaming = processedDesc.type || 'part';
          // Keep the timestamp and random string format
          processedDesc.name = `${typeForNaming}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        }
        
        // Add to the name mapping
        nameMapping[originalName] = processedDesc.name;
        console.log(`IMPORT - Renamed descendant from ${originalName} to ${processedDesc.name}`);
      }
      
      // Add the new name to the list of existing names to avoid duplicates
      existingNames.push(processedDesc.name);
      
      // Set the g4name - keep just the component name for better readability
      if (metadataName && objectSerial !== undefined) {
        // Just use the component name directly without prepending parent assembly name
        const componentName = processedDesc.g4name || originalName;
        processedDesc.g4name = componentName;
        console.log(`IMPORT - Set g4name for descendant to ${processedDesc.g4name}`);
      }
      
      return processedDesc;
    });
    
    // Second pass: update mother_volume references using the name mapping
    const updatedDescendants = processedDescendants.map(desc => {
      const updatedDesc = { ...desc };
      
      // Update mother_volume reference if it's in the name mapping
      if (updatedDesc.mother_volume && nameMapping[updatedDesc.mother_volume]) {
        updatedDesc.mother_volume = nameMapping[updatedDesc.mother_volume];
        console.log(`IMPORT - Updated mother_volume reference from ${desc.mother_volume} to ${updatedDesc.mother_volume}`);
      } else if (updatedDesc.mother_volume === originalMainName) {
        // If the mother_volume is the original main object, update it to the new name
        updatedDesc.mother_volume = addedMainName;
        console.log(`IMPORT - Updated mother_volume reference to main object: ${updatedDesc.mother_volume}`);
      }
      
      // Update _boolean_parent reference if it's in the name mapping or points to the original main object
      if (updatedDesc._is_boolean_component === true) {
        console.log(`IMPORT - Processing boolean component: ${updatedDesc.name}`);
        console.log(`IMPORT - Current _boolean_parent: ${updatedDesc._boolean_parent}`);
        console.log(`IMPORT - Original main name: ${originalMainName}`);
        console.log(`IMPORT - Added main name: ${addedMainName}`);
        console.log(`IMPORT - Name mapping:`, nameMapping);
        
        // Always update the _boolean_parent to the new main object name if this is a union component
        if (mainObject.type === 'union') {
          updatedDesc._boolean_parent = addedMainName;
          console.log(`IMPORT - Forced update of _boolean_parent to new union name: ${updatedDesc._boolean_parent}`);
        } else if (updatedDesc._boolean_parent && nameMapping[updatedDesc._boolean_parent]) {
          updatedDesc._boolean_parent = nameMapping[updatedDesc._boolean_parent];
          console.log(`IMPORT - Updated _boolean_parent reference from ${desc._boolean_parent} to ${updatedDesc._boolean_parent}`);
        } else if (updatedDesc._boolean_parent === originalMainName) {
          // If the _boolean_parent is the original main object, update it to the new name
          updatedDesc._boolean_parent = addedMainName;
          console.log(`IMPORT - Updated _boolean_parent reference to main object: ${updatedDesc._boolean_parent}`);
        }
      }
      
      // Propagate the compound ID to all descendants
      if (mainObject._compoundId) {
        updatedDesc._compoundId = mainObject._compoundId;
        console.log(`IMPORT - Propagated compound ID ${mainObject._compoundId} to descendant ${updatedDesc.name}`);
      }
      
      return updatedDesc;
    });
    
    // Debug: Log any boolean components after processing
    const processedBooleanComponents = updatedDescendants.filter(desc => desc._is_boolean_component === true);
    console.log('IMPORT - Boolean components after processing:', processedBooleanComponents.map(comp => ({
      name: comp.name,
      _boolean_parent: comp._boolean_parent
    })));
    
    // Add all descendants to the volumes array
    updatedGeometries.volumes = [...updatedGeometries.volumes, ...updatedDescendants];
    console.log(`IMPORT - Added ${updatedDescendants.length} descendants`);
  }
  
  // Update the state with the new geometries
  setGeometries(updatedGeometries);
  
  // Select the main object
  setSelectedGeometry(mainObjectId);
  console.log(`IMPORT - Selected main object: ${mainObjectId}`);
  
  return { success: true, message: 'Import successful', objectId: mainObjectId };
};

/**
 * Import full geometries
 * @param {Object} importData - The data to import
 * @param {Function} setGeometries - Function to update geometries state
 * @param {Function} setSelectedGeometry - Function to update selected geometry
 * @returns {Object} Result of the import operation
 */
export const importGeometries = (importData, setGeometries, setSelectedGeometry) => {
  if (!importData || !importData.world || !Array.isArray(importData.volumes)) {
    console.error('Invalid import data format');
    return { success: false, message: 'Invalid import data format' };
  }
  
  // Update the geometries state with the imported data
  setGeometries(importData);
  
  // Deselect any geometry
  setSelectedGeometry(null);
  
  return { success: true, message: 'Import successful' };
};
