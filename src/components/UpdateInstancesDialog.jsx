import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import { instanceTracker } from '../utils/InstanceTracker';

/**
 * Enhanced dialog component that shows compound objects that need updates
 * and allows the user to update them all at once or individually.
 */
const UpdateInstancesDialog = ({
  open,
  onClose,
  onUpdateAll,
  isLoading
}) => {
  // State for compound objects that need updates
  const [compoundUpdates, setCompoundUpdates] = useState([]);
  const [regularUpdates, setRegularUpdates] = useState([]);
  const [activeTab, setActiveTab] = useState('compound');
  
  // Load pending updates when the dialog opens
  useEffect(() => {
    if (open) {
      // Get compound objects that need updates
      const pendingCompoundUpdates = instanceTracker.getPendingCompoundUpdates();
      setCompoundUpdates(pendingCompoundUpdates);
      
      // Get regular updates (for backward compatibility)
      const pendingUpdates = instanceTracker.getPendingUpdates();
      const regularUpdatesList = [];
      
      Object.keys(pendingUpdates).forEach(sourceId => {
        const update = pendingUpdates[sourceId];
        if (!update.isCompoundUpdate) {
          regularUpdatesList.push({
            sourceId,
            instanceCount: update.affectedInstances || 0,
            objectName: update.sourceData?.object?.name || 'Unknown Object'
          });
        }
      });
      
      setRegularUpdates(regularUpdatesList);
    }
  }, [open]);
  
  // Handle updating a single compound object
  const handleUpdateCompound = (sourceId) => {
    // Get the compound object data
    const compoundData = instanceTracker.getCompoundObject(sourceId);
    
    if (compoundData) {
      // Update all instances of this compound object
      const result = window.updateAllInstances(sourceId, compoundData.object);
      console.log('Update result:', result);
      
      // Remove this compound object from the list
      setCompoundUpdates(prevUpdates => 
        prevUpdates.filter(update => update.sourceId !== sourceId)
      );
      
      // If no more updates, close the dialog
      if (compoundUpdates.length <= 1 && regularUpdates.length === 0) {
        onClose(false);
      }
    }
  };
  
  // Handle updating all compound objects
  const handleUpdateAllCompounds = () => {
    // Update each compound object
    compoundUpdates.forEach(update => {
      handleUpdateCompound(update.sourceId);
    });
    
    // Close the dialog
    onClose(false);
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={() => !isLoading && onClose(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {compoundUpdates.length > 0 ? 
          'Update Compound Objects' : 
          'Update Related Instances'}
      </DialogTitle>
      <DialogContent>
        {compoundUpdates.length > 0 ? (
          <>
            <Typography variant="body1" paragraph>
              The following compound objects have instances that need to be updated:
            </Typography>
            
            <List sx={{ width: '100%' }}>
              {compoundUpdates.map((update, index) => (
                <React.Fragment key={update.sourceId}>
                  {index > 0 && <Divider />}
                  <ListItem 
                    alignItems="flex-start"
                    secondaryAction={
                      <Button 
                        variant="contained" 
                        color="primary"
                        onClick={() => handleUpdateCompound(update.sourceId)}
                        disabled={isLoading}
                        size="small"
                      >
                        Update
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {update.name}
                          </Typography>
                          <Chip 
                            label={update.type} 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" component="span">
                            {update.instanceCount} {update.instanceCount === 1 ? 'instance' : 'instances'} need updating
                          </Typography>
                          <br />
                          <Typography variant="body2" component="span" color="text.secondary">
                            Contains {update.descendantCount} child {update.descendantCount === 1 ? 'object' : 'objects'}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              • Each instance will maintain its unique position, rotation, and mother volume
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Properties like dimensions, material, and other attributes will be updated
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • All child objects within each compound will be updated automatically
            </Typography>
          </>
        ) : regularUpdates.length > 0 ? (
          // Show regular updates for backward compatibility
          <>
            <Typography variant="body1" paragraph>
              You've edited an object that has {regularUpdates[0].instanceCount} other 
              {regularUpdates[0].instanceCount === 1 ? ' instance' : ' instances'} in your project.
            </Typography>
            <Typography variant="body1" paragraph>
              Would you like to update all other instances of "{regularUpdates[0].objectName}" with your changes?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Each instance will maintain its unique position, rotation, and mother volume
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Properties like dimensions, material, and other shape-specific attributes will be updated
            </Typography>
          </>
        ) : (
          <Typography variant="body1" align="center" sx={{ py: 3 }}>
            No objects need updating
          </Typography>
        )}
        
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
          {compoundUpdates.length > 0 || regularUpdates.length > 0 ? 'Skip Updates' : 'Close'}
        </Button>
        {compoundUpdates.length > 0 ? (
          <Button 
            onClick={handleUpdateAllCompounds} 
            variant="contained" 
            color="primary"
            disabled={isLoading}
          >
            Update All Compound Objects ({compoundUpdates.length})
          </Button>
        ) : regularUpdates.length > 0 ? (
          <Button 
            onClick={() => onUpdateAll()} 
            variant="contained" 
            color="primary"
            disabled={isLoading}
          >
            Yes, Update All Instances
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};

export default UpdateInstancesDialog;
