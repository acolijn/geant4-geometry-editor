import { useState, useEffect } from 'react';
import { 
  Box, 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  Tabs, 
  Tab,
  Container,
  ThemeProvider,
  createTheme,
  Button,
  Tooltip
} from '@mui/material';
import Viewer3D from './components/Viewer3D';
import GeometryEditor from './components/GeometryEditor';
import MaterialsEditor from './components/MaterialsEditor';
import JsonViewer from './components/JsonViewer';
import ProjectManager from './components/ProjectManager';
import { defaultGeometry, defaultMaterials } from './utils/defaults';
import { standardizeProjectData, restoreProjectData } from './utils/ObjectFormatStandardizer';
import './App.css';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [geometries, setGeometries] = useState(defaultGeometry);
  const [materials, setMaterials] = useState(defaultMaterials);
  const [selectedGeometry, setSelectedGeometry] = useState(null);
  const [hitCollections, setHitCollections] = useState(['MyHitsCollection']);
  
  // No localStorage loading - starting with default values
  
  // No localStorage saving
  
  // Handle updating a geometry
  const handleUpdateGeometry = (id, updatedObject, keepSelected = true, isLiveUpdate = false) => {
    // Store the current selection before any updates
    const currentSelection = selectedGeometry;
    
    // Instance tracking functionality has been removed for a cleaner implementation
    // The update dialog and related functionality will be reimplemented in a simpler way
    
    // Create a new state update that includes both geometry and selection changes
    // to ensure they happen atomically and prevent flickering/jumping
    const updateState = () => {
      // Check if the name has changed (for updating daughter references)
      let oldName = null;
      let newName = updatedObject.name;
      
      if (id === 'world') {
        oldName = geometries.world.name;
        
        // First update the geometry
        setGeometries(prevGeometries => {
          // Update the world object
          const updatedGeometries = {
            ...prevGeometries,
            world: updatedObject
          };
          
          // If name changed, update all daughter volumes that reference this as mother
          if (oldName !== newName) {
            updatedGeometries.volumes = prevGeometries.volumes.map(volume => {
              if (volume.mother_volume === oldName) {
                return { ...volume, mother_volume: newName };
              }
              return volume;
            });
          }
          
          return updatedGeometries;
        });
      } else if (id.startsWith('volume-')) {
        const index = parseInt(id.split('-')[1]);
        oldName = geometries.volumes[index].name;
        
        setGeometries(prevGeometries => {
          const updatedVolumes = [...prevGeometries.volumes];
          
          // Check if this is an intermediate object using world coordinates
          if (updatedObject._usingWorldCoordinates) {
            // For intermediate objects using world coordinates, we need to handle them differently
            // Remove the special flag before storing in state
            const { _usingWorldCoordinates, _isIntermediateObject, ...cleanObject } = updatedObject;
            updatedVolumes[index] = cleanObject;
          } else {
            // Normal update for regular objects
            // Remove any special flags if present
            const { _isIntermediateObject, ...cleanObject } = updatedObject;
            updatedVolumes[index] = cleanObject;
          }
          
          // If name changed, update all daughter volumes that reference this as mother
          if (oldName !== newName) {
            updatedVolumes.forEach((volume, i) => {
              if (i !== index && volume.mother_volume === oldName) {
                updatedVolumes[i] = { ...volume, mother_volume: newName };
              }
            });
          }
          
          return {
            ...prevGeometries,
            volumes: updatedVolumes
          };
        });
      }
    };
    
    // Execute the state update
    updateState();
    
    // CRITICAL: When keepSelected is false, we should NOT change the selection at all
    // This allows the Viewer3D component to manage selection explicitly
    if (keepSelected) {
      // Only change selection when explicitly requested
      setSelectedGeometry(id);
      console.log(`Setting selection to ${id} as requested`);
    } else {
      // When keepSelected is false, maintain the current selection
      console.log(`Keeping current selection (${currentSelection}) as requested`);
    }
  };
  
  // Generate a unique name for a new geometry
  const generateUniqueName = (baseType) => {
    // Get all existing names
    const existingNames = [
      geometries.world.name,
      ...geometries.volumes.map(vol => vol.name)
    ];
    
    // Find the next available number
    let counter = 0;
    let newName;
    do {
      // Just use the base type without capitalization and a counter
      // This is for internal names only, displayName will be set separately
      newName = `${baseType}_${counter}`;
      counter++;
    } while (existingNames.includes(newName));
    
    return newName;
  };
  
  // Handle adding a new geometry
  const handleAddGeometry = (newGeometry) => {
    // If the geometry doesn't have a custom name, generate a unique one
    if (!newGeometry.name || newGeometry.name === `New${newGeometry.type.charAt(0).toUpperCase() + newGeometry.type.slice(1)}`) {
      newGeometry.name = generateUniqueName(newGeometry.type);
    }
    
    // Log the geometry being added
    console.log('Adding geometry:', newGeometry);
    
    // Get the index that the new volume will have
    const newVolumeIndex = geometries.volumes.length;
    const newVolumeKey = `volume-${newVolumeIndex}`;
    
    // Update geometries with the new object
    setGeometries({
      ...geometries,
      volumes: [...geometries.volumes, newGeometry]
    });
    
    // Select the newly added geometry
    // Use a small timeout to ensure the geometry is added to the DOM before selecting
    // This ensures the transform controls appear immediately
    setTimeout(() => {
      console.log(`Selecting newly created object: ${newVolumeKey}`);
      setSelectedGeometry(newVolumeKey);
    }, 50);
    
    // Return the name of the added geometry (useful for tracking)
    return newGeometry.name;
  };
  
  // Handle importing a partial geometry from the Add New tab
  const handleImportPartialFromAddNew = (content, motherVolume) => {
    if (!content || !content.object || !Array.isArray(content.descendants)) {
      console.error('Invalid partial geometry format');
      return { success: false, message: 'Invalid partial geometry format' };
    }
    
    // DETAILED DEBUG: Log the entire content being imported
    console.log('IMPORT - Full content being imported:', content);
    
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
    // Get the exact name from the JSON file without any prefixes or suffixes
    // The name in the JSON file should be something like "base", "glass", etc.
    const originalMainName = mainObject.name;
    
    // Get the metadata name if available (for setting the displayName)
    const metadataName = content.metadata?.name;
    
    // Generate a source ID for instance tracking if not already present
    if (!mainObject._sourceId) {
      mainObject._sourceId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`IMPORT - Generated new source ID: ${mainObject._sourceId}`);
    }
    
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
    
    // Store the original name for special handling of PMT objects
    const isPMTObject = originalMainName === 'PMT';
    
    // Set the mother volume, defaulting to "World" if undefined
    mainObject.mother_volume = motherVolume || 'World';
    
    // CRITICAL FIX: Ensure the box has all required properties
    if (mainObject.type === 'box') {
      console.log('IMPORT - Processing box object:', mainObject);
      
      // Ensure size property exists
      if (!mainObject.size) {
        console.warn('IMPORT WARNING - Box missing size property, adding default');
        mainObject.size = { x: 10, y: 10, z: 10 };
      }
      
      // Ensure position property exists
      if (!mainObject.position) {
        console.warn('IMPORT WARNING - Box missing position property, adding default');
        mainObject.position = { x: 0, y: 0, z: 0 };
      }
      
      // Ensure rotation property exists
      if (!mainObject.rotation) {
        console.warn('IMPORT WARNING - Box missing rotation property, adding default');
        mainObject.rotation = { x: 0, y: 0, z: 0 };
      }
    }
    
    // Check if the name already exists and generate a unique name if needed
    if (existingNames.includes(originalMainName)) {
      // If this is a PMT object, use 'pmt' as the type for naming, otherwise use the actual type
      const typeForNaming = isPMTObject ? 'pmt' : mainObject.type;
      mainObject.name = generateUniqueName(typeForNaming);
      nameMapping[originalMainName] = mainObject.name;
      console.log(`IMPORT - Renamed main object from ${originalMainName} to ${mainObject.name}`);
    }
    
    // DETAILED DEBUG: Log the main object after processing
    console.log('IMPORT - Main object details after processing:', mainObject);
    
    // Define objectSerial in a wider scope so it's available for descendants
    let objectSerial;
    
    // Set the displayName based on metadata name with a serial number and the component name
    if (metadataName) {
      // Extract just the base name for the object type (e.g., "PMT" from "PMT.json")
      const objectType = metadataName.split('.')[0];
      
      // Find existing objects with similar displayNames to determine the next serial number
      // Extract the serial numbers from existing displayNames with the format "PMT_X"
      const existingSerialNumbers = updatedGeometries.volumes
        .filter(vol => vol.displayName && vol.displayName.startsWith(`${objectType}_`))
        .map(vol => {
          // Updated regex to match the new format without colon
          const match = vol.displayName.match(new RegExp(`^${objectType}_(\\d+)$`));
          return match ? parseInt(match[1], 10) : -1;
        })
        .filter(num => num >= 0);
      
      // Start numbering from zero
      let serialNumber = -1;
      let newDisplayName;
      do {
        serialNumber++;
        // Format: <object>_<serial>
        newDisplayName = `${objectType}_${serialNumber}`;
      } while (existingSerialNumbers.includes(serialNumber));
      
      // Set the displayName for the main object
      mainObject.displayName = newDisplayName;
      console.log(`IMPORT - Set displayName for main object to ${newDisplayName}`);
      
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
    
    // Instance tracking functionality has been removed for a cleaner implementation
    // Object tracking and updating will be reimplemented in a simpler way
    
    console.log(`IMPORT - Added main object with name: ${addedMainName} at index: ${mainObjectIndex}`);
    console.log(`IMPORT - Registered compound object with instance tracker: sourceId=${mainObject._sourceId}, instanceId=${mainObjectId}, descendantCount=${content.descendants.length}`);
    
    // Process descendants
    if (content.descendants.length > 0) {
      // First pass: generate unique names for all descendants
      const processedDescendants = content.descendants.map(desc => {
        const processedDesc = { ...desc };
        const originalName = processedDesc.name;
        
        // Ensure each descendant has all required properties
        if (processedDesc.type === 'cylinder') {
          if (!processedDesc.radius) processedDesc.radius = 5;
          if (!processedDesc.height) processedDesc.height = 10;
          
          // Standardize inner_radius property name
          if (processedDesc.innerRadius !== undefined && processedDesc.inner_radius === undefined) {
            // Convert innerRadius to inner_radius for consistency
            processedDesc.inner_radius = processedDesc.innerRadius;
            delete processedDesc.innerRadius;
          } else if (!processedDesc.inner_radius) {
            // Set default if neither property exists
            processedDesc.inner_radius = 0;
          }
        } else if (processedDesc.type === 'box') {
          if (!processedDesc.size) {
            processedDesc.size = { x: 10, y: 10, z: 10 };
          }
        }
        
        // Ensure position and rotation
        if (!processedDesc.position) {
          processedDesc.position = { x: 0, y: 0, z: 0 };
        }
        if (!processedDesc.rotation) {
          processedDesc.rotation = { x: 0, y: 0, z: 0 };
        }
        
        // Store the original name for later use in displayName
        processedDesc._originalName = originalName;
        
        // Check if the name already exists
        if (existingNames.includes(originalName) || nameMapping[originalName]) {
          processedDesc.name = generateUniqueName(processedDesc.type);
          nameMapping[originalName] = processedDesc.name;
        }
        
        // Add this name to existingNames to avoid duplicates in subsequent descendants
        existingNames.push(processedDesc.name);
        
        return processedDesc;
      });
      
      // Create a map to track assembly types
      const assemblyTypes = {};
      processedDescendants.forEach(desc => {
        if (desc.type === 'assembly') {
          assemblyTypes[desc.name] = true;
        }
      });
      
      // Second pass: update mother_volume references, set displayName, and preserve compound IDs
      const finalDescendants = processedDescendants.map(desc => {
        const finalDesc = { ...desc };
        
        // If mother_volume is undefined, set it to the main object by default
        if (!finalDesc.mother_volume) {
          finalDesc.mother_volume = addedMainName;
          console.log(`IMPORT - Set default mother_volume for ${finalDesc.name} to ${addedMainName}`);
        }
        
        // Prevent circular references in assembly relationships
        // If this is an assembly and its mother_volume is also an assembly,
        // set its mother_volume to World to break the cycle
        if (finalDesc.type === 'assembly' && finalDesc.mother_volume !== 'World' && assemblyTypes[finalDesc.mother_volume]) {
          console.warn(`IMPORT - Breaking circular reference: Assembly ${finalDesc.name} had assembly parent ${finalDesc.mother_volume}. Setting mother to World.`);
          finalDesc.mother_volume = 'World';
        }
        
        // Set the displayName based on the metadata name with the same serial number and the component name
        if (metadataName && typeof objectSerial !== 'undefined') {
          // Extract just the base name for the object type (e.g., "PMT" from "PMT.json")
          const objectType = metadataName.split('.')[0];
          
          // Get the original name of the component from the JSON file
          // Use the _originalName we stored earlier, or fall back to the current name
          const componentName = finalDesc._originalName || finalDesc.name;
          
          // Format: <object>_<serial>
          // Use the same serial number as the main object for all descendants
          const newDisplayName = `${objectType}_${objectSerial}`;
          
          // Set the displayName for this descendant
          finalDesc.displayName = newDisplayName;
          console.log(`IMPORT - Set displayName for descendant ${finalDesc.name} to ${newDisplayName}`);
        }
        // Update mother_volume reference if it's been renamed
        else if (nameMapping[finalDesc.mother_volume]) {
          finalDesc.mother_volume = nameMapping[finalDesc.mother_volume];
        }
        
        // If the mother_volume is the original main object, update to the new name
        if (finalDesc.mother_volume === originalMainName) {
          finalDesc.mother_volume = addedMainName;
        }
        
        // Preserve the compound ID from the main object for all descendants
        if (mainObject._compoundId) {
          finalDesc._compoundId = mainObject._compoundId;
          console.log(`IMPORT - Added compound ID ${mainObject._compoundId} to descendant ${finalDesc.name}`);
        }
        
        // Also set the same instance ID for all descendants
        // This allows us to identify which specific instance this component belongs to
        if (mainObject._instanceId) {
          finalDesc._instanceId = mainObject._instanceId;
          console.log(`IMPORT - Added instance ID ${mainObject._instanceId} to descendant ${finalDesc.name}`);
        }
        
        return finalDesc;
      });
      
      // Add all descendants to the volumes array
      finalDescendants.forEach((desc, index) => {
        console.log(`IMPORT - Adding descendant ${index + 1}/${finalDescendants.length}:`, desc);
        
        // Add the descendant to the volumes array
        // Ensure we preserve all metadata including _compoundId
        updatedGeometries.volumes.push(desc);
        
        // Get the index of the descendant in the volumes array
        const descendantIndex = updatedGeometries.volumes.length - 1;
        
        // Debug: Log the added descendant to verify _compoundId is present
        console.log('IMPORT - Added descendant with _compoundId:', updatedGeometries.volumes[descendantIndex]);
        
        // Instance tracking functionality has been removed for a cleaner implementation
        // Descendant tracking will be reimplemented in a simpler way
        if (desc._sourceId) {
          const descendantId = `volume-${descendantIndex}`;
          console.log(`IMPORT - Added descendant with ID: ${descendantId}`);
        }
      });
      
      // CRITICAL FIX: Update the geometries state with the complete updated structure
      setGeometries(updatedGeometries);
      
      // Select the newly added main object
      setSelectedGeometry(`volume-${mainObjectIndex}`);
      
      return { 
        success: true, 
        message: `Imported ${addedMainName} with ${finalDescendants.length} descendants`,
        mainObjectName: addedMainName
      };
    } else {
      // No descendants, just update with the main object
      setGeometries(updatedGeometries);
      
      // Select the newly added main object
      setSelectedGeometry(`volume-${mainObjectIndex}`);
      
      return { 
        success: true, 
        message: `Imported ${addedMainName} successfully`,
        mainObjectName: addedMainName
      };
    }
    
    return { 
      success: true, 
      message: `Imported ${addedMainName} successfully`,
      mainObjectName: addedMainName
    };
  };
  
  // Handle removing a geometry
  const handleRemoveGeometry = (id) => {
    if (id.startsWith('volume-')) {
      const index = parseInt(id.split('-')[1]);
      const volumeToRemove = geometries.volumes[index];
      
      if (!volumeToRemove) {
        console.error(`Volume at index ${index} not found`);
        return;
      }
      
      // Create a map of volume names to their indices for easy lookup
      const volumeNameToIndex = {};
      geometries.volumes.forEach((volume, idx) => {
        if (volume.name) {
          volumeNameToIndex[volume.name] = idx;
        }
      });
      
      // Function to recursively find all descendants of a volume
      const findDescendants = (volumeName, descendantIndices = []) => {
        geometries.volumes.forEach((volume, idx) => {
          if (volume.mother_volume === volumeName) {
            descendantIndices.push(idx);
            // Recursively find descendants of this volume
            findDescendants(volume.name, descendantIndices);
          }
        });
        return descendantIndices;
      };
      
      // Find all descendants of the volume to remove
      const descendantIndices = findDescendants(volumeToRemove.name);
      
      // Sort indices in descending order to avoid shifting issues when removing
      const indicesToRemove = [index, ...descendantIndices].sort((a, b) => b - a);
      
      // Create a copy of the volumes array
      const updatedVolumes = [...geometries.volumes];
      
      // Remove the volumes in descending index order
      indicesToRemove.forEach(idx => {
        updatedVolumes.splice(idx, 1);
      });
      
      // Update the geometries state
      setGeometries({
        ...geometries,
        volumes: updatedVolumes
      });
      
      // Clear the selection
      setSelectedGeometry(null);
      
      // Log the operation for debugging
      console.log(`Removed volume ${volumeToRemove.name} and ${descendantIndices.length} descendants`);
    }
  };
  
  // Handle updating materials
  const handleUpdateMaterials = (updatedMaterials) => {
    setMaterials(updatedMaterials);
  };
  
  // Handle importing geometries from a JSON file
  const handleImportGeometries = (importedGeometries) => {
    // Validate the imported geometries structure
    if (!importedGeometries.world || !Array.isArray(importedGeometries.volumes)) {
      console.error('Invalid geometry format');
      return;
    }
    
    // Set the geometries state with the imported data
    setGeometries(importedGeometries);
    
    // Reset the selection
    setSelectedGeometry(null);
  };
  
  // Handle importing a partial geometry (a specific object and its descendants)
  const handleImportPartialGeometry = (partialGeometry) => {
    // Validate the imported partial geometry structure
    if (!partialGeometry.object || !Array.isArray(partialGeometry.descendants)) {
      console.error('Invalid partial geometry format');
      return;
    }
    
    // Create a copy of the current geometries
    const updatedGeometries = { ...geometries };
    
    // If the imported object is a world object, replace the current world
    if (partialGeometry.object.name === 'World' || partialGeometry.isWorld) {
      updatedGeometries.world = partialGeometry.object;
    } else {
      // Add the main object to volumes
      const mainObject = { ...partialGeometry.object };
      
      // Generate a unique name if needed
      if (updatedGeometries.world.name === mainObject.name || 
          updatedGeometries.volumes.some(vol => vol.name === mainObject.name)) {
        mainObject.name = generateUniqueName(mainObject.type);
      }
      
      updatedGeometries.volumes = [...updatedGeometries.volumes, mainObject];
    }
    
    // Add all descendants, updating their mother_volume references if needed
    if (partialGeometry.descendants.length > 0) {
      const originalMainName = partialGeometry.object.name;
      const newMainName = updatedGeometries.volumes[updatedGeometries.volumes.length - 1].name;
      
      // Process each descendant
      partialGeometry.descendants.forEach(descendant => {
        const updatedDescendant = { ...descendant };
        
        // Update mother_volume reference if it was pointing to the main object
        if (updatedDescendant.mother_volume === originalMainName) {
          updatedDescendant.mother_volume = newMainName;
        }
        
        // Generate a unique name if needed
        if (updatedGeometries.world.name === updatedDescendant.name || 
            updatedGeometries.volumes.some(vol => vol.name === updatedDescendant.name)) {
          updatedDescendant.name = generateUniqueName(updatedDescendant.type);
        }
        
        updatedGeometries.volumes = [...updatedGeometries.volumes, updatedDescendant];
      });
    }
    
    // Update the geometries state
    setGeometries(updatedGeometries);
  };
  
  // Handle importing materials from a JSON file
  const handleImportMaterials = (importedMaterials) => {
    // Validate the imported materials structure
    if (typeof importedMaterials !== 'object') {
      console.error('Invalid materials format');
      return;
    }
    
    // Set the materials state with the imported data
    setMaterials(importedMaterials);
  };
  
  // Extract an object and all its descendants
  const extractObjectWithDescendants = (objectId) => {
    let mainObject;
    let isWorld = false;
    
    // Get the main object
    if (objectId === 'world') {
      mainObject = { ...geometries.world };
      isWorld = true;
    } else if (objectId.startsWith('volume-')) {
      const index = parseInt(objectId.split('-')[1]);
      mainObject = { ...geometries.volumes[index] };
    } else {
      return null; // Invalid ID
    }
    
    // Find all descendants recursively
    const findDescendants = (parentName, allVolumes) => {
      return allVolumes.filter(volume => volume.mother_volume === parentName);
    };
    
    // Start with direct children
    let descendants = findDescendants(mainObject.name, geometries.volumes);
    let allDescendants = [...descendants];
    
    // Find descendants of descendants (recursive)
    for (let i = 0; i < descendants.length; i++) {
      const childDescendants = findDescendants(descendants[i].name, geometries.volumes);
      if (childDescendants.length > 0) {
        allDescendants = [...allDescendants, ...childDescendants];
        descendants = [...descendants, ...childDescendants];
      }
    }
    
    // Generate a source ID if one doesn't exist
    if (!mainObject._sourceId) {
      mainObject._sourceId = `source-${mainObject.name}-${Date.now()}`;
      console.log(`Generated new source ID for ${mainObject.name}: ${mainObject._sourceId}`);
    }
    
    // Check if the object already has a compound ID (from a previous save)
    // If it does, preserve it to maintain the relationship between all instances
    // If not, generate a new one
    let compoundId = mainObject._compoundId;
    if (!compoundId) {
      // Generate a stable compound ID based on the object name (without timestamp)
      // This ensures the ID remains consistent when overwriting
      compoundId = `compound-${mainObject.name}-${mainObject.type}`;
      console.log(`Generated new _compoundId ${compoundId} for ${mainObject.name}`);
    } else {
      console.log(`Preserving existing _compoundId ${compoundId} for ${mainObject.name}`);
    }
    
    // Ensure the mother_volume property is included for the main object if it exists
    // This fixes the issue where the top-level object of a compound object doesn't have its mother_volume in the exported JSON
    // We need to make sure the mother_volume is explicitly preserved
    const exportedMainObject = { ...mainObject, _compoundId: compoundId };
    console.log(`Using _compoundId ${compoundId} for main object ${exportedMainObject.name}`);
    
    // For volumes (not the world), ensure the mother_volume is explicitly set in the exported object
    if (!isWorld && objectId.startsWith('volume-')) {
      const index = parseInt(objectId.split('-')[1]);
      const originalVolume = geometries.volumes[index];
      if (originalVolume.mother_volume) {
        exportedMainObject.mother_volume = originalVolume.mother_volume;
        console.log(`Preserved mother_volume '${originalVolume.mother_volume}' for object '${exportedMainObject.name}'`);
      }
      
      // Explicitly preserve hit collection information
      if (originalVolume.isActive) {
        exportedMainObject.isActive = originalVolume.isActive;
        console.log(`Preserved isActive status for object '${exportedMainObject.name}'`);
      }
      
      if (originalVolume.hitsCollectionName) {
        exportedMainObject.hitsCollectionName = originalVolume.hitsCollectionName;
        console.log(`Preserved hitsCollectionName '${originalVolume.hitsCollectionName}' for object '${exportedMainObject.name}'`);
      }
    }
    
    // Process descendants to ensure hit collection information is preserved
    // and add the compound ID to all descendants
    const processedDescendants = allDescendants.map(descendant => {
      // Create a deep copy to avoid modifying the original
      const processedDescendant = { ...descendant, _compoundId: compoundId };
      console.log(`Added _compoundId ${compoundId} to descendant ${descendant.name}`);
      
      // Ensure hit collection properties are explicitly preserved
      if (descendant.isActive !== undefined) {
        processedDescendant.isActive = descendant.isActive;
      }
      
      if (descendant.hitsCollectionName) {
        processedDescendant.hitsCollectionName = descendant.hitsCollectionName;
      }
      
      return processedDescendant;
    });
    
    // Return the main object and all its descendants
    return {
      object: exportedMainObject,
      descendants: processedDescendants,
      isWorld,
      _sourceId: mainObject._sourceId, // Include the source ID at the top level for easy access
      _compoundId: compoundId // Include the compound ID at the top level as well
    };
  };
  
  // Pre-process geometries before export to ensure all volumes have mother_volume property
  // and convert position/rotation to placement format
  const prepareGeometriesForExport = () => {
    // Create a deep copy of the geometries to avoid modifying the state directly
    const exportGeometries = JSON.parse(JSON.stringify(geometries));
    
    // Ensure all volumes have their mother_volume property
    exportGeometries.volumes = exportGeometries.volumes.map(volume => {
      // If mother_volume is missing and it's a top-level volume, set it to "World"
      if (!volume.mother_volume) {
        console.log(`Adding missing mother_volume "World" to volume: ${volume.name}`);
        return { ...volume, mother_volume: "World" };
      }
      return volume;
    });
    
    return exportGeometries;
  };
  
  // Handle loading a project (geometries and materials and hitCollections)
  const handleLoadProject = (loadedGeometries, loadedMaterials, loadedHitCollections) => {
    // Set the geometries and materials state with the loaded data
    setGeometries(loadedGeometries);
    setMaterials(loadedMaterials);
    
    // Set hit collections if they exist in the loaded project
    if (loadedHitCollections && Array.isArray(loadedHitCollections)) {
      setHitCollections(loadedHitCollections);
    }
    
    // Reset the selection
    setSelectedGeometry(null);
  };

return (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ mr: 2 }}>
            Geant4 Geometry Editor
          </Typography>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ 
              flexGrow: 1,
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 'normal',
              },
              '& .Mui-selected': {
                color: '#ffffff',
                fontWeight: 'bold',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px 4px 0 0',
              },
              '& .MuiTabs-indicator': {
                height: 3,
                backgroundColor: '#ffffff',
              }
            }}
            centered
          >
            <Tab label="3D View" />
            <Tab label="Materials" />
            <Tab label="JSON" />
          </Tabs>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <ProjectManager 
              geometries={geometries} 
              materials={materials}
              hitCollections={hitCollections}
              onLoadProject={handleLoadProject}
              handleImportPartialFromAddNew={handleImportPartialFromAddNew}
              compactMode={true}
            />
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Geometry Tab */}
        {tabValue === 0 && (
          <Box sx={{ display: 'flex', height: '100%' }}>
            <Box sx={{ width: '70%', height: '100%' }}>
              <Viewer3D 
                  geometries={geometries}
                  selectedGeometry={selectedGeometry}
                  onSelect={setSelectedGeometry}
                  onUpdateGeometry={handleUpdateGeometry}
                />
              </Box>
              <Box sx={{ width: '30%', height: '100%', overflow: 'auto' }}>
                <GeometryEditor 
                  geometries={geometries}
                  materials={materials}
                  selectedGeometry={selectedGeometry}
                  hitCollections={hitCollections}
                  onUpdateHitCollections={setHitCollections}
                  onUpdateGeometry={handleUpdateGeometry}
                  onAddGeometry={handleAddGeometry}
                  onRemoveGeometry={handleRemoveGeometry}
                  extractObjectWithDescendants={extractObjectWithDescendants}
                  handleImportPartialFromAddNew={handleImportPartialFromAddNew}
                />
              </Box>
            </Box>
          )}
          
          {/* Materials Tab */}
          {tabValue === 1 && (
            <Container maxWidth="lg" sx={{ height: '100%', py: 2 }}>
              <MaterialsEditor 
                materials={materials}
                onUpdateMaterials={handleUpdateMaterials}
              />
            </Container>
          )}
          {/* JSON Tab */}
          {tabValue === 2 && (
            <Container maxWidth="lg" sx={{ height: '100%', py: 2 }}>
              <JsonViewer 
                geometries={prepareGeometriesForExport()} 
                materials={materials} 
                onImportGeometries={handleImportGeometries}
                onImportMaterials={handleImportMaterials}
                onImportPartialGeometry={handleImportPartialGeometry}
              />
            </Container>
          )}
        </Box>
      </Box>
      
      {/* Instance tracking components have been removed for a cleaner implementation */}
    </ThemeProvider>
  );
  
  // Instance update functionality has been removed for a cleaner implementation
}

export default App;





