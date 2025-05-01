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
  
  // Try to load saved geometries and materials from localStorage on initial load
  useEffect(() => {
    try {
      const savedGeometries = localStorage.getItem('geant4-geometries');
      if (savedGeometries) {
        setGeometries(JSON.parse(savedGeometries));
      }
      
      const savedMaterials = localStorage.getItem('geant4-materials');
      if (savedMaterials) {
        setMaterials(JSON.parse(savedMaterials));
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);
  
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
    
    setGeometries({
      ...geometries,
      volumes: [...geometries.volumes, newGeometry]
    });
    
    // Select the newly added geometry
    setSelectedGeometry(`volume-${geometries.volumes.length}`);
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Geant4 Geometry Editor
            </Typography>
          </Toolbar>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            centered
          >
            <Tab label="Geometry" />
            <Tab label="Materials" />
            <Tab label="JSON" />
          </Tabs>
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
              />
            </Container>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;





