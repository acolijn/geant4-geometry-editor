import React, { useState, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Button,
  Tabs,
  Tab,
  Divider,
  Menu,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const GeometryEditor = ({ 
  geometries, 
  materials, 
  selectedGeometry, 
  onUpdateGeometry, 
  onAddGeometry, 
  onRemoveGeometry,
  extractObjectWithDescendants,
  handleImportPartialFromAddNew
}) => {
  // Reference to the file input for importing object JSON files
  const fileInputRef = useRef(null);
  const [tabValue, setTabValue] = useState(0);
  const [newGeometryType, setNewGeometryType] = useState('box');
  const [newMotherVolume, setNewMotherVolume] = useState('World'); // Default mother volume for new geometries
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const menuOpen = Boolean(menuAnchorEl);
  const [importAlert, setImportAlert] = useState({ show: false, message: '', severity: 'info' });
  
  // Handle opening the context menu
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };
  
  // Handle closing the context menu
  const handleMenuClose = (event) => {
    if (event) event.stopPropagation();
    setMenuAnchorEl(null);
  };
  
  // Handle exporting the selected object with its descendants
  const handleExportObject = (event) => {
    if (event) event.stopPropagation();
    handleMenuClose();
    
    if (!selectedGeometry) return;
    
    // Extract the selected object and its descendants
    const exportData = extractObjectWithDescendants(selectedGeometry);
    if (!exportData) return;
    
    // Add debug information to the export data
    exportData.debug = {
      exportedAt: new Date().toISOString(),
      objectType: exportData.object.type,
      objectName: exportData.object.name,
      descendantCount: exportData.descendants.length
    };
    
    // DETAILED DEBUG: Log the main object properties
    console.log('EXPORT - Main object details:', {
      name: exportData.object.name,
      type: exportData.object.type,
      mother_volume: exportData.object.mother_volume,
      position: exportData.object.position,
      rotation: exportData.object.rotation,
      size: exportData.object.size,  // For box
      radius: exportData.object.radius, // For cylinder/sphere
      height: exportData.object.height, // For cylinder
      inner_radius: exportData.object.inner_radius, // For cylinder
      innerRadius: exportData.object.innerRadius // For cylinder (alternate property name)
    });
    
    // DETAILED DEBUG: Log each descendant
    if (exportData.descendants.length > 0) {
      exportData.descendants.forEach((desc, index) => {
        console.log(`EXPORT - Descendant ${index + 1}:`, {
          name: desc.name,
          type: desc.type,
          mother_volume: desc.mother_volume,
          position: desc.position,
          rotation: desc.rotation,
          size: desc.size,  // For box
          radius: desc.radius, // For cylinder/sphere
          height: desc.height, // For cylinder
          inner_radius: desc.inner_radius, // For cylinder
          innerRadius: desc.innerRadius // For cylinder (alternate property name)
        });
      });
    }
    
    // Create a JSON file and trigger download
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportData.object.name}_with_descendants.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show alert with export information
    setImportAlert({
      show: true,
      message: `Exported ${exportData.object.name} with ${exportData.descendants.length} descendants. Check browser console for details.`,
      severity: 'info'
    });
    
    // Create a global variable to make the export data accessible in the console
    window.lastExportedObject = exportData;
    console.log('Export data saved to window.lastExportedObject for debugging');
  };

  // Get the selected geometry object
  const getSelectedGeometryObject = () => {
    if (!selectedGeometry) return null;
    if (selectedGeometry === 'world') return geometries.world;
    if (selectedGeometry.startsWith('volume-')) {
      const index = parseInt(selectedGeometry.split('-')[1]);
      return geometries.volumes[index];
    }
    return null;
  };

  const selectedObject = getSelectedGeometryObject();

  // Handle property changes
  const handlePropertyChange = (property, value, allowNegative = true, isStringProperty = false) => {
    if (!selectedGeometry) return;
    
    const updatedObject = { ...getSelectedGeometryObject() };
    
    // Special handling for string properties like name and material
    if (isStringProperty) {
      updatedObject[property] = value;
      onUpdateGeometry(selectedGeometry, updatedObject);
      return;
    }
    
    // Process numeric values
    let processedValue = value;
    if (typeof value === 'string' && value.match(/^-?\d*\.?\d*$/)) {
      // Convert to number if it's a valid numeric string
      const numValue = parseFloat(value);
      
      // If not allowing negative values, ensure it's positive
      if (!allowNegative && numValue < 0) {
        processedValue = 0;
      } else if (!isNaN(numValue)) {
        processedValue = numValue;
      } else if (value === '-' || value === '') {
        // Allow typing a minus sign or empty string (will be converted to 0 later)
        processedValue = value;
      } else {
        processedValue = 0;
      }
    }
    
    // Handle nested properties like position.x
    if (property.includes('.')) {
      const [parent, child] = property.split('.');
      
      // For empty string or just a minus sign, keep it as is to allow typing
      if (processedValue === '' || processedValue === '-') {
        updatedObject[parent] = { 
          ...updatedObject[parent], 
          [child]: processedValue 
        };
      } else {
        updatedObject[parent] = { 
          ...updatedObject[parent], 
          [child]: parseFloat(processedValue) || 0 
        };
      }
    } else {
      // For empty string or just a minus sign, keep it as is to allow typing
      if (processedValue === '' || processedValue === '-') {
        updatedObject[property] = processedValue;
      } else if (typeof processedValue === 'number') {
        updatedObject[property] = processedValue;
      } else {
        updatedObject[property] = parseFloat(processedValue) || 0;
      }
    }
    
    onUpdateGeometry(selectedGeometry, updatedObject);
  };

  // Add a new geometry
  const handleAddGeometry = () => {
    const newGeometry = {
      type: newGeometryType,
      name: `New${newGeometryType.charAt(0).toUpperCase() + newGeometryType.slice(1)}`,
      material: 'G4_AIR',
      position: { x: 0, y: 0, z: 0, unit: 'cm' },
      rotation: { x: 0, y: 0, z: 0, unit: 'deg' },
      mother_volume: newMotherVolume // Use the selected mother volume
    };
    
    // Add specific properties based on geometry type
    if (newGeometryType === 'box') {
      newGeometry.size = { x: 10, y: 10, z: 10, unit: 'cm' };
    } else if (newGeometryType === 'cylinder') {
      newGeometry.radius = 5;
      newGeometry.height = 10;
      newGeometry.inner_radius = 0;
      newGeometry.unit = 'cm'; // Add unit information for cylinder dimensions
    } else if (newGeometryType === 'sphere') {
      newGeometry.radius = 5;
      newGeometry.unit = 'cm'; // Add unit information for sphere dimensions
    }
    
    onAddGeometry(newGeometry);
  };

  // Render the property editor for the selected geometry
  const renderPropertyEditor = () => {
    if (!selectedObject) {
      return (
        <Typography variant="body1" sx={{ p: 2 }}>
          Select a geometry to edit its properties
        </Typography>
      );
    }

    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            {selectedObject.name || 'Unnamed Geometry'}
          </Typography>
          
          <Tooltip title="Object Options">
            <IconButton
              aria-label="more"
              aria-controls="geometry-menu"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Menu
          id="geometry-menu"
          anchorEl={menuAnchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          PaperProps={{
            onClick: (e) => e.stopPropagation(),
            style: { minWidth: '200px' }
          }}
        >
          <MenuItem onClick={handleExportObject}>Export Object with Descendants</MenuItem>
        </Menu>
        
        <TextField
          label="Name"
          value={selectedObject.name || ''}
          onChange={(e) => {
            e.stopPropagation();
            handlePropertyChange('name', e.target.value, true, true);
          }}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          fullWidth
          margin="normal"
          size="small"
        />
        
        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>Material</InputLabel>
          <Select
            value={selectedObject.material || ''}
            label="Material"
            onChange={(e) => {
              e.stopPropagation();
              handlePropertyChange('material', e.target.value, true, true);
            }}
            onClick={(e) => e.stopPropagation()}
            MenuProps={{
              onClick: (e) => e.stopPropagation(),
              PaperProps: { onClick: (e) => e.stopPropagation() }
            }}
          >
            {Object.keys(materials).map((material) => (
              <MenuItem key={material} value={material}>
                {material}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Mother Volume selector - only show for non-world volumes */}
        {selectedGeometry !== 'world' && (
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Mother Volume</InputLabel>
            <Select
              value={selectedObject.mother_volume || 'World'}
              label="Mother Volume"
              onChange={(e) => {
                e.stopPropagation();
                handlePropertyChange('mother_volume', e.target.value, true, true);
              }}
              onClick={(e) => e.stopPropagation()}
              MenuProps={{
                onClick: (e) => e.stopPropagation(),
                PaperProps: { onClick: (e) => e.stopPropagation() }
              }}
            >
              <MenuItem value="World">World</MenuItem>
              {geometries.volumes && geometries.volumes.map((volume, index) => {
                // Skip the current volume to prevent self-reference and circular dependencies
                if (selectedGeometry === `volume-${index}`) return null;
                return (
                  <MenuItem key={`mother-${index}`} value={volume.name}>
                    {volume.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        )}
        
        <Typography variant="subtitle1" sx={{ mt: 2 }}>Position</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="X"
            type="number"
            value={selectedObject.position?.x || 0}
            onChange={(e) => handlePropertyChange('position.x', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Y"
            type="number"
            value={selectedObject.position?.y || 0}
            onChange={(e) => handlePropertyChange('position.y', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Z"
            type="number"
            value={selectedObject.position?.z || 0}
            onChange={(e) => handlePropertyChange('position.z', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Unit"
            value={selectedObject.position?.unit || 'cm'}
            onChange={(e) => handlePropertyChange('position.unit', e.target.value)}
            size="small"
          />
        </Box>
        
        <Typography variant="subtitle1" sx={{ mt: 2 }}>Rotation</Typography>
        <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary' }}>
          Rotations are applied sequentially in Geant4 order: first X, then Y (around new Y axis), then Z (around new Z axis).
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="X"
            type="number"
            value={selectedObject.rotation?.x || 0}
            onChange={(e) => handlePropertyChange('rotation.x', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Y"
            type="number"
            value={selectedObject.rotation?.y || 0}
            onChange={(e) => handlePropertyChange('rotation.y', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Z"
            type="number"
            value={selectedObject.rotation?.z || 0}
            onChange={(e) => handlePropertyChange('rotation.z', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Unit"
            value={selectedObject.rotation?.unit || 'deg'}
            onChange={(e) => handlePropertyChange('rotation.unit', e.target.value)}
            size="small"
          />
        </Box>
        
        {/* Render type-specific properties */}
        {selectedObject.type === 'box' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Size</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="X"
                type="number"
                value={selectedObject.size?.x || 0}
                onChange={(e) => handlePropertyChange('size.x', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Y"
                type="number"
                value={selectedObject.size?.y || 0}
                onChange={(e) => handlePropertyChange('size.y', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Z"
                type="number"
                value={selectedObject.size?.z || 0}
                onChange={(e) => handlePropertyChange('size.z', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Unit"
                value={selectedObject.size?.unit || 'cm'}
                onChange={(e) => handlePropertyChange('size.unit', e.target.value)}
                size="small"
              />
            </Box>
          </>
        )}
        
        {selectedObject.type === 'cylinder' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Radius"
                type="number"
                value={selectedObject.radius || 0}
                onChange={(e) => handlePropertyChange('radius', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Height"
                type="number"
                value={selectedObject.height || 0}
                onChange={(e) => handlePropertyChange('height', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
            </Box>
            <TextField
              label="Inner Radius"
              type="number"
              value={selectedObject.innerRadius || 0}
              onChange={(e) => handlePropertyChange('innerRadius', e.target.value, false)}
              size="small"
              sx={{ mb: 1 }}
              inputProps={{ step: 'any', min: 0 }}
            />
          </>
        )}
        
        {selectedObject.type === 'sphere' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
            <TextField
              label="Radius"
              type="number"
              value={selectedObject.radius || 0}
              onChange={(e) => handlePropertyChange('radius', e.target.value, false)}
              size="small"
              fullWidth
              inputProps={{ step: 'any', min: 0 }}
            />
          </>
        )}
        
        {selectedGeometry !== 'world' && (
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              color="error" 
              onClick={() => onRemoveGeometry(selectedGeometry)}
            >
              Remove Geometry
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  // Generate a unique name for an object, ensuring it doesn't conflict with existing objects
  const generateUniqueName = (baseName, type) => {
    // Get all existing names
    const existingNames = [
      geometries.world.name,
      ...geometries.volumes.map(vol => vol.name)
    ];
    
    // If the name doesn't exist, use it as is
    if (!existingNames.includes(baseName)) {
      return baseName;
    }
    
    // Otherwise, generate a unique name with a counter
    let counter = 1;
    let newName;
    do {
      newName = `${baseName}_${counter}`;
      counter++;
    } while (existingNames.includes(newName));
    
    return newName;
  };
  
  // Handle importing an object JSON file
  const handleImportObjectFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target.result);
        
        // Log the imported content for debugging
        console.log('Imported JSON content:', content);
        
        // Validate the object JSON format
        if (content.object && Array.isArray(content.descendants)) {
          // Use the new dedicated import function from App.jsx
          const result = handleImportPartialFromAddNew(content, newMotherVolume);
          
          if (result.success) {
            setImportAlert({
              show: true,
              message: result.message,
              severity: 'success'
            });
            
            // Auto-switch to the Properties tab to see the imported object
            setTabValue(0);
          } else {
            setImportAlert({
              show: true,
              message: result.message,
              severity: 'error'
            });
          }
        } else {
          setImportAlert({
            show: true,
            message: 'Invalid object format. The file must contain an "object" and "descendants" array.',
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        setImportAlert({
          show: true,
          message: 'Error parsing JSON file. Please ensure it is valid JSON.',
          severity: 'error'
        });
      }
      
      // Clear the file input
      event.target.value = null;
    };
    
    reader.readAsText(file);
  };
  
  // Clear the import alert after a delay
  React.useEffect(() => {
    if (importAlert.show) {
      const timer = setTimeout(() => {
        setImportAlert({ ...importAlert, show: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [importAlert]);
  
  // Render the "Add New" tab content
  const renderAddNewTab = () => {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Add New Geometry</Typography>
        
        {importAlert.show && (
          <Alert 
            severity={importAlert.severity} 
            sx={{ mt: 2, mb: 2 }}
            onClose={() => setImportAlert({ ...importAlert, show: false })}
          >
            {importAlert.message}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, mb: 3 }}>
          <Typography variant="subtitle1">Import Existing Object</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              component="label"
              sx={{ flexGrow: 1 }}
            >
              Select Object JSON File
              <input
                type="file"
                hidden
                accept=".json"
                ref={fileInputRef}
                onChange={handleImportObjectFile}
              />
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Import a previously exported object with its descendants. The object will be added with {newMotherVolume} as its mother volume.
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1">Create New Object</Typography>
        
        <FormControl fullWidth margin="normal">
          <InputLabel>Geometry Type</InputLabel>
          <Select
            value={newGeometryType}
            label="Geometry Type"
            onChange={(e) => setNewGeometryType(e.target.value)}
          >
            <MenuItem value="box">Box</MenuItem>
            <MenuItem value="cylinder">Cylinder</MenuItem>
            <MenuItem value="sphere">Sphere</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl fullWidth margin="normal">
          <InputLabel>Mother Volume</InputLabel>
          <Select
            value={newMotherVolume}
            label="Mother Volume"
            onChange={(e) => setNewMotherVolume(e.target.value)}
          >
            <MenuItem value="World">World</MenuItem>
            {geometries.volumes && geometries.volumes.map((volume, index) => (
              <MenuItem key={`mother-${index}`} value={volume.name}>
                {volume.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleAddGeometry}
          sx={{ mt: 2 }}
          fullWidth
        >
          Add Geometry
        </Button>
      </Box>
    );
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs 
        value={tabValue} 
        onChange={(e, newValue) => setTabValue(newValue)}
        variant="fullWidth"
      >
        <Tab label="Properties" />
        <Tab label="Add New" />
      </Tabs>
      <Divider />
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {tabValue === 0 ? renderPropertyEditor() : renderAddNewTab()}
      </Box>
    </Paper>
  );
};

export default GeometryEditor;
