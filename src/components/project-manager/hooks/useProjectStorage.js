/**
 * useProjectStorage.js
 * Custom hook for managing project and object storage
 * Handles both File System Access API and IndexedDB fallback
 */

import { useState, useEffect, useCallback } from 'react';
import fileSystemManager from '../../../utils/FileSystemManager';
import indexedDBManager from '../../../utils/IndexedDBManager';
import { extractObjectWithDescendants } from '../../geometry-editor/utils/GeometryUtils';
import { generateJson } from '../../json-viewer/utils/geometryToJson';
import { jsonToGeometry } from '../../json-viewer/utils/jsonToGeometry';

/**
 * Custom hook for project storage management
 * @param {Object} geometries - Current geometry data
 * @param {Object} materials - Current materials data
 * @param {Array} hitCollections - Current hit collections
 * @param {Function} onLoadProject - Callback when project is loaded
 * @returns {Object} Storage state and methods
 */
export const useProjectStorage = (geometries, materials, hitCollections, onLoadProject) => {
  // Storage state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [storageManager, setStorageManager] = useState(null);
  const [storageMode, setStorageMode] = useState('none'); // 'filesystem', 'indexeddb', or 'none'
  
  // Data state
  const [savedProjects, setSavedProjects] = useState([]);
  const [savedObjects, setSavedObjects] = useState([]);
  const [categories, setCategories] = useState(['detectors', 'shielding', 'common']);
  
  // Alert state
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  
  // Check if File System Access API is supported
  const isFileSystemAccessSupported = 'showDirectoryPicker' in window;

  // Check initialization on mount
  useEffect(() => {
    checkInitialization();
  }, []);

  // Check if any storage manager is initialized
  const checkInitialization = useCallback(async () => {
    if (storageManager) {
      setIsInitialized(true);
      return true;
    }
    
    if (fileSystemManager.initialized) {
      setStorageManager(fileSystemManager);
      setStorageMode('filesystem');
      setIsInitialized(true);
      return true;
    } else if (indexedDBManager.initialized) {
      setStorageManager(indexedDBManager);
      setStorageMode('indexeddb');
      setIsInitialized(true);
      return true;
    }
    
    setIsInitialized(false);
    setStorageMode('none');
    return false;
  }, [storageManager]);

  // Initialize File System storage
  const initializeFileSystem = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Starting file system initialization...');
      const success = await fileSystemManager.initialize();
      
      if (success && fileSystemManager.initialized) {
        console.log('File system initialization successful');
        setStorageManager(fileSystemManager);
        setStorageMode('filesystem');
        setIsInitialized(true);
        
        let dirPath = '';
        try {
          dirPath = fileSystemManager.baseDirectory ? 
            await fileSystemManager.baseDirectory.name : '';
        } catch (e) {
          console.warn('Could not get directory name:', e);
        }
        
        setAlert({
          open: true,
          message: `File system initialized successfully. Saving to: ${dirPath || 'selected directory'}`,
          severity: 'success'
        });
        
        return true;
      } else {
        throw new Error('File system initialization failed or was cancelled');
      }
    } catch (error) {
      console.error('Error initializing file system:', error);
      fileSystemManager.initialized = false;
      fileSystemManager.baseDirectory = null;
      fileSystemManager.directoryHandle = null;
      
      setAlert({
        open: true,
        message: `File system initialization failed: ${error.message}. Please try again.`,
        severity: 'error'
      });
      
      setIsInitialized(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize IndexedDB storage
  const initializeIndexedDB = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Starting IndexedDB initialization...');
      const success = await indexedDBManager.initialize();
      
      if (success && indexedDBManager.initialized) {
        console.log('IndexedDB initialization successful');
        setStorageManager(indexedDBManager);
        setStorageMode('indexeddb');
        setIsInitialized(true);
        
        await indexedDBManager.ensureDirectoryStructure();
        
        setAlert({
          open: true,
          message: 'Browser storage initialized successfully. Your data will be stored locally in your browser.',
          severity: 'success'
        });
        
        return true;
      } else {
        throw new Error('IndexedDB initialization failed');
      }
    } catch (error) {
      console.error('Error initializing IndexedDB:', error);
      indexedDBManager.initialized = false;
      indexedDBManager.db = null;
      
      setAlert({
        open: true,
        message: `Browser storage initialization failed: ${error.message}. Please try again.`,
        severity: 'error'
      });
      
      setIsInitialized(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load saved projects list
  const loadSavedProjectsList = useCallback(async () => {
    if (!isInitialized || !storageManager) return [];
    
    setIsLoading(true);
    try {
      const projects = await storageManager.listProjects();
      setSavedProjects(projects);
      return projects;
    } catch (error) {
      console.error('Error loading projects list:', error);
      setAlert({
        open: true,
        message: 'Error loading projects list',
        severity: 'error'
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, storageManager]);

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!isInitialized || !storageManager) return [];
    
    setIsLoading(true);
    try {
      const cats = await storageManager.listCategories();
      if (cats.length > 0) {
        setCategories(cats);
      }
      return cats;
    } catch (error) {
      console.error('Error loading categories:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, storageManager]);

  // Load objects in a category
  const loadObjectsList = useCallback(async (category) => {
    if (!isInitialized || !storageManager) return [];
    
    setIsLoading(true);
    try {
      const objects = await storageManager.listObjects(category);
      setSavedObjects(objects);
      return objects;
    } catch (error) {
      console.error(`Error loading objects in ${category}:`, error);
      setAlert({
        open: true,
        message: `Error loading objects in ${category}`,
        severity: 'error'
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, storageManager]);

  // Create a category
  const createCategory = useCallback(async (categoryName) => {
    if (!isInitialized || !storageManager || !categoryName.trim()) return false;
    
    setIsLoading(true);
    try {
      const success = await storageManager.createCategory(categoryName.trim());
      if (success) {
        setAlert({
          open: true,
          message: `Category "${categoryName}" created successfully`,
          severity: 'success'
        });
        await loadCategories();
        return true;
      } else {
        setAlert({
          open: true,
          message: `Failed to create category "${categoryName}"`,
          severity: 'error'
        });
        return false;
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setAlert({
        open: true,
        message: 'Error creating category',
        severity: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, storageManager, loadCategories]);

  // Save project
  const saveProject = useCallback(async (projectName, projectDescription = '') => {
    if (!isInitialized || !storageManager || !projectName.trim()) {
      setAlert({
        open: true,
        message: 'Please enter a project name',
        severity: 'warning'
      });
      return false;
    }

    setIsLoading(true);
    try {
      const geometryData = generateJson({
        world: geometries.world,
        volumes: geometries.volumes || []
      });
      
      if (materials && Object.keys(materials).length > 0) {
        geometryData.materials = materials;
      }
      
      if (hitCollections && hitCollections.length > 0) {
        geometryData.hitCollections = hitCollections;
      }
      
      const metadata = {
        description: projectDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await storageManager.saveProject(
        projectName.trim(),
        geometryData,
        metadata
      );

      if (success) {
        setAlert({
          open: true,
          message: `Project "${projectName}" saved successfully`,
          severity: 'success'
        });
        await loadSavedProjectsList();
        return true;
      } else {
        setAlert({
          open: true,
          message: 'Failed to save project',
          severity: 'error'
        });
        return false;
      }
    } catch (error) {
      console.error('Error saving project:', error);
      setAlert({
        open: true,
        message: 'Error saving project',
        severity: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, storageManager, geometries, materials, hitCollections, loadSavedProjectsList]);

  // Load project
  const loadProject = useCallback(async (projectName) => {
    if (!isInitialized || !storageManager) return false;
    
    setIsLoading(true);
    try {
      const projectData = await storageManager.loadProject(projectName);
      
      if (projectData && projectData.geometry) {
        const geometryData = projectData.geometry;
        
        const currentGeometry = {
          geometries: geometries,
          materials: materials
        };
        
        const updatedGeometry = jsonToGeometry(geometryData, currentGeometry);
        
        if (!updatedGeometry || !updatedGeometry.geometries) {
          throw new Error('Invalid geometry data structure after import');
        }
        
        const restoredHitCollections = geometryData.hitCollections || [];
        
        onLoadProject(updatedGeometry.geometries, updatedGeometry.materials, restoredHitCollections);
        
        setAlert({
          open: true,
          message: `Project "${projectName}" loaded successfully`,
          severity: 'success'
        });
        
        return true;
      } else {
        setAlert({
          open: true,
          message: `Failed to load project "${projectName}": Invalid project data`,
          severity: 'error'
        });
        return false;
      }
    } catch (error) {
      console.error('Error loading project:', error);
      setAlert({
        open: true,
        message: `Error loading project: ${error.message}`,
        severity: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, storageManager, geometries, materials, onLoadProject]);

  // Save object
  const saveObject = useCallback(async (objectName, objectData, category = 'common') => {
    if (!isInitialized || !storageManager || !objectName.trim()) {
      setAlert({
        open: true,
        message: 'Please enter an object name',
        severity: 'warning'
      });
      return false;
    }

    setIsLoading(true);
    try {
      const success = await storageManager.saveObject(
        objectName.trim(),
        objectData,
        category
      );

      if (success) {
        setAlert({
          open: true,
          message: `Object "${objectName}" saved successfully in ${category}`,
          severity: 'success'
        });
        await loadObjectsList(category);
        return true;
      } else {
        setAlert({
          open: true,
          message: 'Failed to save object',
          severity: 'error'
        });
        return false;
      }
    } catch (error) {
      console.error('Error saving object:', error);
      setAlert({
        open: true,
        message: 'Error saving object: ' + error.message,
        severity: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, storageManager, loadObjectsList]);

  // Load object
  const loadObject = useCallback(async (objectName, category) => {
    if (!isInitialized || !storageManager) return null;
    
    setIsLoading(true);
    try {
      const objectData = await storageManager.loadObject(objectName, category);
      
      if (!objectData) {
        throw new Error(`Failed to load object "${objectName}"`);
      }
      
      return objectData;
    } catch (error) {
      console.error('Error loading object:', error);
      setAlert({
        open: true,
        message: `Error loading object: ${error.message}`,
        severity: 'error'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, storageManager]);

  // Clear alert
  const clearAlert = useCallback(() => {
    setAlert({ ...alert, open: false });
  }, [alert]);

  // Show alert
  const showAlert = useCallback((message, severity = 'info') => {
    setAlert({ open: true, message, severity });
  }, []);

  return {
    // State
    isInitialized,
    isLoading,
    storageMode,
    isFileSystemAccessSupported,
    savedProjects,
    savedObjects,
    categories,
    alert,
    
    // Initialization methods
    checkInitialization,
    initializeFileSystem,
    initializeIndexedDB,
    
    // Project methods
    loadSavedProjectsList,
    saveProject,
    loadProject,
    
    // Object methods
    loadObjectsList,
    saveObject,
    loadObject,
    
    // Category methods
    loadCategories,
    createCategory,
    
    // Alert methods
    clearAlert,
    showAlert,
  };
};

export default useProjectStorage;
