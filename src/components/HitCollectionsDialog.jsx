import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Typography,
  Box,
  Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

/**
 * Dialog component for managing hit collections
 * 
 * @param {Object} props Component props
 * @param {boolean} props.open Whether the dialog is open
 * @param {Function} props.onClose Function to call when the dialog is closed
 * @param {string[]} props.hitCollections Array of hit collection names
 * @param {Function} props.onUpdateHitCollections Function to call when hit collections are updated
 */
const HitCollectionsDialog = ({ open, onClose, hitCollections, onUpdateHitCollections }) => {
  // State for the list of hit collections
  const [collections, setCollections] = useState(hitCollections || ['MyHitsCollection']);
  // State for the new collection name being added
  const [newCollectionName, setNewCollectionName] = useState('');
  // Error state for validation
  const [error, setError] = useState('');

  // Update collections when props change
  useEffect(() => {
    setCollections(hitCollections || ['MyHitsCollection']);
  }, [hitCollections]);

  /**
   * Handle adding a new hit collection
   * Validates the collection name before adding
   */
  const handleAddCollection = () => {
    const trimmedName = newCollectionName.trim();
    
    // Validate the new collection name
    if (!trimmedName) {
      setError('Collection name cannot be empty');
      return;
    }
    
    // Check for special characters that might cause issues
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedName)) {
      setError('Collection name can only contain letters, numbers, and underscores');
      return;
    }

    if (collections.includes(trimmedName)) {
      setError('Collection name must be unique');
      return;
    }

    // Add the new collection
    const updatedCollections = [...collections, trimmedName];
    setCollections(updatedCollections);
    setNewCollectionName('');
    setError('');
  };

  /**
   * Handle removing a hit collection
   * Prevents removal of the default collection
   * 
   * @param {number} index Index of the collection to remove
   */
  const handleRemoveCollection = (index) => {
    // Validate the index
    if (index < 0 || index >= collections.length) {
      console.error(`Invalid collection index: ${index}`);
      return;
    }
    
    // Don't allow removing the default collection
    if (collections[index] === 'MyHitsCollection') {
      setError('Cannot remove the default collection');
      return;
    }

    // Create a new array without the removed collection
    const updatedCollections = [...collections];
    updatedCollections.splice(index, 1);
    setCollections(updatedCollections);
    
    // Clear any previous error messages
    setError('');
  };

  /**
   * Handle saving changes to hit collections
   * Updates the parent component with the new collections and closes the dialog
   */
  const handleSave = () => {
    // Ensure we always have at least the default collection
    if (!collections.includes('MyHitsCollection')) {
      const updatedCollections = ['MyHitsCollection', ...collections];
      onUpdateHitCollections(updatedCollections);
    } else {
      onUpdateHitCollections(collections);
    }
    
    // Close the dialog
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Hit Collections</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Hit collections are used to store and analyze detector hits during simulation.
          Each active volume can be assigned to a specific hit collection.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: 2 }}>
          <TextField
            label="New Collection Name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            error={!!error}
            helperText={error}
            fullWidth
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCollection}
          >
            Add
          </Button>
        </Box>

        <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
          <List>
            {collections.map((collection, index) => (
              <React.Fragment key={collection}>
                <ListItem>
                  <ListItemText
                    primary={collection}
                    secondary={collection === 'MyHitsCollection' ? 'Default collection' : ''}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveCollection(index)}
                      disabled={collection === 'MyHitsCollection'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < collections.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HitCollectionsDialog;
