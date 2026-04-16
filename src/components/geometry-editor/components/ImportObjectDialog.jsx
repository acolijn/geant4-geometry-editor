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
import { debugLog } from '../../../utils/logger.js';

/**
 * Dialog for importing a JSON object from the objects directory.
 * Appends raw JSON volumes to the primary JSON state.
 * When incoming volume names conflict with existing ones, a resolution
 * dialog offers: replace definition (keep placements), import as new copy, or skip.
 */
const ImportObjectDialog = ({
  open,
  onClose,
  onImportMaterials,
  onAppendJsonVolumes,
  onReplaceJsonVolumes,
  jsonData,
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
  
  // Conflict resolution state
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictingNames, setConflictingNames] = useState([]);
  const [pendingImportData, setPendingImportData] = useState(null);

  // Handle importing the selected object
  const handleImport = async () => {
    if (!selectedObject) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await loadObject(selectedObject.fileName);

      if (result.success) {
        debugLog('handleImport:: result.data', result.data);

        const objectData = result.data;
        const objectJson = objectData.volumes ? objectData : { volumes: [objectData] };

        // Detect name conflicts with existing project volumes
        const existingNames = new Set((jsonData?.volumes || []).map(v => v.name));
        const conflicts = objectJson.volumes
          .map(v => v.name)
          .filter(n => existingNames.has(n));

        if (conflicts.length > 0) {
          // Pause and ask the user how to resolve
          setPendingImportData(objectJson);
          setConflictingNames(conflicts);
          setConflictDialogOpen(true);
          setIsLoading(false);
          return;
        }

        // No conflicts — append directly
        onAppendJsonVolumes(objectJson.volumes);
        if (objectData.materials) {
          onImportMaterials({ ...objectData.materials, ...materials });
        }
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

  // Conflict resolution: replace definitions, keep existing placements
  const handleConflictReplace = () => {
    if (!pendingImportData) return;
    setConflictDialogOpen(false);
    onReplaceJsonVolumes(pendingImportData.volumes);
    if (pendingImportData.materials) {
      onImportMaterials({ ...pendingImportData.materials, ...materials });
    }
    setPendingImportData(null);
    onClose();
  };

  // Conflict resolution: rename conflicting volumes and import as new copies
  const handleConflictImportCopy = () => {
    if (!pendingImportData) return;
    setConflictDialogOpen(false);

    const existingNames = new Set((jsonData?.volumes || []).map(v => v.name));
    const renamedVolumes = pendingImportData.volumes.map(vol => {
      if (!existingNames.has(vol.name)) return vol;

      // Find a unique name by appending _1, _2, …
      let suffix = 1;
      let newName = `${vol.name}_${suffix}`;
      while (existingNames.has(newName)) {
        suffix++;
        newName = `${vol.name}_${suffix}`;
      }
      existingNames.add(newName); // reserve it for subsequent volumes

      const renamed = { ...vol, name: newName };
      if (vol.g4name === vol.name) renamed.g4name = newName;
      // Rename top-level placements to match new volume name
      if (vol.placements) {
        renamed.placements = vol.placements.map((pl, i) => ({
          ...pl,
          name: `${newName}_${String(i).padStart(3, '0')}`,
          g4name: `${newName}_${String(i).padStart(3, '0')}`,
        }));
      }
      // For compound volumes: update internal component parent references
      // so child placements point to the renamed parent placement names
      if (vol.components) {
        const oldPlacementNames = new Set((vol.placements || []).map(pl => pl.name));
        const newPlacementNames = (renamed.placements || []).map(pl => pl.name);
        const oldToNew = new Map(
          [...oldPlacementNames].map((oldName, i) => [oldName, newPlacementNames[i]])
        );
        renamed.components = vol.components.map(comp => ({
          ...comp,
          placements: (comp.placements || []).map(pl => ({
            ...pl,
            parent: oldToNew.get(pl.parent) ?? pl.parent,
          })),
        }));
      }
      return renamed;
    });

    onAppendJsonVolumes(renamedVolumes);
    if (pendingImportData.materials) {
      onImportMaterials({ ...pendingImportData.materials, ...materials });
    }
    setPendingImportData(null);
    onClose();
  };

  // Conflict resolution: cancel the import entirely
  const handleConflictCancel = () => {
    setConflictDialogOpen(false);
    setPendingImportData(null);
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
    
    {/* Conflict resolution dialog */}
    <Dialog
      open={conflictDialogOpen}
      onClose={handleConflictCancel}
      aria-labelledby="conflict-dialog-title"
    >
      <DialogTitle id="conflict-dialog-title">
        Name Conflict Detected
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          The following volume{conflictingNames.length > 1 ? 's' : ''} already exist{conflictingNames.length === 1 ? 's' : ''} in this project:
        </DialogContentText>
        <Box component="ul" sx={{ mt: 1, mb: 1, pl: 3 }}>
          {conflictingNames.map(name => (
            <li key={name}>
              <Typography variant="body2">{name}</Typography>
            </li>
          ))}
        </Box>
        <DialogContentText>
          How would you like to handle this?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, p: 2 }}>
        <Button onClick={handleConflictReplace} variant="contained" color="primary" fullWidth>
          Replace definition, keep placements
        </Button>
        <Button onClick={handleConflictImportCopy} variant="outlined" fullWidth>
          Import as new copy (rename)
        </Button>
        <Button onClick={handleConflictCancel} fullWidth>
          Cancel
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
