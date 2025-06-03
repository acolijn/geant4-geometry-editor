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
  Snackbar,
  Tabs,
  Tab,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import CategoryIcon from '@mui/icons-material/Category';
import fileSystemManager from '../utils/FileSystemManager';
import { standardizeProjectData, restoreProjectData } from './geometry-editor/utils/ObjectFormatStandardizer';
// Import the extractObjectWithDescendants function from GeometryUtils
import { extractObjectWithDescendants } from './geometry-editor/utils/GeometryUtils';
// LocalStorageManager has been removed to avoid browser storage usage
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';

const ProjectManager = ({ geometries, materials, hitCollections, onLoadProject, handleImportPartialFromAddNew, compactMode = false }) => {
  // UI state
  const [currentTab, setCurrentTab] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [objectDialogOpen, setObjectDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  
  // Data state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [savedProjects, setSavedProjects] = useState([]);
  const [savedObjects, setSavedObjects] = useState([]);
  const [categories, setCategories] = useState(['detectors', 'shielding', 'common']);
  const [selectedCategory, setSelectedCategory] = useState('common');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [objectName, setObjectName] = useState('');
  const [objectToSave, setObjectToSave] = useState(null);
  
  // System state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [storageManager, setStorageManager] = useState(null);
  const [storageMode, setStorageMode] = useState('none'); // 'filesystem' or 'none'

  // Handle custom saveObject event
  useEffect(() => {
    const handleSaveObjectEvent = (event) => {
      if (!isInitialized) {
        setInitDialogOpen(true);
        return;
      }
      
      const { objectData } = event.detail;
      if (objectData && objectData.object) {
        // Pre-fill the object name field
        setObjectName(objectData.object.name || '');
        // Determine the best category based on the object type
        const objectType = objectData.object.type?.toLowerCase() || '';
        if (objectType.includes('box')) {
          setSelectedCategory('common');
        } else if (objectType.includes('sphere')) {
          setSelectedCategory('detectors');
        } else if (objectType.includes('cylinder')) {
          setSelectedCategory('shielding');
        } else {
          setSelectedCategory('common');
        }
        
        // Store the object data to be saved
        setObjectToSave(objectData);
        
        // Open the save object dialog
        setObjectDialogOpen(true);
      }
    };
    
    // Add event listener
    document.addEventListener('saveObject', handleSaveObjectEvent);
    
    // Cleanup
    return () => {
      document.removeEventListener('saveObject', handleSaveObjectEvent);
    };
  }, [isInitialized]);

  // Check if file system is initialized on component mount
  useEffect(() => {
    checkInitialization();
  }, []);

  // Check if any storage manager is initialized
  const checkInitialization = async () => {
    // First check if we already have a storage manager set
    if (storageManager) {
      setIsInitialized(true);
      loadSavedProjectsList();
      loadCategories();
      return;
    }
    
    // Check if file system manager is initialized
    if (fileSystemManager.initialized) {
      setStorageManager(fileSystemManager);
      setStorageMode('filesystem');
      setIsInitialized(true);
      loadSavedProjectsList();
      loadCategories();
    } else {
      setIsInitialized(false);
      setStorageMode('none');
      // Show initialization dialog if not initialized
      setInitDialogOpen(true);
    }
  };

  // Initialize the storage system
  const initializeFileSystem = async () => {
    setIsLoading(true);
    try {
      console.log('Starting file system initialization...');
      const success = await fileSystemManager.initialize();
      
      if (success && fileSystemManager.initialized) {
        console.log('File system initialization successful');
        setStorageManager(fileSystemManager);
        setStorageMode('filesystem');
        setIsInitialized(true);
        
        // Get the directory path if available
        let dirPath = '';
        try {
          dirPath = fileSystemManager.baseDirectory ? 
            await fileSystemManager.baseDirectory.name : '';
          console.log('Using directory:', dirPath);
        } catch (e) {
          console.warn('Could not get directory name:', e);
        }
        
        // Load saved projects and categories
        try {
          await loadSavedProjectsList();
          await loadCategories();
        } catch (e) {
          console.warn('Error loading saved data:', e);
        }
        
        setAlert({
          open: true,
          message: `File system initialized successfully. Saving to: ${dirPath || 'selected directory'}`,
          severity: 'success'
        });
        setInitDialogOpen(false);
        return true;
      } else {
        throw new Error('File system initialization failed or was cancelled');
      }
    } catch (error) {
      console.error('Error initializing file system:', error);
      
      // Reset file system manager state
      fileSystemManager.initialized = false;
      fileSystemManager.baseDirectory = null;
      fileSystemManager.directoryHandle = null;
      
      setAlert({
        open: true,
        message: `File system initialization failed: ${error.message}. Please try again.`,
        severity: 'error'
      });
      
      // No fallback to localStorage - we're only using filesystem access
      setIsInitialized(false);
      setIsLoading(false);
      return false;
    } finally {
      setIsLoading(false);
      setInitDialogOpen(false);
    } 
  };
  
  // Load the list of saved projects
  const loadSavedProjectsList = async () => {
    if (!isInitialized || !storageManager) return;
    
    setIsLoading(true);
    try {
      const projects = await storageManager.listProjects();
      setSavedProjects(projects);
    } catch (error) {
      console.error('Error loading projects list:', error);
      setAlert({
        open: true,
        message: 'Error loading projects list',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load the list of categories
  const loadCategories = async () => {
    if (!isInitialized || !storageManager) return;
    
    setIsLoading(true);
    try {
      const cats = await storageManager.listCategories();
      if (cats.length > 0) {
        setCategories(cats);
      }
      // Load objects for the selected category
      loadObjectsList(selectedCategory);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load the list of objects in a category
  const loadObjectsList = async (category) => {
    if (!isInitialized || !storageManager) return;
    
    setIsLoading(true);
    try {
      const objects = await storageManager.listObjects(category);
      setSavedObjects(objects);
    } catch (error) {
      console.error(`Error loading objects in ${category}:`, error);
      setAlert({
        open: true,
        message: `Error loading objects in ${category}`,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new category
  const createCategory = async () => {
    if (!isInitialized || !storageManager || !newCategoryName.trim()) return;
    
    setIsLoading(true);
    try {
      const success = await storageManager.createCategory(newCategoryName.trim());
      if (success) {
        setAlert({
          open: true,
          message: `Category "${newCategoryName}" created successfully`,
          severity: 'success'
        });
        loadCategories();
        setNewCategoryName('');
        setCategoryDialogOpen(false);
      } else {
        setAlert({
          open: true,
          message: `Failed to create category "${newCategoryName}"`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setAlert({
        open: true,
        message: 'Error creating category',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save the current project
  const saveProject = async () => {
    if (!isInitialized || !storageManager || !projectName.trim()) {
      setAlert({
        open: true,
        message: 'Please enter a project name',
        severity: 'warning'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Standardize project data for storage
      const standardizedData = standardizeProjectData(geometries, materials, hitCollections);
      
      // Create metadata
      const metadata = {
        description: projectDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save standardized project data to storage
      const success = await storageManager.saveProject(
        projectName.trim(),
        standardizedData,
        metadata
      );

      if (success) {
        // Show success message
        setAlert({
          open: true,
          message: `Project "${projectName}" saved successfully`,
          severity: 'success'
        });
        loadSavedProjectsList();
        setSaveDialogOpen(false);
      } else {
        setAlert({
          open: true,
          message: 'Failed to save project',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error saving project:', error);
      setAlert({
        open: true,
        message: 'Error saving project',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save the selected object
  const saveObject = async () => {
    if (!isInitialized || !storageManager || !objectName.trim()) {
      setAlert({
        open: true,
        message: 'Please enter an object name',
        severity: 'warning'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Determine which object data to save
      let objectData;
      
      // If we have an object from the saveObject event, use that
      if (objectToSave) {
        objectData = objectToSave;
      } else {
        // Check if we have a selected geometry
        if (!geometries.selectedGeometry) {
          setAlert({
            open: true,
            message: 'Please select an object to save',
            severity: 'warning'
          });
          setIsLoading(false);
          return;
        }
        
        // Get the selected geometry
        const selectedId = geometries.selectedGeometry;
        let selectedObject;
        
        if (selectedId === 'world') {
          selectedObject = geometries.world;
        } else if (selectedId.startsWith('volume-')) {
          const index = parseInt(selectedId.replace('volume-', ''));
          selectedObject = geometries.volumes[index];
        } else {
          throw new Error('Invalid selection');
        }

        const { object, descendants } = extractObjectWithDescendants(selectedObject, geometries);

        // Create the object data
        objectData = {
          object,
          descendants,
          debug: {
            exportedAt: new Date().toISOString(),
            objectType: object.type,
            objectName: object.name,
            descendantCount: descendants.length
          }
        };
      }

      // Save object to storage
      const success = await storageManager.saveObject(
        objectName.trim(),
        objectData,
        selectedCategory
      );

      if (success) {
        // Show success message
        setAlert({
          open: true,
          message: `Object "${objectName}" saved successfully in ${selectedCategory}`,
          severity: 'success'
        });
        loadObjectsList(selectedCategory);
        setObjectDialogOpen(false);
        // Clear the objectToSave after saving
        setObjectToSave(null);
      } else {
        setAlert({
          open: true,
          message: 'Failed to save object',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error saving object:', error);
      setAlert({
        open: true,
        message: 'Error saving object: ' + error.message,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load a project
  const loadProject = async (projectName) => {
    if (!isInitialized || !storageManager) return;
    
    setIsLoading(true);
    try {
      const projectData = await storageManager.loadProject(projectName);
      
      // Check if the project data is in the new standardized format
      if (projectData && projectData.geometry && 
          (projectData.geometry.geometries?.world?.dimensions || 
           (projectData.geometry.geometries?.volumes && 
            projectData.geometry.geometries.volumes.length > 0 && 
            projectData.geometry.geometries.volumes[0].dimensions))) {
        
        // Project is in the new format, proceed with restoration
        const restoredData = restoreProjectData(projectData.geometry);
        
        // Extract components from restored data
        const { geometries: restoredGeometries, materials: restoredMaterials, hitCollections: restoredHitCollections } = restoredData;
        
        // Load the project with restored data
        onLoadProject(restoredGeometries, restoredMaterials, restoredHitCollections);
        setLoadDialogOpen(false);
        setAlert({
          open: true,
          message: `Project "${projectName}" loaded successfully`,
          severity: 'success'
        });
      } else if (projectData && projectData.geometry) {
        // Project is in the old format
        setAlert({
          open: true,
          message: `Project "${projectName}" is in an outdated format and cannot be loaded. Please create a new project.`,
          severity: 'error'
        });
      } else {
        setAlert({
          open: true,
          message: `Failed to load project "${projectName}"`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error loading project:', error);
      setAlert({
        open: true,
        message: 'Error loading project',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load an object
  const loadObject = async (objectName, category) => {
    if (!isInitialized || !storageManager) return;
    
    setIsLoading(true);
    try {
      console.log(`Loading object: ${objectName} from category: ${category}`);
      const objectData = await storageManager.loadObject(objectName, category);
      
      // Validate the object data structure
      if (!objectData) {
        throw new Error(`Failed to load object "${objectName}"`);
      }
      
      console.log('Loaded object data:', objectData);
      
      // Ensure the object has the required structure
      if (!objectData.object || typeof objectData.object !== 'object') {
        throw new Error('Invalid object data: missing main object');
      }
      
      if (!Array.isArray(objectData.descendants)) {
        // Fix the structure if descendants is missing
        console.warn('Object data missing descendants array, adding empty array');
        objectData.descendants = [];
      }
      
      // Ensure the main object has all required properties
      const mainObject = objectData.object;
      if (!mainObject.type) {
        throw new Error('Invalid object data: missing type');
      }
      
      // Ensure position, rotation, and size/radius properties exist
      if (!mainObject.position) {
        console.warn('Main object missing position, adding default');
        mainObject.position = { x: 0, y: 0, z: 0, unit: 'cm' };
      }
      
      if (!mainObject.rotation) {
        console.warn('Main object missing rotation, adding default');
        mainObject.rotation = { x: 0, y: 0, z: 0, unit: 'deg' };
      }
      
      // Add type-specific properties if missing
/*       if (mainObject.type === 'box' && !mainObject.size) {
        console.warn('Box missing size property, adding default');
        mainObject.size = { x: 10, y: 10, z: 10, unit: 'cm' };
      } else if (mainObject.type === 'cylinder') {
        if (!mainObject.radius) {
          console.warn('Cylinder missing radius, adding default');
          mainObject.radius = 5;
        }
        if (!mainObject.height) {
          console.warn('Cylinder missing height, adding default');
          mainObject.height = 10;
        }
        if (!mainObject.inner_radius && !mainObject.innerRadius) {
          console.warn('Cylinder missing inner_radius, adding default');
          mainObject.inner_radius = 0;
        }
      } else if (mainObject.type === 'sphere' && !mainObject.radius) {
        console.warn('Sphere missing radius, adding default');
        mainObject.radius = 5;
      } */
      
      // Now use the existing import function with the validated data
      if (typeof handleImportPartialFromAddNew === 'function') {
        const result = handleImportPartialFromAddNew(objectData, 'World');
        
        if (result && result.success) {
          setAlert({
            open: true,
            message: `Object "${objectName}" loaded successfully`,
            severity: 'success'
          });
        } else {
          throw new Error(result?.message || 'Failed to import object');
        }
      } else {
        throw new Error('Import function not available');
      }
    } catch (error) {
      console.error('Error loading object:', error);
      setAlert({
        open: true,
        message: `Error loading object: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
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

  // Render compact mode UI for toolbar
  if (compactMode) {
    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Storage indicator icon with click to change */}
          {isInitialized && (
            <Tooltip title="Using File System Storage - Click to switch to Browser Storage">
              <IconButton 
                size="small"
                sx={{ 
                  bgcolor: 'success.main',
                  color: 'white',
                  mr: 1,
                  '&:hover': {
                    bgcolor: 'success.dark',
                  }
                }}
                onClick={() => {
                  setInitDialogOpen(true);
                }}
              >
                <FolderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Project actions */}
          <Tooltip title="Save Project">
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (!isInitialized) {
                  setInitDialogOpen(true);
                  return;
                }
                loadSavedProjectsList();
                setSaveDialogOpen(true);
              }}
              size="small"
              startIcon={<SaveIcon />}
            >
              Save
            </Button>
          </Tooltip>
          
          <Tooltip title="Load Project">
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                if (!isInitialized) {
                  setInitDialogOpen(true);
                  return;
                }
                loadSavedProjectsList();
                setLoadDialogOpen(true);
              }}
              size="small"
              startIcon={<FolderOpenIcon />}
            >
              Load
            </Button>
          </Tooltip>
          
          {/* Save Object button removed as requested */}
          
          {!isInitialized && (
            <Tooltip title="Initialize Storage">
              <IconButton
                color="warning"
                onClick={() => setInitDialogOpen(true)}
                size="small"
              >
                <CreateNewFolderIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        {/* Storage Initialization Dialog */}
        <Dialog open={initDialogOpen} onClose={() => setInitDialogOpen(false)}>
          <DialogTitle>Select Working Directory</DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>
              Select a directory where your projects and objects will be stored:
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* File System Option */}
              <Box 
                sx={{ 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 1, 
                  p: 2,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Typography variant="h6" gutterBottom>
                  <FolderIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  File System Storage
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Store files in a folder on your computer. Data persists between browser sessions and can be backed up.
                </Typography>
                <Button 
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      await initializeFileSystem();
                    } catch (error) {
                      setAlert({
                        open: true,
                        message: `Error: ${error.message || 'Failed to initialize storage system'}`,
                        severity: 'error'
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  }} 
                  variant="contained"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <FolderIcon />}
                  fullWidth
                >
                  Select Directory
                </Button>
              </Box>
            </Box>
            
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Initializing storage system...
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInitDialogOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
        
        {/* Save Project Dialog */}
        <Dialog 
          open={saveDialogOpen} 
          onClose={() => setSaveDialogOpen(false)}
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
              onChange={(e) => setProjectName(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Description (optional)"
              type="text"
              fullWidth
              multiline
              rows={2}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            />
            {savedProjects.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  Existing Projects:
                </Typography>
                <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {savedProjects.map((project) => (
                    <ListItem 
                      key={project.name} 
                      button 
                      onClick={() => {
                        setProjectName(project.name);
                        setProjectDescription(project.description || '');
                      }}
                    >
                      <ListItemText 
                        primary={project.name} 
                        secondary={formatDate(project.updatedAt || project.createdAt)}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={saveProject} 
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
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
                      onClick={() => loadProject(project.name)}
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
            <Button onClick={() => setLoadDialogOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
        
        {/* Save Object Dialog */}
        <Dialog 
          open={objectDialogOpen} 
          onClose={() => setObjectDialogOpen(false)}
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
              onChange={(e) => setObjectName(e.target.value)}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
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
            <Button onClick={() => setObjectDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={saveObject} 
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Alert Snackbar */}
        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={handleAlertClose}
        >
          <Alert onClose={handleAlertClose} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
  
  // Regular (non-compact) mode UI
  return (
    <>
      {/* Storage Initialization Dialog */}
      <Dialog open={initDialogOpen} onClose={() => setInitDialogOpen(false)}>
        <DialogTitle>Choose Storage Method</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Choose how you want to store your projects and objects:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* File System Option */}
            <Box 
              sx={{ 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: 1, 
                p: 2,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Typography variant="h6" gutterBottom>
                <FolderIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                File System Storage
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Store files in a folder on your computer. Data persists between browser sessions and can be backed up.
              </Typography>
              <Button 
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    await initializeFileSystem();
                  } catch (error) {
                    setAlert({
                      open: true,
                      message: `Error: ${error.message || 'Failed to initialize storage system'}`,
                      severity: 'error'
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }} 
                variant="contained"
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <FolderIcon />}
                fullWidth
              >
                Select Directory
              </Button>
            </Box>
          </Box>
          
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Initializing storage system...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInitDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Main UI */}
      <Box sx={{ width: '100%' }}>
        {/* Storage Status Indicator */}
        {isInitialized && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 1, 
              p: 1, 
              borderRadius: 1,
              bgcolor: 'success.light',
              color: 'success.contrastText',
            }}
          >
            <FolderIcon sx={{ mr: 1 }} />
            <Typography variant="body2">
              Storage Mode: <strong>File System</strong> - Your data is being saved to your selected folder
            </Typography>
          </Box>
        )}
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab label="Projects" />
            <Tab label="Objects" />
          </Tabs>
        </Box>

        {/* Projects Tab */}
        {currentTab === 0 && (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<SaveIcon />}
                onClick={() => {
                  if (!isInitialized) {
                    setInitDialogOpen(true);
                    return;
                  }
                  loadSavedProjectsList();
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
                  if (!isInitialized) {
                    setInitDialogOpen(true);
                    return;
                  }
                  loadSavedProjectsList();
                  setLoadDialogOpen(true);
                }}
                size="small"
              >
                Load Project
              </Button>
            </Box>

            {!isInitialized && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Please initialize the storage system first by clicking the button below.
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Browser storage has been disabled. Please use the file system access.
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => setInitDialogOpen(true)}
                  sx={{ ml: 2 }}
                >
                  Initialize Storage
                </Button>
              </Alert>
            )}

            {isInitialized && savedProjects.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6">Recent Projects</Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {savedProjects.slice(0, 3).map((project) => (
                    <Grid item xs={12} sm={6} md={4} key={project.name}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" component="div">
                            {project.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {project.description || 'No description'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Last modified: {formatDate(project.updatedAt || project.createdAt)}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button size="small" onClick={() => loadProject(project.name)}>Load</Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        )}

        {/* Objects Tab */}
        {currentTab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
              <Button 
                variant="outlined"
                startIcon={<CategoryIcon />}
                onClick={() => {
                  if (!isInitialized) {
                    setInitDialogOpen(true);
                    return;
                  }
                  setNewCategoryName('');
                  setCategoryDialogOpen(true);
                }}
                size="small"
              >
                New Category
              </Button>
              
              <FormControl variant="outlined" size="small" sx={{ minWidth: 120, ml: 'auto' }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    loadObjectsList(e.target.value);
                  }}
                  label="Category"
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {!isInitialized && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Please initialize the storage system first.
              </Alert>
            )}

            {isInitialized && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">Objects in </Typography>
                  <Chip 
                    label={`objects/${selectedCategory}`} 
                    variant="outlined" 
                    size="small" 
                    sx={{ ml: 1 }}
                    icon={<FolderIcon fontSize="small" />}
                  />
                </Box>
                {savedObjects.length === 0 ? (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    No objects found in this category.
                  </Typography>
                ) : (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {savedObjects.map((objectName) => (
                      <Grid item xs={12} sm={6} md={4} key={objectName}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" component="div">
                              {objectName}
                            </Typography>
                            <Chip 
                              label={selectedCategory} 
                              size="small" 
                              sx={{ mt: 1 }}
                            />
                          </CardContent>
                          <CardActions>
                            <Button 
                              size="small" 
                              onClick={() => loadObject(objectName, selectedCategory)}
                            >
                              Import
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Save Project Dialog */}
      <Dialog 
        open={saveDialogOpen} 
        onClose={() => setSaveDialogOpen(false)}
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
            onChange={(e) => setProjectName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            multiline
            rows={2}
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
          />
          {savedProjects.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Existing Projects:
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                {savedProjects.map((project) => (
                  <ListItem 
                    key={project.name} 
                    button 
                    onClick={() => {
                      setProjectName(project.name);
                      setProjectDescription(project.description || '');
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
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={saveProject} 
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Object Dialog */}
      <Dialog 
        open={objectDialogOpen} 
        onClose={() => setObjectDialogOpen(false)}
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
            onChange={(e) => setObjectName(e.target.value)}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
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
          <Button onClick={() => setObjectDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={saveObject} 
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog 
        open={categoryDialogOpen} 
        onClose={() => setCategoryDialogOpen(false)}
      >
        <DialogTitle>Create New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            type="text"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={createCategory} 
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            Create
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
                    onClick={() => loadProject(project.name)}
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
          <Button onClick={() => setLoadDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleAlertClose}
      >
        <Alert onClose={handleAlertClose} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProjectManager;
