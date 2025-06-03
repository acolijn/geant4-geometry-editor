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
  
  // Generate the geometry JSON with hits collections
  /* const generateGeometryJson = () => {
    // Debug: Log all volumes to check for _compoundId
    console.log('JsonViewer - All volumes:', geometries.volumes);
    
    // Check for _compoundId in volumes
    const volumesWithCompoundId = (geometries.volumes || []).filter(vol => vol._compoundId);
    console.log(`JsonViewer - Found ${volumesWithCompoundId.length} volumes with _compoundId:`, volumesWithCompoundId);
    
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
   */
  // Helper function to convert position and rotation to placement format in JSON string
  // and dimension properties to a dimensions object, also removing redundant unit fields
  /* const convertPositionRotationToPlacement = (jsonString) => {
    // Create a new JSON object to work with
    const jsonObj = JSON.parse(jsonString);
    
    // Process the world object
    if (jsonObj.world && jsonObj.world.position) {
      // const placement = createPlacementObjectX(jsonObj.world.position, jsonObj.world.rotation);
      const placement = createPlacementObject(jsonObj.world);

      jsonObj.world.placement = placement;
      delete jsonObj.world.position;
      delete jsonObj.world.rotation;
      
      // Convert dimension properties to dimensions object for world
      jsonObj.world.dimensions = createDimensionsObject(jsonObj.world);
      delete jsonObj.world.size;
      
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
        
        // We're using _compoundId internally for identification, but not including it in the output JSON
        // Just log for debugging purposes
        if (volume._compoundId) {
          console.log(`JsonViewer - Volume ${volume.name} has _compoundId: ${volume._compoundId} (not included in output)`);
        } else if (volume.type === 'assembly') {
          console.warn(`JsonViewer - WARNING: Assembly ${volume.name} has no _compoundId!`);
        }
        
        // Convert mother_volume to parent
        convertedVolume.parent = volume.mother_volume || 'World';
        
        // Keep type as type (not shape)
        convertedVolume.type = volume.type;
        
        // Copy material
        convertedVolume.material = volume.material;
        
        // Add color from material or use volume-specific color if available
        if (volume.color) {
          // If volume has its own color, use that
          convertedVolume.color = Array.isArray(volume.color) ? volume.color : [volume.color.r, volume.color.g, volume.color.b, volume.color.opacity || 1.0];
        } else if (volume.material && materials[volume.material] && materials[volume.material].color) {
          // Otherwise use the material's color
          convertedVolume.color = materials[volume.material].color;
        } else {
          // Default color if no material color is defined
          convertedVolume.color = [0.7, 0.7, 0.7, 1.0];
        }
        
        // Add visibility property (default to true if not specified)
        convertedVolume.visible = volume.visible !== undefined ? volume.visible : true;
        
        // Add hit collection information for individual volumes
        if (volume.isActive) {
          convertedVolume.isActive = volume.isActive;
        }
        
        if (volume.hitsCollectionName) {
          convertedVolume.hitsCollectionName = volume.hitsCollectionName;
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
            // Create a converted component using the same logic as regular volumes
            const convertedComponent = {};
            convertedComponent.name = component.name;
            convertedComponent.type = component.shape;
            
            // Process dimensions using the same function as regular volumes
            //convertedComponent.dimensions = createDimensionsObject(tempVolume);
            convertedComponent.dimensions = createDimensionsObject(component);

            // Add any additional properties needed for the component
            if (component.material) {
              convertedComponent.material = component.material;
              
              // Add color from material or use component-specific color if available
              if (component.color) {
                // If component has its own color, use that
                convertedComponent.color = Array.isArray(component.color) ? component.color : [component.color.r, component.color.g, component.color.b, component.color.opacity || 1.0];
              } else if (component.material && materials[component.material] && materials[component.material].color) {
                // Otherwise use the material's color
                convertedComponent.color = materials[component.material].color;
              } else {
                // Default color if no material color is defined
                convertedComponent.color = [0.7, 0.7, 0.7, 1.0];
              }
              
              // Add visibility property (default to true if not specified)
              convertedComponent.visible = component.visible !== undefined ? component.visible : true;
            }
            
            // Process placement for each component
            if (component.placement && Array.isArray(component.placement)) {
              // Create placement array using the same logic as for regular volumes
              convertedComponent.placement = createPlacementObject(component);
            }
            
            convertedVolume.components.push(convertedComponent);
          });
          
          // Add placement for the union itself
          convertedVolume.placement = createPlacementObject(volume);
        } else {
          // Standard non-union volumes
          convertedVolume.dimensions = createDimensionsObject(volume);
          convertedVolume.placement = createPlacementObject(volume);
        }
        
        // Add the converted volume to the array
        convertedVolumes.push(convertedVolume);
      });
      
      // Sort volumes to ensure parents come before children
      const sortedVolumes = sortVolumesByHierarchy(convertedVolumes);
      
      // Replace the original volumes with the sorted, converted ones
      jsonObj.volumes = sortedVolumes;
    };

    const jsonWithMarkers = JSON.stringify(jsonObj, null, 2);
    return jsonWithMarkers;
  }; */
  
  // Sort volumes to ensure parents come before children in the output JSON
  /* const sortVolumesByHierarchy = (volumes) => {
    // Create a map of volume names to their indices
    const volumeMap = {};
    volumes.forEach((volume, index) => {
      volumeMap[volume.name] = index;
    });
    
    // Create a dependency graph
    const dependencies = {};
    volumes.forEach(volume => {
      dependencies[volume.name] = [];
      
      // Add parent as a dependency if it exists
      if (volume.parent && volume.parent !== 'world') {
        dependencies[volume.name].push(volume.parent);
      }
    });
    
    // Topological sort function
    const sortedNames = [];
    const visited = {};
    const temp = {}; // For cycle detection
    
    const visit = (name) => {
      // If we've already processed this node, skip
      if (visited[name]) return;
      
      // If we're in the middle of processing this node, we have a cycle
      if (temp[name]) {
        console.warn(`Circular dependency detected in geometry: ${name}`);
        return;
      }
      
      // Mark as being processed
      temp[name] = true;
      
      // Process all dependencies first
      if (dependencies[name]) {
        dependencies[name].forEach(dep => {
          // Only visit if the dependency exists in our volume list
          if (volumeMap[dep] !== undefined) {
            visit(dep);
          }
        });
      }
      
      // Mark as processed and add to sorted list
      temp[name] = false;
      visited[name] = true;
      sortedNames.push(name);
    };
    
    // Start with the world volume if it exists
    if (volumeMap['world'] !== undefined) {
      visit('world');
    }
    
    // Process all other volumes
    volumes.forEach(volume => {
      visit(volume.name);
    });
    
    // Create the sorted array based on the topological sort
    const sortedVolumes = [];
    sortedNames.forEach(name => {
      if (volumeMap[name] !== undefined) {
        sortedVolumes.push(volumes[volumeMap[name]]);
      }
    });
    
    return sortedVolumes;
  };
   */
  // We no longer use the custom generateGeometryJson function to avoid duplication
  // const geometryJson = generateGeometryJson();
  
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
