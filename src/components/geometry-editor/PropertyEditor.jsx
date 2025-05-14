import React from 'react';
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
  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
  const menuOpen = Boolean(menuAnchorEl);
  
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
  const handlePropertyChange = (key, value) => {
    const selectedObject = getSelectedGeometryObject();
    if (!selectedObject) return;
  
    const isNumberField = typeof value === 'string' && /^-?\\d*\\.?\\d*$/.test(value);
  
    const keys = key.split('.');
    const updatedObject = { ...selectedObject };
  
    let finalValue = value;
    if (!isNumberField) {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        finalValue = parsed;
      }
    }
  
    if (keys.length === 1) {
      updatedObject[key] = finalValue;
    } else {
      const [outer, inner] = keys;
      updatedObject[outer] = {
        ...updatedObject[outer],
        [inner]: finalValue
      };
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
        label="Name"
        value={selectedObject?.name || ''}
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
          value={selectedObject?.position?.x ?? 0}
          onChange={(e) => handlePropertyChange('position.x', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Y"
          type="number"
          value={selectedObject?.position?.y ?? 0}
          onChange={(e) => handlePropertyChange('position.y', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Z"
          type="number"
          value={selectedObject?.position?.z ?? 0}
          onChange={(e) => handlePropertyChange('position.z', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Unit"
          value={selectedObject?.position?.unit || 'cm'}
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
          value={selectedObject?.rotation?.x ?? 0}
          onChange={(e) => handlePropertyChange('rotation.x', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Y"
          type="number"
          value={selectedObject?.rotation?.y ?? 0}
          onChange={(e) => handlePropertyChange('rotation.y', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Z"
          type="number"
          value={selectedObject?.rotation?.z ?? 0}
          onChange={(e) => handlePropertyChange('rotation.z', e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleNumberKeyDown}
          size="small"
          inputProps={{ step: 'any' }}
        />
        <TextField
          label="Unit"
          value={selectedObject?.rotation?.unit || 'deg'}
          onChange={(e) => handlePropertyChange('rotation.unit', e.target.value)}
          size="small"
        />
      </Box>
      
      {/* Render type-specific properties */}
      {selectedObject?.type === 'box' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Size</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="X"
              type="number"
              value={selectedObject?.size?.x || 0}
              onChange={(e) => handlePropertyChange('size.x', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Y"
              type="number"
              value={selectedObject?.size?.y || 0}
              onChange={(e) => handlePropertyChange('size.y', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Z"
              type="number"
              value={selectedObject?.size?.z || 0}
              onChange={(e) => handlePropertyChange('size.z', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Unit"
              value={selectedObject?.size?.unit || 'cm'}
              onChange={(e) => handlePropertyChange('size.unit', e.target.value)}
              size="small"
            />
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
              value={selectedObject?.radius || 0}
              onChange={(e) => handlePropertyChange('radius', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Height"
              type="number"
              value={selectedObject?.height || 0}
              onChange={(e) => handlePropertyChange('height', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
          </Box>
          <TextField
            label="Inner Radius"
            type="number"
            value={selectedObject?.innerRadius || 0}
            onChange={(e) => handlePropertyChange('innerRadius', e.target.value, false)}
            onFocus={handleInputFocus}
            size="small"
            sx={{ mb: 1 }}
            inputProps={{ step: 'any', min: 0 }}
          />
        </>
      )}
      
      {selectedObject?.type === 'sphere' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
          <TextField
            label="Radius"
            type="number"
            value={selectedObject?.radius || 0}
            onChange={(e) => handlePropertyChange('radius', e.target.value, false)}
            onFocus={handleInputFocus}
            size="small"
            fullWidth
            inputProps={{ step: 'any', min: 0 }}
          />
        </>
      )}
      
      {selectedObject?.type === 'trapezoid' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="dx1 (X at -z/2)"
              type="number"
              value={selectedObject?.dx1 || 0}
              onChange={(e) => handlePropertyChange('dx1', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="dx2 (X at +z/2)"
              type="number"
              value={selectedObject?.dx2 || 0}
              onChange={(e) => handlePropertyChange('dx2', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="dy1 (Y at -z/2)"
              type="number"
              value={selectedObject?.dy1 || 0}
              onChange={(e) => handlePropertyChange('dy1', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="dy2 (Y at +z/2)"
              type="number"
              value={selectedObject?.dy2 || 0}
              onChange={(e) => handlePropertyChange('dy2', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
          </Box>
          <TextField
            label="dz (Half-length in Z)"
            type="number"
            value={selectedObject?.dz || 0}
            onChange={(e) => handlePropertyChange('dz', e.target.value, false)}
            onFocus={handleInputFocus}
            size="small"
            fullWidth
            inputProps={{ step: 'any', min: 0 }}
            sx={{ mb: 1 }}
          />
        </>
      )}
      
      {selectedObject?.type === 'ellipsoid' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="X Radius"
              type="number"
              value={selectedObject?.xRadius || 0}
              onChange={(e) => handlePropertyChange('xRadius', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Y Radius"
              type="number"
              value={selectedObject?.yRadius || 0}
              onChange={(e) => handlePropertyChange('yRadius', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Z Radius"
              type="number"
              value={selectedObject?.zRadius || 0}
              onChange={(e) => handlePropertyChange('zRadius', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
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
              value={selectedObject?.majorRadius || 0}
              onChange={(e) => handlePropertyChange('majorRadius', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
            <TextField
              label="Minor Radius"
              type="number"
              value={selectedObject?.minorRadius || 0}
              onChange={(e) => handlePropertyChange('minorRadius', e.target.value, false)}
              onFocus={handleInputFocus}
              size="small"
              inputProps={{ step: 'any', min: 0 }}
            />
          </Box>
        </>
      )}
      
      {selectedObject?.type === 'polycone' && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Z Sections</Typography>
          <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary' }}>
            Define the sections of the polycone along the z-axis
          </Typography>
          {selectedObject?.zSections && selectedObject?.zSections.map((section, index) => (
            <Box key={`section-${index}`} sx={{ display: 'flex', gap: 1, mb: 1, border: '1px solid #eee', p: 1, borderRadius: '4px' }}>
              <TextField
                label="Z Position"
                type="number"
                value={section.z || 0}
                onChange={(e) => {
                  const newSections = [...selectedObject?.zSections];
                  newSections[index] = { ...newSections[index], z: parseFloat(e.target.value) || 0 };
                  handlePropertyChange('zSections', newSections);
                }}
                onFocus={handleInputFocus}
                size="small"
                inputProps={{ step: 'any' }}
              />
              <TextField
                label="Min Radius"
                type="number"
                value={section.rMin || 0}
                onChange={(e) => {
                  const newSections = [...selectedObject?.zSections];
                  newSections[index] = { ...newSections[index], rMin: parseFloat(e.target.value) || 0 };
                  handlePropertyChange('zSections', newSections);
                }}
                onFocus={handleInputFocus}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Max Radius"
                type="number"
                value={section.rMax || 0}
                onChange={(e) => {
                  const newSections = [...selectedObject?.zSections];
                  newSections[index] = { ...newSections[index], rMax: parseFloat(e.target.value) || 0 };
                  handlePropertyChange('zSections', newSections);
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
                    handlePropertyChange('zSections', newSections);
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
              const lastZ = newSections.length > 0 ? newSections[newSections.length - 1].z + 5 : 0;
              newSections.push({ z: lastZ, rMin: 0, rMax: 5 });
              handlePropertyChange('zSections', newSections);
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
