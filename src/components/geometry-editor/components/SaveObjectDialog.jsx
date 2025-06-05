import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Paper,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';

/**
 * Dialog for saving a compound object with name and description
 */
const SaveObjectDialog = ({
  open,
  onClose,
  onSave,
  objectData,
  defaultName = ''
}) => {
  // Tab state (0 = New Object, 1 = Overwrite Existing)
  const [tabValue, setTabValue] = useState(0);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preserveComponentIds, setPreserveComponentIds] = useState(true); // Default to true
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Existing objects state
  const [existingObjects, setExistingObjects] = useState([]);
  const [filteredObjects, setFilteredObjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedObject, setSelectedObject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load existing objects when the dialog opens
  useEffect(() => {
    if (open) {
      loadExistingObjects();
      setTabValue(0);
      setName(defaultName);
      setDescription('');
      setError('');
      setSuccess('');
      setIsSaving(false);
      setSearchTerm('');
      setSelectedObject(null);
    }
  }, [open, defaultName]);
  
  // Filter objects when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredObjects(existingObjects);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = existingObjects.filter(obj => 
        obj.name.toLowerCase().includes(term) || 
        (obj.description && obj.description.toLowerCase().includes(term))
      );
      setFilteredObjects(filtered);
    }
  }, [searchTerm, existingObjects]);
  
  // Load the list of existing objects
  const loadExistingObjects = async () => {
    setIsLoading(true);
    try {
      // Import dynamically to avoid server-side issues
      const { listObjects } = await import('../utils/ObjectStorage');
      const objectsList = await listObjects();
      
      // Sort by name
      objectsList.sort((a, b) => a.name.localeCompare(b.name));
      
      setExistingObjects(objectsList);
      setFilteredObjects(objectsList);
    } catch (error) {
      console.error('Error loading objects:', error);
      setError(`Error loading objects: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle selecting an existing object
  const handleSelectObject = (object) => {
    setSelectedObject(object);
    setName(object.name);
    setDescription(object.description || '');
  };
  
  // Handle saving the object
  const handleSave = async () => {
    // Validate inputs
    if (!name.trim()) {
      setError('Please enter a name for the object');
      return;
    }
    
    // Sanitize name - only allow alphanumeric characters, underscores, and hyphens
    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    if (sanitizedName !== name.trim()) {
      setName(sanitizedName);
      setError('Name has been sanitized to remove special characters');
      return;
    }
    
    setIsSaving(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('XXX SaveObjectDialog:: onSave:: name', name);
      console.log('XXX SaveObjectDialog:: onSave:: description', description);
      console.log('XXX SaveObjectDialog:: onSave:: objectData', objectData);
      console.log('XXX SaveObjectDialog:: onSave:: preserveComponentIds', preserveComponentIds);
      
      // Call the onSave callback with the name, description, objectData, and preserveComponentIds flag
      const result = await onSave(sanitizedName, description, objectData, preserveComponentIds);
      
      if (result.success) {
        setSuccess(result.message || 'Object saved successfully');
        // Close after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(result.message || 'Error saving object');
      }
    } catch (error) {
      console.error('Error saving object:', error);
      setError(`Error saving object: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Render the Create New tab content
  const renderCreateNewTab = () => (
    <Box sx={{ mt: 1 }}>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        margin="normal"
        required
        disabled={isSaving}
        autoFocus
        placeholder="Enter a name for the new object"
      />
      
      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        margin="normal"
        multiline
        rows={3}
        disabled={isSaving}
        placeholder="Optional description"
      />
      
      <Box sx={{ mt: 2, mb: 1 }}>
        <Tooltip title="When enabled, existing component IDs will be preserved when overwriting an assembly. New components will get new IDs.">
          <FormControlLabel
            control={
              <Checkbox
                checked={preserveComponentIds}
                onChange={(e) => setPreserveComponentIds(e.target.checked)}
                disabled={isSaving}
                color="primary"
              />
            }
            label="Preserve component IDs"
          />
        </Tooltip>
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        The object will be saved with {objectData?.descendants?.length || 0} descendants.
        {preserveComponentIds && (
          <span>
            <br />
            Component IDs will be preserved when overwriting an existing assembly.
          </span>
        )}
      </Typography>
    </Box>
  );
  
  // Render the Overwrite Existing tab content
  const renderOverwriteTab = () => (
    <Box sx={{ mt: 1 }}>
      <TextField
        placeholder="Search existing objects..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fullWidth
        margin="normal"
        disabled={isSaving}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      
      <Paper variant="outlined" sx={{ mt: 2, height: '300px', overflow: 'auto' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={30} />
          </Box>
        ) : filteredObjects.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'No objects found matching your search' : 'No saved objects found'}
            </Typography>
          </Box>
        ) : (
          <List>
            {filteredObjects.map((object) => (
              <React.Fragment key={object.fileName}>
                <ListItemButton 
                  selected={selectedObject?.fileName === object.fileName}
                  onClick={() => handleSelectObject(object)}
                  disabled={isSaving}
                >
                  <ListItemText
                    primary={object.name}
                    secondary={
                      <>
                        {object.description && object.description.length > 50 
                          ? `${object.description.substring(0, 50)}...` 
                          : object.description || 'No description'}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          Last updated: {new Date(object.updatedAt).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
      
      {selectedObject && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Selected Object: {selectedObject.name}</Typography>
          
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={3}
            disabled={isSaving}
            placeholder="Edit or add to the description"
            helperText="You can modify the description when overwriting an existing object"
          />
          
          <Typography variant="caption" color="text.secondary">
            This object will be overwritten with the current selection, preserving the name and using the description above.
          </Typography>
        </Box>
      )}
    </Box>
  );
  
  return (
    <Dialog 
      open={open} 
      onClose={isSaving ? undefined : onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Save Compound Object</DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save this object to the library for reuse in other projects.
            Objects are stored in the "objects" directory of the application.
          </Typography>
          
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab 
              label="Create New" 
              icon={<AddIcon />} 
              iconPosition="start"
              disabled={isSaving}
            />
            <Tab 
              label="Overwrite Existing" 
              icon={<SaveIcon />} 
              iconPosition="start"
              disabled={isSaving}
            />
          </Tabs>
          
          {tabValue === 0 ? renderCreateNewTab() : renderOverwriteTab()}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={isSaving || (tabValue === 1 && !selectedObject)}
          startIcon={isSaving ? <CircularProgress size={20} /> : null}
        >
          {isSaving ? 'Saving...' : tabValue === 0 ? 'Save New' : 'Overwrite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveObjectDialog;
