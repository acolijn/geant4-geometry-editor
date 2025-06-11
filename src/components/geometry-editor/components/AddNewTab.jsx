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
          return motherVolume ? (motherVolume.g4name || motherVolume.name) : value;
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
