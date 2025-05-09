import React, { useState, useEffect } from 'react';
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
      // Import dynamically to avoid server-side issues
      const { listObjects } = await import('../utils/ObjectStorage');
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
      // Find top-level instances of this object type in the scene
      const baseName = objectType.name;
      
      // Collect all top-level instances from the scene
      const foundInstances = [];
      
      // Helper function to check if an object is a top-level instance of the selected type
      const isTopLevelInstance = (obj) => {
        // Parse the object name to extract the base name and component name
        const nameParts = obj.name.split('_');
        if (nameParts.length < 2) return false;
        
        const objBaseName = nameParts[0];
        const componentName = nameParts[1];
        
        // Check if this is a top-level object of the selected type
        // A top-level object will have the same component name as the object type name
        return objBaseName === baseName && componentName === baseName;
      };
      
      // Check the world object
      if (isTopLevelInstance(geometries.world)) {
        foundInstances.push({
          id: 'world',
          name: geometries.world.name,
          type: geometries.world.type,
          position: geometries.world.position,
          rotation: geometries.world.rotation
        });
      }
      
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
      const { loadObject } = await import('../utils/ObjectStorage');
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
          Select the instances you want to update
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
                      secondary={`Type: ${instance.type}`}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
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
