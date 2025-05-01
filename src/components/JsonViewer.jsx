import React, { useState, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
  Tabs,
  Tab
} from '@mui/material';

const JsonViewer = ({ geometries, materials }) => {
  const [tabValue, setTabValue] = useState(0);
  
  // Format the JSON with proper indentation for display
  const formatJson = (data) => {
    return JSON.stringify(data, null, 2);
  };
  
  // Generate the geometry JSON
  const geometryJson = formatJson(geometries);
  
  // Generate the materials JSON
  const materialsJson = formatJson({ materials });
  
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
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs 
        value={tabValue} 
        onChange={(e, newValue) => setTabValue(newValue)}
        variant="fullWidth"
      >
        <Tab label="Geometry JSON" />
        <Tab label="Materials JSON" />
      </Tabs>
      
      <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
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
  );
};

export default JsonViewer;
