import React, { useState, useRef, useCallback } from 'react';
import fileSystemManager from '../utils/FileSystemManager';
import SaveObjectDialog from './SaveObjectDialog';
import LoadObjectDialog from './LoadObjectDialog';
import UpdateObjectsDialog from './UpdateObjectsDialog';
// Instance tracking functionality has been removed for a cleaner implementation
// UpdateCompoundDialog import removed
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

const GeometryEditor = ({ 
  geometries, 
  materials, 
  selectedGeometry, 
  onUpdateGeometry, 
  onAddGeometry, 
  onRemoveGeometry,
  extractObjectWithDescendants,
  handleImportPartialFromAddNew
}) => {
  // Reference to the file input for importing object JSON files
  const fileInputRef = useRef(null);
  const [tabValue, setTabValue] = useState(0);
  const [newGeometryType, setNewGeometryType] = useState('box');
  const [newMotherVolume, setNewMotherVolume] = useState('World'); // Default mother volume for new geometries
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const menuOpen = Boolean(menuAnchorEl);
  const [importAlert, setImportAlert] = useState({ show: false, message: '', severity: 'info' });
  
  // State for object save/load/update dialogs
  const [saveObjectDialogOpen, setSaveObjectDialogOpen] = useState(false);
  const [loadObjectDialogOpen, setLoadObjectDialogOpen] = useState(false);
  const [updateObjectsDialogOpen, setUpdateObjectsDialogOpen] = useState(false);
  const [objectToSave, setObjectToSave] = useState(null);
  
  // State for alerts and notifications
  // (Update compound functionality has been removed)
  
  // Handle opening the context menu
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };
  
  // Open the load object dialog
  const handleOpenLoadObjectDialog = () => {
    setLoadObjectDialogOpen(true);
  };
  
  // Handle saving an object to the objects directory
  // Simplify object names by removing the structured naming pattern before saving
  const simplifyObjectNames = (objectData) => {
    if (!objectData || !objectData.object) return objectData;
    
    // Create a deep copy of the object data
    const simplifiedData = JSON.parse(JSON.stringify(objectData));
    
    // Create a mapping of old names to simplified names
    const nameMapping = {};
    
    // Extract the component name from the structured name
    const extractComponentName = (structuredName) => {
      if (!structuredName) return structuredName;
      
      // Parse the name parts: BaseName_ComponentName_ID
      const parts = structuredName.split('_');
      if (parts.length >= 2) {
        // Return just the component name
        return parts[1];
      }
      return structuredName; // If not in expected format, return as is
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
  
  // Handle loading an object from the objects directory
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
  
  // Apply structured naming convention to an object and its descendants
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
  const handleMenuClose = (event) => {
    if (event) event.stopPropagation();
    setMenuAnchorEl(null);
  };
  

  
  // Handle exporting the selected object with its descendants
  const handleExportObject = () => {
    handleMenuClose();
    
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

  // Get the selected geometry object
  const getSelectedGeometryObject = () => {
    if (!selectedGeometry) return null;
    if (selectedGeometry === 'world') return geometries.world;
    if (selectedGeometry.startsWith('volume-')) {
      const index = parseInt(selectedGeometry.split('-')[1]);
      return geometries.volumes[index];
    }
    return null;
  };

  const selectedObject = getSelectedGeometryObject();

  // Handle rotation changes
  const handleRotationChange = (axis, value) => {
    if (!selectedGeometry) return;
    
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
  
  // Handle relative position changes for union solids
  const handleRelativePositionChange = (axis, value) => {
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
  
  // Handle relative rotation changes for union solids
  const handleRelativeRotationChange = (axis, value) => {
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
  const handlePropertyChange = (property, value, allowNegative = true, isStringProperty = false) => {
    if (!selectedGeometry) return;
    
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
    
    // Process numeric values
    let processedValue = value;
    if (typeof value === 'string' && value.match(/^-?\d*\.?\d*$/)) {
      // Convert to number if it's a valid numeric string
      const numValue = parseFloat(value);
      
      // If not allowing negative values, ensure it's positive
      if (!allowNegative && numValue < 0) {
        processedValue = 0;
      } else if (!isNaN(numValue)) {
        processedValue = numValue;
      } else if (value === '-' || value === '') {
        // Allow typing a minus sign or empty string (will be converted to 0 later)
        processedValue = value;
      } else {
        processedValue = 0;
      }
    }
    
    // Handle nested properties like position.x
    if (property.includes('.')) {
      const [parent, child] = property.split('.');
      
      // For empty string or just a minus sign, keep it as is to allow typing
      if (processedValue === '' || processedValue === '-') {
        updatedObject[parent] = { 
          ...updatedObject[parent], 
          [child]: processedValue 
        };
      } else {
        updatedObject[parent] = { 
          ...updatedObject[parent], 
          [child]: parseFloat(processedValue) || 0 
        };
      }
    } else {
      // For empty string or just a minus sign, keep it as is to allow typing
      if (processedValue === '' || processedValue === '-') {
        updatedObject[property] = processedValue;
      } else if (typeof processedValue === 'number') {
        updatedObject[property] = processedValue;
      } else {
        updatedObject[property] = parseFloat(processedValue) || 0;
      }
    }
    
    onUpdateGeometry(selectedGeometry, updatedObject);
  };

  // Add a new geometry
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

  // Render the property editor for the selected geometry
  const renderPropertyEditor = () => {
    if (!selectedObject) {
      return (
        <Typography variant="body1" sx={{ p: 2 }}>
          Select a geometry to edit its properties
        </Typography>
      );
    }

    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Geometry Editor</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>

            

            

            
            {selectedGeometry && (
              <IconButton
                aria-label="more"
                aria-controls="geometry-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
              >
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>
        </Box>
        
        <Menu
          id="geometry-menu"
          anchorEl={menuAnchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          PaperProps={{
            onClick: (e) => e.stopPropagation(),
            style: { minWidth: '200px' }
          }}
        >
          {/* Save to Library button moved to bottom of panel */}
          {/* Update Compound Objects functionality has been removed */}
        </Menu>
        

        
        <TextField
          label="Name"
          value={selectedObject.name || ''}
          onChange={(e) => {
            e.stopPropagation();
            handlePropertyChange('name', e.target.value, true, true);
          }}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          fullWidth
          margin="normal"
          size="small"
        />
        
        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>Material</InputLabel>
          <Select
            value={selectedObject.material || ''}
            label="Material"
            onChange={(e) => {
              e.stopPropagation();
              handlePropertyChange('material', e.target.value, true, true);
            }}
            onClick={(e) => e.stopPropagation()}
            MenuProps={{
              onClick: (e) => e.stopPropagation(),
              PaperProps: { onClick: (e) => e.stopPropagation() }
            }}
          >
            {Object.keys(materials).map((material) => (
              <MenuItem key={material} value={material}>
                {material}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Mother Volume selector - only show for non-world volumes */}
        {selectedGeometry !== 'world' && (
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Mother Volume</InputLabel>
            <Select
              value={selectedObject.mother_volume || 'World'}
              label="Mother Volume"
              onChange={(e) => {
                e.stopPropagation();
                handlePropertyChange('mother_volume', e.target.value, true, true);
              }}
              onClick={(e) => e.stopPropagation()}
              MenuProps={{
                onClick: (e) => e.stopPropagation(),
                PaperProps: { onClick: (e) => e.stopPropagation() }
              }}
            >
              <MenuItem value="World">World</MenuItem>
              {geometries.volumes && geometries.volumes.map((volume, index) => {
                // Skip the current volume to prevent self-reference and circular dependencies
                if (selectedGeometry === `volume-${index}`) return null;
                return (
                  <MenuItem key={`mother-${index}`} value={volume.name}>
                    {volume.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        )}
        
        <Typography variant="subtitle1" sx={{ mt: 2 }}>Position</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="X"
            type="number"
            value={selectedObject.position?.x || 0}
            onChange={(e) => handlePropertyChange('position.x', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Y"
            type="number"
            value={selectedObject.position?.y || 0}
            onChange={(e) => handlePropertyChange('position.y', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Z"
            type="number"
            value={selectedObject.position?.z || 0}
            onChange={(e) => handlePropertyChange('position.z', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Unit"
            value={selectedObject.position?.unit || 'cm'}
            onChange={(e) => handlePropertyChange('position.unit', e.target.value)}
            size="small"
          />
        </Box>
        
        <Typography variant="subtitle1" sx={{ mt: 2 }}>Rotation</Typography>
        <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary' }}>
          Rotations are applied sequentially in Geant4 order: first X, then Y (around new Y axis), then Z (around new Z axis).
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="X"
            type="number"
            value={selectedObject.rotation?.x || 0}
            onChange={(e) => handlePropertyChange('rotation.x', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Y"
            type="number"
            value={selectedObject.rotation?.y || 0}
            onChange={(e) => handlePropertyChange('rotation.y', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Z"
            type="number"
            value={selectedObject.rotation?.z || 0}
            onChange={(e) => handlePropertyChange('rotation.z', e.target.value)}
            size="small"
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="Unit"
            value={selectedObject.rotation?.unit || 'deg'}
            onChange={(e) => handlePropertyChange('rotation.unit', e.target.value)}
            size="small"
          />
        </Box>
        
        {/* Render type-specific properties */}
        {selectedObject.type === 'box' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Size</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="X"
                type="number"
                value={selectedObject.size?.x || 0}
                onChange={(e) => handlePropertyChange('size.x', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Y"
                type="number"
                value={selectedObject.size?.y || 0}
                onChange={(e) => handlePropertyChange('size.y', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Z"
                type="number"
                value={selectedObject.size?.z || 0}
                onChange={(e) => handlePropertyChange('size.z', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Unit"
                value={selectedObject.size?.unit || 'cm'}
                onChange={(e) => handlePropertyChange('size.unit', e.target.value)}
                size="small"
              />
            </Box>
          </>
        )}
        
        {selectedObject.type === 'cylinder' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Radius"
                type="number"
                value={selectedObject.radius || 0}
                onChange={(e) => handlePropertyChange('radius', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Height"
                type="number"
                value={selectedObject.height || 0}
                onChange={(e) => handlePropertyChange('height', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
            </Box>
            <TextField
              label="Inner Radius"
              type="number"
              value={selectedObject.innerRadius || 0}
              onChange={(e) => handlePropertyChange('innerRadius', e.target.value, false)}
              size="small"
              sx={{ mb: 1 }}
              inputProps={{ step: 'any', min: 0 }}
            />
          </>
        )}
        
        {selectedObject.type === 'sphere' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
            <TextField
              label="Radius"
              type="number"
              value={selectedObject.radius || 0}
              onChange={(e) => handlePropertyChange('radius', e.target.value, false)}
              size="small"
              fullWidth
              inputProps={{ step: 'any', min: 0 }}
            />
          </>
        )}
        
        {selectedObject.type === 'trapezoid' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="dx1 (X at -z/2)"
                type="number"
                value={selectedObject.dx1 || 0}
                onChange={(e) => handlePropertyChange('dx1', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="dx2 (X at +z/2)"
                type="number"
                value={selectedObject.dx2 || 0}
                onChange={(e) => handlePropertyChange('dx2', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="dy1 (Y at -z/2)"
                type="number"
                value={selectedObject.dy1 || 0}
                onChange={(e) => handlePropertyChange('dy1', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="dy2 (Y at +z/2)"
                type="number"
                value={selectedObject.dy2 || 0}
                onChange={(e) => handlePropertyChange('dy2', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
            </Box>
            <TextField
              label="dz (Half-length in Z)"
              type="number"
              value={selectedObject.dz || 0}
              onChange={(e) => handlePropertyChange('dz', e.target.value, false)}
              size="small"
              fullWidth
              inputProps={{ step: 'any', min: 0 }}
              sx={{ mb: 1 }}
            />
          </>
        )}
        
        {selectedObject.type === 'ellipsoid' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="X Radius"
                type="number"
                value={selectedObject.xRadius || 0}
                onChange={(e) => handlePropertyChange('xRadius', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Y Radius"
                type="number"
                value={selectedObject.yRadius || 0}
                onChange={(e) => handlePropertyChange('yRadius', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Z Radius"
                type="number"
                value={selectedObject.zRadius || 0}
                onChange={(e) => handlePropertyChange('zRadius', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
            </Box>
          </>
        )}
        
        {selectedObject.type === 'torus' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Dimensions</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Major Radius"
                type="number"
                value={selectedObject.majorRadius || 0}
                onChange={(e) => handlePropertyChange('majorRadius', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
              <TextField
                label="Minor Radius"
                type="number"
                value={selectedObject.minorRadius || 0}
                onChange={(e) => handlePropertyChange('minorRadius', e.target.value, false)}
                size="small"
                inputProps={{ step: 'any', min: 0 }}
              />
            </Box>
          </>
        )}
        
        {selectedObject.type === 'polycone' && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Z Sections</Typography>
            <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary' }}>
              Define the sections of the polycone along the z-axis
            </Typography>
            {selectedObject.zSections && selectedObject.zSections.map((section, index) => (
              <Box key={`section-${index}`} sx={{ display: 'flex', gap: 1, mb: 1, border: '1px solid #eee', p: 1, borderRadius: '4px' }}>
                <TextField
                  label="Z Position"
                  type="number"
                  value={section.z || 0}
                  onChange={(e) => {
                    const newSections = [...selectedObject.zSections];
                    newSections[index] = { ...newSections[index], z: parseFloat(e.target.value) || 0 };
                    handlePropertyChange('zSections', newSections);
                  }}
                  size="small"
                  inputProps={{ step: 'any' }}
                />
                <TextField
                  label="Min Radius"
                  type="number"
                  value={section.rMin || 0}
                  onChange={(e) => {
                    const newSections = [...selectedObject.zSections];
                    newSections[index] = { ...newSections[index], rMin: parseFloat(e.target.value) || 0 };
                    handlePropertyChange('zSections', newSections);
                  }}
                  size="small"
                  inputProps={{ step: 'any', min: 0 }}
                />
                <TextField
                  label="Max Radius"
                  type="number"
                  value={section.rMax || 0}
                  onChange={(e) => {
                    const newSections = [...selectedObject.zSections];
                    newSections[index] = { ...newSections[index], rMax: parseFloat(e.target.value) || 0 };
                    handlePropertyChange('zSections', newSections);
                  }}
                  size="small"
                  inputProps={{ step: 'any', min: 0 }}
                />
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small"
                  onClick={() => {
                    if (selectedObject.zSections.length > 2) {
                      const newSections = [...selectedObject.zSections];
                      newSections.splice(index, 1);
                      handlePropertyChange('zSections', newSections);
                    }
                  }}
                  disabled={selectedObject.zSections.length <= 2}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => {
                const newSections = [...(selectedObject.zSections || [])];
                const lastZ = newSections.length > 0 ? newSections[newSections.length - 1].z + 5 : 0;
                newSections.push({ z: lastZ, rMin: 0, rMax: 5 });
                handlePropertyChange('zSections', newSections);
              }}
              sx={{ mb: 1 }}
            >
              Add Section
            </Button>
          </>
        )}
        
        {selectedGeometry !== 'world' && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={handleExportObject}
            >
              Save to Library
            </Button>
            <Button 
              variant="outlined" 
              color="error" 
              onClick={() => onRemoveGeometry(selectedGeometry)}
            >
              Remove Geometry
            </Button>
          </Box>
        )}
      </Box>
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
  
  // Clear the import alert after a delay
  React.useEffect(() => {
    if (importAlert.show) {
      const timer = setTimeout(() => {
        setImportAlert({ ...importAlert, show: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [importAlert]);
  
  // Render the "Add New" tab content
  const renderAddNewTab = () => {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Add New Geometry</Typography>
        
        {importAlert.show && (
          <Alert 
            severity={importAlert.severity} 
            sx={{ mt: 2, mb: 2 }}
            onClose={() => setImportAlert({ ...importAlert, show: false })}
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
          sx={{ mt: 2, mb: 4 }}
          fullWidth
        >
          Add Geometry
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
      <Tabs 
        value={tabValue} 
        onChange={(e, newValue) => setTabValue(newValue)}
        variant="fullWidth"
      >
        <Tab label="Properties" />
        <Tab label="Add New" />
      </Tabs>
      <Divider />
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {tabValue === 0 ? renderPropertyEditor() : renderAddNewTab()}
      </Box>
      
      {/* Hidden file input for importing object JSON files */}
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleImportObjectFile}
      />
      
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
        onAddNew={() => setTabValue(1)}
      />
      
      {/* Update Objects Dialog */}
      <UpdateObjectsDialog
        open={updateObjectsDialogOpen}
        onClose={() => setUpdateObjectsDialogOpen(false)}
        onUpdate={handleUpdateObjects}
        geometries={geometries}
      />
    </Paper>
  );
};

export default GeometryEditor;
