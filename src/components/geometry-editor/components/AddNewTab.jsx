import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Alert
} from '@mui/material';
import TreeSelect from './TreeSelect';
import { renderMotherVolumeTree } from './motherVolumeUtils.jsx';

/**
 * AddNewTab Component
 * 
 * This component renders the UI for adding new geometry objects to the scene.
 * It includes options for importing existing objects, creating new primitive shapes,
 * and creating union solids by combining two or more existing objects.
 */
const AddNewTab = ({
  importAlert,
  handleCloseAlert,
  newGeometryType,
  setNewGeometryType,
  newMotherVolume,
  setNewMotherVolume,
  firstSolid,
  setFirstSolid,
  secondSolid,
  setSecondSolid,
  additionalComponents,
  additionalComponentsValues,
  handleAddComponent,
  handleRemoveComponent,
  handleAdditionalComponentChange,
  geometries,
  handleAddGeometry,
  setLoadObjectDialogOpen,
  setHitCollectionsDialogOpen,
  setUpdateObjectsDialogOpen
}) => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">Add New Geometry</Typography>
      
      {importAlert.show && (
        <Alert 
          severity={importAlert.severity} 
          sx={{ mt: 2, mb: 2 }}
          onClose={handleCloseAlert}
        >
          {importAlert.message}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, mb: 3 }}>
        <Typography variant="subtitle1">Import Existing Object</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setLoadObjectDialogOpen(true)}
            sx={{ flexGrow: 1 }}
          >
            Select From Library
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Import a previously exported object with its descendants. The object will be added with {newMotherVolume} as its mother volume.
        </Typography>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="subtitle1">Create New Primitive</Typography>
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
          <MenuItem value="trapezoid">Trapezoid</MenuItem>
          <MenuItem value="torus">Torus</MenuItem>
          <MenuItem value="ellipsoid">Ellipsoid</MenuItem>
          <MenuItem value="polycone">Polycone</MenuItem>
          <Divider />
          <MenuItem value="assembly">Assembly</MenuItem>
          <MenuItem value="union">Union Solid</MenuItem>
        </Select>
      </FormControl>
      
      {/* Additional fields for union solid */}
      {newGeometryType === 'union' && (
        <Box sx={{ mt: 2, mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Union Solid Configuration</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A union solid combines multiple existing solids. Select at least two solids to combine.
          </Typography>
          
          {/* Component selection section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Components</Typography>
            
            {/* First component (always required) */}
            <FormControl fullWidth margin="normal">
              <InputLabel>First Component</InputLabel>
              <Select
                label="First Component"
                value={firstSolid}
                onChange={(e) => setFirstSolid(e.target.value)}
              >
                <MenuItem value=""><em>Select a solid</em></MenuItem>
                {geometries.volumes.map((volume, index) => (
                  <MenuItem key={`first-${index}`} value={`volume-${index}`}>
                    {volume.name || `${volume.type.charAt(0).toUpperCase() + volume.type.slice(1)} ${index + 1}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Second component (always required) */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Second Component</InputLabel>
              <Select
                label="Second Component"
                value={secondSolid}
                onChange={(e) => setSecondSolid(e.target.value)}
                disabled={!firstSolid} // Disable until first component is selected
              >
                <MenuItem value=""><em>Select a solid</em></MenuItem>
                {geometries.volumes.map((volume, index) => (
                  <MenuItem 
                    key={`second-${index}`} 
                    value={`volume-${index}`}
                    disabled={`volume-${index}` === firstSolid} // Can't select the same solid twice
                  >
                    {volume.name || `${volume.type.charAt(0).toUpperCase() + volume.type.slice(1)} ${index + 1}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Additional components section */}
            {Array.from({ length: additionalComponents }).map((_, index) => (
              <FormControl fullWidth margin="normal" key={`additional-component-${index}`}>
                <InputLabel>Additional Component {index + 1}</InputLabel>
                <Select
                  label={`Additional Component ${index + 1}`}
                  value={additionalComponentsValues[index] || ''}
                  onChange={(e) => handleAdditionalComponentChange(index, e.target.value)}
                  disabled={!secondSolid} // Disable until second component is selected
                >
                  <MenuItem value=""><em>Select a solid</em></MenuItem>
                  {geometries.volumes.map((volume, volumeIndex) => (
                    <MenuItem 
                      key={`additional-${index}-${volumeIndex}`} 
                      value={`volume-${volumeIndex}`}
                      disabled={
                        `volume-${volumeIndex}` === firstSolid || 
                        `volume-${volumeIndex}` === secondSolid ||
                        additionalComponentsValues.includes(`volume-${volumeIndex}`)
                      } // Can't select duplicates
                    >
                      {volume.name || `${volume.type.charAt(0).toUpperCase() + volume.type.slice(1)} ${volumeIndex + 1}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
            
            {/* Add/Remove component buttons */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleAddComponent}
                disabled={!secondSolid} // Disable until at least two components are selected
                sx={{ flexGrow: 1 }}
              >
                Add Component
              </Button>
              
              <Button 
                variant="outlined" 
                size="small" 
                color="error"
                onClick={handleRemoveComponent}
                disabled={additionalComponents === 0} // Disable if no additional components
                sx={{ flexGrow: 1 }}
              >
                Remove Component
              </Button>
            </Box>
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Note: The union will create a new solid that combines all selected components.
            The original solids will remain unchanged. Components will be combined in the order they are listed.
          </Typography>
        </Box>
      )}
      
      <TreeSelect
        label="Mother Volume"
        value={newMotherVolume}
        onChange={(value) => setNewMotherVolume(value)}
        placeholder="Select a mother volume"
        renderValue={(value) => {
          // For World, just return World
          if (value === 'World') return 'World';
          
          // For other volumes, find the volume with this name and return its display name
          const motherVolume = geometries.volumes.find(vol => vol.name === value);
          return motherVolume ? (motherVolume.displayName || motherVolume.name) : value;
        }}
        renderTree={({ expandedNodes, toggleNodeExpansion, handleSelect, selectedValue }) => {
          return renderMotherVolumeTree({
            geometries,
            expandedNodes,
            toggleNodeExpansion,
            handleSelect,
            selectedValue,
            currentVolumeKey: null // No need to exclude any volume when adding new geometry
          });
        }}
        fullWidth
        margin="normal"
        size="small"
      />
      
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleAddGeometry}
        sx={{ mt: 2, mb: 2 }}
        fullWidth
      >
        Add Geometry
      </Button>
      
      <Button 
        variant="outlined" 
        color="secondary" 
        onClick={() => setHitCollectionsDialogOpen(true)}
        sx={{ mb: 4 }}
        fullWidth
      >
        Manage Hit Collections
      </Button>
    </Box>
  );
};

export default AddNewTab;
