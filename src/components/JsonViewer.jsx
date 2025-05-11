import React, { useState, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
  Tabs,
  Tab,
  Alert,
  Snackbar
} from '@mui/material';

const JsonViewer = ({ geometries, materials, onImportGeometries, onImportMaterials, onImportPartialGeometry }) => {
  const [tabValue, setTabValue] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [importMode, setImportMode] = useState('full'); // 'full' or 'partial'
  const fileInputRef = useRef(null);
  
  // Format the JSON with proper indentation for display
  const formatJson = (data) => {
    return JSON.stringify(data, null, 2);
  };
  
  // Generate the geometry JSON with hits collections
  const generateGeometryJson = () => {
    // Start with the existing format
    const jsonData = {
      world: geometries.world,
      volumes: geometries.volumes || []
    };
    
    // Find all active volumes and their hits collections
    const activeVolumes = (geometries.volumes || []).filter(vol => vol.isActive);
    
    if (activeVolumes.length > 0) {
      // Get unique hits collection names
      const collectionNames = new Set();
      activeVolumes.forEach(vol => {
        if (vol.hitsCollectionName) {
          collectionNames.add(vol.hitsCollectionName);
        }
      });
      
      // Create hits collections entries
      if (collectionNames.size > 0) {
        jsonData.hitsCollections = Array.from(collectionNames).map(name => {
          const associatedVolumes = activeVolumes
            .filter(vol => vol.hitsCollectionName === name)
            .map(vol => vol.name);
            
          return {
            name,
            description: name === "MyHitsCollection" ? "Default hits collection for energy deposits" : "",
            associatedVolumes
          };
        });
      }
    }
    
    return formatJson(jsonData);
  };
  
  const geometryJson = generateGeometryJson();
  
  // Generate the materials JSON
  const materialsJson = formatJson({ materials });
  
  // Handle file import
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target.result);
        
        // Determine if it's a geometry or materials file
        if (tabValue === 0) {
          if (importMode === 'full') {
            // Validate full geometry format
            if (content.world && Array.isArray(content.volumes)) {
              onImportGeometries(content);
              setAlert({ 
                open: true, 
                message: 'Geometry imported successfully!', 
                severity: 'success' 
              });
            } else {
              // Check if it's a partial geometry format
              if (content.object && Array.isArray(content.descendants)) {
                setAlert({ 
                  open: true, 
                  message: 'This appears to be a partial geometry file. Please use the "Import Partial Geometry" option.', 
                  severity: 'warning' 
                });
              } else {
                setAlert({ 
                  open: true, 
                  message: 'Invalid geometry format. File must contain "world" object and "volumes" array.', 
                  severity: 'error' 
                });
              }
            }
          } else if (importMode === 'partial') {
            // Validate partial geometry format
            if (content.object && Array.isArray(content.descendants)) {
              onImportPartialGeometry(content);
              setAlert({ 
                open: true, 
                message: `Object "${content.object.name}" and ${content.descendants.length} descendants imported successfully!`, 
                severity: 'success' 
              });
            } else {
              // Check if it's a full geometry format
              if (content.world && Array.isArray(content.volumes)) {
                setAlert({ 
                  open: true, 
                  message: 'This appears to be a full geometry file. Please use the "Import Full Geometry" option.', 
                  severity: 'warning' 
                });
              } else {
                setAlert({ 
                  open: true, 
                  message: 'Invalid partial geometry format. File must contain "object" and "descendants" array.', 
                  severity: 'error' 
                });
              }
            }
          }
        } else {
          // Validate materials format
          if (content.materials && typeof content.materials === 'object') {
            onImportMaterials(content.materials);
            setAlert({ 
              open: true, 
              message: 'Materials imported successfully!', 
              severity: 'success' 
            });
          } else {
            setAlert({ 
              open: true, 
              message: 'Invalid materials format. File must contain a "materials" object.', 
              severity: 'error' 
            });
          }
        }
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        setAlert({ 
          open: true, 
          message: 'Error parsing JSON file. Please ensure it is valid JSON.', 
          severity: 'error' 
        });
      }
      
      // Clear the file input
      event.target.value = null;
    };
    
    reader.readAsText(file);
  };
  
  // Handle alert close
  const handleAlertClose = () => {
    setAlert({ ...alert, open: false });
  };
  
  // Handle download of JSON file
  const handleDownload = (content, filename) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Handle copy to clipboard
  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
  };

  // Reference to the JSON container for scrolling
  const jsonContainerRef = useRef(null);
  
  // Scroll to top function
  const scrollToTop = () => {
    if (jsonContainerRef.current) {
      jsonContainerRef.current.scrollTop = 0;
    }
  };

  return (
    <>
      {/* Main component JSX */}
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="fullWidth"
        >
          <Tab label="Geometry JSON" />
          <Tab label="Materials JSON" />
        </Tabs>
        
        <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            onClick={() => handleDownload(
              tabValue === 0 ? geometryJson : materialsJson,
              tabValue === 0 ? 'geometry.json' : 'materials.json'
            )}
            size="small"
          >
            Download JSON
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => handleCopy(tabValue === 0 ? geometryJson : materialsJson)}
            size="small"
          >
            Copy to Clipboard
          </Button>
          
          {tabValue === 0 && (
            <>
              <Button
                variant="contained"
                color={importMode === 'full' ? 'secondary' : 'inherit'}
                size="small"
                onClick={() => {
                  setImportMode('full');
                  fileInputRef.current?.click();
                }}
              >
                Import Full Geometry
              </Button>
              <Button
                variant="contained"
                color={importMode === 'partial' ? 'secondary' : 'inherit'}
                size="small"
                onClick={() => {
                  setImportMode('partial');
                  fileInputRef.current?.click();
                }}
              >
                Import Partial Geometry
              </Button>
            </>
          )}
          
          {tabValue === 1 && (
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={() => fileInputRef.current?.click()}
            >
              Import Materials
            </Button>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleFileImport}
          />
          <Button 
            onClick={scrollToTop} 
            size="small" 
            variant="outlined"
            sx={{ marginLeft: 'auto' }} 
          >
            Top
          </Button>
        </Box>
        
        <Box 
          ref={jsonContainerRef}
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: 2,
            backgroundColor: '#f5f5f5',
            borderRadius: 1,
            mx: 2,
            mb: 2,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#bdbdbd',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
            },
          }}
        >
          {tabValue === 0 ? geometryJson : materialsJson}
        </Box>
      </Paper>
      
      {/* Alert for import status */}
      <Snackbar 
        open={alert.open} 
        autoHideDuration={6000} 
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleAlertClose} 
          severity={alert.severity} 
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default JsonViewer;
