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
import MaterialsEditor from './components/material-editor';
import JsonViewer from './components/JsonViewer';
import ProjectManager from './components/ProjectManager';
import { defaultGeometry, defaultMaterials } from './utils/defaults';
import { standardizeProjectData, restoreProjectData } from './utils/ObjectFormatStandardizer';
import { propagateCompoundIdToDescendants } from './components/geometry-editor/utils/compoundIdPropagator';
import { importPartialFromAddNew } from './components/geometry-editor/utils/GeometryImport';
import { extractObjectWithDescendants } from './components/geometry-editor/utils/GeometryUtils';
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
  
  // Handle importing a partial geometry from the Add New tab using the imported utility function
  const handleImportPartialFromAddNew = (content, motherVolume) => {
    // Log the import operation for debugging
    console.log('IMPORT - Using imported utility function for partial geometry import');
    
    // Call the imported utility function with all required parameters
    return importPartialFromAddNew(
      content,
      motherVolume,
      geometries,
      setGeometries,
      setSelectedGeometry,
      propagateCompoundIdToDescendants
    );
  };
  
  // Handle importing geometries
  const handleImportGeometries = (importData) => {
    // Validate the imported geometries structure
    if (!importData || !importData.volumes || !Array.isArray(importData.volumes)) {
      console.error('Invalid geometries format');
      return { success: false, message: 'Invalid geometries format' };
    }
    
    // Set the geometries state with the imported data
    setGeometries(importData);
    return { success: true, message: 'Geometries imported successfully' };
  };
  
  // Handle importing materials
  const handleImportMaterials = (importedMaterials) => {
    // Validate the imported materials structure
    if (typeof importedMaterials !== 'object') {
      console.error('Invalid materials format');
      return { success: false, message: 'Invalid materials format' };
    }
    
    // Set the materials state with the imported data
    setMaterials(importedMaterials);
    return { success: true, message: 'Materials imported successfully' };
  };
  
  // Handle updating materials
  const handleUpdateMaterials = (updatedMaterials) => {
    setMaterials(updatedMaterials);
  };
  
  // Extract an object and all its descendants
  // This is a wrapper around the imported extractObjectWithDescendants function from GeometryUtils.js
  // It adds additional processing specific to the App component's needs
  const processObjectWithDescendants = (objectId) => {
    // Use the imported function to get the basic object and descendants
    const result = extractObjectWithDescendants(objectId, geometries);
    
    if (!result) return null;
    
    const { object: mainObject, descendants: allDescendants, isWorld } = result;
    
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
                  extractObjectWithDescendants={processObjectWithDescendants}
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