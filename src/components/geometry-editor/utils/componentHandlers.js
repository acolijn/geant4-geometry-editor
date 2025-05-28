/**
 * Component Handlers for Geometry Editor
 * 
 * This module contains handler functions for managing components in the geometry editor,
 * particularly for union solids that can have multiple components.
 */

/**
 * Creates component handler functions with access to state and setState
 * 
 * @param {Object} setState - Object containing setState functions
 * @param {Function} setState.setAdditionalComponents - Function to update additionalComponents state
 * @param {Function} setState.setAdditionalComponentsValues - Function to update additionalComponentsValues state
 * @param {Object} state - Object containing current state values
 * @param {number} state.additionalComponents - Number of additional components
 * @param {Array} state.additionalComponentsValues - Values of additional components
 * @returns {Object} Object containing handler functions
 */
export const createComponentHandlers = (setState, state) => {
  /**
   * Handler for adding a new component to the union
   */
  const handleAddComponent = () => {
    setState.setAdditionalComponents(prev => prev + 1);
  };
  
  /**
   * Handler for removing the last component from the union
   */
  const handleRemoveComponent = () => {
    if (state.additionalComponents > 0) {
      setState.setAdditionalComponents(prev => prev - 1);
      setState.setAdditionalComponentsValues(prev => prev.slice(0, -1));
    }
  };
  
  /**
   * Handler for changing the value of an additional component
   * 
   * @param {number} index - Index of the component to change
   * @param {string} value - New value for the component
   */
  const handleAdditionalComponentChange = (index, value) => {
    setState.setAdditionalComponentsValues(prev => {
      const newValues = [...prev];
      newValues[index] = value;
      return newValues;
    });
  };

  return {
    handleAddComponent,
    handleRemoveComponent,
    handleAdditionalComponentChange
  };
};
