import React, { useState, useMemo, useRef } from 'react';
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
import {
  formatJson,
  ensureOrderedZPlanes,
  generateMaterialsJson,
  generateGeometryJson,
  handleDownload,
  handleFileUpload,
  importJsonGeometry
} from './utils/jsonHandlers';

const JsonViewer = ({ geometries, materials, onImportGeometries, onImportMaterials }) => {
  const [tabValue, setTabValue] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  

  
  const combinedJson = generateGeometryJson(geometries, materials);
  // Handle importing geometry from JSON file
  const handleImportGeometry = async (event) => {
    console.log('handleImportGeometry:: Import button clicked');
    const file = event.target.files[0];
    if (!file) {
      console.log('handleImportGeometry:: No file selected');
      return;
    }
        
    try {
      // Parse the JSON file
      const jsonData = await handleFileUpload(file);
      
      // Convert the JSON to geometry format
      const currentGeometry = {
        geometries: geometries,
        materials: materials
      };
      console.log('handleImportGeometry:: Current geometry:', currentGeometry);
      
      const updatedGeometry = importJsonGeometry(jsonData, currentGeometry);
      console.log('handleImportGeometry:: Updated geometry:', updatedGeometry);
  
      onImportGeometries(updatedGeometry.geometries);
      onImportMaterials(updatedGeometry.materials);
      
      setAlert({
        open: true,
        message: 'Geometry imported successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('handleImportGeometry:: Error importing geometry:', error);
      setAlert({
        open: true,
        message: `Error importing geometry: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  // Alert handling functions
  const handleAlertClose = () => {
    setAlert({ ...alert, open: false });
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
        <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
          Geometry JSON (with Materials)
        </Typography>
        
        <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            onClick={() => handleDownload(combinedJson, 'geometry.json')}
            size="small"
          >
            Download JSON
          </Button>
          
          <Button
            variant="contained"
            component="label"
            size="small"
            color="secondary"
            onClick={() => console.log('Import button clicked directly')}
          >
            Import JSON
            <input
              type="file"
              accept=".json"
              hidden
              onClick={(e) => console.log('Input element clicked')}
              onChange={(e) => {
                console.log('onChange event fired');
                handleImportGeometry(e);
              }}
            />
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
          {combinedJson}
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
