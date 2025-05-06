import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';

/**
 * Dialog component that asks the user if they want to update all instances
 * of the same object when one instance is edited and saved.
 */
const UpdateInstancesDialog = ({
  open,
  onClose,
  onUpdateAll,
  instanceCount,
  objectName,
  isLoading
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={() => !isLoading && onClose(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Update Related Instances</DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          You've edited an object that has {instanceCount} other {instanceCount === 1 ? 'instance' : 'instances'} in your project.
        </Typography>
        <Typography variant="body1" paragraph>
          Would you like to update all other instances of "{objectName}" with your changes?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Each instance will maintain its unique position, rotation, and mother volume
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Properties like dimensions, material, and other shape-specific attributes will be updated
        </Typography>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => onClose(false)} 
          color="primary"
          disabled={isLoading}
        >
          No, Skip Update
        </Button>
        <Button 
          onClick={() => onUpdateAll()} 
          variant="contained" 
          color="primary"
          disabled={isLoading}
        >
          Yes, Update All Instances
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpdateInstancesDialog;
