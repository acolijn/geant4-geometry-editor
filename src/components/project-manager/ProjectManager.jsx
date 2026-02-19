/**
 * ProjectManager.jsx
 * Refactored component for managing project save/load operations
 * Uses extracted dialogs and custom hooks for cleaner code
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';

// Import dialogs
import {
  StorageInitDialog,
  SaveProjectDialog,
  LoadProjectDialog,
  SaveObjectDialog,
  CreateCategoryDialog
} from './dialogs';

// Import custom hook
import { useProjectStorage } from './hooks/useProjectStorage';

/**
 * Toolbar actions and dialogs for project/object persistence.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.geometries - Current geometry state.
 * @param {Object} props.materials - Current material definitions.
 * @param {Array} props.hitCollections - Current hit collection definitions.
 * @param {Function} props.onLoadProject - Callback invoked after loading a project.
 * @param {boolean} [props.compactMode=false] - Whether to render compact controls.
 * @returns {JSX.Element} Project manager UI.
 */
const ProjectManager = ({ geometries, materials, hitCollections, onLoadProject, compactMode = false }) => {
  // Use custom storage hook
  const storage = useProjectStorage(geometries, materials, hitCollections, onLoadProject);
  
  // Dialog open states
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [objectDialogOpen, setObjectDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  
  // Form states
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [objectName, setObjectName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('common');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [objectToSave, setObjectToSave] = useState(null);

  // Check initialization on mount
  useEffect(() => {
    if (!storage.isInitialized) {
      setInitDialogOpen(true);
    }
  }, [storage.isInitialized]);

  // Handle custom saveObject event
  useEffect(() => {
    const handleSaveObjectEvent = (event) => {
      if (!storage.isInitialized) {
        setInitDialogOpen(true);
        return;
      }
      
      const { objectData } = event.detail;
      if (objectData && objectData.object) {
        setObjectName(objectData.object.name || '');
        // Keep the currently selected category or default to 'common'
        // User can change it in the dialog if needed
        setObjectToSave(objectData);
        setObjectDialogOpen(true);
      }
    };
    
    document.addEventListener('saveObject', handleSaveObjectEvent);
    return () => document.removeEventListener('saveObject', handleSaveObjectEvent);
  }, [storage.isInitialized]);

  // Format date for display
  const formatDate = (isoString) => {
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return 'Unknown date';
    }
  };

  // Handle save project
  const handleSaveProject = async () => {
    const success = await storage.saveProject(projectName, projectDescription);
    if (success) {
      setSaveDialogOpen(false);
      setProjectName('');
      setProjectDescription('');
    }
  };

  // Handle load project
  const handleLoadProject = async (name) => {
    const success = await storage.loadProject(name);
    if (success) {
      setLoadDialogOpen(false);
    }
  };

  // Handle save object
  const handleSaveObject = async () => {
    if (!objectToSave) return;
    
    const success = await storage.saveObject(objectName, objectToSave, selectedCategory);
    if (success) {
      setObjectDialogOpen(false);
      setObjectName('');
      setObjectToSave(null);
    }
  };

  // Handle create category
  const handleCreateCategory = async () => {
    const success = await storage.createCategory(newCategoryName);
    if (success) {
      setCategoryDialogOpen(false);
      setNewCategoryName('');
    }
  };

  // Handle initialize file system
  const handleInitializeFileSystem = async () => {
    const success = await storage.initializeFileSystem();
    if (success) {
      setInitDialogOpen(false);
      await storage.loadSavedProjectsList();
      await storage.loadCategories();
    }
  };

  // Handle initialize IndexedDB
  const handleInitializeIndexedDB = async () => {
    const success = await storage.initializeIndexedDB();
    if (success) {
      setInitDialogOpen(false);
      await storage.loadSavedProjectsList();
      await storage.loadCategories();
    }
  };

  // Open save dialog
  const openSaveDialog = async () => {
    if (!storage.isInitialized) {
      setInitDialogOpen(true);
      return;
    }
    await storage.loadSavedProjectsList();
    setSaveDialogOpen(true);
  };

  // Open load dialog
  const openLoadDialog = async () => {
    if (!storage.isInitialized) {
      setInitDialogOpen(true);
      return;
    }
    await storage.loadSavedProjectsList();
    setLoadDialogOpen(true);
  };

  // Render toolbar (compact mode)
  if (compactMode) {
    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Storage indicator */}
          {storage.isInitialized && (
            <Tooltip title={storage.storageMode === 'filesystem' 
              ? "Using File System Storage - Click to change" 
              : "Using Browser Storage - Click to change"}>
              <IconButton 
                size="small"
                sx={{ 
                  bgcolor: storage.storageMode === 'filesystem' ? 'success.main' : 'info.main',
                  color: 'white',
                  mr: 1,
                  '&:hover': {
                    bgcolor: storage.storageMode === 'filesystem' ? 'success.dark' : 'info.dark',
                  }
                }}
                onClick={() => setInitDialogOpen(true)}
              >
                {storage.storageMode === 'filesystem' ? <FolderIcon fontSize="small" /> : <StorageIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          
          {/* Save button */}
          <Tooltip title="Save Project">
            <Button
              variant="contained"
              color="primary"
              onClick={openSaveDialog}
              size="small"
              startIcon={<SaveIcon />}
            >
              Save
            </Button>
          </Tooltip>
          
          {/* Load button */}
          <Tooltip title="Load Project">
            <Button
              variant="outlined"
              color="secondary"
              onClick={openLoadDialog}
              size="small"
              startIcon={<FolderOpenIcon />}
            >
              Load
            </Button>
          </Tooltip>
          
          {/* Initialize storage button (when not initialized) */}
          {!storage.isInitialized && (
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
        
        {/* Dialogs */}
        <StorageInitDialog
          open={initDialogOpen}
          onClose={() => setInitDialogOpen(false)}
          isLoading={storage.isLoading}
          isFileSystemAccessSupported={storage.isFileSystemAccessSupported}
          onInitializeFileSystem={handleInitializeFileSystem}
          onInitializeIndexedDB={handleInitializeIndexedDB}
        />
        
        <SaveProjectDialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          isLoading={storage.isLoading}
          projectName={projectName}
          onProjectNameChange={setProjectName}
          projectDescription={projectDescription}
          onProjectDescriptionChange={setProjectDescription}
          savedProjects={storage.savedProjects}
          onSave={handleSaveProject}
          formatDate={formatDate}
        />
        
        <LoadProjectDialog
          open={loadDialogOpen}
          onClose={() => setLoadDialogOpen(false)}
          isLoading={storage.isLoading}
          savedProjects={storage.savedProjects}
          onLoadProject={handleLoadProject}
          formatDate={formatDate}
        />
        
        <SaveObjectDialog
          open={objectDialogOpen}
          onClose={() => setObjectDialogOpen(false)}
          isLoading={storage.isLoading}
          objectName={objectName}
          onObjectNameChange={setObjectName}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={storage.categories}
          onSave={handleSaveObject}
        />
        
        <CreateCategoryDialog
          open={categoryDialogOpen}
          onClose={() => setCategoryDialogOpen(false)}
          isLoading={storage.isLoading}
          categoryName={newCategoryName}
          onCategoryNameChange={setNewCategoryName}
          onCreate={handleCreateCategory}
        />
        
        {/* Alert Snackbar */}
        <Snackbar
          open={storage.alert.open}
          autoHideDuration={6000}
          onClose={storage.clearAlert}
        >
          <Alert onClose={storage.clearAlert} severity={storage.alert.severity}>
            {storage.alert.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
  
  // Non-compact mode (if needed in future)
  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={openSaveDialog}
        >
          Save Project
        </Button>
        <Button
          variant="outlined"
          startIcon={<FolderOpenIcon />}
          onClick={openLoadDialog}
        >
          Load Project
        </Button>
      </Box>
      
      {/* Same dialogs as compact mode */}
      <StorageInitDialog
        open={initDialogOpen}
        onClose={() => setInitDialogOpen(false)}
        isLoading={storage.isLoading}
        isFileSystemAccessSupported={storage.isFileSystemAccessSupported}
        onInitializeFileSystem={handleInitializeFileSystem}
        onInitializeIndexedDB={handleInitializeIndexedDB}
      />
      
      <SaveProjectDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        isLoading={storage.isLoading}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        projectDescription={projectDescription}
        onProjectDescriptionChange={setProjectDescription}
        savedProjects={storage.savedProjects}
        onSave={handleSaveProject}
        formatDate={formatDate}
      />
      
      <LoadProjectDialog
        open={loadDialogOpen}
        onClose={() => setLoadDialogOpen(false)}
        isLoading={storage.isLoading}
        savedProjects={storage.savedProjects}
        onLoadProject={handleLoadProject}
        formatDate={formatDate}
      />
      
      <Snackbar
        open={storage.alert.open}
        autoHideDuration={6000}
        onClose={storage.clearAlert}
      >
        <Alert onClose={storage.clearAlert} severity={storage.alert.severity}>
          {storage.alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProjectManager;
