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
  Menu,
  Tooltip
} from '@mui/material';
import NumericInput from './NumericInput';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { toInternalUnit, fromInternalUnit, getAvailableUnits } from '../utils/UnitConverter';
import { getSelectedGeometryObject } from '../utils/GeometryUtils';
import { createPropertyHandlers } from '../utils/propertyHandlers';

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
  setUpdateObjectsDialogOpen,
  handlePropertyChange,
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

  // Helper function to get the selected geometry object using the shared utility
  const getSelectedGeometryObjectLocal = () => {
    return getSelectedGeometryObject(selectedGeometry, geometries);
  };


/*   // Handle property changes
  const handlePropertyChangeLocal = (key, value, isString = false) => {
    const selectedObject = getSelectedGeometryObjectLocal();
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
  }; */
  
// Get the selected object
  const selectedObject = getSelectedGeometryObjectLocal();
  
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
              const currentObject = getSelectedGeometryObjectLocal();
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
        <NumericInput
          label="X"
          internalValue={selectedObject?.position?.x}
          unit={lengthUnit}
          type="length"
          onUpdate={(newValue) => handlePropertyChange('position.x', newValue)}
          onFocus={handleInputFocus}
        />
        <NumericInput
          label="Y"
          internalValue={selectedObject?.position?.y}
          unit={lengthUnit}
          type="length"
          onUpdate={(newValue) => handlePropertyChange('position.y', newValue)}
          onFocus={handleInputFocus}
        />
        <NumericInput
          label="Z"
          internalValue={selectedObject?.position?.z}
          unit={lengthUnit}
          type="length"
          onUpdate={(newValue) => handlePropertyChange('position.z', newValue)}
          onFocus={handleInputFocus}
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
        <NumericInput
          label="X"
          internalValue={selectedObject?.rotation?.x}
          unit={angleUnit}
          type="angle"
          onUpdate={(newValue) => handlePropertyChange('rotation.x', newValue)}
          onFocus={handleInputFocus}
        />
        <NumericInput
          label="Y"
          internalValue={selectedObject?.rotation?.y}
          unit={angleUnit}
          type="angle"
          onUpdate={(newValue) => handlePropertyChange('rotation.y', newValue)}
          onFocus={handleInputFocus}
        />
        <NumericInput
          label="Z"
          internalValue={selectedObject?.rotation?.z}
          unit={angleUnit}
          type="angle"
          onUpdate={(newValue) => handlePropertyChange('rotation.z', newValue)}
          onFocus={handleInputFocus}
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
            <NumericInput
              label="X"
              internalValue={selectedObject?.dimensions?.x !== undefined 
                ? selectedObject.dimensions.x
                : (selectedObject?.size?.x !== undefined 
                  ? selectedObject.size.x
                  : 0)
              }
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('dimensions.x', newValue)}
              onFocus={handleInputFocus}
            />
            <NumericInput
              label="Y"
              internalValue={selectedObject?.dimensions?.y !== undefined 
                ? selectedObject.dimensions.y
                : (selectedObject?.size?.y !== undefined 
                  ? selectedObject.size.y
                  : 0)
              }
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('dimensions.y', newValue)}
              onFocus={handleInputFocus}
            />
            <NumericInput
              label="Z"
              internalValue={selectedObject?.dimensions?.z !== undefined 
                ? selectedObject.dimensions.z
                : (selectedObject?.size?.z !== undefined 
                  ? selectedObject.size.z
                  : 0)
              }
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('dimensions.z', newValue)}
              onFocus={handleInputFocus}
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
            <NumericInput
              label="Radius"
              internalValue={selectedObject?.radius !== undefined ? selectedObject.radius : 0}
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('radius', newValue)}
              onFocus={handleInputFocus}
            />
            <NumericInput
              label="Height"
              internalValue={selectedObject?.height !== undefined ? selectedObject.height : 0}
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('height', newValue)}
              onFocus={handleInputFocus}
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
            <NumericInput
              label="Inner Radius"
              internalValue={selectedObject?.innerRadius !== undefined ? selectedObject.innerRadius : 0}
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('innerRadius', newValue)}
              onFocus={handleInputFocus}
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
            <NumericInput
              label="Radius"
              internalValue={selectedObject?.radius !== undefined ? selectedObject.radius : 0}
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('radius', newValue)}
              onFocus={handleInputFocus}
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
            <NumericInput
              label="dx1 (X at -z/2)"
              internalValue={selectedObject?.dx1 !== undefined ? selectedObject.dx1 : 0}
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('dx1', newValue)}
              onFocus={handleInputFocus}
            />
            <NumericInput
              label="dx2 (X at +z/2)"
              internalValue={selectedObject?.dx2 !== undefined ? selectedObject.dx2 : 0}
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('dx2', newValue)}
              onFocus={handleInputFocus}
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
            <NumericInput
              label="dy1 (Y at -z/2)"
              internalValue={selectedObject?.dy1 !== undefined ? selectedObject.dy1 : 0}
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('dy1', newValue)}
              onFocus={handleInputFocus}
            />
            <NumericInput
              label="dy2 (Y at +z/2)"
              internalValue={selectedObject?.dy2 !== undefined ? selectedObject.dy2 : 0}
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('dy2', newValue)}
              onFocus={handleInputFocus}
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
            <NumericInput
              label="dz (Half-length in Z)"
              internalValue={selectedObject?.dz !== undefined ? selectedObject.dz : 0}
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('dz', newValue)}
              onFocus={handleInputFocus}
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
              onChange={(e) => handlePropertyChange('xRadius', e.target.value, lengthUnit)}
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
              onChange={(e) => handlePropertyChange('yRadius', e.target.value, lengthUnit)}
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
              onChange={(e) => handlePropertyChange('zRadius', e.target.value, lengthUnit)}
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
            <NumericInput
              label="Major Radius"
              internalValue={selectedObject?.majorRadius !== undefined ? selectedObject.majorRadius : 0}
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('majorRadius', newValue)}
              onFocus={handleInputFocus}
            />
            <NumericInput
              label="Minor Radius"
              internalValue={selectedObject?.minorRadius !== undefined ? selectedObject.minorRadius : 0}
              unit={lengthUnit}
              type="length"
              onUpdate={(newValue) => handlePropertyChange('minorRadius', newValue)}
              onFocus={handleInputFocus}
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
                  handlePropertyChange('zSections', newSections, lengthUnit, true);
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
                  handlePropertyChange('zSections', newSections, lengthUnit, true);
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
                  handlePropertyChange('zSections', newSections, lengthUnit, true);
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
                    handlePropertyChange('zSections', newSections, lengthUnit, true);
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
              handlePropertyChange('zSections', newSections, lengthUnit, true);
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
          {/* Only enabled for top-level assemblies */}
          {(() => {
            // Get the selected object
            const selectedObj = getSelectedGeometryObjectLocal();
            
            // Check if this is a top-level assembly
            const isTopLevelAssembly = selectedObj && 
              selectedObj.type === 'assembly' && 
              (!selectedObj.mother_volume || selectedObj.mother_volume === 'World');
            
            return (
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={handleExportObject}
                disabled={!isTopLevelAssembly}
                aria-label="Save selected geometry to library"
                title={isTopLevelAssembly 
                  ? "Save this assembly and its descendants to the object library for reuse" 
                  : "Only top-level assemblies can be saved to the library"}
                sx={{
                  opacity: isTopLevelAssembly ? 1 : 0.6,
                  '&:hover': {
                    opacity: isTopLevelAssembly ? 1 : 0.6
                  }
                }}
              >
                Save to Library
              </Button>
            );
          })()} 

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
