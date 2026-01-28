import React, { useState, useEffect } from 'react';
import { listObjects, loadObject } from '../utils/ObjectStorage';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  TextField,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import UpdateIcon from '@mui/icons-material/Update';

/**
 * Dialog for updating instances of objects in the scene
 */
const UpdateObjectsDialog = ({
  open,
  onClose,
  onUpdate,
  geometries
}) => {
  const [objectTypes, setObjectTypes] = useState([]);
  const [filteredObjectTypes, setFilteredObjectTypes] = useState([]);
  const [instances, setInstances] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedInstances, setSelectedInstances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [objectDetails, setObjectDetails] = useState(null);
  const [step, setStep] = useState('types'); // 'types' or 'instances'
  
  // Load the list of available object types when the dialog opens
  useEffect(() => {
    if (open) {
      loadObjectTypes();
    }
  }, [open]);
  
  // Filter object types when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredObjectTypes(objectTypes);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = objectTypes.filter(obj => 
        obj.name.toLowerCase().includes(term) || 
        obj.description.toLowerCase().includes(term)
      );
      setFilteredObjectTypes(filtered);
    }
  }, [searchTerm, objectTypes]);
  
  // Load the list of available object types
  const loadObjectTypes = async () => {
    setIsLoading(true);
    setError('');
    setSelectedType(null);
    setObjectDetails(null);
    setStep('types');
    
    try {
      const objectsList = await listObjects();
      
      // Sort by name
      objectsList.sort((a, b) => a.name.localeCompare(b.name));
      
      setObjectTypes(objectsList);
      setFilteredObjectTypes(objectsList);
    } catch (error) {
      console.error('Error loading object types:', error);
      setError(`Error loading object types: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle selecting an object type
  const handleSelectType = async (objectType) => {
    setSelectedType(objectType);
    setObjectDetails(objectType);
    setIsLoading(true);
    setError('');
    
    try {
      // Load the object definition to get more information about it
      let objectDefinition = null;
      try {
        const result = await loadObject(objectType.fileName);
        if (result.success && result.data) {
          objectDefinition = result.data;
          console.log('Loaded object definition:', objectDefinition);
        }
      } catch (err) {
        console.warn('Could not load object definition:', err);
      }
      
      // Find top-level instances of this object type in the scene
      const baseName = objectType.name;
      console.log('Looking for instances of:', baseName);
      console.log('World object:', geometries.world);
      console.log('All volumes:', geometries.volumes);
      
      // Collect all top-level instances from the scene
      const foundInstances = [];
      
      // Helper function to check if an object is a top-level instance of the selected type
      const isTopLevelInstance = (obj) => {
        if (!obj.name) {
          console.log('Object has no name:', obj);
          return false;
        }
        
        console.log('Checking object:', obj.name);
        
        // Parse the object name to extract parts
        const nameParts = obj.name.split('_');
        console.log('Name parts:', nameParts);
        
        // Different detection strategies
        
        // Strategy 1: Check for BaseName_BaseName_ID pattern (e.g., PMT_PMT_0)
        if (nameParts.length >= 3) {
          const objBaseName = nameParts[0];
          const componentName = nameParts[1];
          const result = objBaseName === baseName && componentName === baseName;
          console.log('Strategy 1:', { objBaseName, componentName, baseName, result });
          if (result) return true;
        }
        
        // Strategy 2: Check if this is a mother object with children that have the same base name
        let hasMatchingChildren = false;
        geometries.volumes.forEach(volume => {
          if (volume.mother_volume === obj.name) {
            console.log('Found child with mother:', obj.name, volume.name);
            const childNameParts = volume.name.split('_');
            if (childNameParts.length > 0 && childNameParts[0] === baseName) {
              hasMatchingChildren = true;
              console.log('Child matches base name:', volume.name);
            }
          }
        });
        
        if (hasMatchingChildren) {
          console.log('Strategy 2: Has matching children');
          return true;
        }
        
        // Strategy 3: Check if the name exactly matches the base name
        if (obj.name === baseName) {
          console.log('Strategy 3: Exact name match');
          return true;
        }
        
        // Strategy 4: Check if the name contains the base name
        // This is a fallback for simpler naming schemes
        const result = obj.name.includes(baseName);
        console.log('Strategy 4: Name includes base name:', result);
        return result;
      };
      
      // APPROACH 1: Use the object definition to find matching structures
      if (objectDefinition && objectDefinition.descendants) {
        console.log('Using structure matching approach');
        // Get the structure of the object (number and types of descendants)
        const objectStructure = {
          mainType: objectDefinition.object.type,
          descendantTypes: objectDefinition.descendants.map(d => d.type),
          descendantCount: objectDefinition.descendants.length
        };
        console.log('Object structure:', objectStructure);
        
        // Find objects that could be the main object based on their descendants
        const potentialMainObjects = [];
        
        // Skip checking the world object - we don't want to update the world
        // as it's a special object that shouldn't be treated as a compound object
        
        // Check all volumes as potential main objects
        geometries.volumes.forEach((volume, index) => {
          let descendants = [];
          geometries.volumes.forEach(vol => {
            if (vol.mother_volume === volume.name) {
              descendants.push(vol);
            }
          });
          
          if (descendants.length > 0) {
            potentialMainObjects.push({
              id: `volume-${index}`,
              object: volume,
              descendants: descendants
            });
          }
        });
        
        console.log('Potential main objects:', potentialMainObjects);
        
        // Check each potential main object to see if its structure matches the object definition
        potentialMainObjects.forEach(candidate => {
          console.log('Checking candidate:', candidate.object.name);
          
          // Simple structure matching - just check if it has a similar number of descendants
          // and if the main object type matches
          const structureMatches = 
            candidate.descendants.length > 0 &&
            (candidate.object.type === objectStructure.mainType ||
             candidate.object.name.includes(baseName));
          
          if (structureMatches) {
            console.log('Found matching structure:', candidate.object.name);
            foundInstances.push({
              id: candidate.id,
              name: candidate.object.name,
              type: candidate.object.type,
              position: candidate.object.position,
              rotation: candidate.object.rotation
            });
          }
        });
      }
      
      // APPROACH 2: Use name-based detection as a fallback
      if (foundInstances.length === 0) {
        console.log('Falling back to name-based detection');
        
        // Skip checking the world object - we don't want to update the world
        
        // Check all volumes
        geometries.volumes.forEach((volume, index) => {
          if (isTopLevelInstance(volume)) {
            foundInstances.push({
              id: `volume-${index}`,
              name: volume.name,
              type: volume.type,
              position: volume.position,
              rotation: volume.rotation
            });
          }
        });
      }
      
      // APPROACH 3: Last resort - just find any objects with similar types or names
      if (foundInstances.length === 0 && objectDefinition) {
        console.log('Using last resort approach');
        const mainObjectType = objectDefinition.object.type;
        
        // Skip checking the world object - we don't want to update the world
        
        // Check all volumes
        geometries.volumes.forEach((volume, index) => {
          if (volume.type === mainObjectType || 
              volume.name.includes(baseName)) {
            foundInstances.push({
              id: `volume-${index}`,
              name: volume.name,
              type: volume.type,
              position: volume.position,
              rotation: volume.rotation
            });
          }
        });
      }
      
      setInstances(foundInstances);
      setSelectedInstances([]);
      setStep('instances');
    } catch (error) {
      console.error('Error finding instances:', error);
      setError(`Error finding instances: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle toggling instance selection
  const handleToggleInstance = (instanceId) => {
    setSelectedInstances(prev => {
      if (prev.includes(instanceId)) {
        return prev.filter(id => id !== instanceId);
      } else {
        return [...prev, instanceId];
      }
    });
  };
  
  // Handle updating the selected instances
  const handleUpdateInstances = async () => {
    if (selectedInstances.length === 0 || !selectedType) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Load the object definition from storage
      const result = await loadObject(selectedType.fileName);
      
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to load object definition');
      }
      
      // Call the onUpdate callback with the selected instances and object data
      onUpdate(selectedInstances, result.data);
      onClose();
    } catch (error) {
      console.error('Error updating instances:', error);
      setError(`Error updating instances: ${error.message}`);
      setIsLoading(false);
    }
  };
  
  // Format date string
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return dateString;
    }
  };
  
  // Render the object types selection step
  const renderObjectTypesStep = () => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <TextField
          placeholder="Search object types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ width: '100%' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', height: '400px' }}>
        {/* Object types list */}
        <Paper 
          variant="outlined" 
          sx={{ 
            width: '50%', 
            mr: 2, 
            overflow: 'auto',
            bgcolor: 'background.paper'
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : filteredObjectTypes.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No object types found
              </Typography>
            </Box>
          ) : (
            <List dense>
              {filteredObjectTypes.map((objectType) => (
                <React.Fragment key={objectType.fileName}>
                  <ListItem 
                    button 
                    selected={selectedType?.fileName === objectType.fileName}
                    onClick={() => handleSelectType(objectType)}
                  >
                    <ListItemText 
                      primary={objectType.name} 
                      secondary={objectType.description.length > 50 
                        ? `${objectType.description.substring(0, 50)}...` 
                        : objectType.description}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        onClick={() => setObjectDetails(objectType)}
                        size="small"
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
        
        {/* Object details */}
        <Paper 
          variant="outlined" 
          sx={{ 
            width: '50%', 
            p: 2, 
            overflow: 'auto',
            bgcolor: 'background.paper'
          }}
        >
          {objectDetails ? (
            <>
              <Typography variant="h6">{objectDetails.name}</Typography>
              <Divider sx={{ my: 1 }} />
              
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2" paragraph>
                {objectDetails.description || 'No description provided'}
              </Typography>
              
              <Typography variant="subtitle2" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body2" paragraph>
                {formatDate(objectDetails.updatedAt)}
              </Typography>
              
              <Typography variant="subtitle2" color="text.secondary">
                File
              </Typography>
              <Typography variant="body2" paragraph>
                {objectDetails.fileName}
              </Typography>
            </>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                Select an object type to view details
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </>
  );
  
  // Render the instances selection step
  const renderInstancesStep = () => (
    <>
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="outlined" 
          onClick={() => setStep('types')}
          sx={{ mb: 2 }}
        >
          Back to Object Types
        </Button>
        
        <Typography variant="h6">
          Instances of {selectedType?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select the instances you want to update. Each instance will be updated along with all its components.
        </Typography>
      </Box>
      
      <Box sx={{ height: '400px', overflow: 'auto' }}>
        <Paper variant="outlined" sx={{ bgcolor: 'background.paper' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : instances.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No instances found in the scene
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">
                  Found {instances.length} instance(s)
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => {
                    if (selectedInstances.length === instances.length) {
                      setSelectedInstances([]);
                    } else {
                      setSelectedInstances(instances.map(inst => inst.id));
                    }
                  }}
                >
                  {selectedInstances.length === instances.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>
              <Divider />
              <List dense>
                {instances.map((instance) => (
                  <React.Fragment key={instance.id}>
                    <ListItem>
                      <Checkbox
                        edge="start"
                        checked={selectedInstances.includes(instance.id)}
                        onChange={() => handleToggleInstance(instance.id)}
                      />
                      <ListItemText 
                        primary={instance.name} 
                        secondary={`Position: (${instance.position.x.toFixed(2)}, ${instance.position.y.toFixed(2)}, ${instance.position.z.toFixed(2)})`}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </>
          )}
        </Paper>
      </Box>
    </>
  );
  
  return (
    <Dialog 
      open={open} 
      onClose={isLoading ? undefined : onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Update Object Instances</DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {step === 'types' ? renderObjectTypesStep() : renderInstancesStep()}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={isLoading}
        >
          Cancel
        </Button>
        {step === 'instances' && (
          <Button 
            onClick={handleUpdateInstances} 
            variant="contained" 
            color="primary"
            disabled={isLoading || selectedInstances.length === 0}
            startIcon={isLoading ? <CircularProgress size={20} /> : <UpdateIcon />}
          >
            {isLoading ? 'Updating...' : `Update ${selectedInstances.length} Instance(s)`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UpdateObjectsDialog;
