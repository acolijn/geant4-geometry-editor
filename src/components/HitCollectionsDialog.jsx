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

  // Handle adding a new hit collection
  const handleAddCollection = () => {
    // Validate the new collection name
    if (!newCollectionName.trim()) {
      setError('Collection name cannot be empty');
      return;
    }

    if (collections.includes(newCollectionName)) {
      setError('Collection name must be unique');
      return;
    }

    // Add the new collection
    const updatedCollections = [...collections, newCollectionName];
    setCollections(updatedCollections);
    setNewCollectionName('');
    setError('');
  };

  // Handle removing a hit collection
  const handleRemoveCollection = (index) => {
    // Don't allow removing the default collection
    if (collections[index] === 'MyHitsCollection') {
      setError('Cannot remove the default collection');
      return;
    }

    const updatedCollections = [...collections];
    updatedCollections.splice(index, 1);
    setCollections(updatedCollections);
  };

  // Handle saving changes
  const handleSave = () => {
    onUpdateHitCollections(collections);
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
