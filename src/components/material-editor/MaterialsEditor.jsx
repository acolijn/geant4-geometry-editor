import React, { useState, useEffect } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Import the color picker component
import ColorPicker from './components/ColorPicker';

// Import the material handlers
import { createMaterialHandlers } from './utils/materialHandlers';

/**
 * Material editor for browsing, creating, and updating material definitions.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.materials - Material map keyed by material name.
 * @param {Function} props.onUpdateMaterials - Callback that receives updated materials.
 * @returns {JSX.Element} Materials editor UI.
 */
const MaterialsEditor = ({ materials, onUpdateMaterials }) => {
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    type: 'nist',
    density: 1.0,
    density_unit: 'g/cm3',
    state: 'solid',
    temperature: 293.15,
    temperature_unit: 'kelvin',
    composition: {},
    color: [0.5, 0.5, 0.5, 1.0] // Default color (RGBA)
  });
  const [elementName, setElementName] = useState('');
  const [elementCount, setElementCount] = useState(1);
  const [editElementName, setEditElementName] = useState('');
  const [editElementCount, setEditElementCount] = useState(1);

  // Create material handlers
  const {
    handleSelectMaterial,
    handleUpdateMaterial,
    handleDeleteMaterial,
    handleAddElement,
    handleRemoveElement,
    handleAddMaterial
  } = createMaterialHandlers({
    materials,
    onUpdateMaterials,
    setSelectedMaterial,
    setNewMaterial,
    setElementName,
    setElementCount,
    setDialogOpen
  });
  
  // Reset edit element fields when selected material changes
  useEffect(() => {
    setEditElementName('');
    setEditElementCount(1);
  }, [selectedMaterial]);

  const renderMaterialList = () => {
    return (
      <List dense>
        {Object.keys(materials).map((name) => (
          <ListItem 
            key={name} 
            button 
            selected={selectedMaterial === name}
            onClick={() => handleSelectMaterial(name)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              '&.Mui-selected': {
                backgroundColor: '#e3f2fd',
              }
            }}
          >
            {/* Color indicator */}
            {materials[name].color && (
              <Box 
                sx={{ 
                  width: 16, 
                  height: 16, 
                  borderRadius: '50%', 
                  mr: 1,
                  backgroundColor: materials[name].color ? 
                    `rgba(${materials[name].color[0] * 255}, ${materials[name].color[1] * 255}, ${materials[name].color[2] * 255}, ${materials[name].color[3]})` : 
                    'transparent',
                  border: '1px solid #ccc'
                }} 
              />
            )}
            <ListItemText 
              primary={name} 
              secondary={materials[name].type === 'nist' ? 'NIST Material' : `Custom ${materials[name].type}`} 
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const renderMaterialEditor = () => {
    if (!selectedMaterial) {
      return (
        <Typography variant="body1" sx={{ p: 2 }}>
          Select a material to edit its properties
        </Typography>
      );
    }

    const material = materials[selectedMaterial];

    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">{selectedMaterial}</Typography>
        
        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>Material Type</InputLabel>
          <Select
            value={material.type || 'nist'}
            label="Material Type"
            onChange={(e) => handleUpdateMaterial('type', e.target.value, selectedMaterial)}
          >
            <MenuItem value="nist">NIST Material</MenuItem>
            <MenuItem value="element_based">Element Based</MenuItem>
            <MenuItem value="compound">Compound</MenuItem>
          </Select>
        </FormControl>
        
        {material.type === 'nist' ? (
          <TextField
            label="NIST Material Name"
            value={material.name || ''}
            onChange={(e) => handleUpdateMaterial('name', e.target.value, selectedMaterial)}
            fullWidth
            margin="normal"
            size="small"
          />
        ) : (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Physical Properties</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Density"
                type="number"
                value={material.density || 1.0}
                onChange={(e) => handleUpdateMaterial('density', parseFloat(e.target.value), selectedMaterial)}
                size="small"
              />
              <TextField
                label="Unit"
                value={material.density_unit || 'g/cm3'}
                onChange={(e) => handleUpdateMaterial('density_unit', e.target.value, selectedMaterial)}
                size="small"
              />
            </Box>
            
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>State</InputLabel>
              <Select
                value={material.state || 'solid'}
                label="State"
                onChange={(e) => handleUpdateMaterial('state', e.target.value, selectedMaterial)}
              >
                <MenuItem value="solid">Solid</MenuItem>
                <MenuItem value="liquid">Liquid</MenuItem>
                <MenuItem value="gas">Gas</MenuItem>
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                label="Temperature"
                type="number"
                value={material.temperature || 293.15}
                onChange={(e) => handleUpdateMaterial('temperature', parseFloat(e.target.value), selectedMaterial)}
                size="small"
              />
              <TextField
                label="Unit"
                value={material.temperature_unit || 'kelvin'}
                onChange={(e) => handleUpdateMaterial('temperature_unit', e.target.value, selectedMaterial)}
                size="small"
              />
            </Box>
            
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Composition</Typography>
            {(material.type === 'compound' || material.type === 'element_based') && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                <TextField
                  label="Element"
                  value={editElementName}
                  onChange={(e) => setEditElementName(e.target.value)}
                  size="small"
                />
                <TextField
                  label="Count"
                  type="number"
                  value={editElementCount}
                  onChange={(e) => setEditElementCount(parseFloat(e.target.value))}
                  size="small"
                />
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="primary" 
                  onClick={() => {
                    if (editElementName) {
                      handleUpdateMaterial(
                        'composition', 
                        { ...material.composition, [editElementName]: editElementCount },
                        selectedMaterial
                      );
                      setEditElementName('');
                      setEditElementCount(1);
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
            )}
            <List dense>
              {material.composition && Object.entries(material.composition).map(([element, count]) => (
                <ListItem key={element}>
                  <ListItemText primary={`${element}: ${count}`} />
                  <ListItemSecondaryAction>
                    <Button 
                      size="small" 
                      color="error" 
                      onClick={() => {
                        const updatedComposition = { ...material.composition };
                        delete updatedComposition[element];
                        handleUpdateMaterial('composition', updatedComposition, selectedMaterial);
                      }}
                    >
                      Remove
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* Color Section */}
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Material Color</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ColorPicker 
              color={material.color || [0.5, 0.5, 0.5, 1.0]} 
              onChange={(color) => handleUpdateMaterial('color', color, selectedMaterial)}
            />
          </AccordionDetails>
        </Accordion>
        
        <Button 
          variant="outlined" 
          color="error" 
          onClick={() => handleDeleteMaterial(selectedMaterial)}
          sx={{ mt: 2 }}
        >
          Delete Material
        </Button>
      </Box>
    );
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Materials</Typography>
        <Button 
          variant="contained" 
          onClick={() => setDialogOpen(true)}
        >
          Add Material
        </Button>
      </Box>
      <Divider />
      <Box sx={{ display: 'flex', height: 'calc(100% - 60px)' }}>
        <Box sx={{ width: '40%', borderRight: '1px solid rgba(0, 0, 0, 0.12)', overflow: 'auto' }}>
          {renderMaterialList()}
        </Box>
        <Box sx={{ width: '60%', overflow: 'auto' }}>
          {renderMaterialEditor()}
        </Box>
      </Box>
      
      {/* Add Material Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Material</DialogTitle>
        <DialogContent>
          <TextField
            label="Material Name"
            value={newMaterial.name}
            onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
            fullWidth
            margin="normal"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Material Type</InputLabel>
            <Select
              value={newMaterial.type}
              label="Material Type"
              onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })}
            >
              <MenuItem value="nist">NIST Material</MenuItem>
              <MenuItem value="element_based">Element Based</MenuItem>
              <MenuItem value="compound">Compound</MenuItem>
            </Select>
          </FormControl>
          
          {newMaterial.type === 'nist' ? (
            <TextField
              label="NIST Material Name"
              value={newMaterial.name}
              onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
              fullWidth
              margin="normal"
            />
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ mt: 2 }}>Physical Properties</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label="Density"
                  type="number"
                  value={newMaterial.density}
                  onChange={(e) => setNewMaterial({ ...newMaterial, density: parseFloat(e.target.value) })}
                />
                <TextField
                  label="Unit"
                  value={newMaterial.density_unit}
                  onChange={(e) => setNewMaterial({ ...newMaterial, density_unit: e.target.value })}
                />
              </Box>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>State</InputLabel>
                <Select
                  value={newMaterial.state}
                  label="State"
                  onChange={(e) => setNewMaterial({ ...newMaterial, state: e.target.value })}
                >
                  <MenuItem value="solid">Solid</MenuItem>
                  <MenuItem value="liquid">Liquid</MenuItem>
                  <MenuItem value="gas">Gas</MenuItem>
                </Select>
              </FormControl>
              
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <TextField
                  label="Temperature"
                  type="number"
                  value={newMaterial.temperature}
                  onChange={(e) => setNewMaterial({ ...newMaterial, temperature: parseFloat(e.target.value) })}
                />
                <TextField
                  label="Unit"
                  value={newMaterial.temperature_unit}
                  onChange={(e) => setNewMaterial({ ...newMaterial, temperature_unit: e.target.value })}
                />
              </Box>
              
              <Typography variant="subtitle1" sx={{ mt: 2 }}>Composition</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="Element"
                  value={elementName}
                  onChange={(e) => setElementName(e.target.value)}
                />
                <TextField
                  label="Count"
                  type="number"
                  value={elementCount}
                  onChange={(e) => setElementCount(e.target.value)}
                />
                <Button size="small" color="primary" onClick={() => handleAddElement(elementName, elementCount, newMaterial)}>
                  Add
                </Button>
              </Box>
              
              <List dense>
                {Object.entries(newMaterial.composition).map(([element, count]) => (
                  <ListItem key={element}>
                    <ListItemText primary={`${element}: ${count}`} />
                    <ListItemSecondaryAction>
                      <Button size="small" color="error" onClick={() => handleRemoveElement(element, newMaterial)}>
                        Remove
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {/* Color Picker for new material */}
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Material Color</Typography>
          <ColorPicker 
            color={newMaterial.color} 
            onChange={(color) => setNewMaterial({ ...newMaterial, color })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleAddMaterial(newMaterial)} variant="contained" color="primary">
            Add Material
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default MaterialsEditor;
