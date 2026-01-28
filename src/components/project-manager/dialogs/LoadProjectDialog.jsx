/**
 * LoadProjectDialog.jsx
 * Dialog for loading a saved project
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Box,
  CircularProgress
} from '@mui/material';

const LoadProjectDialog = ({
  open,
  onClose,
  isLoading,
  savedProjects,
  onLoadProject,
  formatDate
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Load Project</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : savedProjects.length === 0 ? (
          <Typography variant="body1">No saved projects found</Typography>
        ) : (
          <List>
            {savedProjects.map((project) => (
              <React.Fragment key={project.name}>
                <ListItem 
                  button 
                  onClick={() => onLoadProject(project.name)}
                >
                  <ListItemText 
                    primary={project.name} 
                    secondary={
                      <>
                        {project.description && (
                          <Typography variant="body2" component="span" display="block">
                            {project.description}
                          </Typography>
                        )}
                        <Typography variant="caption" component="span">
                          Last modified: {formatDate(project.updatedAt || project.createdAt)}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoadProjectDialog;
