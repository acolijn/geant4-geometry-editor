/**
 * SaveObjectDialog.jsx
 * Dialog for saving a geometry object to the library
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress
} from '@mui/material';

const SaveObjectDialog = ({
  open,
  onClose,
  isLoading,
  objectName,
  onObjectNameChange,
  selectedCategory,
  onCategoryChange,
  categories,
  onSave
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Save Object</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Object Name"
          type="text"
          fullWidth
          value={objectName}
          onChange={(e) => onObjectNameChange(e.target.value)}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            label="Category"
          >
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" sx={{ mt: 2 }}>
          This will save the currently selected object and all its descendants.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={onSave}
          variant="contained"
          disabled={isLoading || !objectName.trim()}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveObjectDialog;
