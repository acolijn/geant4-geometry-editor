/**
 * SaveProjectDialog.jsx
 * Dialog for saving a project
 */

import React from 'react';
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
  Typography,
  CircularProgress
} from '@mui/material';

const SaveProjectDialog = ({
  open,
  onClose,
  isLoading,
  projectName,
  onProjectNameChange,
  projectDescription,
  onProjectDescriptionChange,
  savedProjects,
  onSave,
  formatDate
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Save Project</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Project Name"
          type="text"
          fullWidth
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Description (optional)"
          type="text"
          fullWidth
          multiline
          rows={2}
          value={projectDescription}
          onChange={(e) => onProjectDescriptionChange(e.target.value)}
        />
        {savedProjects.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Existing Projects (click to overwrite):
            </Typography>
            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
              {savedProjects.map((project) => (
                <ListItem 
                  key={project.name} 
                  button 
                  onClick={() => {
                    onProjectNameChange(project.name);
                    onProjectDescriptionChange(project.description || '');
                  }}
                >
                  <ListItemText 
                    primary={project.name} 
                    secondary={formatDate(project.updatedAt || project.createdAt)}
                  />
                </ListItem>
              ))}
            </List>
            <Typography variant="caption" color="text.secondary">
              Note: Saving with an existing name will overwrite that project
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={onSave}
          variant="contained"
          disabled={isLoading || !projectName.trim()}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveProjectDialog;
