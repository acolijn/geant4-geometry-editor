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
   * Handle property changes for the selected geometry object
   * 
   * @param {string} property - The property to change
   * @param {any} value - The new value for the property
   * @param {string} unit - The unit of the input value (e.g., 'cm', 'mm', 'deg', 'rad')
   * @param {boolean} isStringProperty - Whether the property is a string (no numeric conversion)
   */
  const handlePropertyChange = (property, value, unit = 'cm', isStringProperty = false) => {
    // Get the currently selected geometry object
    console.log(`handlePropertyChange called for property ${property} with value ${value} and unit ${unit}`);
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
    } else if (typeof value === 'number') {
      // If the value is already a number (from NumericInput), use it directly
      // The NumericInput component has already done the unit conversion
      finalValue = value;
    }; /* else {
      // For string values (from regular TextField inputs)
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
    } */
    
    // Handle nested properties like 'position.x'
    if (property.includes('.')) {
      
      const [parent, child] = property.split('.');
      
      // Ensure the parent property exists
      if (!updatedObject[parent]) {
        updatedObject[parent] = {};
      }
      
      // Apply the value to the property
      updatedObject[parent][child] = finalValue;
      
      // Special handling for box dimensions - update both dimensions and size
/*       if (parent === 'dimensions' && updatedObject.type === 'box') {
        // Ensure size property exists and is updated to match dimensions
        if (!updatedObject.size) {
          updatedObject.size = {};
        }
        updatedObject.size[child] = finalValue;
        console.log(`Updated box ${child} dimension to ${finalValue} and synchronized with size property`);
      } */
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
    handlePropertyChange,
    handleRotationChange,
    handleRelativePositionChange,
    handleRelativeRotationChange
  };
};
