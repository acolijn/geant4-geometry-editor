import React, { useState, useEffect } from 'react';
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
  Checkbox,
  Divider,
  IconButton,
  Badge,
  Tooltip,
  Paper,
  Collapse,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Check as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { instanceTracker } from '../utils/InstanceTracker';

/**
 * Component for managing pending instance updates
 */
const UpdateInstancesManager = ({ onUpdateComplete, open: externalOpen, onClose }) => {
  const [open, setOpen] = useState(false);
  
  // Sync with external open state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [selectedSources, setSelectedSources] = useState({});
  const [expandedSources, setExpandedSources] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Listen for changes in pending updates
  useEffect(() => {
    const removeListener = instanceTracker.addUpdateListener((updateInfo) => {
      setPendingUpdates(updateInfo.pendingUpdates);
      setPendingCount(updateInfo.pendingInstanceCount);
      
      // Initialize selected sources for any new pending updates
      const newSelected = { ...selectedSources };
      Object.keys(updateInfo.pendingUpdates).forEach(sourceId => {
        if (newSelected[sourceId] === undefined) {
          newSelected[sourceId] = true; // Select by default
        }
      });
      setSelectedSources(newSelected);
    });
    
    // Initial load
    const initialUpdates = instanceTracker.getPendingUpdates();
    setPendingUpdates(initialUpdates);
    setPendingCount(instanceTracker.getPendingInstanceCount());
    
    // Initialize selected sources
    const initialSelected = {};
    Object.keys(initialUpdates).forEach(sourceId => {
      initialSelected[sourceId] = true; // Select by default
    });
    setSelectedSources(initialSelected);
    
    return () => removeListener();
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setUpdateResult(null);
  };

  const handleClose = () => {
    setOpen(false);
    if (onClose) {
      onClose();
    }
  };

  const handleToggleSource = (sourceId) => {
    setSelectedSources(prev => ({
      ...prev,
      [sourceId]: !prev[sourceId]
    }));
  };

  const handleToggleExpand = (sourceId) => {
    setExpandedSources(prev => ({
      ...prev,
      [sourceId]: !prev[sourceId]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.keys(pendingUpdates).reduce((acc, sourceId) => {
      acc[sourceId] = true;
      return acc;
    }, {});
    setSelectedSources(allSelected);
  };

  const handleDeselectAll = () => {
    const allDeselected = Object.keys(pendingUpdates).reduce((acc, sourceId) => {
      acc[sourceId] = false;
      return acc;
    }, {});
    setSelectedSources(allDeselected);
  };

  const handleApplyUpdates = async () => {
    setIsUpdating(true);
    setUpdateResult(null);
    
    try {
      // Get selected sources
      const sourcesToUpdate = Object.keys(selectedSources).filter(
        sourceId => selectedSources[sourceId]
      );
      
      if (sourcesToUpdate.length === 0) {
        setUpdateResult({
          success: true,
          message: 'No sources selected for update',
          updatedCount: 0
        });
        setIsUpdating(false);
        return;
      }
      
      // Apply updates for each selected source
      let totalUpdated = 0;
      for (const sourceId of sourcesToUpdate) {
        const updated = instanceTracker.applyUpdates(sourceId);
        totalUpdated += updated;
      }
      
      setUpdateResult({
        success: true,
        message: `Successfully updated ${totalUpdated} instances`,
        updatedCount: totalUpdated
      });
      
      // Notify parent component
      if (onUpdateComplete) {
        onUpdateComplete({
          success: true,
          updatedCount: totalUpdated
        });
      }
    } catch (error) {
      console.error('Error applying updates:', error);
      setUpdateResult({
        success: false,
        message: `Error updating instances: ${error.message}`,
        updatedCount: 0
      });
      
      // Notify parent component
      if (onUpdateComplete) {
        onUpdateComplete({
          success: false,
          error: error.message
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Count selected sources and instances
  const selectedSourceCount = Object.values(selectedSources).filter(Boolean).length;
  const selectedInstanceCount = Object.keys(pendingUpdates)
    .filter(sourceId => selectedSources[sourceId])
    .reduce((count, sourceId) => count + pendingUpdates[sourceId].affectedInstances, 0);

  return (
    <>
      {/* Badge button to open the manager */}
      <Tooltip title={pendingCount > 0 ? `${pendingCount} instances need updating` : 'No pending updates'}>
        <Badge badgeContent={pendingCount} color="error" overlap="circular">
          <IconButton 
            color="primary" 
            onClick={handleOpen}
            disabled={pendingCount === 0}
          >
            <RefreshIcon />
          </IconButton>
        </Badge>
      </Tooltip>
      
      {/* Update manager dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Update Instances Manager
          <Typography variant="subtitle2" color="text.secondary">
            {pendingCount} instances from {Object.keys(pendingUpdates).length} sources need updating
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          {/* Results alert */}
          {updateResult && (
            <Alert 
              severity={updateResult.success ? "success" : "error"}
              sx={{ mb: 2 }}
            >
              {updateResult.message}
            </Alert>
          )}
          
          {/* Source selection controls */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Button 
                size="small" 
                onClick={handleSelectAll}
                disabled={isUpdating}
              >
                Select All
              </Button>
              <Button 
                size="small" 
                onClick={handleDeselectAll}
                disabled={isUpdating}
              >
                Deselect All
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {selectedSourceCount} sources selected ({selectedInstanceCount} instances)
            </Typography>
          </Box>
          
          {/* List of pending updates */}
          {Object.keys(pendingUpdates).length > 0 ? (
            <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
              <List dense>
                {Object.keys(pendingUpdates).map((sourceId) => {
                  const update = pendingUpdates[sourceId];
                  const isExpanded = expandedSources[sourceId];
                  
                  return (
                    <React.Fragment key={sourceId}>
                      <ListItem>
                        <Checkbox
                          edge="start"
                          checked={!!selectedSources[sourceId]}
                          onChange={() => handleToggleSource(sourceId)}
                          disabled={isUpdating}
                        />
                        <ListItemText
                          primary={
                            <Typography variant="body1">
                              {update.sourceData?.object?.name || sourceId}
                              <Typography 
                                component="span" 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ ml: 1 }}
                              >
                                ({update.affectedInstances} instances)
                              </Typography>
                              {update.fromSimilarType && (
                                <Typography 
                                  component="span" 
                                  variant="body2" 
                                  color="primary"
                                  sx={{ ml: 1, fontWeight: 'bold' }}
                                >
                                  [Same Type]
                                </Typography>
                              )}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              Updated: {new Date(update.updatedAt).toLocaleString()}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleToggleExpand(sourceId)}
                            disabled={isUpdating}
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      {/* Expanded details */}
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Source ID:</strong> {sourceId}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            <strong>Object Type:</strong> {update.sourceData?.object?.type || 'Unknown'}
                          </Typography>
                          {update.fromSimilarType && (
                            <Typography variant="body2" gutterBottom color="primary">
                              <strong>Update Type:</strong> Same object type as {update.sourceData?.object?.name}
                            </Typography>
                          )}
                          <Typography variant="body2" gutterBottom>
                            <strong>Affected Properties:</strong> Dimensions, material, and other shape attributes
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                            Position, rotation, and parent relationships will be preserved for each instance
                          </Typography>
                        </Box>
                      </Collapse>
                      <Divider component="li" />
                    </React.Fragment>
                  );
                })}
              </List>
            </Paper>
          ) : (
            <Typography variant="body1" align="center" sx={{ py: 4 }}>
              No pending updates available
            </Typography>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={isUpdating}>
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleApplyUpdates}
            disabled={isUpdating || selectedInstanceCount === 0}
            startIcon={isUpdating ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            {isUpdating ? 'Updating...' : `Update ${selectedInstanceCount} Instances`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UpdateInstancesManager;
