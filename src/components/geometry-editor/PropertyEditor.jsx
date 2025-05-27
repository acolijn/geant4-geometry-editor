import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Menu
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { toInternalUnit, fromInternalUnit, getAvailableUnits } from '../../utils/UnitConverter';

/**
 * PropertyEditor Component
 * 
 * This component renders the property editor panel for the selected geometry object.
 * It handles different types of geometries (world, volumes) and displays
 * the relevant properties for each type. The property editor allows users to modify
 * properties like position, rotation, dimensions, and material.
 */
const PropertyEditor = ({
  selectedGeometry,
  geometries,
  materials,
  hitCollections,
  onUpdateGeometry,
  onRemoveGeometry,
  handleExportObject,
  handleInputFocus,
  handleNumberKeyDown
}) => {
  // State for the menu
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const menuOpen = Boolean(menuAnchorEl);
  
  // State for display units (these don't affect storage, only display)
  const [lengthUnit, setLengthUnit] = useState('cm');
  const [angleUnit, setAngleUnit] = useState('deg');
  
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Helper function to get the selected geometry object
  const getSelectedGeometryObject = () => {
    if (!selectedGeometry) return null;
    
    if (selectedGeometry === 'world') {
      return geometries.world;
    } else {
      const volumeIndex = parseInt(selectedGeometry.split('-')[1]);
      return geometries.volumes[volumeIndex];
    }
  };


  // Handle property changes
  const handlePropertyChange = (key, value, isString = false) => {
    const selectedObject = getSelectedGeometryObject();
    if (!selectedObject) return;
  
    // Determine if this is a numeric field that needs unit conversion
    const isNumberField = !isString && typeof value === 'string' && /^-?\d*\.?\d*$/.test(value);
  
    // Parse the value if it's a number
    let finalValue = value;
    if (isNumberField) {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        // Determine if this is a length or angle property
        const isAngle = key.includes('rotation');
        
        // Convert to internal units (mm or rad)
        finalValue = toInternalUnit(
          parsed, 
          isAngle ? angleUnit : lengthUnit,
          isAngle ? 'angle' : 'length'
        );
      }
    } else if (!isString) {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        finalValue = parsed;
      }
    }
  
    // Update the object with the converted value
    const keys = key.split('.');
    const updatedObject = { ...selectedObject };
  
    if (keys.length === 1) {
      updatedObject[key] = finalValue;
    } else {
      const [outer, inner] = keys;
      updatedObject[outer] = {
        ...updatedObject[outer],
        [inner]: finalValue
      };
      
      // For rotation, always store in radians (no unit needed)
      // For position, preserve the length unit
      if (outer === 'position') {
        updatedObject[outer].unit = lengthUnit;
      } else if (updatedObject[outer].unit) {
        // For other properties, remove unit as it's no longer needed
        delete updatedObject[outer].unit;
      }
      
      // Special handling for box dimensions - update both dimensions and size
      if (outer === 'dimensions' && updatedObject.type === 'box') {
        // Ensure size property exists and is updated to match dimensions
        if (!updatedObject.size) {
          updatedObject.size = {};
        }
        updatedObject.size[inner] = finalValue;
        console.log(`Updated box ${inner} dimension to ${finalValue} and synchronized with size property`);
      }
    }
  
    onUpdateGeometry(selectedGeometry, updatedObject);
  };
  
/*   const handlePropertyChange = (property, value, isString = false, skipConversion = false) => {
    const selectedObject = getSelectedGeometryObject();
    if (!selectedObject) return;
    
    // Create a deep copy of the selected object
    const updatedObject = { ...selectedObject };
    
    // Handle nested properties (e.g., 'position.x')
    if (property.includes('.')) {
      const [parentProp, childProp] = property.split('.');
      
      // Ensure the parent property exists
      if (!updatedObject[parentProp]) {
        updatedObject[parentProp] = {};
      }
      
      // Update the child property with the appropriate type conversion
      if (isString || skipConversion) {
        updatedObject[parentProp] = {
          ...updatedObject[parentProp],
          [childProp]: value
        };
      } else {
        updatedObject[parentProp] = {
          ...updatedObject[parentProp],
          [childProp]: parseFloat(value) || 0
        };
      }
    } else {
      // Handle direct properties with appropriate type conversion
      if (isString || skipConversion) {
        updatedObject[property] = value;
      } else {
        updatedObject[property] = parseFloat(value) || 0;
      }
    }
    
    // Update the geometry with the modified object
    onUpdateGeometry(selectedGeometry, updatedObject);
  }; */

  // Get the selected object
  const selectedObject = getSelectedGeometryObject();
  
  if (!selectedObject) {
    return (
      <Typography variant="body1" sx={{ p: 2 }}>
        Select a geometry to edit its properties
      </Typography>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Geometry Editor</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {selectedGeometry && (
            <IconButton
              aria-label="more"
              aria-controls="geometry-menu"
              aria-haspopup="true"
              onClick={handleMenuOpen}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>
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
        {/* Menu items can be added here if needed */}
      </Menu>
      
      <TextField
        label="Internal Name"
        value={selectedObject?.name || ''}
        InputProps={{
          readOnly: true,
        }}
        variant="filled"
        fullWidth
        margin="normal"
        size="small"
        helperText="This is the internal name used for references (read-only)"
      />
      
      <TextField
        label="Geant4 Name"
        value={selectedObject?.displayName || selectedObject?.name || ''}
        onChange={(e) => {
          e.stopPropagation();
          // Only update the displayName of the selected component
          // This allows each component to have its own unique Geant4 name
          handlePropertyChange('displayName', e.target.value, true);
        }}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
        fullWidth
        margin="normal"
        size="small"
      />
      <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary' }}>
        Name used in Geant4 export
      </Typography>
      
      <FormControl fullWidth margin="normal" size="small">
        <InputLabel>Material</InputLabel>
        <Select
          value={selectedObject?.material || ''}
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
      
      {/* Hits Collection selector - simple dropdown with inactive option */}
      {selectedGeometry !== 'world' && (
        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>Hits Collection</InputLabel>
          <Select
            value={selectedObject && selectedObject.hitsCollectionName ? selectedObject.hitsCollectionName : 'Inactive'}
            label="Hits Collection"
            onChange={(e) => {
              e.stopPropagation();
              const currentObject = getSelectedGeometryObject();
              if (!currentObject) return;
              
              const updatedObject = { ...currentObject };
              
              if (e.target.value === 'Inactive') {
                // If Inactive is selected, remove isActive flag and hitsCollectionName
                updatedObject.isActive = false;
                delete updatedObject.hitsCollectionName;
              } else {
                // Otherwise, set the volume as active with the selected collection
                updatedObject.isActive = true;
                updatedObject.hitsCollectionName = e.target.value;
              }
              
              onUpdateGeometry(selectedGeometry, updatedObject);
            }}
            onClick={(e) => e.stopPropagation()}
            MenuProps={{
              onClick: (e) => e.stopPropagation(),
              PaperProps: { onClick: (e) => e.stopPropagation() }
            }}
          >
            <MenuItem value="Inactive">Inactive</MenuItem>
            {hitCollections.map((collection) => (
              <MenuItem key={collection} value={collection}>
                {collection}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      
      {/* Mother Volume selector - only show for non-world volumes */}
      {selectedGeometry !== 'world' && (
        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>Mother Volume</InputLabel>
          <Select
            value={selectedObject?.mother_volume || 'World'}
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
            renderValue={(value) => {
              // For World, just return World
              if (value === 'World') return 'World';
              
              // For other volumes, find the volume with this name and return its display name
              const motherVolume = geometries.volumes.find(vol => vol.name === value);
              return motherVolume ? (motherVolume.displayName || motherVolume.name) : value;
            }}
          >
            <MenuItem value="World">World</MenuItem>
            {geometries.volumes && geometries.volumes.map((volume, index) => {
              // Skip the current volume to prevent self-reference and circular dependencies
              if (selectedGeometry === `volume-${index}`) return null;
              return (
                <MenuItem key={`mother-${index}`} value={volume.name}>
                  {/* Show the Geant4 name (displayName) if available, otherwise fall back to internal name */}
                  {volume.displayName || volume.name}
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
          value={selectedObject?.position?.x !== undefined 
            ? fromInternalUnit(selectedObject.position.x, lengthUnit, 'length')
            : 0
          }
          onChange={(e) => handlePropertyChange('position.x', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Y"
          type="number"
          value={selectedObject?.position?.y !== undefined 
            ? fromInternalUnit(selectedObject.position.y, lengthUnit, 'length')
            : 0
          }
          onChange={(e) => handlePropertyChange('position.y', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Z"
          type="number"
          value={selectedObject?.position?.z !== undefined 
            ? fromInternalUnit(selectedObject.position.z, lengthUnit, 'length')
            : 0
          }
          onChange={(e) => handlePropertyChange('position.z', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <FormControl size="small" sx={{ minWidth: '90px' }}>
          <InputLabel>Unit</InputLabel>
          <Select
            value={lengthUnit}
            label="Unit"
            onChange={(e) => setLengthUnit(e.target.value)}
            size="small"
          >
            {getAvailableUnits('length').map(unit => (
              <MenuItem key={unit} value={unit}>{unit}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      <Typography variant="subtitle1" sx={{ mt: 2 }}>Rotation</Typography>
      <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary' }}>
        Rotations are applied sequentially in Geant4 order: first X, then Y (around new Y axis), then Z (around new Z axis).
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          label="X"
          type="number"
          value={selectedObject?.rotation?.x !== undefined 
            ? fromInternalUnit(selectedObject.rotation.x, angleUnit, 'angle')
            : 0
          }
          onChange={(e) => handlePropertyChange('rotation.x', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Y"
          type="number"
          value={selectedObject?.rotation?.y !== undefined 
            ? fromInternalUnit(selectedObject.rotation.y, angleUnit, 'angle')
            : 0
          }
          onChange={(e) => handlePropertyChange('rotation.y', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Z"
          type="number"
          value={selectedObject?.rotation?.z !== undefined 
            ? fromInternalUnit(selectedObject.rotation.z, angleUnit, 'angle')
            : 0
          }
          onChange={(e) => handlePropertyChange('rotation.z', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <FormControl size="small" sx={{ minWidth: '90px' }}>
          <InputLabel>Unit</InputLabel>
          <Select
            value={angleUnit}
            label="Unit"
            onChange={(e) => setAngleUnit(e.target.value)}
            size="small"
          >
            {getAvailableUnits('angle').map(unit => (
              <MenuItem key={unit} value={unit}>{unit}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {/* Render type-specific properties */}
      {selectedObject?.type === 'box' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="X"
              type="number"
              value={selectedObject?.dimensions?.x !== undefined 
                ? fromInternalUnit(selectedObject.dimensions.x, lengthUnit, 'length')
                : (selectedObject?.size?.x !== undefined 
                  ? fromInternalUnit(selectedObject.size.x, lengthUnit, 'length')
                  : 0)
              }
              onChange={(e) => handlePropertyChange('dimensions.x', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Y"
              type="number"
              value={selectedObject?.dimensions?.y !== undefined 
                ? fromInternalUnit(selectedObject.dimensions.y, lengthUnit, 'length')
                : (selectedObject?.size?.y !== undefined 
                  ? fromInternalUnit(selectedObject.size.y, lengthUnit, 'length')
                  : 0)
              }
              onChange={(e) => handlePropertyChange('dimensions.y', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Z"
              type="number"
              value={selectedObject?.dimensions?.z !== undefined 
                ? fromInternalUnit(selectedObject.dimensions.z, lengthUnit, 'length')
                : (selectedObject?.size?.z !== undefined 
                  ? fromInternalUnit(selectedObject.size.z, lengthUnit, 'length')
                  : 0)
              }
              onChange={(e) => handlePropertyChange('dimensions.z', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <FormControl size="small" sx={{ minWidth: '90px' }}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={lengthUnit}
                label="Unit"
                onChange={(e) => setLengthUnit(e.target.value)}
                size="small"
              >
                {getAvailableUnits('length').map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </>
      )}
      
      {selectedObject?.type === 'cylinder' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="Radius"
              type="number"
              value={selectedObject?.radius !== undefined 
                ? fromInternalUnit(selectedObject.radius, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('radius', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Height"
              type="number"
              value={selectedObject?.height !== undefined 
                ? fromInternalUnit(selectedObject.height, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('height', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <FormControl size="small" sx={{ minWidth: '90px' }}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={lengthUnit}
                label="Unit"
                onChange={(e) => setLengthUnit(e.target.value)}
                size="small"
              >
                {getAvailableUnits('length').map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="Inner Radius"
              type="number"
              value={selectedObject?.innerRadius !== undefined 
                ? fromInternalUnit(selectedObject.innerRadius, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('innerRadius', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <FormControl size="small" sx={{ minWidth: '90px' }}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={lengthUnit}
                label="Unit"
                onChange={(e) => setLengthUnit(e.target.value)}
                size="small"
              >
                {getAvailableUnits('length').map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </>
      )}
      
      {selectedObject?.type === 'sphere' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="Radius"
              type="number"
              value={selectedObject?.radius !== undefined 
                ? fromInternalUnit(selectedObject.radius, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('radius', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <FormControl size="small" sx={{ minWidth: '90px' }}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={lengthUnit}
                label="Unit"
                onChange={(e) => setLengthUnit(e.target.value)}
                size="small"
              >
                {getAvailableUnits('length').map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </>
      )}
      
      {selectedObject?.type === 'trapezoid' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="dx1 (X at -z/2)"
              type="number"
              value={selectedObject?.dx1 !== undefined 
                ? fromInternalUnit(selectedObject.dx1, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('dx1', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="dx2 (X at +z/2)"
              type="number"
              value={selectedObject?.dx2 !== undefined 
                ? fromInternalUnit(selectedObject.dx2, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('dx2', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <FormControl size="small" sx={{ minWidth: '90px' }}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={lengthUnit}
                label="Unit"
                onChange={(e) => setLengthUnit(e.target.value)}
                size="small"
              >
                {getAvailableUnits('length').map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="dy1 (Y at -z/2)"
              type="number"
              value={selectedObject?.dy1 !== undefined 
                ? fromInternalUnit(selectedObject.dy1, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('dy1', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="dy2 (Y at +z/2)"
              type="number"
              value={selectedObject?.dy2 !== undefined 
                ? fromInternalUnit(selectedObject.dy2, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('dy2', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <FormControl size="small" sx={{ minWidth: '90px' }}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={lengthUnit}
                label="Unit"
                onChange={(e) => setLengthUnit(e.target.value)}
                size="small"
              >
                {getAvailableUnits('length').map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="dz (Half-length in Z)"
              type="number"
              value={selectedObject?.dz !== undefined 
                ? fromInternalUnit(selectedObject.dz, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('dz', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <FormControl size="small" sx={{ minWidth: '90px' }}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={lengthUnit}
                label="Unit"
                onChange={(e) => setLengthUnit(e.target.value)}
                size="small"
              >
                {getAvailableUnits('length').map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </>
      )}
      
      {selectedObject?.type === 'ellipsoid' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="X Radius"
              type="number"
              value={selectedObject?.xRadius !== undefined 
                ? fromInternalUnit(selectedObject.xRadius, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('xRadius', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Y Radius"
              type="number"
              value={selectedObject?.yRadius !== undefined 
                ? fromInternalUnit(selectedObject.yRadius, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('yRadius', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Z Radius"
              type="number"
              value={selectedObject?.zRadius !== undefined 
                ? fromInternalUnit(selectedObject.zRadius, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('zRadius', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <FormControl size="small" sx={{ minWidth: '90px' }}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={lengthUnit}
                label="Unit"
                onChange={(e) => setLengthUnit(e.target.value)}
                size="small"
              >
                {getAvailableUnits('length').map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </>
      )}
      
      {selectedObject?.type === 'torus' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="Major Radius"
              type="number"
              value={selectedObject?.majorRadius !== undefined 
                ? fromInternalUnit(selectedObject.majorRadius, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('majorRadius', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Minor Radius"
              type="number"
              value={selectedObject?.minorRadius !== undefined 
                ? fromInternalUnit(selectedObject.minorRadius, lengthUnit, 'length')
                : 0
              }
              onChange={(e) => handlePropertyChange('minorRadius', e.target.value)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <FormControl size="small" sx={{ minWidth: '90px' }}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={lengthUnit}
                label="Unit"
                onChange={(e) => setLengthUnit(e.target.value)}
                size="small"
              >
                {getAvailableUnits('length').map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </>
      )}
      
      {selectedObject?.type === 'polycone' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Z Sections</Typography>
          <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary' }}>
            Define the sections of the polycone along the z-axis
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <FormControl size="small" sx={{ minWidth: '90px' }}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={lengthUnit}
                label="Unit"
                onChange={(e) => setLengthUnit(e.target.value)}
                size="small"
              >
                {getAvailableUnits('length').map(unit => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          {selectedObject?.zSections && selectedObject?.zSections.map((section, index) => (
            <Box key={`section-${index}`} sx={{ display: 'flex', gap: 1, mb: 1, border: '1px solid #eee', p: 1, borderRadius: '4px' }}>
              <TextField
                label="Z Position"
                type="number"
                value={section.z !== undefined 
                  ? fromInternalUnit(section.z, lengthUnit, 'length')
                  : 0
                }
                onChange={(e) => {
                  const newSections = [...selectedObject?.zSections];
                  // Convert to internal units (mm)
                  const valueInMm = toInternalUnit(parseFloat(e.target.value) || 0, lengthUnit, 'length');
                  newSections[index] = { ...newSections[index], z: valueInMm };
                  handlePropertyChange('zSections', newSections, true);
                }}
                onFocus={handleInputFocus}
                size="small"
                inputProps={{ step: 'any' }}
              />
              <TextField
                label="Min Radius"
                type="number"
                value={section.rMin !== undefined 
                  ? fromInternalUnit(section.rMin, lengthUnit, 'length')
                  : 0
                }
                onChange={(e) => {
                  const newSections = [...selectedObject?.zSections];
                  // Convert to internal units (mm)
                  const valueInMm = toInternalUnit(parseFloat(e.target.value) || 0, lengthUnit, 'length');
                  newSections[index] = { ...newSections[index], rMin: valueInMm };
                  handlePropertyChange('zSections', newSections, true);
                }}
                onFocus={handleInputFocus}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Max Radius"
                type="number"
                value={section.rMax !== undefined 
                  ? fromInternalUnit(section.rMax, lengthUnit, 'length')
                  : 0
                }
                onChange={(e) => {
                  const newSections = [...selectedObject?.zSections];
                  // Convert to internal units (mm)
                  const valueInMm = toInternalUnit(parseFloat(e.target.value) || 0, lengthUnit, 'length');
                  newSections[index] = { ...newSections[index], rMax: valueInMm };
                  handlePropertyChange('zSections', newSections, true);
                }}
                onFocus={handleInputFocus}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <Button 
                variant="outlined" 
                color="error" 
                size="small"
                onClick={() => {
                  if (selectedObject?.zSections?.length > 2) {
                    const newSections = [...selectedObject?.zSections];
                    newSections.splice(index, 1);
                    handlePropertyChange('zSections', newSections, true);
                  }
                }}
                disabled={selectedObject?.zSections?.length <= 2}
              >
                Remove
              </Button>
            </Box>
          ))}
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => {
              const newSections = [...(selectedObject?.zSections || [])];
              // Get the last Z position in internal units (mm)
              const lastZInMm = newSections.length > 0 ? newSections[newSections.length - 1].z : 0;
              // Add 5 units in the current display unit, converted to mm
              const incrementInMm = toInternalUnit(5, lengthUnit, 'length');
              // Create new section with values in mm
              newSections.push({ 
                z: lastZInMm + incrementInMm, 
                rMin: 0, 
                rMax: toInternalUnit(5, lengthUnit, 'length') 
              });
              handlePropertyChange('zSections', newSections, true);
            }}
            sx={{ mb: 1 }}
          >
            Add Section
          </Button>
        </>
      )}
      
      {selectedGeometry !== 'world' && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          {/* Save to Library button - exports the selected geometry to the object library */}
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={handleExportObject}
            aria-label="Save selected geometry to library"
            title="Save this geometry and its descendants to the object library for reuse"
          >
            Save to Library
          </Button>
          {/* Remove Geometry button - deletes the selected geometry from the scene */}
          <Button 
            variant="outlined" 
            color="error" 
            onClick={() => onRemoveGeometry(selectedGeometry)}
            aria-label="Remove selected geometry"
          >
            Remove Geometry
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PropertyEditor;
