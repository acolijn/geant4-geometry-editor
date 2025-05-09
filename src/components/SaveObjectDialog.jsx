import React, { useState } from 'react';
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
  Alert
} from '@mui/material';

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
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription('');
      setError('');
      setSuccess('');
      setIsSaving(false);
    }
  }, [open, defaultName]);
  
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
      // Call the onSave callback with the name and description
      const result = await onSave(sanitizedName, description, objectData);
      
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
  
  return (
    <Dialog 
      open={open} 
      onClose={isSaving ? undefined : onClose}
      maxWidth="sm"
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
          
          <TextField
            label="Object Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            margin="normal"
            disabled={isSaving}
            helperText="Use only letters, numbers, underscores, and hyphens"
            required
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
            helperText="Optional: Add a description to help identify this object later"
          />
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={isSaving || !name.trim()}
          startIcon={isSaving ? <CircularProgress size={20} /> : null}
        >
          {isSaving ? 'Saving...' : 'Save Object'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveObjectDialog;
