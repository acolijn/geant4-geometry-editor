import { useState } from 'react';
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
import { updateGeometry, addGeometry, removeGeometry } from './components/geometry-editor/utils/GeometryOperations';
import Viewer3D from './components/viewer3D/Viewer3D';
import GeometryEditor from './components/geometry-editor/GeometryEditor';
import MaterialsEditor from './components/material-editor/MaterialsEditor';
import JsonViewer from './components/json-viewer/JsonViewer';
import { ProjectManager } from './components/project-manager';
import { defaultGeometry, defaultMaterials } from './utils/defaults';
import { propagateCompoundIdToDescendants } from './components/geometry-editor/utils/compoundIdPropagator';
import { debugLog } from './utils/logger';

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
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const cloneData = (data) => {
    if (typeof structuredClone === 'function') {
      return structuredClone(data);
    }

    return JSON.parse(JSON.stringify(data));
  };
  
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
      null,
      propagateCompoundIdToDescendants
    );
  };
  
  // Handle adding a new geometry
  const handleAddGeometry = (newGeometry) => {
    return addGeometry(
      newGeometry,
      geometries,
      setGeometries,
      setSelectedGeometry,
      propagateCompoundIdToDescendants
    );
  };
  
  // Handle removing a geometry
  const handleRemoveGeometry = (id) => {
    removeGeometry(
      id,
      geometries,
      setGeometries,
      setSelectedGeometry,
      selectedGeometry
    );
  };
  
  // Handle importing geometries
  const handleImportGeometries = (importData) => {
    debugLog('handleImportGeometries:: Received data:', importData);
    
    // Validate the imported geometries structure
    if (!importData || !importData.volumes || !Array.isArray(importData.volumes)) {
      console.error('Invalid geometries format');
      return { success: false, message: 'Invalid geometries format' };
    }
    
    // Create a deep copy to prevent reference issues
    const geometriesCopy = cloneData(importData);
    debugLog('handleImportGeometries:: Setting geometries state with:', geometriesCopy);
    
    // Ensure all assemblies and unions have _compoundId assigned and propagate to descendants
    let updatedVolumes = [...geometriesCopy.volumes];
    geometriesCopy.volumes.forEach((volume, index) => {
      if ((volume.type === 'assembly' || volume.type === 'union')) {
        // Ensure the assembly/union has a _compoundId (use its name if missing)
        if (!volume._compoundId) {
          updatedVolumes[index] = { ...volume, _compoundId: volume.name };
          debugLog(`handleImportGeometries:: Assigned _compoundId ${volume.name} to imported ${volume.type}: ${volume.name}`);
        }
        // Propagate _compoundId to all descendants
        const compoundId = updatedVolumes[index]._compoundId;
        updatedVolumes = propagateCompoundIdToDescendants(volume.name, compoundId, updatedVolumes);
      }
    });
    geometriesCopy.volumes = updatedVolumes;
    
    // Set the geometries state with the imported data
    setGeometries(geometriesCopy);
    return { success: true, message: 'Geometries imported successfully' };
  };
  
  // Handle importing materials
  const handleImportMaterials = (importedMaterials) => {
    debugLog('handleImportMaterials:: Received data:', importedMaterials);
    
    // Validate the imported materials structure
    if (typeof importedMaterials !== 'object') {
      console.error('Invalid materials format');
      return { success: false, message: 'Invalid materials format' };
    }
    
    // Create a deep copy to prevent reference issues
    const materialsCopy = cloneData(importedMaterials);
    debugLog('handleImportMaterials:: Setting materials state with:', materialsCopy);
    
    // Set the materials state with the imported data
    setMaterials(materialsCopy);
    return { success: true, message: 'Materials imported successfully' };
  };
  
  // Handle updating materials
  const handleUpdateMaterials = (updatedMaterials) => {
    setMaterials(updatedMaterials);
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
                  materials={materials}
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
                  handleImportGeometries={handleImportGeometries}
                  handleImportMaterials={handleImportMaterials}
                  externalUpdateDialogData={null}
                  updateDialogOpen={updateDialogOpen}
                  setUpdateDialogOpen={setUpdateDialogOpen}
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
              />
            </Container>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;