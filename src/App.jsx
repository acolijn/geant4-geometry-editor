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
  createTheme
} from '@mui/material';
import Viewer3D from './components/Viewer3D';
import GeometryEditor from './components/GeometryEditor';
import MaterialsEditor from './components/MaterialsEditor';
import JsonViewer from './components/JsonViewer';
import ProjectManager from './components/ProjectManager';
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

// Default geometry structure
const defaultGeometry = {
  world: {
    type: 'box',
    name: 'World',
    material: 'G4_AIR',
    size: {
      x: 200.0,
      y: 200.0,
      z: 200.0,
      unit: 'cm'
    },
    position: {
      x: 0.0,
      y: 0.0,
      z: 0.0,
      unit: 'cm'
    },
    rotation: {
      x: 0.0,
      y: 0.0,
      z: 0.0,
      unit: 'deg'
    }
  },
  volumes: []
};

// Default materials from the sample file
const defaultMaterials = {
  "LXe": {
    "type": "element_based",
    "density": 3.02,
    "density_unit": "g/cm3",
    "state": "liquid",
    "temperature": 165.0,
    "temperature_unit": "kelvin",
    "composition": {
      "Xe": 1
    }
  },
  "G4_AIR": {
    "type": "nist",
    "name": "G4_AIR"
  },
  "G4_WATER": {
    "type": "nist",
    "name": "G4_WATER"
  },
  "G4_Si": {
    "type": "nist",
    "name": "G4_Si"
  },
  "G4_Cf": {
    "type": "nist",
    "name": "G4_Cf"
  },
  "G4_Al": {
    "type": "nist",
    "name": "G4_Al"
  },
  "G4_Cu": {
    "type": "nist",
    "name": "G4_Cu"
  }
};

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [geometries, setGeometries] = useState(defaultGeometry);
  const [materials, setMaterials] = useState(defaultMaterials);
  const [selectedGeometry, setSelectedGeometry] = useState(null);
  
  // We'll no longer automatically load from localStorage on initial load
  // This ensures we always start with the default empty world
  
  // Save geometries and materials to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('geant4-geometries', JSON.stringify(geometries));
      localStorage.setItem('geant4-materials', JSON.stringify(materials));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }, [geometries, materials]);
  
  // Handle updating a geometry
  const handleUpdateGeometry = (id, updatedObject, keepSelected = true) => {
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
          updatedVolumes[index] = updatedObject;
          
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
      
      // Update selection in the same render cycle if needed
      if (keepSelected) {
        setSelectedGeometry(id);
      }
    };
    
    // Execute the state update
    updateState();
  };
  
  // Generate a unique name for a new geometry object
  const generateUniqueName = (baseType) => {
    // Capitalize the first letter of the type
    const typeName = baseType.charAt(0).toUpperCase() + baseType.slice(1);
    const prefix = `New${typeName}_`;
    
    // Get all existing names
    const existingNames = [
      geometries.world.name,
      ...geometries.volumes.map(vol => vol.name)
    ];
    
    // Find the next available number
    let counter = 0;
    let newName;
    do {
      newName = `${prefix}${counter}`;
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
    
    setGeometries({
      ...geometries,
      volumes: [...geometries.volumes, newGeometry]
    });
    
    // Select the newly added geometry
    setSelectedGeometry(`volume-${geometries.volumes.length}`);
    
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
    const originalMainName = mainObject.name;
    
    // Set the mother volume
    mainObject.mother_volume = motherVolume;
    
    // CRITICAL FIX: Ensure the box has all required properties
    if (mainObject.type === 'box') {
      console.log('IMPORT - Processing box object:', mainObject);
      
      // Ensure size property exists
      if (!mainObject.size) {
        console.warn('IMPORT WARNING - Box missing size property, adding default');
        mainObject.size = { x: 10, y: 10, z: 10, unit: 'cm' };
      }
      
      // Ensure position property exists
      if (!mainObject.position) {
        console.warn('IMPORT WARNING - Box missing position property, adding default');
        mainObject.position = { x: 0, y: 0, z: 0, unit: 'cm' };
      }
      
      // Ensure rotation property exists
      if (!mainObject.rotation) {
        console.warn('IMPORT WARNING - Box missing rotation property, adding default');
        mainObject.rotation = { x: 0, y: 0, z: 0, unit: 'deg' };
      }
    }
    
    // Check if the name already exists and generate a unique name if needed
    if (existingNames.includes(originalMainName)) {
      mainObject.name = generateUniqueName(mainObject.type);
      nameMapping[originalMainName] = mainObject.name;
      console.log(`IMPORT - Renamed main object from ${originalMainName} to ${mainObject.name}`);
    }
    
    // DETAILED DEBUG: Log the main object after processing
    console.log('IMPORT - Main object details after processing:', mainObject);
    
    // CRITICAL FIX: Directly add the main object to the volumes array
    updatedGeometries.volumes.push(mainObject);
    const addedMainName = mainObject.name;
    const mainObjectIndex = updatedGeometries.volumes.length - 1;
    
    console.log(`IMPORT - Added main object with name: ${addedMainName} at index: ${mainObjectIndex}`);
    
    // Process descendants
    if (content.descendants.length > 0) {
      // First pass: generate unique names for all descendants
      const processedDescendants = content.descendants.map(desc => {
        const processedDesc = { ...desc };
        const originalName = processedDesc.name;
        
        // CRITICAL FIX: Ensure each descendant has all required properties
        if (processedDesc.type === 'cylinder') {
          if (!processedDesc.radius) processedDesc.radius = 5;
          if (!processedDesc.height) processedDesc.height = 10;
          if (!processedDesc.inner_radius && !processedDesc.innerRadius) {
            processedDesc.inner_radius = 0;
          }
        } else if (processedDesc.type === 'box') {
          if (!processedDesc.size) {
            processedDesc.size = { x: 10, y: 10, z: 10, unit: 'cm' };
          }
        }
        
        // Ensure position and rotation
        if (!processedDesc.position) {
          processedDesc.position = { x: 0, y: 0, z: 0, unit: 'cm' };
        }
        if (!processedDesc.rotation) {
          processedDesc.rotation = { x: 0, y: 0, z: 0, unit: 'deg' };
        }
        
        // Check if the name already exists
        if (existingNames.includes(originalName) || nameMapping[originalName]) {
          processedDesc.name = generateUniqueName(processedDesc.type);
          nameMapping[originalName] = processedDesc.name;
        }
        
        return processedDesc;
      });
      
      // Second pass: update mother_volume references
      const finalDescendants = processedDescendants.map(desc => {
        const finalDesc = { ...desc };
        
        // Update mother_volume reference if it's been renamed
        if (nameMapping[finalDesc.mother_volume]) {
          finalDesc.mother_volume = nameMapping[finalDesc.mother_volume];
        }
        
        // If the mother_volume is the original main object, update to the new name
        if (finalDesc.mother_volume === originalMainName) {
          finalDesc.mother_volume = addedMainName;
        }
        
        return finalDesc;
      });
      
      // Add all descendants to the volumes array
      finalDescendants.forEach((desc, index) => {
        console.log(`IMPORT - Adding descendant ${index + 1}/${finalDescendants.length}:`, desc);
        updatedGeometries.volumes.push(desc);
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
      const updatedVolumes = [...geometries.volumes];
      updatedVolumes.splice(index, 1);
      
      setGeometries({
        ...geometries,
        volumes: updatedVolumes
      });
      
      setSelectedGeometry(null);
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
  
  // Extract a specific object and all its descendants
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
    
    // Return the main object and all its descendants
    return {
      object: mainObject,
      descendants: allDescendants,
      isWorld
    };
  };
  
  // Handle loading a project (geometries and materials)
  const handleLoadProject = (loadedGeometries, loadedMaterials) => {
    // Set the geometries and materials state with the loaded data
    setGeometries(loadedGeometries);
    setMaterials(loadedMaterials);
    
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
            sx={{ flexGrow: 1 }}
            centered
          >
            <Tab label="3D View" />
            <Tab label="Materials" />
            <Tab label="JSON" />
          </Tabs>
          <ProjectManager 
            geometries={geometries} 
            materials={materials} 
            onLoadProject={handleLoadProject} 
          />
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
                geometries={geometries} 
                materials={materials} 
                onImportGeometries={handleImportGeometries}
                onImportMaterials={handleImportMaterials}
                onImportPartialGeometry={handleImportPartialGeometry}
              />
            </Container>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;





