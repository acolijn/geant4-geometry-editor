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
     * This function preserves the unique identifiers in component names.
     * 
     * @param {string} structuredName - The structured name to process
     * @returns {string} The processed name that maintains uniqueness
     */
    const extractComponentName = (structuredName) => {
      // Return early if the name is empty or undefined
      if (!structuredName) return structuredName;
      
      // For components that follow the pattern type_index (e.g., box_1, box_2)
      // we want to preserve the full name to maintain uniqueness
      const typeIndexPattern = /^([a-z]+)_([0-9]+)$/i;
      if (typeIndexPattern.test(structuredName)) {
        // This is already a type_index format name, keep it as is
        return structuredName;
      }
      
      // For other structured names, keep the original name
      return structuredName;
    };
    
    // Process the top-level object name to prevent recursive explosion
    const originalMotherName = simplifiedData.object.name;
    
    // Store the original name for reference if not already present
    if (!simplifiedData.object._originalName) {
      simplifiedData.object._originalName = originalMotherName;
    }
    
    // For assemblies, use just 'assembly' in the template
    if (simplifiedData.object.type === 'assembly') {
      // In the template (object.json), the name should simply be 'assembly'
      // When instances are created, they'll get the unique ID appended
      
      // Set the name to just 'assembly' for the template
      const simplifiedMotherName = 'assembly';
      
      // Store the mapping
      nameMapping[originalMotherName] = simplifiedMotherName;
      
      // Update the mother object name to just 'assembly'
      simplifiedData.object.name = simplifiedMotherName;
      
      // Preserve the displayName if it exists
      if (simplifiedData.object.displayName) {
        // Keep the display name as is - this is what shows in the UI
        // No need to modify it
      }
    } else {
      // For non-assembly objects, use the standard extraction
      const simplifiedMotherName = extractComponentName(originalMotherName);
      
      // Store the mapping
      nameMapping[originalMotherName] = simplifiedMotherName;
      
      // Update the mother object name
      simplifiedData.object.name = simplifiedMotherName;
    }
    
    // Process all descendant names to ensure uniqueness
    if (simplifiedData.descendants && Array.isArray(simplifiedData.descendants)) {
      // Create a map to track used names and ensure uniqueness
      const usedNames = new Map();
      
      // First pass: Create the name mapping while ensuring uniqueness
      simplifiedData.descendants.forEach((descendant) => {
        if (descendant.name) {
          const originalName = descendant.name;
          
          // Store the original name for reference
          if (!descendant._originalName) {
            descendant._originalName = originalName;
          }
          
          // Keep the name as is to maintain uniqueness
          nameMapping[originalName] = originalName;
        }
      });
      
      // Second pass: Apply the names and update mother_volume references
      simplifiedData.descendants = simplifiedData.descendants.map((descendant, index) => {
        // If this is a type_index format name (e.g., box_1), keep it to maintain uniqueness
        if (descendant.name) {
          // Use the name from the mapping or keep the original
          const mappedName = nameMapping[descendant.name] || descendant.name;
          
          // Check if this name has been used before
          if (usedNames.has(mappedName)) {
            // Get the count of how many times this name has been used
            const count = usedNames.get(mappedName) + 1;
            usedNames.set(mappedName, count);
            
            // Create a unique name by appending the count
            descendant.name = `${mappedName}_${count}`;
          } else {
            // First time seeing this name
            usedNames.set(mappedName, 1);
            descendant.name = mappedName;
          }
        }
        
        // CRITICAL: Ensure every component has a _componentId
        // If it doesn't have one, generate a new one
        if (!descendant._componentId) {
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 10);
          descendant._componentId = `component_${timestamp}_${randomSuffix}`;
          console.log(`Generated new _componentId ${descendant._componentId} for imported component ${descendant.name}`);
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
  
  const handleSaveObject = async (name, description, objectData, preserveComponentIds = false) => {
    try {
      // Import the ObjectStorage utility
      const { saveObject } = await import('../utils/ObjectStorage');
      
      // Simplify object names before saving
      const simplifiedObjectData = simplifyObjectNames(objectData);
      
      // Update the compound ID to include the saved object name
      // This ensures the compound ID contains the name given in the save dialog
      const updatedCompoundId = `compound-${name}-${simplifiedObjectData.object.type}`;
      console.log(`Updated compound ID to include saved name: ${updatedCompoundId}`);
      simplifiedObjectData._compoundId = updatedCompoundId;
      
      // Save the object with simplified names and updated compound ID
      // Pass the preserveComponentIds flag to maintain component IDs when overwriting
      const result = await saveObject(name, description, simplifiedObjectData, preserveComponentIds);
      
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
   * Process an object with standardized format (placement and dimensions)
   * 
   * This function converts an object with standardized format (using placement and dimensions)
   * to the internal format used by the application (using position, rotation, and direct dimension properties).
   * 
   * @param {Object} objectData - The object data to process
   * @returns {Object} The processed object data
   */
  const processStandardizedFormat = (objectData) => {
    if (!objectData) return objectData;
    
    // Create a deep copy to avoid modifying the original
    const processedData = JSON.parse(JSON.stringify(objectData));
    
    // Process the main object
    if (processedData.object) {
      // We require the placement property to be present
      if (!processedData.object.placement) {
        throw new Error('Object is missing required placement property');
      }
      
      // Convert placement to position and rotation
      processedData.object.position = {
        x: processedData.object.placement.x || 0,
        y: processedData.object.placement.y || 0,
        z: processedData.object.placement.z || 0
      };
      
      processedData.object.rotation = {
        x: processedData.object.placement.rotation?.x || 0,
        y: processedData.object.placement.rotation?.y || 0,
        z: processedData.object.placement.rotation?.z || 0
      };
      
      // Remove the placement property
      delete processedData.object.placement;
      
      // We require the dimensions property to be present
      if (!processedData.object.dimensions) {
        throw new Error('Object is missing required dimensions property');
      }
      
      const { dimensions, type } = processedData.object;
      
      // Convert dimensions to the appropriate properties based on object type
      if (type === 'box') {
        processedData.object.size = {
          x: dimensions.x || 10,
          y: dimensions.y || 10,
          z: dimensions.z || 10
        };
      } else if (type === 'sphere') {
        processedData.object.radius = dimensions.radius;
      } else if (type === 'cylinder') {
        processedData.object.radius = dimensions.radius;
        // Only use the snake_case version from the standardized format
        processedData.object.innerRadius = dimensions.inner_radius || 0;
        processedData.object.height = dimensions.height;
      } else if (type === 'trapezoid') {
        processedData.object.dx1 = dimensions.dx1;
        processedData.object.dx2 = dimensions.dx2;
        processedData.object.dy1 = dimensions.dy1;
        processedData.object.dy2 = dimensions.dy2;
        processedData.object.dz = dimensions.dz;
      } else if (type === 'torus') {
        processedData.object.majorRadius = dimensions.major_radius;
        processedData.object.minorRadius = dimensions.minor_radius;
      } else if (type === 'ellipsoid') {
        processedData.object.xRadius = dimensions.x_radius;
        processedData.object.yRadius = dimensions.y_radius;
        processedData.object.zRadius = dimensions.z_radius;
      }
      
      // Remove the dimensions property
      delete processedData.object.dimensions;
      
      // Convert parent to mother_volume if needed
      if (processedData.object.parent && !processedData.object.mother_volume) {
        processedData.object.mother_volume = processedData.object.parent;
        delete processedData.object.parent;
      }
    }
    
    // Process all descendants
    if (processedData.descendants && Array.isArray(processedData.descendants)) {
      processedData.descendants = processedData.descendants.map(descendant => {
        // We require the placement property to be present
        if (!descendant.placement) {
          throw new Error('Descendant is missing required placement property');
        }
        
        // Convert placement to position and rotation
        descendant.position = {
          x: descendant.placement.x || 0,
          y: descendant.placement.y || 0,
          z: descendant.placement.z || 0
        };
        
        descendant.rotation = {
          x: descendant.placement.rotation?.x || 0,
          y: descendant.placement.rotation?.y || 0,
          z: descendant.placement.rotation?.z || 0
        };
        
        // Remove the placement property
        delete descendant.placement;
        
        // We require the dimensions property to be present
        if (!descendant.dimensions) {
          throw new Error('Descendant is missing required dimensions property');
        }
        
        const { dimensions, type } = descendant;
        
        // Convert dimensions to the appropriate properties based on object type
        if (type === 'box') {
          descendant.size = {
            x: dimensions.x || 10,
            y: dimensions.y || 10,
            z: dimensions.z || 10
          };
        } else if (type === 'sphere') {
          descendant.radius = dimensions.radius;
        } else if (type === 'cylinder') {
          descendant.radius = dimensions.radius;
          // Only use the snake_case version from the standardized format
          descendant.innerRadius = dimensions.inner_radius || 0;
          descendant.height = dimensions.height;
        } else if (type === 'trapezoid') {
          descendant.dx1 = dimensions.dx1;
          descendant.dx2 = dimensions.dx2;
          descendant.dy1 = dimensions.dy1;
          descendant.dy2 = dimensions.dy2;
          descendant.dz = dimensions.dz;
        } else if (type === 'torus') {
          descendant.majorRadius = dimensions.major_radius;
          descendant.minorRadius = dimensions.minor_radius;
        } else if (type === 'ellipsoid') {
          descendant.xRadius = dimensions.x_radius;
          descendant.yRadius = dimensions.y_radius;
          descendant.zRadius = dimensions.z_radius;
        }
        
        // Remove the dimensions property
        delete descendant.dimensions;
        
        // Convert parent to mother_volume if needed
        if (descendant.parent && !descendant.mother_volume) {
          descendant.mother_volume = descendant.parent;
          delete descendant.parent;
        }
        
        return descendant;
      });
    }
    
    return processedData;
  };
  
  /**
   * Handle loading an object from the library
   * 
   * This function processes object data loaded from the library, applies structured naming
   * to ensure consistency, and adds the object to the scene. It handles objects in the
   * standardized format with 'placement' and 'dimensions' properties.
   * 
   * @param {Object} objectData - The object data to load, including the main object and its descendants
   * @returns {Object} An object indicating success or failure of the operation
   */
  const handleLoadObject = (objectData) => {
    try {
      // Process the loaded object data
      console.log('Loaded object data:', objectData);
      
      // Process the object to convert from standardized format to internal format
      // We assume all objects are in the standardized format
      const processedData = processStandardizedFormat(objectData);
      console.log('Processed standardized format to internal format');
      
      // Apply structured naming convention to the object and its descendants
      const structuredObjectData = applyStructuredNaming(processedData);
      
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
        
        // Find all descendants recursively
        const findAllDescendants = (parentName, allVolumes, currentDepth = 0, maxDepth = 10) => {
          if (currentDepth >= maxDepth) return []; // Prevent infinite recursion
          
          const directDescendants = [];
          
          // Find direct children
          allVolumes.forEach((volume, index) => {
            if (volume.mother_volume === parentName) {
              console.log(`Found descendant at depth ${currentDepth}:`, volume.name, 'of', parentName);
              
              // Add this descendant
              directDescendants.push({
                id: `volume-${index}`,
                object: volume
              });
              
              // Find this descendant's children recursively
              const childDescendants = findAllDescendants(volume.name, allVolumes, currentDepth + 1, maxDepth);
              directDescendants.push(...childDescendants);
            }
          });
          
          return directDescendants;
        };
        
        // Find all descendants of this instance
        const allDescendants = findAllDescendants(instance.name, geometries.volumes);
        topLevelInstances[topLevelInstances.length - 1].descendants.push(...allDescendants);
        
        console.log(`Found ${allDescendants.length} total descendants for ${instance.name}`);
      });
      
      console.log('Top level instances with descendants:', topLevelInstances);
      
      // Create a deep copy of the object data to avoid modifying the original
      const templateData = JSON.parse(JSON.stringify(objectData));
      
      // Now update each top-level instance and its descendants
      topLevelInstances.forEach(topInstance => {
        // Get the original object data
        const originalObject = topInstance.object;
        console.log('Updating top-level object:', originalObject.name);
        
        // Preserve the name, displayName, position, rotation, and mother_volume of the original object
        // Take all other properties from the template
        const preservedProps = {
          name: originalObject.name,
          displayName: originalObject.displayName, // Preserve the displayName (Geant4 name)
          position: { ...originalObject.position },
          rotation: { ...originalObject.rotation },
          mother_volume: originalObject.mother_volume
        };
        
        // Create a new object with the template properties
        const updatedObject = {
          ...templateData.object,  // Start with template properties
          ...preservedProps,      // Override with preserved properties
          // Keep the original position and rotation
          // Copy dimensions from the template
          dimensions: templateData.object.dimensions ? { ...templateData.object.dimensions } : originalObject.dimensions
        };
        
        // Special handling for assembly objects
        if (updatedObject.type === 'assembly' && templateData.object.type === 'assembly') {
          console.log('Updating assembly object with template:', templateData.object);
          
          // Ensure all assembly-specific properties are properly copied
          if (templateData.object.components && originalObject.components) {
            // Create a map of component IDs to original components for easier lookup
            const originalComponentsMap = new Map();
            originalObject.components.forEach(component => {
              if (component._componentId) {
                originalComponentsMap.set(component._componentId, component);
              }
            });
            
            // Create a deep copy of the template components
            const updatedComponents = JSON.parse(JSON.stringify(templateData.object.components));
            
            // For each component in the updated list, try to match it with an original component
            updatedComponents.forEach(updatedComponent => {
              // If the component has a _componentId, try to find a match in the original components
              if (updatedComponent._componentId && originalComponentsMap.has(updatedComponent._componentId)) {
                // Get the original component
                const originalComponent = originalComponentsMap.get(updatedComponent._componentId);
                
                // Preserve the name from the original component
                updatedComponent.name = originalComponent.name;
                
                // If there are other properties that should be preserved, add them here
              }
            });
            
            // Set the updated components
            updatedObject.components = updatedComponents;
          } else if (templateData.object.components) {
            // If there are no original components or they don't have _componentId, just copy the template components
            updatedObject.components = JSON.parse(JSON.stringify(templateData.object.components));
          }
          
          // Copy any other assembly-specific properties
          if (templateData.object.assemblyProperties) {
            updatedObject.assemblyProperties = JSON.parse(JSON.stringify(templateData.object.assemblyProperties));
          }
        }
        
        // Special handling for box dimensions
        if (updatedObject.type === 'box') {
          // Ensure dimensions are properly set for box objects
          if (templateData.object.dimensions && Object.keys(templateData.object.dimensions).length > 0) {
            // Log the dimensions from the template
            console.log('Box dimensions from template:', templateData.object.dimensions);
            
            // Explicitly set dimensions for box objects
            updatedObject.dimensions = { ...templateData.object.dimensions };
            
            // Also set size property for backward compatibility
            updatedObject.size = {
              x: templateData.object.dimensions.x || 0,
              y: templateData.object.dimensions.y || 0,
              z: templateData.object.dimensions.z || 0
            };
          }
        }
        
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
          
          // Create a map of template components by their _componentId
          const templateDescByComponentId = new Map();
          
          // Log all template descendants and their _componentId values
          console.log('Template descendants with _componentId:');
          templateData.descendants.forEach(td => {
            console.log(`Template: ${td.type} (${td.name}) - _componentId: ${td._componentId || 'none'}`);
            if (td._componentId) {
              templateDescByComponentId.set(td._componentId, td);
            }
          });
          
          // Create a map of original descendants by their _componentId
          const originalDescByComponentId = new Map();
          
          // Log all original descendants and their _componentId values
          console.log('Original descendants with _componentId:');
          topInstance.descendants.forEach(descendant => {
            const desc = descendant.object;
            console.log(`Original: ${desc.type} (${desc.name}) - _componentId: ${desc._componentId || 'none'}`);
            if (desc._componentId) {
              originalDescByComponentId.set(desc._componentId, {
                id: descendant.id,
                object: desc
              });
            }
          });
          
          // Create a map of template components by type for fallback matching
          const templateDescByType = new Map();
          templateData.descendants.forEach(td => {
            if (td.type) {
              if (!templateDescByType.has(td.type)) {
                templateDescByType.set(td.type, []);
              }
              templateDescByType.get(td.type).push(td);
            }
          });
          
          // Track which template components have been used to avoid duplicates
          const usedTemplateComponents = new Set();
          
          // First, process all descendants with _componentId (most reliable matching)
          console.log('Processing descendants with _componentId:');
          
          // Helper function to update a descendant with template properties
          function updateDescendantWithTemplate(descendantId, originalDesc, templateDesc) {
            // CRITICAL: Ensure every component has a _componentId
            // If it doesn't have one, generate a new one
            if (!originalDesc._componentId) {
              const timestamp = Date.now();
              const randomSuffix = Math.random().toString(36).substring(2, 10);
              originalDesc._componentId = `component_${timestamp}_${randomSuffix}`;
              console.log(`Generated new _componentId ${originalDesc._componentId} for component ${originalDesc.name}`);
            }
            
            // Create an updated description that preserves critical properties from the original
            // while taking updated geometry properties from the template
            const updatedDesc = {
              // Start with a copy of the original to preserve all its properties
              ...originalDesc,
              
              // Take geometry properties from the template
              type: templateDesc.type,
              material: templateDesc.material,
              visible: templateDesc.visible !== undefined ? templateDesc.visible : originalDesc.visible,
              
              // CRITICAL: Preserve the original mother_volume to maintain hierarchy
              mother_volume: originalDesc.mother_volume,
              
              // CRITICAL: Preserve the original name to maintain identity
              name: originalDesc.name,
              
              // Preserve the displayName if it exists
              displayName: originalDesc.displayName,
              
              // CRITICAL: Always include the _componentId
              _componentId: originalDesc._componentId,
              
              // Mark as part of an assembly for easier identification
              parent: 'assembly',
              
              // Take dimensions from the template if they exist
              dimensions: templateDesc.dimensions ? { ...templateDesc.dimensions } : originalDesc.dimensions,
              
              // For cylinder, map radius and height directly for backward compatibility
              ...(templateDesc.dimensions?.radius ? { radius: templateDesc.dimensions.radius } : {}),
              ...(templateDesc.dimensions?.height ? { height: templateDesc.dimensions.height } : {})
            };
            
            // Carefully handle position and rotation
            // If the template has a placement property, use it
            // Otherwise keep the original position and rotation
            if (templateDesc.placement) {
              updatedDesc.position = { 
                x: templateDesc.placement.x,
                y: templateDesc.placement.y,
                z: templateDesc.placement.z
              };
              
              if (templateDesc.placement.rotation) {
                updatedDesc.rotation = {
                  x: templateDesc.placement.rotation.x,
                  y: templateDesc.placement.rotation.y,
                  z: templateDesc.placement.rotation.z
                };
              }
            }
            
            // Special handling for box dimensions
            if (updatedDesc.type === 'box' && templateDesc.dimensions) {
              // Ensure dimensions are properly set for box objects
              if (Object.keys(templateDesc.dimensions).length > 0) {
                // Also set size property for backward compatibility
                updatedDesc.size = {
                  x: templateDesc.dimensions.x || 0,
                  y: templateDesc.dimensions.y || 0,
                  z: templateDesc.dimensions.z || 0
                };
              }
            }
            
            console.log(`Updating descendant ${originalDesc.name} (${descendantId})`);
            onUpdateGeometry(descendantId, updatedDesc);
            updatedCount++;
          }
          
          // Process components with _componentId first
          for (const [componentId, originalDescData] of originalDescByComponentId.entries()) {
            const originalDesc = originalDescData.object;
            const descendantId = originalDescData.id;
            
            // Try to find a matching template by _componentId
            if (templateDescByComponentId.has(componentId)) {
              const templateDesc = templateDescByComponentId.get(componentId);
              console.log(`Matched by _componentId: ${componentId} - ${originalDesc.name} (${originalDesc.type})`);
              
              // Mark this template as used
              usedTemplateComponents.add(componentId);
              
              // Update the descendant with the template properties while preserving hierarchy
              updateDescendantWithTemplate(descendantId, originalDesc, templateDesc);
            }
          }
          
          // Now process any remaining descendants without _componentId using type matching
          console.log('Processing remaining descendants without _componentId:');
          topInstance.descendants.forEach(descendant => {
            const originalDesc = descendant.object;
            
            // Skip if this descendant was already processed (has _componentId and was matched)
            if (originalDesc._componentId && originalDescByComponentId.has(originalDesc._componentId) && 
                templateDescByComponentId.has(originalDesc._componentId)) {
              return;
            }
            
            console.log(`Processing unmatched descendant: ${originalDesc.name} (${originalDesc.type})`);
            
            // Try to find a matching template by type
            if (originalDesc.type && templateDescByType.has(originalDesc.type)) {
              const typeMatches = templateDescByType.get(originalDesc.type);
              
              // Find an unused template of this type
              let templateDesc = null;
              
              for (const potentialMatch of typeMatches) {
                const matchId = potentialMatch._componentId || JSON.stringify(potentialMatch);
                if (!usedTemplateComponents.has(matchId)) {
                  templateDesc = potentialMatch;
                  usedTemplateComponents.add(matchId);
                  console.log(`Matched by type (unused): ${originalDesc.type}`);
                  break;
                }
              }
              
              // If all templates of this type are used, just use the first one
              if (!templateDesc && typeMatches.length > 0) {
                templateDesc = typeMatches[0];
                console.log(`Matched by type (reused): ${originalDesc.type}`);
              }
              
              if (templateDesc) {
                // Update the descendant with the template properties
                updateDescendantWithTemplate(descendant.id, originalDesc, templateDesc);
              }
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
        ...(solid.zSections && { zSections: [...solid.zSections] })
      });
      
      // Create the union solid with the new multi-component format
      const newGeometry = {
        type: 'union',
        name: unionName,
        material: 'G4_AIR',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        mother_volume: newMotherVolume,
        
        // For backward compatibility, keep solid1 and solid2 for the first two components
        solid1: extractSolidProperties(components[0]),
        solid2: extractSolidProperties(components[1]),
        
        // Add the new components array for multi-component unions
        components: components.map((component, index) => {
          // Generate a permanent unique component ID that will remain consistent across all instances
          // This ID is critical for matching components during updates
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 10);
          const componentId = `component_${timestamp}_${randomSuffix}`;
          
          // Create a unique name for each component that includes the component type and index
          // This ensures that multiple components of the same type have different names
          const uniqueComponentName = `${component.type}_${index + 1}`;
          
          return {
            // Use the unique component name instead of just the component name
            // This ensures that multiple objects of the same type have different names
            name: uniqueComponentName,
            // Store the original name as displayName for UI purposes
            displayName: component.name || uniqueComponentName,
            shape: component.type,
            dimensions: extractSolidProperties(component),
            placement: [
              { 
                x: 0, 
                y: 0, 
                z: index * 5, // Stagger components along z-axis for visibility
                rotation: { x: 0, y: 0, z: 0 }
              }
            ],
            // Add a permanent unique component ID that will be preserved during updates
            // This is the key to reliable component matching
            _componentId: componentId
          };
        }),
        
        // Relative position of the second solid with respect to the first (for backward compatibility)
        relative_position: { x: 0, y: 0, z: 5 },
        relative_rotation: { x: 0, y: 0, z: 0 },
        
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
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      mother_volume: newMotherVolume // Use the selected mother volume
    };
    
    // For assembly type, add special properties
    if (newGeometryType === 'assembly') {
      // Generate a unique timestamp and random suffix for the instance ID
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 10);
      
      // Create a unique instance ID in the format type_longID
      const instanceId = `assembly_${timestamp}_${randomSuffix}`;
      
      // For instances in the scene, use the unique instance ID
      // When exported to a template, this will be simplified to just 'assembly'
      newGeometry.name = instanceId;
      
      // Store the instance ID separately for reference
      newGeometry._instanceId = instanceId;
      
      // Generate a unique compound ID for tracking all instances of this assembly type
      newGeometry._compoundId = `compound-${timestamp}-${randomSuffix}`;
      
      // Set a display name (Geant4 name) for the assembly
      // This is what will be shown in the UI
      newGeometry.displayName = "NewAssembly";
      
      // Set a semi-transparent color for visualization
      newGeometry.color = [0.7, 0.7, 0.7, 0.3];
    }
    
    // Add specific properties based on geometry type
    if (newGeometryType === 'box') {
      newGeometry.size = { x: 100, y: 100, z: 100};
    } else if (newGeometryType === 'cylinder') {
      newGeometry.radius = 50;
      newGeometry.height = 100;
      newGeometry.innerRadius = 0; // Changed from inner_radius to innerRadius for consistency
    } else if (newGeometryType === 'sphere') {
      newGeometry.radius = 50;
    } else if (newGeometryType === 'trapezoid') {
      newGeometry.dx1 = 50; // Half-length in x at -z/2
      newGeometry.dx2 = 50; // Half-length in x at +z/2
      newGeometry.dy1 = 50; // Half-length in y at -z/2
      newGeometry.dy2 = 50; // Half-length in y at +z/2
      newGeometry.dz = 50;  // Half-length in z
    } else if (newGeometryType === 'torus') {
      newGeometry.majorRadius = 50;
      newGeometry.minorRadius = 10;
    } else if (newGeometryType === 'ellipsoid') {
      newGeometry.xRadius = 50;
      newGeometry.yRadius = 30;
      newGeometry.zRadius = 40;
    } else if (newGeometryType === 'polycone') {
      newGeometry.zSections = [
        { z: -50, rMin: 0, rMax: 30 },
        { z: 0, rMin: 0, rMax: 50 },
        { z: 50, rMin: 0, rMax: 20 }
      ];
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
        setUpdateObjectsDialogOpen={setUpdateObjectsDialogOpen}
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
