import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { instanceTracker } from '../utils/InstanceTracker';

/**
 * A simple dialog for updating compound objects by source ID
 */
const UpdateCompoundDialog = ({
  open,
  onClose,
  geometries,
  setGeometries,
  sourceObject,
  sourceDescendants,
  sourceId
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState(null);
  
  // Handle updating all instances
  const handleUpdate = () => {
    if (!sourceId || !sourceObject || !Array.isArray(sourceDescendants)) {
      setResult({
        success: false,
        message: 'Invalid source data',
        count: 0
      });
      return;
    }
    
    setIsUpdating(true);
    setResult(null);
    
    try {
      // Use the instance tracker to update all instances with this source ID
      const updateResult = instanceTracker.updateCompoundObjects(
        geometries,
        sourceObject,
        sourceDescendants,
        sourceId
      );
      
      setResult(updateResult);
      
      // Update the geometries state if successful
      if (updateResult.success && updateResult.newGeometries) {
        setGeometries(updateResult.newGeometries);
      }
      
      // Close the dialog after a short delay if successful
      if (updateResult.success) {
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setIsUpdating(false);
      }
    } catch (error) {
      console.error('Error updating compound objects:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`,
        count: 0
      });
      setIsUpdating(false);
    }
  };
  
  // Safely check if we have valid data to display
  const isDataValid = sourceId && sourceObject && sourceObject.name && Array.isArray(sourceDescendants);
  
  return (
    <Dialog 
      open={open} 
      onClose={() => !isUpdating && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Update Compound Objects</DialogTitle>
      <DialogContent>
        {!isDataValid ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            Invalid object data. Please try importing again.
          </Alert>
        ) : !result ? (
          <>
            <Typography variant="body1" paragraph>
              Update all instances of "{sourceObject.name}" with the latest properties?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Each instance will maintain its position, rotation, and mother volume
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • All child objects will be updated automatically
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Source object has {sourceDescendants.length} child objects
            </Typography>
          </>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Alert 
              severity={result.success ? "success" : "error"}
              sx={{ mb: 2 }}
            >
              {result.message}
            </Alert>
            
            {result.success && (
              <Typography variant="body2">
                Updated {result.count} objects in total
              </Typography>
            )}
          </Box>
        )}
        
        {isUpdating && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          color="primary"
          disabled={isUpdating}
        >
          {result?.success ? 'Close' : 'Cancel'}
        </Button>
        {!result && isDataValid && (
          <Button 
            onClick={handleUpdate} 
            variant="contained" 
            color="primary"
            disabled={isUpdating}
          >
            Update All Instances
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UpdateCompoundDialog;
