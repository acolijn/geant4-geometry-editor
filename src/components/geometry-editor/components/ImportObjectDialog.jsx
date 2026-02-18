import React, { useState, useEffect } from 'react';
import { listObjects, deleteObject, loadObject } from '../utils/ObjectStorage';
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
  InputAdornment,
  Tooltip,
  DialogContentText
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

/**
 * Dialog for importing a JSON object from the objects directory
 * This dialog specifically uses jsonToGeometry to convert the object to geometry
 */
const ImportObjectDialog = ({
  open,
  onClose,
  onImportGeometries,
  onImportMaterials,
  geometries,
  materials
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
  
  // Handle deleting an object
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [objectToDelete, setObjectToDelete] = useState(null);
  
  const handleDeleteClick = (event, object) => {
    event.stopPropagation(); // Prevent selecting the object when clicking delete
    setObjectToDelete(object);
    setDeleteConfirmOpen(true);
  };
  
  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setObjectToDelete(null);
  };
  
  const handleDeleteConfirm = async () => {
    if (!objectToDelete) return;
    
    setIsLoading(true);
    setDeleteConfirmOpen(false);
    
    try {
      const result = await deleteObject(objectToDelete.fileName);
      
      if (result.success) {
        // If the deleted object was selected, deselect it
        if (selectedObject && selectedObject.fileName === objectToDelete.fileName) {
          setSelectedObject(null);
          setObjectDetails(null);
        }
        
        // Reload the objects list
        await loadObjectsList();
      } else {
        setError(result.message || 'Error deleting object');
      }
    } catch (error) {
      console.error('Error deleting object:', error);
      setError(`Error deleting object: ${error.message}`);
    } finally {
      setIsLoading(false);
      setObjectToDelete(null);
    }
  };
  
  // Handle selecting an object
  const handleSelectObject = (object) => {
    setSelectedObject(object);
    setObjectDetails(object);
  };
  
  // Handle importing the selected object
  const handleImport = async () => {
    if (!selectedObject) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await loadObject(selectedObject.fileName);
      
      if (result.success) {
        // Import the jsonToGeometry function
        const { jsonToGeometry } = await import('../../json-viewer/utils/jsonToGeometry');
        
        // Create current geometry object
        const currentGeometry = {
          geometries: geometries,
          materials: materials
        };
        
        // Convert the object data to geometry
        console.log('handleImport:: result.data', result.data);
        console.log('handleImport:: currentGeometry', currentGeometry);
        const updatedGeometry = jsonToGeometry(result.data, currentGeometry);
        
        // Call the import callbacks with the updated geometry and materials
        onImportGeometries(updatedGeometry.geometries);
        onImportMaterials(updatedGeometry.materials);
        
        onClose();
      } else {
        setError(result.message || 'Error loading object');
      }
    } catch (error) {
      console.error('Error importing object:', error);
      setError(`Error importing object: ${error.message}`);
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
    } catch {
      return dateString;
    }
  };
  
  return (
    <>
      <Dialog 
        open={open} 
        onClose={isLoading ? undefined : onClose}
        maxWidth="md"
        fullWidth
      >
      <DialogTitle>Import Object From Library</DialogTitle>
      
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
                          <Tooltip title="View details">
                            <IconButton 
                              edge="end" 
                              onClick={() => handleSelectObject(object)}
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete object">
                            <IconButton 
                              edge="end" 
                              onClick={(e) => handleDeleteClick(e, object)}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
          onClick={handleImport} 
          variant="contained" 
          disabled={isLoading || !selectedObject}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Importing...' : 'Import Object'}
        </Button>
      </DialogActions>
    </Dialog>
    
    {/* Delete confirmation dialog */}
    <Dialog
      open={deleteConfirmOpen}
      onClose={handleDeleteCancel}
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <DialogTitle id="delete-dialog-title">
        Delete Object
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-dialog-description">
          Are you sure you want to delete "{objectToDelete?.name}"? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDeleteCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={isLoading}>
          {isLoading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default ImportObjectDialog;
