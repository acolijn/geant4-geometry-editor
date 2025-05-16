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
import SaveObjectDialog from './geometry-editor/SaveObjectDialog';
import LoadObjectDialog from './geometry-editor/LoadObjectDialog';
import UpdateObjectsDialog from './geometry-editor/UpdateObjectsDialog';
import HitCollectionsDialog from './geometry-editor/HitCollectionsDialog';
import PropertyEditor from './geometry-editor/PropertyEditor';
import AddNewTab from './geometry-editor/AddNewTab';
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
  // For multi-component union solids: number of additional components beyond the first two
  const [additionalComponents, setAdditionalComponents] = useState(0);
  // For multi-component union solids: values of the additional components
  const [additionalComponentsValues, setAdditionalComponentsValues] = useState([]);
  
  // Handler for adding a new component to the union
  const handleAddComponent = () => {
    setAdditionalComponents(prev => prev + 1);
  };
  
  // Handler for removing the last component from the union
  const handleRemoveComponent = () => {
    if (additionalComponents > 0) {
      setAdditionalComponents(prev => prev - 1);
      setAdditionalComponentsValues(prev => prev.slice(0, -1));
    }
  };
  
  // Handler for changing the value of an additional component
  const handleAdditionalComponentChange = (index, value) => {
    setAdditionalComponentsValues(prev => {
      const newValues = [...prev];
      newValues[index] = value;
      return newValues;
    });
  };
  
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
    
    // Create a global variable to make the export data accessible in the console for debugging
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
    // For union solids, we need to validate that at least two solids are selected
    if (newGeometryType === 'union') {
      if (!firstSolid || !secondSolid) {
        setImportAlert({
          show: true,
          message: 'Please select at least two components for the union operation.',
          severity: 'error'
        });
        return;
      }
      
      // Collect all component selections
      const componentSelections = [firstSolid, secondSolid, ...additionalComponentsValues.filter(v => v)];
      
      // Validate that we have at least two valid components
      if (componentSelections.length < 2) {
        setImportAlert({
          show: true,
          message: 'Please select at least two components for the union operation.',
          severity: 'error'
        });
        return;
      }
      
      // Get the indices and objects for all components
      const components = [];
      const componentIndices = [];
      
      for (const selection of componentSelections) {
        const index = parseInt(selection.split('-')[1]);
        const solidObj = geometries.volumes[index];
        
        if (!solidObj) {
          setImportAlert({
            show: true,
            message: `One of the selected components (index ${index}) could not be found.`,
            severity: 'error'
          });
          return;
        }
        
        components.push(solidObj);
        componentIndices.push(index);
      }
      
      // Create a name based on the components
      const unionName = `Union_${componentIndices.join('_')}`;
      
      // Helper function to extract solid properties
      const extractSolidProperties = (solid) => ({
        type: solid.type,
        ...(solid.size && { size: { ...solid.size } }),
        ...(solid.radius && { radius: solid.radius }),
        ...(solid.height && { height: solid.height }),
        ...(solid.inner_radius && { inner_radius: solid.inner_radius }),
        ...(solid.innerRadius && { innerRadius: solid.innerRadius }),
        ...(solid.dx1 && { dx1: solid.dx1 }),
        ...(solid.dx2 && { dx2: solid.dx2 }),
        ...(solid.dy1 && { dy1: solid.dy1 }),
        ...(solid.dy2 && { dy2: solid.dy2 }),
        ...(solid.dz && { dz: solid.dz }),
        ...(solid.xRadius && { xRadius: solid.xRadius }),
        ...(solid.yRadius && { yRadius: solid.yRadius }),
        ...(solid.zRadius && { zRadius: solid.zRadius }),
        ...(solid.majorRadius && { majorRadius: solid.majorRadius }),
        ...(solid.minorRadius && { minorRadius: solid.minorRadius }),
        ...(solid.zSections && { zSections: [...solid.zSections] }),
        ...(solid.unit && { unit: solid.unit })
      });
      
      // Create the union solid with the new multi-component format
      const newGeometry = {
        type: 'union',
        name: unionName,
        material: 'G4_AIR',
        position: { x: 0, y: 0, z: 0, unit: 'cm' },
        rotation: { x: 0, y: 0, z: 0, unit: 'deg' },
        mother_volume: newMotherVolume,
        
        // For backward compatibility, keep solid1 and solid2 for the first two components
        solid1: extractSolidProperties(components[0]),
        solid2: extractSolidProperties(components[1]),
        
        // Add the new components array for multi-component unions
        components: components.map((component, index) => ({
          name: component.name || `Component_${index + 1}`,
          shape: component.type,
          dimensions: extractSolidProperties(component),
          placement: [
            { 
              x: 0, 
              y: 0, 
              z: index * 5, // Stagger components along z-axis for visibility
              rotation: { x: 0, y: 0, z: 0 }
            }
          ]
        })),
        
        // Relative position of the second solid with respect to the first (for backward compatibility)
        relative_position: { x: 0, y: 0, z: 5, unit: 'cm' },
        relative_rotation: { x: 0, y: 0, z: 0, unit: 'deg' },
        
        // Store component indices for the editor's reference
        _editorData: {
          componentIndices
        }
      };
      
      onAddGeometry(newGeometry);
      
      // Reset all selections after creating the union
      setFirstSolid('');
      setSecondSolid('');
      setAdditionalComponents(0);
      setAdditionalComponentsValues([]);
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
  
  // Import the AddNewTab component
  const renderAddNewTab = () => {
    return (
      <AddNewTab
        importAlert={importAlert}
        handleCloseAlert={handleCloseAlert}
        newGeometryType={newGeometryType}
        setNewGeometryType={setNewGeometryType}
        newMotherVolume={newMotherVolume}
        setNewMotherVolume={setNewMotherVolume}
        firstSolid={firstSolid}
        setFirstSolid={setFirstSolid}
        secondSolid={secondSolid}
        setSecondSolid={setSecondSolid}
        additionalComponents={additionalComponents}
        additionalComponentsValues={additionalComponentsValues}
        handleAddComponent={handleAddComponent}
        handleRemoveComponent={handleRemoveComponent}
        handleAdditionalComponentChange={handleAdditionalComponentChange}
        geometries={geometries}
        handleAddGeometry={handleAddGeometry}
        setLoadObjectDialogOpen={setLoadObjectDialogOpen}
        setHitCollectionsDialogOpen={setHitCollectionsDialogOpen}
        setUpdateObjectsDialogOpen={setUpdateObjectsDialogOpen}
      />
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
