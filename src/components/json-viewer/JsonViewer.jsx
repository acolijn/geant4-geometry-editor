import { useState, useRef, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
  Alert,
  Snackbar
} from '@mui/material';
import {
  handleDownload,
  handleFileUpload
} from './utils/jsonHandlers';
import { JsonTree } from './components/JsonTreeNode';
import { debugLog } from '../../utils/logger';
import { useAppContext } from '../../contexts/useAppContext';

/**
 * JSON viewer for exporting and importing combined geometry/material state.
 * Displays the primary JSON data directly (no reconstruction from flat state).
 * State is consumed from AppStateContext.
 */
const JsonViewer = () => {
  const {
    jsonData,
    materials,
    handleImportGeometries: onImportGeometries,
    handleImportMaterials: onImportMaterials,
  } = useAppContext();
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  // Tree expansion depth: bump this key to force a full re-mount with new depth
  const [expandDepth, setExpandDepth] = useState(1);
  const [treeKey, setTreeKey] = useState(0);
  

  // Build the display JSON from the primary jsonData state
  const parsedData = useMemo(() => {
    if (!jsonData) return null;
    const combined = structuredClone(jsonData);
    if (materials && Object.keys(materials).length > 0) {
      combined.materials = materials;
    }
    return combined;
  }, [jsonData, materials]);
  const combinedJson = useMemo(() => {
    return parsedData ? JSON.stringify(parsedData, null, 2) : '{}';
  }, [parsedData]);
  // Handle importing geometry from JSON file
  const handleImportGeometry = async (event) => {
    debugLog('handleImportGeometry:: Import button clicked');
    const file = event.target.files[0];
    if (!file) {
      debugLog('handleImportGeometry:: No file selected');
      return;
    }
        
    try {
      // Parse the JSON file
      const jsonData = await handleFileUpload(file);
      debugLog('handleImportGeometry:: Parsed JSON:', jsonData);
      
      // Pass the raw JSON directly — handleImportGeometries will
      // derive the flat view via expandToFlat
      if (jsonData.world || jsonData.volumes) {
        onImportGeometries(jsonData);
      }
      if (jsonData.materials) {
        onImportMaterials(jsonData.materials);
      }
      
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
          >
            Import JSON
            <input
              type="file"
              accept=".json"
              hidden
              onChange={handleImportGeometry}
            />
          </Button>

          <Button 
            onClick={scrollToTop} 
            size="small" 
            variant="outlined"
            sx={{ ml: 1 }} 
          >
            Top
          </Button>

          <Button
            onClick={() => { setExpandDepth(100); setTreeKey(k => k + 1); }}
            size="small"
            variant="outlined"
            sx={{ ml: 'auto' }}
          >
            Expand All
          </Button>
          <Button
            onClick={() => { setExpandDepth(0); setTreeKey(k => k + 1); }}
            size="small"
            variant="outlined"
          >
            Collapse All
          </Button>
        </Box>
        
        <Box 
          ref={jsonContainerRef}
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: 2,
            m: 0,
            backgroundColor: '#f5f5f5',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: 1,
            mx: 2,
            mb: 2,
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#bbb',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#e8e8e8',
              borderRadius: '4px',
            },
          }}
        >
          {parsedData !== null ? (
            <JsonTree key={treeKey} data={parsedData} defaultOpen={expandDepth} />
          ) : (
            <pre style={{ margin: 0 }}>{combinedJson}</pre>
          )}
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
