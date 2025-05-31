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
// Import utility functions from GeometryOperations.js
import { updateGeometry, addGeometry, removeGeometry, generateId, generateUniqueName } from './components/geometry-editor/utils/GeometryOperations';
import Viewer3D from './components/viewer3D/Viewer3D';
//import GeometryEditor from './components/GeometryEditor';
import GeometryEditor from './components/geometry-editor/GeometryEditor';
import MaterialsEditor from './components/MaterialsEditor';
import JsonViewer from './components/JsonViewer';
import ProjectManager from './components/ProjectManager';
import { defaultGeometry, defaultMaterials } from './utils/defaults';
import { standardizeProjectData, restoreProjectData } from './utils/ObjectFormatStandardizer';
import { propagateCompoundIdToDescendants } from './components/geometry-editor/utils/compoundIdPropagator';
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
  // State for update dialog
  const [updateDialogData, setUpdateDialogData] = useState(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  // Reference to the updateAssemblies function from Viewer3D
  const [updateAssembliesFunc, setUpdateAssembliesFunc] = useState(null);
  
  // Handle updating a geometry using the imported utility function
  const handleUpdateGeometry = (id, updatedObject, keepSelected = true, isLiveUpdate = false, extraData = null) => {
    updateGeometry(
      geometries,
      id,
      updatedObject,
      keepSelected,
      isLiveUpdate,
      extraData,
      setGeometries,
      setSelectedGeometry,
      selectedGeometry,
      updateAssembliesFunc,
      propagateCompoundIdToDescendants
    );
  };
  
  // Using imported generateId and generateUniqueName functions from GeometryOperations.js
  
  // Handle adding a new geometry using the imported utility function
  const handleAddGeometry = (newGeometry) => {
    return addGeometry(
      newGeometry,
      geometries,
      setGeometries,
      setSelectedGeometry,
      propagateCompoundIdToDescendants
    );
  };
  
  // Handle removing a geometry using the imported utility function
  const handleRemoveGeometry = (id) => {
    removeGeometry(
      id,
      geometries,
      setGeometries,
      setSelectedGeometry,
      selectedGeometry
    );
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
    // Preserve the original name as the Geant4 name (displayName)
    // This ensures we keep the user-friendly name from the imported file
    const originalDisplayName = mainObject.displayName || mainObject.name;
    const originalMainName = mainObject.name;
    
    // Get the metadata name if available (for setting the displayName)
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
      // Generate a unique internal name for the main object
      const typeForNaming = mainObject.type || 'compound';
      mainObject.name = generateUniqueName(typeForNaming);
      
      // Set the displayName to preserve the Geant4 name
      // If importing into a specific object type, use that in the displayName
      if (metadataName) {
        // Extract just the base name for the object type (e.g., "PMT" from "PMT.json")
        const objectType = metadataName.split('.')[0];
        
        // Find existing objects with similar displayNames to determine the next serial number
        const existingCount = updatedGeometries.volumes.filter(vol => 
          vol.displayName && vol.displayName.startsWith(`${objectType}_`)
        ).length;
        
        // Format: ObjectType_Number (e.g., PMT_1)
        mainObject.displayName = `${objectType}_${existingCount + 1}`;
      } else {
        // If no metadata name, preserve the original displayName
        mainObject.displayName = originalDisplayName;
      }
      
      // Add to the name mapping
      nameMapping[originalMainName] = mainObject.name;
      console.log(`IMPORT - Renamed main object from ${originalMainName} to ${mainObject.name}, displayName: ${mainObject.displayName}`);
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
        
        // Store the original name for later use in displayName
        processedDesc._originalName = originalName;
        
        // Always generate a unique internal name for references
        // This ensures we don't need string parsing for references
        processedDesc.name = generateUniqueName(processedDesc.type);
        nameMapping[originalName] = processedDesc.name;
        
        // Preserve the original name as displayName (Geant4 name)
        // This ensures components keep their original Geant4 names
        if (!processedDesc.displayName) {
          processedDesc.displayName = originalName;
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
        
        // Update mother_volume reference if it's been renamed
        // This ensures components maintain proper parent-child relationships
        // while preserving their original displayNames from the template
        if (nameMapping[finalDesc.mother_volume]) {
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
        
        // First, mark direct children of the assembly
        if (mainObject.type === 'assembly' && finalDesc.mother_volume === addedMainName) {
          finalDesc.parent = 'assembly';
          
          // If component already has a _componentId, preserve it
          if (!finalDesc._componentId) {
            // Generate a new unique _componentId
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 10);
            finalDesc._componentId = `component_${timestamp}_${randomSuffix}`;
            console.log(`IMPORT - Generated new _componentId ${finalDesc._componentId} for direct child ${finalDesc.name}`);
          }
        }
        
        // Ensure all components have a hitsCollectionName property (default to null)
        if (finalDesc.hitsCollectionName === undefined) {
          finalDesc.hitsCollectionName = null;
          console.log(`IMPORT - Added default hitsCollectionName: null to component ${finalDesc.name}`);
        }
        
        return finalDesc;
      });
      
      // Third pass: recursively mark all components in the assembly hierarchy
      // This ensures that even deeply nested components get a componentId
      let madeChanges = true;
      let iterationCount = 0;
      const maxIterations = 10; // Prevent infinite loops
      
      while (madeChanges && iterationCount < maxIterations) {
        madeChanges = false;
        iterationCount++;
        
        console.log(`IMPORT - Recursive component ID pass ${iterationCount}`);
        
        for (let i = 0; i < finalDescendants.length; i++) {
          const desc = finalDescendants[i];
          
          // Skip components that already have parent and componentId set
          if (desc.parent === 'assembly' && desc._componentId) {
            continue;
          }
          
          // Check if this component's mother is part of the assembly
          const motherName = desc.mother_volume;
          if (motherName) {
            const motherComponent = finalDescendants.find(d => d.name === motherName);
            if (motherComponent && (motherComponent.parent === 'assembly' || motherComponent._componentId)) {
              // This component's mother is part of the assembly, so this component is too
              desc.parent = 'assembly';
              
              if (!desc._componentId) {
                // Generate a new unique _componentId
                const timestamp = Date.now();
                const randomSuffix = Math.random().toString(36).substring(2, 10);
                desc._componentId = `component_${timestamp}_${randomSuffix}`;
                console.log(`IMPORT - Generated new _componentId ${desc._componentId} for nested component ${desc.name}`);
              }
              
              madeChanges = true;
            }
          }
        }
      }
      
      console.log(`IMPORT - Completed recursive component ID assignment in ${iterationCount} iterations`);
      
      // Final check to ensure all components have IDs
      for (const desc of finalDescendants) {
        if (desc.parent === 'assembly' && !desc._componentId) {
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 10);
          desc._componentId = `component_${timestamp}_${randomSuffix}`;
          console.log(`IMPORT - Final pass: Generated _componentId ${desc._componentId} for component ${desc.name}`);
        }
      }
      
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
    
    // Removed _sourceId generation as it's not used for anything useful
    
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
      const processedDescendant = { ...descendant };
      
      // Add compound ID to maintain assembly relationship
      processedDescendant._compoundId = compoundId;
      console.log(`Added _compoundId ${compoundId} to descendant ${descendant.name}`);
      
      // Ensure each component has a _componentId
      if (descendant._componentId) {
        // Preserve existing component ID if it already exists
        processedDescendant._componentId = descendant._componentId;
        console.log(`Preserved _componentId ${descendant._componentId} for component ${descendant.name}`);
      } else if (processedDescendant.parent === 'assembly' || 
                 (mainObject.type === 'assembly' && mainObject.name === processedDescendant.mother_volume)) {
        // Generate a new component ID for assembly components that don't have one
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        processedDescendant._componentId = `component_${timestamp}_${randomSuffix}`;
        console.log(`Generated new _componentId ${processedDescendant._componentId} for component ${descendant.name}`);
      }
      
      // Ensure hit collection properties are explicitly preserved
      if (descendant.isActive !== undefined) {
        processedDescendant.isActive = descendant.isActive;
      }
      
      if (descendant.hitsCollectionName) {
        processedDescendant.hitsCollectionName = descendant.hitsCollectionName;
      }
      
      // Remove _instanceId as it should not be in the exported file
      if (processedDescendant._instanceId) {
        delete processedDescendant._instanceId;
      }
      
      return processedDescendant;
    });
    
    // Remove _instanceId from the main object if it exists
    if (exportedMainObject._instanceId) {
      delete exportedMainObject._instanceId;
    }
    
    // Return the main object and all its descendants
    return {
      object: exportedMainObject,
      descendants: processedDescendants,
      isWorld,
      _compoundId: compoundId // Include the compound ID at the top level
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
                  onOpenUpdateDialog={(data) => {
                    console.log('App: onOpenUpdateDialog called with data:', data);
                    // Set the update dialog data and open state
                    setUpdateDialogData(data);
                    setUpdateDialogOpen(true);
                    console.log('App: Set updateDialogData and updateDialogOpen');
                  }}
                  onRegisterUpdateFunction={(updateFunc) => {
                    console.log('App: Registering updateAssemblies function');
                    setUpdateAssembliesFunc(updateFunc);
                  }}
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
                  externalUpdateDialogData={updateDialogData}
                  updateDialogOpen={updateDialogOpen}
                  setUpdateDialogOpen={setUpdateDialogOpen}
                  updateAssembliesFunc={updateAssembliesFunc}
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





