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
  
  // Helper function to mark placement objects for single-line formatting
  const formatPlacement = (placement) => {
    // Create a special object with a custom toString method
    // This will be used to format the placement as a single line
    const formattedPlacement = {};
    
    // Add a custom toString method that will be called during JSON.stringify
    Object.defineProperty(formattedPlacement, 'toJSON', {
      enumerable: false,
      value: function() {
        // Convert values to mm
        const posUnit = placement.unit || 'cm';
        const x = convertToMm(placement.x, posUnit);
        const y = convertToMm(placement.y, posUnit);
        const z = convertToMm(placement.z, posUnit);
        
        let result = `{ "x": ${x}, "y": ${y}, "z": ${z}`;
        
        if (placement.rotation) {
          const rot = placement.rotation;
          const rotUnit = rot.unit || 'deg';
          const rx = convertToRadians(rot.x, rotUnit);
          const ry = convertToRadians(rot.y, rotUnit);
          const rz = convertToRadians(rot.z, rotUnit);
          result += `, "rotation": { "x": ${rx}, "y": ${ry}, "z": ${rz} }`;
        }
        
        result += ` }`;
        return result;
      }
    });
    
    // Copy all properties from the original placement
    Object.assign(formattedPlacement, placement);
    
    return formattedPlacement;
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
    
    // Custom JSON serialization to format placement objects on a single line
    let jsonString = JSON.stringify(jsonData, null, 2);
    
    // Convert position and rotation to placement format
    jsonString = convertPositionRotationToPlacement(jsonString);
  
    // Add a comment at the top of the JSON to indicate units
    jsonString = `{\n  // All distances are in mm, all angles are in radians\n${jsonString.substring(1)}`;
  
    return jsonString;
  };
  
  // Helper function to convert position and rotation to placement format in JSON string
  // and dimension properties to a dimensions object, also removing redundant unit fields
  const convertPositionRotationToPlacement = (jsonString) => {
    // Create a new JSON object to work with
    const jsonObj = JSON.parse(jsonString);
    
    // Process the world object
    if (jsonObj.world && jsonObj.world.position) {
      const placement = createPlacementObject(jsonObj.world.position, jsonObj.world.rotation);
      jsonObj.world.placement = placement;
      delete jsonObj.world.position;
      delete jsonObj.world.rotation;
      
      // Convert dimension properties to dimensions object for world
      if (jsonObj.world.size) {
        jsonObj.world.dimensions = createDimensionsObject(jsonObj.world);
      }
      
      // Remove the unit field if it exists
      if (jsonObj.world.unit) {
        delete jsonObj.world.unit;
      }
    }
    
    // Process all volumes
    if (jsonObj.volumes && Array.isArray(jsonObj.volumes)) {
      jsonObj.volumes.forEach(volume => {
        // Convert position and rotation to placement
        if (volume.position) {
          const placement = createPlacementObject(volume.position, volume.rotation);
          volume.placement = placement;
          delete volume.position;
          delete volume.rotation;
        }
        
        // Convert dimension properties to dimensions object
        volume.dimensions = createDimensionsObject(volume);
        
        // Remove redundant unit field at the top level since it's already in dimensions and placement
        if (volume.unit) {
          delete volume.unit;
        }
      });
    }
    
    // Convert back to JSON string with custom replacer for placement objects
    const jsonWithMarkers = JSON.stringify(jsonObj, placementReplacer, 2);
    return formatPlacementJson(jsonWithMarkers);
  };
  
  // Helper function to convert lengths to mm
  const convertToMm = (value, unit) => {
    if (unit === 'cm') return value * 10;
    if (unit === 'm') return value * 1000;
    return value; // Already in mm
  };

  // Helper function to convert angles to radians
  const convertToRadians = (value, unit) => {
    if (unit === 'deg') return value * (Math.PI / 180);
    return value; // Already in radians
  };

  // Create a dimensions object based on the geometry type
  const createDimensionsObject = (geometry) => {
    const dimensions = {};
    
    // Get the unit to convert from
    const unit = geometry.size?.unit || 'cm';
    
    switch(geometry.type) {
      case 'box':
        if (geometry.size) {
          dimensions.x = convertToMm(geometry.size.x, unit);
          dimensions.y = convertToMm(geometry.size.y, unit);
          dimensions.z = convertToMm(geometry.size.z, unit);
          delete geometry.size;
        }
        break;
        
      case 'sphere':
        if (geometry.radius !== undefined) {
          dimensions.radius = convertToMm(geometry.radius, unit);
          delete geometry.radius;
        }
        break;
        
      case 'cylinder':
        if (geometry.radius !== undefined) {
          dimensions.radius = convertToMm(geometry.radius, unit);
          delete geometry.radius;
        }
        if (geometry.innerRadius !== undefined) {
          dimensions.inner_radius = convertToMm(geometry.innerRadius, unit);
          delete geometry.innerRadius;
        }
        if (geometry.height !== undefined) {
          dimensions.height = convertToMm(geometry.height, unit);
          delete geometry.height;
        }
        break;
        
      case 'trapezoid':
        if (geometry.dx1 !== undefined) {
          dimensions.dx1 = convertToMm(geometry.dx1, unit);
          delete geometry.dx1;
        }
        if (geometry.dx2 !== undefined) {
          dimensions.dx2 = convertToMm(geometry.dx2, unit);
          delete geometry.dx2;
        }
        if (geometry.dy1 !== undefined) {
          dimensions.dy1 = convertToMm(geometry.dy1, unit);
          delete geometry.dy1;
        }
        if (geometry.dy2 !== undefined) {
          dimensions.dy2 = convertToMm(geometry.dy2, unit);
          delete geometry.dy2;
        }
        if (geometry.dz !== undefined) {
          dimensions.dz = convertToMm(geometry.dz, unit);
          delete geometry.dz;
        }
        break;
        
      case 'torus':
        if (geometry.majorRadius !== undefined) {
          dimensions.major_radius = convertToMm(geometry.majorRadius, unit);
          delete geometry.majorRadius;
        }
        if (geometry.minorRadius !== undefined) {
          dimensions.minor_radius = convertToMm(geometry.minorRadius, unit);
          delete geometry.minorRadius;
        }
        break;
        
      case 'ellipsoid':
        if (geometry.xRadius !== undefined) {
          dimensions.x_radius = convertToMm(geometry.xRadius, unit);
          delete geometry.xRadius;
        }
        if (geometry.yRadius !== undefined) {
          dimensions.y_radius = convertToMm(geometry.yRadius, unit);
          delete geometry.yRadius;
        }
        if (geometry.zRadius !== undefined) {
          dimensions.z_radius = convertToMm(geometry.zRadius, unit);
          delete geometry.zRadius;
        }
        break;
        
      case 'polycone':
        if (geometry.zSections && Array.isArray(geometry.zSections)) {
          // Extract z_sections from the zSections array
          const zSections = geometry.zSections;
          
          // Create arrays for z, rmin, and rmax
          const zValues = [];
          const rminValues = [];
          const rmaxValues = [];
          
          // Extract values from each section and convert to mm
          zSections.forEach(section => {
            zValues.push(convertToMm(section.z, unit));
            // Use rMin and rMax (capital M) as in the PropertyEditor
            rminValues.push(convertToMm(section.rMin || 0, unit));
            rmaxValues.push(convertToMm(section.rMax || 0, unit));
          });
          
          // Add the arrays to dimensions
          dimensions.z = zValues;
          dimensions.rmin = rminValues;
          dimensions.rmax = rmaxValues;
          
          // Remove the original zSections property
          delete geometry.zSections;
        }
        break;
        
      default:
        // For unknown types, just return an empty dimensions object
        break;
    }
    
    return dimensions;
  };
  
  // Create a placement object from position and rotation
  const createPlacementObject = (position, rotation) => {
    const posUnit = position?.unit || 'cm';
    const placement = {
      x: convertToMm(position?.x ?? 0, posUnit),
      y: convertToMm(position?.y ?? 0, posUnit),
      z: convertToMm(position?.z ?? 0, posUnit)
    };
    
    // Add rotation only if it exists and any value is non-zero
    const hasRotation = rotation && (
      (rotation.x && rotation.x !== 0) || 
      (rotation.y && rotation.y !== 0) || 
      (rotation.z && rotation.z !== 0)
    );
    
    if (hasRotation) {
      const rotUnit = rotation?.unit || 'deg';
      placement.rotation = {
        x: convertToRadians(rotation?.x ?? 0, rotUnit),
        y: convertToRadians(rotation?.y ?? 0, rotUnit),
        z: convertToRadians(rotation?.z ?? 0, rotUnit)
      };
    }
    
    // Mark this as a special placement object
    placement._isPlacement = true;
    
    return placement;
  };
  
  // Custom replacer function for JSON.stringify to format placement objects
  const placementReplacer = (key, value) => {
    // Check if this is a placement object
    if (value && value._isPlacement === true) {
      // Remove the marker property
      const { _isPlacement, ...cleanPlacement } = value;
      
      // Create a special object that will be stringified without the placement structure
      // but will be recognized by our custom formatter
      return {
        __isPlacementMarker: true,
        x: cleanPlacement.x,
        y: cleanPlacement.y,
        z: cleanPlacement.z,
        rotation: cleanPlacement.rotation
      };
    }
    return value;
  };
  
  // Format the JSON with proper indentation for display and fix placement formatting
  const formatPlacementJson = (jsonString) => {
    // Find all placement marker objects and replace them with properly formatted placement strings
    return jsonString.replace(/\{\s*"__isPlacementMarker":\s*true,\s*"x":\s*([\d.-]+),\s*"y":\s*([\d.-]+),\s*"z":\s*([\d.-]+)(?:,\s*"rotation":\s*\{\s*"x":\s*([\d.-]+),\s*"y":\s*([\d.-]+),\s*"z":\s*([\d.-]+)\s*\})?\s*\}/g, (match, x, y, z, rotX, rotY, rotZ) => {
      if (rotX !== undefined) {
        // With rotation
        return `{ "x": ${x}, "y": ${y}, "z": ${z}, "rotation": { "x": ${rotX}, "y": ${rotY}, "z": ${rotZ} } }`;
      } else {
        // Without rotation
        return `{ "x": ${x}, "y": ${y}, "z": ${z} }`;
      }
    });
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
