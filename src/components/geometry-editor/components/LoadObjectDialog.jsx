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
  CircularProgress,
  Alert,
  Divider,
  Paper,
  TextField,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';

/**
 * Dialog for loading a compound object from the objects directory
 */
const LoadObjectDialog = ({
  open,
  onClose,
  onLoad,
  onAddNew
}) => {
  const [objects, setObjects] = useState([]);
  const [filteredObjects, setFilteredObjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedObject, setSelectedObject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [objectDetails, setObjectDetails] = useState(null);
  
  // Load the list of available objects when the dialog opens
  useEffect(() => {
    if (open) {
      loadObjectsList();
    }
  }, [open]);
  
  // Filter objects when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredObjects(objects);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = objects.filter(obj => 
        obj.name.toLowerCase().includes(term) || 
        obj.description.toLowerCase().includes(term)
      );
      setFilteredObjects(filtered);
    }
  }, [searchTerm, objects]);
  
  // Load the list of available objects
  const loadObjectsList = async () => {
    setIsLoading(true);
    setError('');
    setSelectedObject(null);
    setObjectDetails(null);
    
    try {
      // Import dynamically to avoid server-side issues
      const { listObjects } = await import('../utils/ObjectStorage');
      const objectsList = await listObjects();
      
      // Sort by name
      objectsList.sort((a, b) => a.name.localeCompare(b.name));
      
      setObjects(objectsList);
      setFilteredObjects(objectsList);
    } catch (error) {
      console.error('Error loading objects list:', error);
      setError(`Error loading objects: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle selecting an object
  const handleSelectObject = (object) => {
    setSelectedObject(object);
    setObjectDetails(object);
  };
  
  // Handle loading the selected object
  const handleLoad = async () => {
    if (!selectedObject) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Import dynamically to avoid server-side issues
      const { loadObject } = await import('../utils/ObjectStorage');
      const result = await loadObject(selectedObject.fileName);
      
      if (result.success) {
        onLoad(result.data);
        onClose();
      } else {
        setError(result.message || 'Error loading object');
      }
    } catch (error) {
      console.error('Error loading object:', error);
      setError(`Error loading object: ${error.message}`);
    } finally {
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
  
  return (
    <Dialog 
      open={open} 
      onClose={isLoading ? undefined : onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Load Compound Object</DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <TextField
              placeholder="Search objects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ width: '50%' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {
                onClose();
                if (onAddNew) onAddNew();
              }}
            >
              Add New Object
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', height: '400px' }}>
            {/* Objects list */}
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
              ) : filteredObjects.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No objects found
                  </Typography>
                </Box>
              ) : (
                <List dense>
                  {filteredObjects.map((object, index) => (
                    <React.Fragment key={object.fileName}>
                      <ListItem 
                        button 
                        selected={selectedObject?.fileName === object.fileName}
                        onClick={() => handleSelectObject(object)}
                      >
                        <ListItemText 
                          primary={object.name} 
                          secondary={object.description.length > 50 
                            ? `${object.description.substring(0, 50)}...` 
                            : object.description}
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleSelectObject(object)}
                            size="small"
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < filteredObjects.length - 1 && <Divider />}
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
                    Select an object to view details
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleLoad} 
          variant="contained" 
          disabled={isLoading || !selectedObject}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Loading...' : 'Load Object'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoadObjectDialog;
