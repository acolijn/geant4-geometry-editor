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
import { createPlacementObject, createDimensionsObject } from '../utils/ObjectFormatStandardizer';
import { convertToMultiplePlacements } from '../utils/MultiPlacementConverter';

const JsonViewer = ({ geometries, materials }) => {
  const [tabValue, setTabValue] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  
  // Format the JSON with proper indentation for display
  const formatJson = (data) => {
    return JSON.stringify(data, null, 2);
  };
  
  // Ensure polycone and polyhedra z-planes are sorted
  const ensureOrderedZPlanes = (volume) => {
    if (volume.type === 'polycone' || volume.type === 'polyhedra') {
      if (volume.dimensions && 
          Array.isArray(volume.dimensions.z) && 
          Array.isArray(volume.dimensions.rmax)) {
        
        // Create an array of indices
        const indices = Array.from({ length: volume.dimensions.z.length }, (_, i) => i);
        
        // Sort indices based on z values
        indices.sort((a, b) => volume.dimensions.z[a] - volume.dimensions.z[b]);
        
        // Check if already sorted
        const isSorted = indices.every((val, idx) => val === idx);
        if (!isSorted) {
          // Create new sorted arrays
          const sortedZ = indices.map(i => volume.dimensions.z[i]);
          const sortedRmax = indices.map(i => volume.dimensions.rmax[i]);
          
          // Handle rmin if it exists
          let sortedRmin = [];
          if (Array.isArray(volume.dimensions.rmin)) {
            sortedRmin = indices.map(i => volume.dimensions.rmin[i]);
            volume.dimensions.rmin = sortedRmin;
          }
          
          // Update the volume with sorted arrays
          volume.dimensions.z = sortedZ;
          volume.dimensions.rmax = sortedRmax;
          
          console.log(`Sorted z-planes for ${volume.name} (${volume.type})`);
        }
      }
    }
    return volume;
  };
  
  // Generate the materials JSON
  const materialsJson = formatJson({ materials });
  
  // Generate the multiple placements JSON - this is the only JSON format we use now
  const multiplePlacementsJson = formatJson(convertToMultiplePlacements({
    world: geometries.world,
    volumes: (geometries.volumes || []).map(vol => ensureOrderedZPlanes({...vol}))
  }));
  
  // Alert handling functions
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
              tabValue === 0 ? multiplePlacementsJson : materialsJson,
              tabValue === 0 ? 'geometry_multiple_placements.json' : 'materials.json'
            )}
            size="small"
          >
            Download JSON
          </Button>

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
          {tabValue === 0 ? multiplePlacementsJson : materialsJson}
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
