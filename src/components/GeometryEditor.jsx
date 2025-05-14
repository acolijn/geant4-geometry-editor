/**
 * GeometryEditor Component
 * 
 * This component provides a comprehensive interface for creating, editing, and managing
 * geometries for Geant4 simulations. It allows users to:
 * - Create various types of geometry objects (box, cylinder, sphere, etc.)
 * - Edit properties of existing geometries
 * - Organize geometries in a hierarchical structure
 * - Import and export geometry objects
 * - Configure hit collections for the detector
 * 
 * The component maintains the exact layout and behavior required for the
 * Geant4 geometry editor application.
 */

import React, { useState, useRef, useCallback } from 'react';
import fileSystemManager from '../utils/FileSystemManager';
import SaveObjectDialog from './SaveObjectDialog';
import LoadObjectDialog from './LoadObjectDialog';
import UpdateObjectsDialog from './UpdateObjectsDialog';
import HitCollectionsDialog from './HitCollectionsDialog';
import PropertyEditor from './geometry-editor/PropertyEditor';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Button,
  Tabs,
  Tab,
  Divider,
  Menu,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

/**
 * Main GeometryEditor component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.geometries - The geometry objects (world and volumes)
 * @param {Array} props.materials - List of available materials
 * @param {string} props.selectedGeometry - ID of the currently selected geometry
 * @param {Array} props.hitCollections - List of hit collections for the detector
 * @param {Function} props.onUpdateHitCollections - Callback to update hit collections
 * @param {Function} props.onUpdateGeometry - Callback to update a geometry object
 * @param {Function} props.onAddGeometry - Callback to add a new geometry object
 * @param {Function} props.onRemoveGeometry - Callback to remove a geometry object
 * @param {Function} props.extractObjectWithDescendants - Function to extract an object with its descendants
 * @param {Function} props.handleImportPartialFromAddNew - Function to handle importing partial geometry
 */
const GeometryEditor = ({ 
  geometries, 
  materials, 
  selectedGeometry, 
  hitCollections,
  onUpdateHitCollections,
  onUpdateGeometry, 
  onAddGeometry, 
  onRemoveGeometry,
  extractObjectWithDescendants,
  handleImportPartialFromAddNew
}) => {
  // ===== Refs =====
  // Reference to the file input for importing object JSON files
  const fileInputRef = useRef(null);
  
  // ===== UI State =====
  // Tab selection (0 = Properties, 1 = Add New)
  const [tabValue, setTabValue] = useState(0);
  // Menu state for the context menu
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const menuOpen = Boolean(menuAnchorEl);
  // Alert state for import notifications
  const [importAlert, setImportAlert] = useState({ show: false, message: '', severity: 'info' });
  
  // ===== Geometry Creation State =====
  // Type of geometry to create (box, cylinder, sphere, etc.)
  const [newGeometryType, setNewGeometryType] = useState('box');
  // Default mother volume for new geometries
  const [newMotherVolume, setNewMotherVolume] = useState('World');
  // For union solids: first solid selection
  const [firstSolid, setFirstSolid] = useState('');
  // For union solids: second solid selection
  const [secondSolid, setSecondSolid] = useState('');
  
  // ===== Dialog States =====
  // Save object dialog
  const [saveObjectDialogOpen, setSaveObjectDialogOpen] = useState(false);
  // Load object dialog
  const [loadObjectDialogOpen, setLoadObjectDialogOpen] = useState(false);
  // Update objects dialog
  const [updateObjectsDialogOpen, setUpdateObjectsDialogOpen] = useState(false);
  // Hit collections dialog
  const [hitCollectionsDialogOpen, setHitCollectionsDialogOpen] = useState(false);
  // Object to save in the save dialog
  const [objectToSave, setObjectToSave] = useState(null);
  
  // State for alerts and notifications
  
  /**
   * Handle tab changes between Properties and Add New tabs
   * 
   * @param {Object} event - The event object (unused)
   * @param {number} newValue - The index of the new tab (0 for Properties, 1 for Add New)
   */
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  /**
   * Open the context menu
   * 
   * This function opens the context menu at the location of the clicked element.
   * It prevents event propagation to avoid unintended side effects like selecting
   * objects underneath the menu button.
   * 
   * @param {Object} event - The click event that triggered the menu opening
   */
  const handleMenuOpen = (event) => {
    // Prevent event propagation to avoid selecting objects underneath
    event.stopPropagation();
    // Set the anchor element to position the menu
    setMenuAnchorEl(event.currentTarget);
  };
  
  // Open the load object dialog
  const handleOpenLoadObjectDialog = () => {
    setLoadObjectDialogOpen(true);
  };
  
  /**
   * Simplify object names by removing the structured naming pattern before saving
   * 
   * This function processes an object and its descendants to simplify their names
   * by extracting the component name from structured names (BaseName_ComponentName_ID).
   * It also updates all references to maintain the correct relationships between objects.
   * 
   * @param {Object} objectData - The object data to process, containing object and descendants
   * @returns {Object} The processed object data with simplified names
   */
  const simplifyObjectNames = (objectData) => {
    // Return early if the input is invalid
    if (!objectData || !objectData.object) return objectData;
    
    // Create a deep copy of the object data
    const simplifiedData = JSON.parse(JSON.stringify(objectData));
    
    // Create a mapping of old names to simplified names
    const nameMapping = {};
    
    /**
     * Extract the component name from a structured name format
     * 
     * Structured names follow the pattern: BaseName_ComponentName_ID
     * This function extracts just the ComponentName part for cleaner exports.
     * 
     * @param {string} structuredName - The structured name to process
     * @returns {string} The extracted component name or the original name if not in expected format
     */
    const extractComponentName = (structuredName) => {
      // Return early if the name is empty or undefined
      if (!structuredName) return structuredName;
      
      // Parse the name parts: BaseName_ComponentName_ID
      const parts = structuredName.split('_');
      if (parts.length >= 2) {
        // Return just the component name
        return parts[1];
      }
      // If not in expected format, return as is
      return structuredName;
    };
    
    // Simplify the mother object name
    const originalMotherName = simplifiedData.object.name;
    const simplifiedMotherName = extractComponentName(originalMotherName);
    
    // Store the mapping
    nameMapping[originalMotherName] = simplifiedMotherName;
    
    // Update the mother object name
    simplifiedData.object.name = simplifiedMotherName;
    
    // Simplify all descendant names
    if (simplifiedData.descendants && Array.isArray(simplifiedData.descendants)) {
      // First pass: Create the name mapping
      simplifiedData.descendants.forEach((descendant) => {
        if (descendant.name) {
          const originalName = descendant.name;
          const simplifiedName = extractComponentName(originalName);
          nameMapping[originalName] = simplifiedName;
        }
      });
      
      // Second pass: Apply the simplified names and update mother_volume references
      simplifiedData.descendants = simplifiedData.descendants.map((descendant) => {
        // Simplify the name
        if (descendant.name) {
          descendant.name = nameMapping[descendant.name] || descendant.name;
        }
        
        // Update mother_volume reference
        if (descendant.mother_volume && nameMapping[descendant.mother_volume]) {
          descendant.mother_volume = nameMapping[descendant.mother_volume];
        }
        
        return descendant;
      });
    }
    
    return simplifiedData;
  };
  
  const handleSaveObject = async (name, description, objectData) => {
    try {
      // Import the ObjectStorage utility
      const { saveObject } = await import('../utils/ObjectStorage');
      
      // Simplify object names before saving
      const simplifiedObjectData = simplifyObjectNames(objectData);
      
      // Save the object with simplified names
      const result = await saveObject(name, description, simplifiedObjectData);
      
      if (result.success) {
        console.log(`Object saved successfully to ${result.filePath}`);
        setImportAlert({
          show: true,
          message: `Saved ${name} with ${objectData.descendants.length} descendants.`,
          severity: 'success'
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error saving object:', error);
      setImportAlert({
        show: true,
        message: `Error saving object: ${error.message}`,
        severity: 'error'
      });
      
      return {
        success: false,
        message: `Error saving object: ${error.message}`
      };
    }
  };
  
  /**
   * Handle loading an object from the library
   * 
   * This function processes object data loaded from the library, applies structured naming
   * to ensure consistency, and adds the object to the scene. It also displays a success
   * or error notification to provide feedback to the user.
   * 
   * @param {Object} objectData - The object data to load, including the main object and its descendants
   * @returns {Object} An object indicating success or failure of the operation
   */
  const handleLoadObject = (objectData) => {
    try {
      // Process the loaded object data
      console.log('Loaded object data:', objectData);
      
      // Apply structured naming convention to the object and its descendants
      const structuredObjectData = applyStructuredNaming(objectData);
      
      // Add the object to the scene
      handleImportPartialFromAddNew(structuredObjectData);
      
      setImportAlert({
        show: true,
        message: `Loaded ${structuredObjectData.object.name} with ${structuredObjectData.descendants.length} descendants.`,
        severity: 'success'
      });
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error loading object:', error);
      setImportAlert({
        show: true,
        message: `Error loading object: ${error.message}`,
        severity: 'error'
      });
      
      return {
        success: false,
        message: `Error loading object: ${error.message}`
      };
    }
  };
  
  // Handle updating instances of objects in the scene
  const handleUpdateObjects = (instanceIds, objectData) => {
    try {
      if (!instanceIds || !instanceIds.length || !objectData) {
        throw new Error('Invalid update parameters');
      }
      
      console.log('Updating instances:', instanceIds);
      console.log('With object data:', objectData);
      
      // Track how many instances were updated
      let updatedCount = 0;
      
      // First, we need to find all descendants of the selected instances
      // This will allow us to update the entire hierarchy for each selected top-level object
      const topLevelInstances = [];
      const instancesMap = new Map(); // Map to store all instances by name
      
      // Build a map of all objects in the scene
      if (geometries.world) {
        instancesMap.set(geometries.world.name, {
          id: 'world',
          object: geometries.world
        });
      }
      
      geometries.volumes.forEach((volume, index) => {
        instancesMap.set(volume.name, {
          id: `volume-${index}`,
          object: volume
        });
      });
      
      // Process each selected instance
      instanceIds.forEach(instanceId => {
        // Get the instance to update
        let instance;
        
        if (instanceId === 'world') {
          instance = geometries.world;
        } else if (instanceId.startsWith('volume-')) {
          const volumeIndex = parseInt(instanceId.split('-')[1]);
          instance = geometries.volumes[volumeIndex];
        }
        
        if (!instance) {
          console.warn(`Instance ${instanceId} not found`);
          return;
        }
        
        console.log('Found instance to update:', instance.name);
        
        // Add this top-level instance to our list
        topLevelInstances.push({
          id: instanceId,
          object: instance,
          descendants: []
        });
        
        // Find all descendants of this instance by checking mother_volume references
        geometries.volumes.forEach((volume, index) => {
          // Check if this volume has the current instance as its mother
          if (volume.mother_volume === instance.name) {
            console.log('Found direct child:', volume.name, 'of', instance.name);
            // Direct child - add to descendants
            topLevelInstances[topLevelInstances.length - 1].descendants.push({
              id: `volume-${index}`,
              object: volume
            });
          }
        });
      });
      
      console.log('Top level instances with descendants:', topLevelInstances);
      
      // Create a deep copy of the object data to avoid modifying the original
      const templateData = JSON.parse(JSON.stringify(objectData));
      
      // Now update each top-level instance and its descendants
      topLevelInstances.forEach(topInstance => {
        // Get the original object data
        const originalObject = topInstance.object;
        console.log('Updating top-level object:', originalObject.name);
        
        // Only preserve the name, position, rotation, and mother_volume of the original object
        // Everything else should come from the template
        const preservedProps = {
          name: originalObject.name,
          position: { ...originalObject.position },
          rotation: { ...originalObject.rotation },
          mother_volume: originalObject.mother_volume
        };
        
        // Create a new object with the template properties
        const updatedObject = {
          ...templateData.object,  // Start with template properties
          ...preservedProps       // Override with preserved properties
        };
        
        console.log('Original object:', originalObject);
        console.log('Template object:', templateData.object);
        console.log('Updated object:', updatedObject);
        
        // Update the top-level instance
        onUpdateGeometry(topInstance.id, updatedObject);
        updatedCount++;
        
        // Update all descendants
        if (topInstance.descendants.length > 0 && templateData.descendants) {
          console.log('Updating descendants for', originalObject.name);
          console.log('Template descendants:', templateData.descendants);
          
          // Create a map of component names to template descendants for easier lookup
          const templateDescMap = new Map();
          templateData.descendants.forEach(td => {
            if (td.name) {
              templateDescMap.set(td.name, td);
            }
          });
          
          topInstance.descendants.forEach(descendant => {
            const originalDesc = descendant.object;
            console.log('Processing descendant:', originalDesc.name);
            
            // Try to find a matching template descendant
            let templateDesc = null;
            
            // First try to match by component name (from structured naming)
            const descNameParts = originalDesc.name.split('_');
            if (descNameParts.length >= 2) {
              const componentName = descNameParts[1];
              console.log('Looking for template with component name:', componentName);
              
              // Look for an exact match in the template
              templateDesc = templateDescMap.get(componentName);
              
              // If no exact match, try to find by partial name match
              if (!templateDesc) {
                templateDesc = templateData.descendants.find(td => {
                  return td.name === componentName || 
                         (td.name && td.name.includes(componentName));
                });
              }
            }
            
            // If no match by name, try to match by type
            if (!templateDesc) {
              console.log('Trying to match by type:', originalDesc.type);
              templateDesc = templateData.descendants.find(td => td.type === originalDesc.type);
            }
            
            if (templateDesc) {
              console.log('Found matching template:', templateDesc);
              
              // Only preserve the name and mother_volume of the original descendant
              // Take ALL other properties directly from the template, including position and rotation
              const updatedDesc = {
                ...templateDesc,       // Start with ALL template properties
                name: originalDesc.name,
                mother_volume: originalDesc.mother_volume
                // Use the template's position and rotation exactly as defined
              };
              
              console.log('Updated descendant:', updatedDesc);
              
              // Update this descendant
              onUpdateGeometry(descendant.id, updatedDesc);
              updatedCount++;
            } else {
              console.warn('No matching template found for:', originalDesc.name);
            }
          });
        }
      });
      
      // Show success message
      setImportAlert({
        show: true,
        message: `Updated ${updatedCount} object(s) successfully.`,
        severity: 'success'
      });
      
      return {
        success: true,
        updatedCount
      };
    } catch (error) {
      console.error('Error updating objects:', error);
      setImportAlert({
        show: true,
        message: `Error updating objects: ${error.message}`,
        severity: 'error'
      });
      
      return {
        success: false,
        message: `Error updating objects: ${error.message}`
      };
    }
  };
  
  /**
   * Apply structured naming to imported objects
   * 
   * This function ensures consistent naming of imported objects by applying a structured
   * naming convention in the format: BaseName_ComponentName_ID. This helps maintain
   * organization and prevents naming conflicts when importing objects.
   * 
   * The function creates a mapping between original names and new structured names,
   * and updates all mother_volume references to maintain proper relationships.
   * 
   * @param {Object} objectData - The object data to process, including the main object and its descendants
   * @returns {Object} The processed object data with structured naming applied
   */
  const applyStructuredNaming = (objectData) => {
    if (!objectData || !objectData.object) return objectData;
    
    // Get the base name from the metadata (if available) or from the main object
    const baseName = objectData.metadata?.name || objectData.object.name;
    
    // Create a deep copy of the object data
    const structuredData = JSON.parse(JSON.stringify(objectData));
    
    // Create a mapping of old names to new names
    const nameMapping = {};
    
    // Get all existing names in the scene to ensure uniqueness
    const existingNames = [
      geometries.world.name,
      ...geometries.volumes.map(vol => vol.name)
    ];
    
    // Store the original mother object name
    const originalMotherName = structuredData.object.name;
    
    // Create a unique ID counter for this import operation
    let uniqueIdCounter = 0;
    
    // Find a unique ID for the mother object
    while (existingNames.includes(`${baseName}_${originalMotherName}_${uniqueIdCounter}`)) {
      uniqueIdCounter++;
    }
    
    // Create the structured name for the mother object
    const newMotherName = `${baseName}_${originalMotherName}_${uniqueIdCounter}`;
    
    // Add to the name mapping
    nameMapping[originalMotherName] = newMotherName;
    
    // Rename the mother object
    structuredData.object.name = newMotherName;
    
    // Add the new name to our list of existing names
    existingNames.push(newMotherName);
    
    // Process all descendants
    if (structuredData.descendants && Array.isArray(structuredData.descendants)) {
      structuredData.descendants.forEach((descendant) => {
        // Store the original name
        const originalName = descendant.name || 
                            (descendant.type.charAt(0).toUpperCase() + descendant.type.slice(1));
        
        // Find a unique ID for this component
        let componentId = 0;
        while (existingNames.includes(`${baseName}_${originalName}_${componentId}`)) {
          componentId++;
        }
        
        // Create a structured name
        const newName = `${baseName}_${originalName}_${componentId}`;
        
        // Add to our mapping
        nameMapping[descendant.name] = newName;
        
        // Add to our list of existing names
        existingNames.push(newName);
      });
      
      // Apply the new names and update mother_volume references
      structuredData.descendants = structuredData.descendants.map((descendant) => {
        // Rename the object using the mapping
        descendant.name = nameMapping[descendant.name];
        
        // Update mother_volume references using our mapping
        if (descendant.mother_volume && nameMapping[descendant.mother_volume]) {
          descendant.mother_volume = nameMapping[descendant.mother_volume];
        }
        
        return descendant;
      });
    }
    
    return structuredData;
  };
  
  // Handle closing the context menu
  /**
   * Close the context menu
   * 
   * This function closes the context menu and prevents event propagation
   * to avoid unintended side effects like selecting objects underneath.
   * 
   * @param {Object} event - The event object (may be undefined if called programmatically)
   */
  const handleMenuClose = (event) => {
    // Prevent event propagation if an event is provided
    if (event) event.stopPropagation();
    // Close the menu by setting its anchor element to null
    setMenuAnchorEl(null);
  };
  

  
  // Handle exporting the selected object with its descendants
  /**
   * Export the selected geometry object and its descendants
   * 
   * This function extracts the selected geometry object along with all its descendants
   * and prepares them for export. It adds debug information and opens the save dialog
   * to allow the user to save the exported data to a file.
   */
  const handleExportObject = () => {
    handleMenuClose();
    
    // Return early if no geometry is selected
    if (!selectedGeometry) return;
    
    // Extract the selected object and its descendants
    const exportData = extractObjectWithDescendants(selectedGeometry);
    if (!exportData) return;
    
    // Add debug information to the export data
    exportData.debug = {
      exportedAt: new Date().toISOString(),
      objectType: exportData.object.type,
      objectName: exportData.object.name,
      descendantCount: exportData.descendants.length
    };
    
    // Store the export data and open the save dialog
    setObjectToSave(exportData);
    setSaveObjectDialogOpen(true);
    return;
    
    // Create a file input element to trigger the native file dialog
    const saveFileInput = document.createElement('input');
    saveFileInput.type = 'file';
    saveFileInput.style.display = 'none';
    saveFileInput.setAttribute('nwsaveas', `${exportData.object.name}.json`); // For NW.js
    saveFileInput.setAttribute('webkitdirectory', ''); // For directory selection
    saveFileInput.setAttribute('directory', ''); // For directory selection
    
    // Create a JSON file for saving
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // Use the showSaveFilePicker API if available (modern browsers)
    if (window.showSaveFilePicker) {
      const saveFile = async () => {
        try {
          // Configure the file picker
          const opts = {
            suggestedName: `${exportData.object.name}.json`,
            types: [{
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] }
            }],
            excludeAcceptAllOption: false
          };
          
          // Show the file picker
          const fileHandle = await window.showSaveFilePicker(opts);
          
          // Get a writable stream and write the file
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          // Register the source with the instance tracker
          const sourceId = fileHandle.name;
          
          // Check if there are other instances of this object
          const instanceId = selectedGeometry;
          const volumeIndex = selectedGeometry === 'world' ? -1 : 
            geometries.volumes.findIndex((_, index) => `volume-${index}` === selectedGeometry);
          
          // Get the current object for debugging
          const currentObject = selectedGeometry === 'world' ? geometries.world : 
            geometries.volumes[volumeIndex];
          
          console.log('Saving object:', {
            sourceId,
            instanceId,
            volumeIndex,
            objectType: currentObject.type,
            objectName: currentObject.name,
            exportData
          });
          
          // Force a check of all volumes to find similar objects
          console.log('All volumes in the scene:');
          geometries.volumes.forEach((volume, index) => {
            console.log(`Volume ${index}:`, {
              type: volume.type,
              name: volume.name,
              key: `volume-${index}`
            });
          });
          
          // Instance tracking functionality has been removed for a cleaner implementation
          // Object tracking and updating will be reimplemented in a simpler way
          console.log('Exported object:', exportData.object.name);
          {
            // Show success message
            setImportAlert({
              show: true,
              message: `Saved ${exportData.object.name} with ${exportData.descendants.length} descendants.`,
              severity: 'success'
            });
          }
        } catch (err) {
          // User probably canceled the save dialog
          if (err.name !== 'AbortError') {
            console.error('Error saving file:', err);
            setImportAlert({
              show: true,
              message: `Error saving file: ${err.message}`,
              severity: 'error'
            });
          }
        }
      };
      
      saveFile();
    } else {
      // Fallback for browsers that don't support the File System Access API
      // Show a dialog to ask the user how they want to save
      const dialogContainer = document.createElement('div');
      dialogContainer.style.position = 'fixed';
      dialogContainer.style.top = '0';
      dialogContainer.style.left = '0';
      dialogContainer.style.width = '100%';
      dialogContainer.style.height = '100%';
      dialogContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      dialogContainer.style.display = 'flex';
      dialogContainer.style.justifyContent = 'center';
      dialogContainer.style.alignItems = 'center';
      dialogContainer.style.zIndex = '9999';
      
      const dialogContent = document.createElement('div');
      dialogContent.style.backgroundColor = 'white';
      dialogContent.style.padding = '20px';
      dialogContent.style.borderRadius = '8px';
      dialogContent.style.maxWidth = '400px';
      dialogContent.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
      
      const title = document.createElement('h3');
      title.textContent = 'Save Object';
      title.style.marginTop = '0';
      
      const message = document.createElement('p');
      message.textContent = `How would you like to save "${exportData.object.name}" with ${exportData.descendants.length} descendants?`;
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'flex-end';
      buttonContainer.style.marginTop = '20px';
      buttonContainer.style.gap = '10px';
      
      const saveToStructureButton = document.createElement('button');
      saveToStructureButton.textContent = 'Save to Structure';
      saveToStructureButton.style.padding = '8px 16px';
      saveToStructureButton.style.backgroundColor = '#1976d2';
      saveToStructureButton.style.color = 'white';
      saveToStructureButton.style.border = 'none';
      saveToStructureButton.style.borderRadius = '4px';
      saveToStructureButton.style.cursor = 'pointer';
      
      const downloadButton = document.createElement('button');
      downloadButton.textContent = 'Download File';
      downloadButton.style.padding = '8px 16px';
      downloadButton.style.backgroundColor = '#f5f5f5';
      downloadButton.style.color = '#333';
      downloadButton.style.border = '1px solid #ccc';
      downloadButton.style.borderRadius = '4px';
      downloadButton.style.cursor = 'pointer';
      
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.padding = '8px 16px';
      cancelButton.style.backgroundColor = '#f5f5f5';
      cancelButton.style.color = '#333';
      cancelButton.style.border = '1px solid #ccc';
      cancelButton.style.borderRadius = '4px';
      cancelButton.style.cursor = 'pointer';
      
      // Add event listeners
      saveToStructureButton.addEventListener('click', () => {
        document.body.removeChild(dialogContainer);
        // Dispatch a custom event to notify ProjectManager to open the save object dialog
        const event = new CustomEvent('saveObject', { 
          detail: { objectData: exportData }
        });
        document.dispatchEvent(event);
      });
      
      downloadButton.addEventListener('click', () => {
        document.body.removeChild(dialogContainer);
        
        // Create a JSON file and trigger download
        const url = URL.createObjectURL(blob);
        
        // Create a temporary link and trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportData.object.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Register the source with the instance tracker
        const sourceId = `${exportData.object.name}-${Date.now()}.json`;
        
        // Check if there are other instances of this object
        const instanceId = selectedGeometry;
        const volumeIndex = selectedGeometry === 'world' ? -1 : 
          geometries.volumes.findIndex((_, index) => `volume-${index}` === selectedGeometry);
        
        // Instance tracking functionality has been removed for a cleaner implementation
        // Object tracking and updating will be reimplemented in a simpler way
        console.log('Saved object:', exportData.object.name);
        {
          // Show alert with export information
          setImportAlert({
            show: true,
            message: `Downloaded ${exportData.object.name} with ${exportData.descendants.length} descendants.`,
            severity: 'info'
          });
        }
      });
      
      cancelButton.addEventListener('click', () => {
        document.body.removeChild(dialogContainer);
      });
      
      // Assemble the dialog
      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(downloadButton);
      buttonContainer.appendChild(saveToStructureButton);
      
      dialogContent.appendChild(title);
      dialogContent.appendChild(message);
      dialogContent.appendChild(buttonContainer);
      
      dialogContainer.appendChild(dialogContent);
      document.body.appendChild(dialogContainer);
    }
    
    // Create a global variable to make the export data accessible in the console
    window.lastExportedObject = exportData;
    console.log('Export data saved to window.lastExportedObject for debugging');
  };

  /**
   * Get the currently selected geometry object based on the selectedGeometry ID
   * 
   * This function retrieves the geometry object that corresponds to the currently
   * selected geometry ID. The ID can be 'world' for the world volume or 'volume-X'
   * where X is the index of the volume in the geometries.volumes array.
   * 
   * @returns {Object|null} The selected geometry object or null if no geometry is selected
   */
  const getSelectedGeometryObject = () => {
    // Return null if no geometry is selected
    if (!selectedGeometry) return null;
    
    // Return the world volume if 'world' is selected
    if (selectedGeometry === 'world') return geometries.world;
    
    // Return the volume at the specified index if a volume is selected
    if (selectedGeometry.startsWith('volume-')) {
      const index = parseInt(selectedGeometry.split('-')[1]);
      return geometries.volumes[index];
    }
    
    // Return null if the selected geometry ID is not recognized
    return null;
  };

  // We'll get the selected object inside the render functions to ensure it's always up-to-date

  /**
   * Handle rotation changes for the selected geometry object
   * 
   * This function updates the rotation of the selected geometry along a specified axis.
   * Rotations in Geant4 follow a sequential system: rotateX, then rotateY around the new Y axis,
   * then rotateZ around the new Z axis.
   * 
   * @param {string} axis - The rotation axis ('x', 'y', or 'z')
   * @param {number} value - The rotation value in degrees
   */
  const handleRotationChange = (axis, value) => {
    // Return early if no geometry is selected
    if (!selectedGeometry) return;
    const selectedObject = getSelectedGeometryObject();
    
    const updatedGeometries = { ...geometries };
    
    if (selectedGeometry === 'world') {
      updatedGeometries.world.rotation = {
        ...updatedGeometries.world.rotation,
        [axis]: value
      };
    } else {
      const index = parseInt(selectedGeometry.split('-')[1]);
      updatedGeometries.volumes[index].rotation = {
        ...updatedGeometries.volumes[index].rotation,
        [axis]: value
      };
    }
    
    onUpdateGeometry(selectedGeometry, updatedGeometries);
  };
  
  /**
   * Handle relative position changes for union solids
   * 
   * This function updates the relative position of the second solid in a union
   * with respect to the first solid. This affects how the two solids are combined
   * in the union operation.
   * 
   * @param {string} axis - The position axis ('x', 'y', or 'z')
   * @param {number} value - The position value in centimeters
   */
  const handleRelativePositionChange = (axis, value) => {
    // Return early if no geometry is selected
    if (!selectedGeometry) return;
    
    const index = parseInt(selectedGeometry.split('-')[1]);
    const volume = geometries.volumes[index];
    
    // Ensure the object is a union solid
    if (volume.type !== 'union') return;
    
    // Create updated relative position
    const updatedRelativePosition = {
      ...volume.relative_position,
      [axis]: value
    };
    
    // Update the geometry
    onUpdateGeometry(selectedGeometry, { relative_position: updatedRelativePosition });
  };
  
  /**
   * Handle relative rotation changes for union solids
   * 
   * This function updates the relative rotation of the second solid in a union
   * with respect to the first solid. Rotations follow Geant4's sequential system:
   * rotateX, then rotateY around the new Y axis, then rotateZ around the new Z axis.
   * 
   * @param {string} axis - The rotation axis ('x', 'y', or 'z')
   * @param {number} value - The rotation value in degrees
   */
  const handleRelativeRotationChange = (axis, value) => {
    // Return early if no geometry is selected
    if (!selectedGeometry) return;
    
    const index = parseInt(selectedGeometry.split('-')[1]);
    const volume = geometries.volumes[index];
    
    // Ensure the object is a union solid
    if (volume.type !== 'union') return;
    
    // Create updated relative rotation
    const updatedRelativeRotation = {
      ...volume.relative_rotation,
      [axis]: value
    };
    
    // Update the geometry
    onUpdateGeometry(selectedGeometry, { relative_rotation: updatedRelativeRotation });
  };

  // Handle property changes
  // Auto-select the content of input fields when they receive focus
  const handleInputFocus = (event) => {
    event.target.select();
  };
  
  // Handle key events for number input fields to allow negative numbers
  const handleNumberKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter, decimal point, minus sign
    if (
      [46, 8, 9, 27, 13, 110, 190, 189, 109].indexOf(e.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true) ||
      // Allow: home, end, left, right
      (e.keyCode >= 35 && e.keyCode <= 39)
    ) {
      return;
    }
    
    // Ensure that it's a number or stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      // Allow minus sign at the beginning of empty input or if cursor is at position 0
      if ((e.keyCode === 189 || e.keyCode === 109) && 
          (e.target.value === '' || e.target.selectionStart === 0)) {
        return;
      }
      e.preventDefault();
    }
  };

  /**
   * Handle changes to geometry properties
   * 
   * This function handles changes to any property of the selected geometry object.
   * It provides special handling for different types of properties (strings, arrays, numbers)
   * and ensures proper validation and formatting of values.
   * 
   * @param {string} property - The name of the property to change (can be nested like 'position.x')
   * @param {any} value - The new value for the property
   * @param {boolean} allowNegative - Whether to allow negative values for numeric properties
   * @param {boolean} isStringProperty - Whether the property is a string (no numeric conversion)
   */
  const handlePropertyChange = (property, value, allowNegative = true, isStringProperty = false) => {
    // Return early if no geometry is selected
    if (!selectedGeometry) return;
    const selectedObject = getSelectedGeometryObject();
    if (!selectedObject) return;
    
    // Create a copy of the selected object to avoid direct state mutation
    const updatedObject = { ...getSelectedGeometryObject() };
    
    // Special handling for string properties like name and material
    if (isStringProperty) {
      updatedObject[property] = value;
      onUpdateGeometry(selectedGeometry, updatedObject);
      return;
    }
    
    // Special handling for array properties like zSections
    if (Array.isArray(value)) {
      updatedObject[property] = value;
      onUpdateGeometry(selectedGeometry, updatedObject);
      return;
    }
    
    /**
     * Process and validate the input value
     * 
     * For numeric properties, we need to validate the input and convert strings to numbers.
     * This includes handling special cases like empty inputs, minus signs, and decimal points.
     */
    let processedValue = value;
    
    // For numeric properties, handle validation and conversion
    if (!isStringProperty) {
      // Allow minus sign at the beginning of empty input or if cursor is at position 0
      // This is important for UX, allowing users to start typing negative numbers
      if (value === '-' || (typeof value === 'string' && value.trim() === '')) {
        processedValue = value;
      } else if (typeof value === 'string') {
        // Only allow numeric input with optional decimal point and minus sign
        // This prevents invalid characters from being entered
        const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
        if (!regex.test(value)) {
          return; // Invalid input, don't update
        }
        
        // Convert to number if it's a valid numeric string
        // Empty string is allowed to enable clearing the input field
        if (value !== '') {
          const numValue = parseFloat(value);
          // If not allowing negative values, ensure it's positive
          if (!allowNegative && numValue < 0) {
            processedValue = 0;
          } else if (!isNaN(numValue)) {
            processedValue = numValue;
          } else {
            processedValue = 0;
          }
        }
      }
    }
    
    /**
     * Handle nested properties like position.x, rotation.y, etc.
     * 
     * This section handles properties that are nested within objects, such as
     * coordinates within position objects or angles within rotation objects.
     * It preserves the structure of the parent object while updating only the
     * specified child property.
     */
    if (property.includes('.')) {
      // Split the property path into parent and child components
      const [parent, child] = property.split('.');
      
      // For empty string or just a minus sign, keep it as is to allow typing
      if (processedValue === '' || processedValue === '-') {
        updatedObject[parent] = { 
          ...updatedObject[parent], 
          [child]: processedValue 
        };
      } else if (typeof processedValue === 'number') {
        // For actual numbers, use them directly
        updatedObject[parent] = { 
          ...updatedObject[parent], 
          [child]: processedValue 
        };
      } else {
        // For string values that should be numbers
        const parsedValue = parseFloat(processedValue);
        updatedObject[parent] = { 
          ...updatedObject[parent], 
          [child]: isNaN(parsedValue) ? 0 : parsedValue 
        };
      }
    } else {
      // For empty string or just a minus sign, keep it as is to allow typing
      if (processedValue === '' || processedValue === '-') {
        updatedObject[property] = processedValue;
      } else if (typeof processedValue === 'number') {
        updatedObject[property] = processedValue;
      } else {
        // For string values that should be numbers
        const parsedValue = parseFloat(processedValue);
        updatedObject[property] = isNaN(parsedValue) ? 0 : parsedValue;
      }
    }
    
    // Update the geometry with the modified object
    // This will trigger a re-render and ensure the object stays selected
    // after the update, maintaining the transform controls visibility
    onUpdateGeometry(selectedGeometry, updatedObject);
  };

  // Add a new geometry
  /**
   * Add a new geometry object to the scene
   * 
   * This function creates a new geometry object based on the selected type and mother volume.
   * It handles special cases for union solids, which require combining two existing solids.
   * For basic geometries, it creates objects with default properties based on the type.
   */
  const handleAddGeometry = () => {
    // For union solids, we need to validate that both solids are selected
    if (newGeometryType === 'union') {
      if (!firstSolid || !secondSolid) {
        setImportAlert({
          show: true,
          message: 'Please select both solids for the union operation.',
          severity: 'error'
        });
        return;
      }
      
      // Get the indices of the selected solids
      const firstSolidIndex = parseInt(firstSolid.split('-')[1]);
      const secondSolidIndex = parseInt(secondSolid.split('-')[1]);
      
      // Get the actual solid objects
      const firstSolidObj = geometries.volumes[firstSolidIndex];
      const secondSolidObj = geometries.volumes[secondSolidIndex];
      
      if (!firstSolidObj || !secondSolidObj) {
        setImportAlert({
          show: true,
          message: 'One or both of the selected solids could not be found.',
          severity: 'error'
        });
        return;
      }
      
      // Create the union solid in a format compatible with the GeometryParser
      // For a self-contained union solid, we need to include the complete definitions of both solids
      // rather than just referencing them by name
      
      const newGeometry = {
        type: 'union',
        name: `Union_${firstSolidIndex}_${secondSolidIndex}`,
        material: 'G4_AIR',
        position: { x: 0, y: 0, z: 0, unit: 'cm' },
        rotation: { x: 0, y: 0, z: 0, unit: 'deg' },
        mother_volume: newMotherVolume,
        // Inline definitions of the solids being combined
        solid1: {
          // Copy all properties of the first solid except position, rotation, and mother_volume
          // which are specific to the placement, not the solid definition
          type: firstSolidObj.type,
          ...(firstSolidObj.size && { size: { ...firstSolidObj.size } }),
          ...(firstSolidObj.radius && { radius: firstSolidObj.radius }),
          ...(firstSolidObj.height && { height: firstSolidObj.height }),
          ...(firstSolidObj.inner_radius && { inner_radius: firstSolidObj.inner_radius }),
          ...(firstSolidObj.innerRadius && { innerRadius: firstSolidObj.innerRadius }),
          ...(firstSolidObj.dx1 && { dx1: firstSolidObj.dx1 }),
          ...(firstSolidObj.dx2 && { dx2: firstSolidObj.dx2 }),
          ...(firstSolidObj.dy1 && { dy1: firstSolidObj.dy1 }),
          ...(firstSolidObj.dy2 && { dy2: firstSolidObj.dy2 }),
          ...(firstSolidObj.dz && { dz: firstSolidObj.dz }),
          ...(firstSolidObj.xRadius && { xRadius: firstSolidObj.xRadius }),
          ...(firstSolidObj.yRadius && { yRadius: firstSolidObj.yRadius }),
          ...(firstSolidObj.zRadius && { zRadius: firstSolidObj.zRadius }),
          ...(firstSolidObj.majorRadius && { majorRadius: firstSolidObj.majorRadius }),
          ...(firstSolidObj.minorRadius && { minorRadius: firstSolidObj.minorRadius }),
          ...(firstSolidObj.zSections && { zSections: [...firstSolidObj.zSections] }),
          ...(firstSolidObj.unit && { unit: firstSolidObj.unit })
        },
        solid2: {
          // Copy all properties of the second solid except position, rotation, and mother_volume
          type: secondSolidObj.type,
          ...(secondSolidObj.size && { size: { ...secondSolidObj.size } }),
          ...(secondSolidObj.radius && { radius: secondSolidObj.radius }),
          ...(secondSolidObj.height && { height: secondSolidObj.height }),
          ...(secondSolidObj.inner_radius && { inner_radius: secondSolidObj.inner_radius }),
          ...(secondSolidObj.innerRadius && { innerRadius: secondSolidObj.innerRadius }),
          ...(secondSolidObj.dx1 && { dx1: secondSolidObj.dx1 }),
          ...(secondSolidObj.dx2 && { dx2: secondSolidObj.dx2 }),
          ...(secondSolidObj.dy1 && { dy1: secondSolidObj.dy1 }),
          ...(secondSolidObj.dy2 && { dy2: secondSolidObj.dy2 }),
          ...(secondSolidObj.dz && { dz: secondSolidObj.dz }),
          ...(secondSolidObj.xRadius && { xRadius: secondSolidObj.xRadius }),
          ...(secondSolidObj.yRadius && { yRadius: secondSolidObj.yRadius }),
          ...(secondSolidObj.zRadius && { zRadius: secondSolidObj.zRadius }),
          ...(secondSolidObj.majorRadius && { majorRadius: secondSolidObj.majorRadius }),
          ...(secondSolidObj.minorRadius && { minorRadius: secondSolidObj.minorRadius }),
          ...(secondSolidObj.zSections && { zSections: [...secondSolidObj.zSections] }),
          ...(secondSolidObj.unit && { unit: secondSolidObj.unit })
        },
        // Relative position of the second solid with respect to the first
        // Set a default offset along the z-axis so the solids don't completely overlap
        relative_position: { x: 0, y: 0, z: 5, unit: 'cm' },
        relative_rotation: { x: 0, y: 0, z: 0, unit: 'deg' },
        // Store the volume indices for the editor's reference
        _editorData: {
          firstSolidIndex,
          secondSolidIndex
        }
      };
      
      onAddGeometry(newGeometry);
      
      // Reset the solid selections after creating the union
      setFirstSolid('');
      setSecondSolid('');
      return;
    }
    
    // For basic geometries
    const newGeometry = {
      type: newGeometryType,
      // Special naming for PMT objects
      name: newGeometryType.toLowerCase() === 'pmt' ? 'PMT' : `New${newGeometryType.charAt(0).toUpperCase() + newGeometryType.slice(1)}`,
      material: 'G4_AIR',
      position: { x: 0, y: 0, z: 0, unit: 'cm' },
      rotation: { x: 0, y: 0, z: 0, unit: 'deg' },
      mother_volume: newMotherVolume // Use the selected mother volume
    };
    
    // Add specific properties based on geometry type
    if (newGeometryType === 'box') {
      newGeometry.size = { x: 10, y: 10, z: 10, unit: 'cm' };
    } else if (newGeometryType === 'cylinder') {
      newGeometry.radius = 5;
      newGeometry.height = 10;
      newGeometry.inner_radius = 0;
      newGeometry.unit = 'cm'; // Add unit information for cylinder dimensions
    } else if (newGeometryType === 'sphere') {
      newGeometry.radius = 5;
      newGeometry.unit = 'cm'; // Add unit information for sphere dimensions
    } else if (newGeometryType === 'trapezoid') {
      newGeometry.dx1 = 5; // Half-length in x at -z/2
      newGeometry.dx2 = 5; // Half-length in x at +z/2
      newGeometry.dy1 = 5; // Half-length in y at -z/2
      newGeometry.dy2 = 5; // Half-length in y at +z/2
      newGeometry.dz = 5;  // Half-length in z
      newGeometry.unit = 'cm';
    } else if (newGeometryType === 'torus') {
      newGeometry.majorRadius = 5;
      newGeometry.minorRadius = 1;
      newGeometry.unit = 'cm';
    } else if (newGeometryType === 'ellipsoid') {
      newGeometry.xRadius = 5;
      newGeometry.yRadius = 3;
      newGeometry.zRadius = 4;
      newGeometry.unit = 'cm';
    } else if (newGeometryType === 'polycone') {
      newGeometry.zSections = [
        { z: -5, rMin: 0, rMax: 3 },
        { z: 0, rMin: 0, rMax: 5 },
        { z: 5, rMin: 0, rMax: 2 }
      ];
      newGeometry.unit = 'cm';
    }
    
    onAddGeometry(newGeometry);
  };

  // Import the PropertyEditor component
  const renderPropertyEditor = () => {
    return (
      <PropertyEditor
        selectedGeometry={selectedGeometry}
        geometries={geometries}
        materials={materials}
        hitCollections={hitCollections}
        onUpdateGeometry={onUpdateGeometry}
        onRemoveGeometry={onRemoveGeometry}
        handleExportObject={handleExportObject}
        handleInputFocus={handleInputFocus}
        handleNumberKeyDown={handleNumberKeyDown}
      />
    );
  };

  // Generate a unique name for an object, ensuring it doesn't conflict with existing objects
  const generateUniqueName = (baseName, type) => {
    // Get all existing names
    const existingNames = [
      geometries.world.name,
      ...geometries.volumes.map(vol => vol.name)
    ];
    
    // If the name doesn't exist, use it as is
    if (!existingNames.includes(baseName)) {
      return baseName;
    }
    
    // Otherwise, generate a unique name with a counter
    let counter = 1;
    let newName;
    do {
      newName = `${baseName}_${counter}`;
      counter++;
    } while (existingNames.includes(newName));
    
    return newName;
  };
  
  // Handle importing an object JSON file using the FileSystemManager
  /**
   * Import geometry objects from a JSON file using the FileSystemManager
   * 
   * This function allows users to import previously exported geometry objects
   * from JSON files. It validates the imported content, adds the objects to the
   * scene with the selected mother volume, and displays appropriate notifications.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const handleImportFromFileSystem = async () => {
    try {
      // Check if FileSystemManager is initialized
      if (!fileSystemManager.initialized) {
        setImportAlert({
          show: true,
          message: 'Please initialize the file system from the top menu first.',
          severity: 'warning'
        });
        return;
      }
      
      // Use the FileSystemManager to read a JSON file from the selected directory
      const content = await fileSystemManager.readJsonFile();
      
      // Log the imported content for debugging
      console.log('Imported JSON content using FileSystemManager:', content);
      
      // Validate the object JSON format
      if (content.object && Array.isArray(content.descendants)) {
        // Use the new dedicated import function from App.jsx
        const result = handleImportPartialFromAddNew(content, newMotherVolume);
        
        if (result.success) {
          setImportAlert({
            show: true,
            message: result.message,
            severity: 'success'
          });
          
          // Auto-switch to the Properties tab to see the imported object
          setTabValue(0);
        } else {
          setImportAlert({
            show: true,
            message: result.message,
            severity: 'error'
          });
        }
      } else {
        setImportAlert({
          show: true,
          message: 'Invalid object format. The file must contain an "object" and "descendants" array.',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error importing from file system:', error);
      
      // Don't show error for user cancellation
      if (error.name === 'AbortError') {
        return;
      }
      
      setImportAlert({
        show: true,
        message: `Error importing file: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  // Handle updating compound objects by selecting a JSON file
  // The handleUpdateCompoundFile function has been removed as part of cleanup
  // Object updating functionality will be reimplemented in a simpler way in the future
  
  // Handle importing an object JSON file using the standard file input
  const handleImportObjectFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target.result);
        
        // Log the imported content for debugging
        console.log('Imported JSON content:', content);
        
        // Validate the object JSON format
        if (content.object && Array.isArray(content.descendants)) {
          // Use the new dedicated import function from App.jsx
          const result = handleImportPartialFromAddNew(content, newMotherVolume);
          
          if (result.success) {
            setImportAlert({
              show: true,
              message: result.message,
              severity: 'success'
            });
            
            // Auto-switch to the Properties tab to see the imported object
            setTabValue(0);
          } else {
            setImportAlert({
              show: true,
              message: result.message,
              severity: 'error'
            });
          }
        } else {
          setImportAlert({
            show: true,
            message: 'Invalid object format. The file must contain an "object" and "descendants" array.',
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        setImportAlert({
          show: true,
          message: 'Error parsing JSON file. Please ensure it is valid JSON.',
          severity: 'error'
        });
      }
      
      // Clear the file input
      event.target.value = null;
    };
    
    reader.readAsText(file);
  };
  
  /**
   * Handle closing of alert notifications
   * 
   * This function closes the alert notification by setting its show property to false
   * while preserving other properties like message and severity.
   */
  const handleCloseAlert = useCallback(() => {
    setImportAlert(prevAlert => ({ ...prevAlert, show: false }));
  }, []);
  
  // Clear the import alert after a delay
  React.useEffect(() => {
    if (importAlert.show) {
      const timer = setTimeout(handleCloseAlert, 5000);
      return () => clearTimeout(timer);
    }
  }, [importAlert, handleCloseAlert]);
  
  /**
   * Render the "Add New" tab content
   * 
   * This function renders the UI for adding new geometry objects to the scene.
   * It includes options for importing existing objects, creating new primitive shapes,
   * and creating union solids by combining two existing objects.
   * 
   * The UI is organized into sections with appropriate controls for each type of
   * geometry that can be added.
   * 
   * @returns {JSX.Element} The rendered Add New tab component
   */
  const renderAddNewTab = () => {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Add New Geometry</Typography>
        
        {importAlert.show && (
          <Alert 
            severity={importAlert.severity} 
            sx={{ mt: 2, mb: 2 }}
            onClose={handleCloseAlert}
          >
            {importAlert.message}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, mb: 3 }}>
          <Typography variant="subtitle1">Import Existing Object</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setLoadObjectDialogOpen(true)}
              sx={{ flexGrow: 1 }}
            >
              Select From Library
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Import a previously exported object with its descendants. The object will be added with {newMotherVolume} as its mother volume.
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1">Create New Primitive</Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>Geometry Type</InputLabel>
          <Select
            value={newGeometryType}
            label="Geometry Type"
            onChange={(e) => setNewGeometryType(e.target.value)}
          >
            <MenuItem value="box">Box</MenuItem>
            <MenuItem value="cylinder">Cylinder</MenuItem>
            <MenuItem value="sphere">Sphere</MenuItem>
            <MenuItem value="trapezoid">Trapezoid</MenuItem>
            <MenuItem value="torus">Torus</MenuItem>
            <MenuItem value="ellipsoid">Ellipsoid</MenuItem>
            <MenuItem value="polycone">Polycone</MenuItem>
            <Divider />
            <MenuItem value="union">Union Solid</MenuItem>
          </Select>
        </FormControl>
        
        {/* Additional fields for union solid */}
        {newGeometryType === 'union' && (
          <Box sx={{ mt: 2, mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Union Solid Configuration</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              A union solid combines two existing solids. Select the two solids to combine.
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>First Solid</InputLabel>
              <Select
                label="First Solid"
                value={firstSolid}
                onChange={(e) => setFirstSolid(e.target.value)}
              >
                <MenuItem value=""><em>Select a solid</em></MenuItem>
                {geometries.volumes.map((volume, index) => (
                  <MenuItem key={`first-${index}`} value={`volume-${index}`}>
                    {volume.name || `${volume.type.charAt(0).toUpperCase() + volume.type.slice(1)} ${index + 1}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Second Solid</InputLabel>
              <Select
                label="Second Solid"
                value={secondSolid}
                onChange={(e) => setSecondSolid(e.target.value)}
                disabled={!firstSolid} // Disable until first solid is selected
              >
                <MenuItem value=""><em>Select a solid</em></MenuItem>
                {geometries.volumes.map((volume, index) => (
                  <MenuItem 
                    key={`second-${index}`} 
                    value={`volume-${index}`}
                    disabled={`volume-${index}` === firstSolid} // Can't select the same solid twice
                  >
                    {volume.name || `${volume.type.charAt(0).toUpperCase() + volume.type.slice(1)} ${index + 1}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Note: The union will create a new solid that combines the two selected solids.
              The original solids will remain unchanged.
            </Typography>
          </Box>
        )}
        
        <FormControl fullWidth margin="normal">
          <InputLabel>Mother Volume</InputLabel>
          <Select
            value={newMotherVolume}
            label="Mother Volume"
            onChange={(e) => setNewMotherVolume(e.target.value)}
          >
            <MenuItem value="World">World</MenuItem>
            {geometries.volumes && geometries.volumes.map((volume, index) => (
              <MenuItem key={`mother-${index}`} value={volume.name}>
                {volume.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleAddGeometry}
          sx={{ mt: 2, mb: 2 }}
          fullWidth
        >
          Add Geometry
        </Button>
        
        <Button 
          variant="outlined" 
          color="secondary" 
          onClick={() => setHitCollectionsDialogOpen(true)}
          sx={{ mb: 4 }}
          fullWidth
        >
          Manage Hit Collections
        </Button>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6">Update Existing Objects</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Update all instances of an object type with the latest definition
        </Typography>
        
        <Button
          variant="contained"
          color="secondary"
          onClick={() => setUpdateObjectsDialogOpen(true)}
          fullWidth
        >
          Update Object Instances
        </Button>
      </Box>
    );
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tabs for switching between Properties and Add New */}
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        variant="fullWidth"
      >
        <Tab label="Properties" />
        <Tab label="Add New" />
      </Tabs>
      <Divider />
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {tabValue === 0 ? renderPropertyEditor() : renderAddNewTab()}
      </Box>
      
      {/* Save Object Dialog */}
      <SaveObjectDialog
        open={saveObjectDialogOpen}
        onClose={() => setSaveObjectDialogOpen(false)}
        onSave={handleSaveObject}
        objectData={objectToSave}
        defaultName={objectToSave?.object?.name || ''}
      />
      
      {/* Load Object Dialog */}
      <LoadObjectDialog
        open={loadObjectDialogOpen}
        onClose={() => setLoadObjectDialogOpen(false)}
        onLoad={handleLoadObject}
        onAddNew={() => handleTabChange(null, 1)} // Switch to Add New tab
      />
      
      {/* Update Objects Dialog */}
      <UpdateObjectsDialog
        open={updateObjectsDialogOpen}
        onClose={() => setUpdateObjectsDialogOpen(false)}
        onUpdate={handleUpdateObjects}
        geometries={geometries}
      />
      
      {/* Hit Collections Dialog */}
      <HitCollectionsDialog
        open={hitCollectionsDialogOpen}
        onClose={() => setHitCollectionsDialogOpen(false)}
        hitCollections={hitCollections}
        onUpdateHitCollections={onUpdateHitCollections}
      />
    </Paper>
  );
};

export default GeometryEditor;
