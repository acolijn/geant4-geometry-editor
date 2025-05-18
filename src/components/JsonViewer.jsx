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
  
  // Helper function to convert lengths to mm
  const convertToMm = (value, unit) => {
    if (unit === 'cm') return value * 10;
    if (unit === 'm') return value * 1000;
    if (unit === 'mm') return value;
    // Default to assuming cm if unit is not specified or unknown
    return value * 10;
  };

  // Helper function to convert angles to radians
  const convertToRadians = (value, unit) => {
    if (unit === 'deg') return value * (Math.PI / 180);
    return value; // Already in radians
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
  
  // Generate the geometry JSON with hits collections
  const generateGeometryJson = () => {
    // Start with the existing format
    const jsonData = {
      world: geometries.world,
      volumes: (geometries.volumes || []).map(vol => ensureOrderedZPlanes({...vol}))
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
      // Create a new array to hold the converted volumes
      const convertedVolumes = [];
      
      jsonObj.volumes.forEach(volume => {
        // Create a new volume object with the converted format
        const convertedVolume = {};
        
        // Copy the name
        convertedVolume.name = volume.name;
        
        // Convert mother_volume to parent
        convertedVolume.parent = volume.mother_volume || 'World';
        
        // Keep type as type (not shape)
        convertedVolume.type = volume.type;
        
        // Copy material
        convertedVolume.material = volume.material;
        
        // Add color if available
        if (volume.color) {
          convertedVolume.color = volume.color;
        }
        
        // Remove any unit properties
        if (volume.unit) {
          delete volume.unit;
        }
        
        // Handle union solids with components specially
        if (volume.type === 'union' && volume.components && Array.isArray(volume.components)) {
          // Create components array
          convertedVolume.components = [];
          
          // Process each component in the union
          volume.components.forEach(component => {
            // Create a temporary volume object that mimics a regular volume
            const tempVolume = {
              name: component.name,
              type: component.shape || 'box'
            };
            
            // If the component has dimensions, add them to the temp volume
            if (component.dimensions) {
              // Map dimensions properties to the temp volume
              const dims = component.dimensions;
              
              // Copy all dimension properties to the temp volume
              Object.keys(dims).forEach(key => {
                if (key !== 'type') { // Skip the 'type' property
                  tempVolume[key] = dims[key];
                }
              });
            }
            
            // Create a converted component using the same logic as regular volumes
            const convertedComponent = {
              name: tempVolume.name,
              type: tempVolume.type
            };
            
            // Process dimensions using the same function as regular volumes
            convertedComponent.dimensions = createDimensionsObject(tempVolume);
            
            // Add any additional properties needed for the component
            if (component.material) {
              convertedComponent.material = component.material;
            }
            
            // Process placement for each component
            if (component.placement && Array.isArray(component.placement)) {
              // Create placement array using the same logic as for regular volumes
              convertedComponent.placement = component.placement.map(place => {
                // Create a temporary position and rotation objects
                const tempPos = {
                  x: place.x || 0,
                  y: place.y || 0,
                  z: place.z || 0,
                  unit: 'cm'
                };
                
                const tempRot = place.rotation ? {
                  x: place.rotation.x || 0,
                  y: place.rotation.y || 0,
                  z: place.rotation.z || 0,
                  unit: place.rotation.unit || 'deg'
                } : null;
                
                // Use the same createPlacementObject function as for regular volumes
                return createPlacementObject(tempPos, tempRot);
              });
            }
            
            convertedVolume.components.push(convertedComponent);
          });
          
          // Add placement for the union itself
          if (volume.position) {
            // Convert position values to mm
            const posUnit = volume.position.unit || 'cm';
            convertedVolume.placement = [{
              x: convertToMm(Number(volume.position.x || 0), posUnit),
              y: convertToMm(Number(volume.position.y || 0), posUnit),
              z: convertToMm(Number(volume.position.z || 0), posUnit)
            }];
            
            // Add rotation if present (convert to radians)
            if (volume.rotation) {
              const rotUnit = volume.rotation.unit || 'deg';
              convertedVolume.placement[0].rotation = {
                x: convertToRadians(Number(volume.rotation.x || 0), rotUnit),
                y: convertToRadians(Number(volume.rotation.y || 0), rotUnit),
                z: convertToRadians(Number(volume.rotation.z || 0), rotUnit)
              };
            }
          } else {
            // Default placement at origin
            convertedVolume.placement = [{ x: 0.0, y: 0.0, z: 0.0 }];
          }
        } else {
          // Standard non-union volumes
          // Convert dimension properties to dimensions object
          convertedVolume.dimensions = createDimensionsObject(volume);
          
          // Convert position and rotation to placement array
          if (volume.position) {
            // Convert position values to mm
            const posUnit = volume.position.unit || 'cm';
            convertedVolume.placement = [{
              x: convertToMm(Number(volume.position.x || 0), posUnit),
              y: convertToMm(Number(volume.position.y || 0), posUnit),
              z: convertToMm(Number(volume.position.z || 0), posUnit)
            }];
            
            // Add rotation if present (convert to radians)
            if (volume.rotation) {
              const rotUnit = volume.rotation.unit || 'deg';
              convertedVolume.placement[0].rotation = {
                x: convertToRadians(Number(volume.rotation.x || 0), rotUnit),
                y: convertToRadians(Number(volume.rotation.y || 0), rotUnit),
                z: convertToRadians(Number(volume.rotation.z || 0), rotUnit)
              };
            }
          } else {
            // Default placement at origin
            convertedVolume.placement = [{ x: 0.0, y: 0.0, z: 0.0 }];
          }
        }
        
        // Add the converted volume to the array
        convertedVolumes.push(convertedVolume);
      });
      
      // Replace the original volumes with the converted ones
      jsonObj.volumes = convertedVolumes;
    }
    
    // Final cleanup to remove any remaining unit tags
    const removeUnitTags = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      
      // Remove unit property if present
      if ('unit' in obj) {
        delete obj.unit;
      }
      
      // Process all properties recursively
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          removeUnitTags(obj[key]);
        }
      }
      
      // Process arrays
      if (Array.isArray(obj)) {
        obj.forEach(item => {
          if (item && typeof item === 'object') {
            removeUnitTags(item);
          }
        });
      }
    };
    
    // Apply the cleanup to remove all unit tags
    removeUnitTags(jsonObj);
    
    // Convert back to JSON string with custom replacer for placement objects
    const jsonWithMarkers = JSON.stringify(jsonObj, placementReplacer, 2);
    return formatPlacementJson(jsonWithMarkers);
  };
  
  // Create a placement object from position and rotation
  const createPlacementObject = (position, rotation) => {
    // Always use cm as the default unit for conversion if not specified
    const posUnit = 'cm';
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

  // Create a dimensions object based on the geometry type
  const createDimensionsObject = (geometry) => {
    const dimensions = {};
    
    // Always use cm as the default unit for conversion if not specified
    const unit = 'cm';
    
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
  
  // Custom replacer function for JSON.stringify to format placement objects
  const placementReplacer = (key, value) => {
    // Check if this is a placement object
    if (value && value._isPlacement === true) {
      // Remove the marker property
      const { _isPlacement, ...cleanPlacement } = value;
      
      // Create a clean object without any internal markers
      const result = {
        x: cleanPlacement.x,
        y: cleanPlacement.y,
        z: cleanPlacement.z
      };
      
      // Add rotation if it exists
      if (cleanPlacement.rotation) {
        result.rotation = {
          x: cleanPlacement.rotation.x,
          y: cleanPlacement.rotation.y,
          z: cleanPlacement.rotation.z
        };
      }
      
      return result;
    }
    return value;
  };
  
  // Format the JSON with proper indentation for display and fix placement formatting
  const formatPlacementJson = (jsonString) => {
    // The JSON is already properly formatted by JSON.stringify, so we don't need to do any special formatting
    return jsonString;
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
