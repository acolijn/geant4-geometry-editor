/**
 * CreateCategoryDialog.jsx
 * Dialog for creating a new object category
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress
} from '@mui/material';

const CreateCategoryDialog = ({
  open,
  onClose,
  isLoading,
  categoryName,
  onCategoryNameChange,
  onCreate
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
    >
      <DialogTitle>Create New Category</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Category Name"
          type="text"
          fullWidth
          value={categoryName}
          onChange={(e) => onCategoryNameChange(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={onCreate}
          variant="contained"
          disabled={isLoading || !categoryName.trim()}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateCategoryDialog;
