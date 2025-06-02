/**
 * Property Handlers for Geometry Editor
 * 
 * This module contains handler functions for managing property changes in the geometry editor,
 * including rotation, position, and other object properties.
 */

import { getSelectedGeometryObject } from './GeometryUtils';
import { toInternalUnit, fromInternalUnit } from './UnitConverter';

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
  
  // We'll get the current unit from the PropertyEditor component when it calls handlePropertyChange

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
   * Handle property changes for the selected geometry object
   * 
   * @param {string} property - The property to change
   * @param {any} value - The new value for the property
   * @param {string} unit - The unit of the input value (e.g., 'cm', 'mm', 'deg', 'rad')
   * @param {boolean} isStringProperty - Whether the property is a string (no numeric conversion)
   */
  const handlePropertyChange = (property, value, unit = 'cm', isStringProperty = false) => {
    // Get the currently selected geometry object
    const selectedObject = getSelectedGeometryObjectLocal();
    if (!selectedObject) return;
    
    // Create a deep copy of the selected object to avoid mutating the original
    const updatedObject = JSON.parse(JSON.stringify(selectedObject));
    
    // Parse the value if it's a number
    let finalValue = value;
    
    // Special handling for array properties (like zSections for polycone)
    if (Array.isArray(value)) {
      // For array properties, we don't need to do any conversion here
      // as it should already be handled in the PropertyEditor component
      finalValue = value;
    } else {
      // Determine if this is a numeric field that needs unit conversion
      const isNumberField = !isStringProperty && typeof value === 'string' && /^-?\d*\.?\d*$/.test(value);
      
      if (isNumberField) {
        // For empty string or just a minus sign, don't process yet
        if (value === '' || value === '-') {
          finalValue = value;
        } else {
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) {
            // Determine if this is a length or angle property
            const isAngle = property.includes('rotation');
            const unitType = isAngle ? 'angle' : 'length';
            
            // Convert from the current display unit to internal units (mm or rad)
            finalValue = toInternalUnit(parsed, unit, unitType);
            console.log(`Converting ${parsed} ${unit} to ${finalValue} internal units (${unitType})`);
          } else {
            // If parsing fails, keep the original value
            finalValue = isStringProperty ? value : 0;
          }
        }
      } else if (!isStringProperty && typeof value !== 'object') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          finalValue = parsed;
        } else {
          finalValue = 0;
        }
      }
    }
    
    // Handle nested properties like 'position.x'
    if (property.includes('.')) {
      const [parent, child] = property.split('.');
      
      // Ensure the parent property exists
      if (!updatedObject[parent]) {
        updatedObject[parent] = {};
      }
      
      // Apply the value to the property
      updatedObject[parent][child] = finalValue;
      
      // For rotation, always store in radians (no unit needed)
      // For position, preserve the length unit
      if (parent === 'position') {
        updatedObject[parent].unit = unit; // Use the unit passed to the function
      } else if (updatedObject[parent].unit) {
        // For other properties, remove unit as it's no longer needed
        delete updatedObject[parent].unit;
      }
      
      // Special handling for box dimensions - update both dimensions and size
      if (parent === 'dimensions' && updatedObject.type === 'box') {
        // Ensure size property exists and is updated to match dimensions
        if (!updatedObject.size) {
          updatedObject.size = {};
        }
        updatedObject.size[child] = finalValue;
        console.log(`Updated box ${child} dimension to ${finalValue} and synchronized with size property`);
      }
    } else {
      // Handle direct properties
      updatedObject[property] = finalValue;
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
