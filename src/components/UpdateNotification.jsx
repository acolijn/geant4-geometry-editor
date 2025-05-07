import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Button,
  IconButton,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { instanceTracker } from '../utils/InstanceTracker';

/**
 * Component that shows a notification when updates are available
 */
const UpdateNotification = ({ onViewUpdates }) => {
  const [open, setOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({
    pendingSourceCount: 0,
    pendingInstanceCount: 0
  });
  
  // Listen for changes in pending updates
  useEffect(() => {
    const removeListener = instanceTracker.addUpdateListener((info) => {
      setUpdateInfo({
        pendingSourceCount: info.pendingSourceCount,
        pendingInstanceCount: info.pendingInstanceCount
      });
      
      // Show notification when new updates are available
      if (info.pendingInstanceCount > 0) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    });
    
    // Initial check
    const initialCount = instanceTracker.getPendingInstanceCount();
    if (initialCount > 0) {
      setUpdateInfo({
        pendingSourceCount: instanceTracker.getPendingUpdateCount(),
        pendingInstanceCount: initialCount
      });
      setOpen(true);
    }
    
    return () => removeListener();
  }, []);
  
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };
  
  const handleViewUpdates = () => {
    setOpen(false);
    if (onViewUpdates) {
      onViewUpdates();
    }
  };
  
  // Don't render anything if no updates
  if (updateInfo.pendingInstanceCount === 0) {
    return null;
  }
  
  return (
    <Snackbar
      open={open}
      autoHideDuration={10000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        severity="info"
        variant="filled"
        action={
          <>
            <Button 
              color="inherit" 
              size="small" 
              startIcon={<RefreshIcon />}
              onClick={handleViewUpdates}
            >
              View Updates
            </Button>
            <IconButton
              size="small"
              color="inherit"
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
      >
        <Box>
          <Typography variant="body2">
            {updateInfo.pendingInstanceCount} {updateInfo.pendingInstanceCount === 1 ? 'instance needs' : 'instances need'} updating
          </Typography>
          <Typography variant="caption">
            From {updateInfo.pendingSourceCount} {updateInfo.pendingSourceCount === 1 ? 'source' : 'sources'}
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default UpdateNotification;
