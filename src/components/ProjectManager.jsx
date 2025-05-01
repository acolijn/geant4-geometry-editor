import React, { useState, useEffect } from 'react';
import { 
  Box,
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

const ProjectManager = ({ geometries, materials, onLoadProject }) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [savedProjects, setSavedProjects] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  // Load the list of saved projects on component mount
  useEffect(() => {
    loadSavedProjectsList();
  }, []);

  // Load the list of saved projects from localStorage
  const loadSavedProjectsList = () => {
    try {
      const projectsListJson = localStorage.getItem('geant4-projects-list');
      if (projectsListJson) {
        const projectsList = JSON.parse(projectsListJson);
        setSavedProjects(projectsList);
      }
    } catch (error) {
      console.error('Error loading projects list:', error);
      setAlert({
        open: true,
        message: 'Error loading projects list',
        severity: 'error'
      });
    }
  };

  // Save the current project
  const saveProject = (projectName) => {
    if (!projectName.trim()) {
      setAlert({
        open: true,
        message: 'Please enter a project name',
        severity: 'warning'
      });
      return;
    }

    try {
      // Create project data object
      const projectData = {
        geometries,
        materials,
        timestamp: new Date().toISOString()
      };

      // Save project data to localStorage
      localStorage.setItem(`geant4-project-${projectName}`, JSON.stringify(projectData));

      // Update projects list
      const updatedProjects = [...savedProjects];
      const existingIndex = updatedProjects.findIndex(p => p.name === projectName);
      
      if (existingIndex >= 0) {
        // Update existing project
        updatedProjects[existingIndex] = {
          name: projectName,
          timestamp: projectData.timestamp
        };
      } else {
        // Add new project
        updatedProjects.push({
          name: projectName,
          timestamp: projectData.timestamp
        });
      }

      // Save updated projects list
      localStorage.setItem('geant4-projects-list', JSON.stringify(updatedProjects));
      setSavedProjects(updatedProjects);

      // Show success message
      setAlert({
        open: true,
        message: 'Project saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving project:', error);
      setAlert({
        open: true,
        message: 'Error saving project',
        severity: 'error'
      });
    }
  };

  // Load a project
  const loadProject = (projectName) => {
    try {
      const projectDataJson = localStorage.getItem(`geant4-project-${projectName}`);
      if (projectDataJson) {
        const projectData = JSON.parse(projectDataJson);
        onLoadProject(projectData.geometries, projectData.materials);
        setLoadDialogOpen(false);
        setAlert({
          open: true,
          message: `Project "${projectName}" loaded successfully`,
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error loading project:', error);
      setAlert({
        open: true,
        message: 'Error loading project',
        severity: 'error'
      });
    }
  };

  // Delete a project
  const deleteProject = (projectName, event) => {
    event.stopPropagation(); // Prevent triggering the load project action
    
    try {
      // Remove project data
      localStorage.removeItem(`geant4-project-${projectName}`);
      
      // Update projects list
      const updatedProjects = savedProjects.filter(p => p.name !== projectName);
      localStorage.setItem('geant4-projects-list', JSON.stringify(updatedProjects));
      setSavedProjects(updatedProjects);
      
      setAlert({
        open: true,
        message: `Project "${projectName}" deleted`,
        severity: 'info'
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      setAlert({
        open: true,
        message: 'Error deleting project',
        severity: 'error'
      });
    }
  };

  // Format date for display
  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch (e) {
      return 'Unknown date';
    }
  };

  // Handle alert close
  const handleAlertClose = () => {
    setAlert({ ...alert, open: false });
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<SaveIcon />}
          onClick={() => {
            loadSavedProjectsList(); // Refresh the list
            setSaveDialogOpen(true);
          }}
          size="small"
        >
          Save Project
        </Button>
        <Button 
          variant="contained" 
          color="secondary"
          startIcon={<FolderOpenIcon />}
          onClick={() => {
            loadSavedProjectsList(); // Refresh the list
            setLoadDialogOpen(true);
          }}
          size="small"
        >
          Load Project
        </Button>
      </Box>

      {/* Save Project Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            type="text"
            fullWidth
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
          {savedProjects.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Existing Projects:
              </Typography>
              <List dense>
                {savedProjects.map((project) => (
                  <ListItem 
                    key={project.name} 
                    button 
                    onClick={() => setProjectName(project.name)}
                  >
                    <ListItemText 
                      primary={project.name} 
                      secondary={formatDate(project.timestamp)}
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
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              saveProject(projectName);
              setSaveDialogOpen(false);
            }} 
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Project Dialog */}
      <Dialog 
        open={loadDialogOpen} 
        onClose={() => setLoadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Load Project</DialogTitle>
        <DialogContent>
          {savedProjects.length === 0 ? (
            <Typography variant="body1">No saved projects found</Typography>
          ) : (
            <List>
              {savedProjects.map((project) => (
                <React.Fragment key={project.name}>
                  <ListItem 
                    button 
                    onClick={() => loadProject(project.name)}
                  >
                    <ListItemText 
                      primary={project.name} 
                      secondary={formatDate(project.timestamp)}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={(e) => deleteProject(project.name, e)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Alert for notifications */}
      <Snackbar 
        open={alert.open} 
        autoHideDuration={6000} 
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleAlertClose} 
          severity={alert.severity} 
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProjectManager;
