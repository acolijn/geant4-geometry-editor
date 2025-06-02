/**
 * Property Handlers for Geometry Editor
 * 
 * This module contains handler functions for managing property changes in the geometry editor,
 * including rotation, position, and other object properties.
 */

import { getSelectedGeometryObject } from './GeometryUtils';

/**
 * Creates property handler functions with access to state and setState
 * 
 * @param {Object} props - Object containing props and functions
 * @param {Function} props.onUpdateGeometry - Function to update geometry
 * @param {string} props.selectedGeometry - ID of currently selected geometry
 * @param {Object} props.geometries - Object containing all geometries
 * @returns {Object} Object containing handler functions
 */
export const createPropertyHandlers = (props) => {
  const { onUpdateGeometry, selectedGeometry, geometries } = props;

  /**
   * Get the currently selected geometry object using the shared utility function
   * 
   * @returns {Object|null} The selected geometry object or null if no geometry is selected
   */
  const getSelectedGeometryObjectLocal = () => {
    return getSelectedGeometryObject(selectedGeometry, geometries);
  };

  /**
   * Auto-select the content of input fields when they receive focus
   * 
   * @param {Object} event - The focus event
   */
  const handleInputFocus = (event) => {
    event.target.select();
  };

  /**
   * Handle key events for number input fields to allow negative numbers
   * 
   * @param {Object} e - The keyboard event
   */
  const handleNumberKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter, decimal point, minus sign
    const allowedKeys = [8, 46, 9, 27, 13, 110, 190, 189, 109];
    
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (
      allowedKeys.includes(e.keyCode) ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      ((e.keyCode === 65 || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88) && e.ctrlKey === true) ||
      // Allow: home, end, left, right
      (e.keyCode >= 35 && e.keyCode <= 39)
    ) {
      // Let it happen, don't do anything
      return;
    }
    
    // Ensure that it's a number and stop the keypress if not
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  /**
   * Handle changes to geometry properties
   * 
   * @param {string} property - The name of the property to change (can be nested like 'position.x')
   * @param {any} value - The new value for the property
   * @param {boolean} allowNegative - Whether to allow negative values for numeric properties
   * @param {boolean} isStringProperty - Whether the property is a string (no numeric conversion)
   */
  const handlePropertyChange = (property, value, allowNegative = true, isStringProperty = false) => {
    // Get the currently selected geometry object
    const selectedObject = getSelectedGeometryObjectLocal();
    if (!selectedObject) return;
    
    // Create a deep copy of the selected object to avoid mutating the original
    const updatedObject = JSON.parse(JSON.stringify(selectedObject));
    
    // Handle nested properties like 'position.x'
    if (property.includes('.')) {
      const [parent, child] = property.split('.');
      
      // Ensure the parent property exists
      if (!updatedObject[parent]) {
        updatedObject[parent] = {};
      }
      
      // Convert the value to a number if it's not a string property
      let newValue = isStringProperty ? value : parseFloat(value);
      
      // Ensure the value is valid
      if (!isStringProperty && isNaN(newValue)) {
        newValue = 0;
      }
      
      // Apply the value to the property
      updatedObject[parent][child] = newValue;
    } else {
      // Handle direct properties
      // Convert the value to a number if it's not a string property
      let newValue = isStringProperty ? value : parseFloat(value);
      
      // Ensure the value is valid
      if (!isStringProperty && isNaN(newValue)) {
        newValue = 0;
      }
      
      // Apply the value to the property
      updatedObject[property] = newValue;
    }
    
    // Update the geometry with the new object
    onUpdateGeometry(selectedGeometry, updatedObject);
  };

  /**
   * Handle rotation changes for the selected geometry object
   * 
   * @param {string} axis - The rotation axis ('x', 'y', or 'z')
   * @param {number} value - The rotation value in degrees
   */
  const handleRotationChange = (axis, value) => {
    // Get the currently selected geometry object
    const selectedObject = getSelectedGeometryObjectLocal();
    if (!selectedObject) return;
    
    // Create a deep copy of the selected object to avoid mutating the original
    const updatedObject = JSON.parse(JSON.stringify(selectedObject));
    
    // Ensure the rotation property exists
    if (!updatedObject.rotation) {
      updatedObject.rotation = { x: 0, y: 0, z: 0 };
    }
    
    // Convert the value to a number and ensure it's valid
    const newValue = parseFloat(value);
    if (isNaN(newValue)) return;
    
    // Apply the rotation to the specified axis
    updatedObject.rotation[axis] = newValue;
    
    // Update the geometry with the new object
    onUpdateGeometry(selectedGeometry, updatedObject);
  };

  /**
   * Handle relative position changes for union solids
   * 
   * @param {string} axis - The position axis ('x', 'y', or 'z')
   * @param {number} value - The position value in centimeters
   */
  const handleRelativePositionChange = (axis, value) => {
    // Get the currently selected geometry object
    const selectedObject = getSelectedGeometryObjectLocal();
    if (!selectedObject || selectedObject.type !== 'union') return;
    
    // Create a deep copy of the selected object to avoid mutating the original
    const updatedObject = JSON.parse(JSON.stringify(selectedObject));
    
    // Ensure the relative_position property exists
    if (!updatedObject.relative_position) {
      updatedObject.relative_position = { x: 0, y: 0, z: 0 };
    }
    
    // Convert the value to a number and ensure it's valid
    const newValue = parseFloat(value);
    if (isNaN(newValue)) return;
    
    // Apply the position to the specified axis
    updatedObject.relative_position[axis] = newValue;
    
    // Update the geometry with the new object
    onUpdateGeometry(selectedGeometry, updatedObject);
  };

  /**
   * Handle relative rotation changes for union solids
   * 
   * @param {string} axis - The rotation axis ('x', 'y', or 'z')
   * @param {number} value - The rotation value in degrees
   */
  const handleRelativeRotationChange = (axis, value) => {
    // Get the currently selected geometry object
    const selectedObject = getSelectedGeometryObjectLocal();
    if (!selectedObject || selectedObject.type !== 'union') return;
    
    // Create a deep copy of the selected object to avoid mutating the original
    const updatedObject = JSON.parse(JSON.stringify(selectedObject));
    
    // Ensure the relative_rotation property exists
    if (!updatedObject.relative_rotation) {
      updatedObject.relative_rotation = { x: 0, y: 0, z: 0 };
    }
    
    // Convert the value to a number and ensure it's valid
    const newValue = parseFloat(value);
    if (isNaN(newValue)) return;
    
    // Apply the rotation to the specified axis
    updatedObject.relative_rotation[axis] = newValue;
    
    // Update the geometry with the new object
    onUpdateGeometry(selectedGeometry, updatedObject);
  };

  return {
    getSelectedGeometryObjectLocal,
    handleInputFocus,
    handleNumberKeyDown,
    handlePropertyChange,
    handleRotationChange,
    handleRelativePositionChange,
    handleRelativeRotationChange
  };
};
