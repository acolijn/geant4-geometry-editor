/**
 * Material Handlers
 * 
 * This module contains handler functions for managing materials in the Geant4 Geometry Editor.
 */

/**
 * Creates material handler functions with access to state and setState
 * 
 * @param {Object} props - Object containing props and functions
 * @param {Object} props.materials - Object containing all materials
 * @param {Function} props.onUpdateMaterials - Function to update materials
 * @param {Function} props.setSelectedMaterial - Function to set selected material
 * @param {Function} props.setNewMaterial - Function to set new material
 * @param {Function} props.setElementName - Function to set element name
 * @param {Function} props.setElementCount - Function to set element count
 * @param {Function} props.setDialogOpen - Function to set dialog open state
 * @returns {Object} Object containing handler functions
 */
export const createMaterialHandlers = (props) => {
  const { 
    materials,
    onUpdateMaterials,
    setSelectedMaterial,
    setNewMaterial,
    setElementName,
    setElementCount,
    setDialogOpen
  } = props;

  /**
   * Handle selecting a material
   * 
   * @param {string} name - Name of the material to select
   */
  const handleSelectMaterial = (name) => {
    setSelectedMaterial(name);
  };

  /**
   * Handle updating a material property
   * 
   * @param {string} property - Property to update
   * @param {any} value - New value for the property
   */
  const handleUpdateMaterial = (property, value, selectedMaterial) => {
    if (!selectedMaterial) return;
    
    const updatedMaterials = { ...materials };
    
    // Handle nested properties
    if (property.includes('.')) {
      const [parent, child] = property.split('.');
      updatedMaterials[selectedMaterial][parent] = { 
        ...updatedMaterials[selectedMaterial][parent], 
        [child]: value 
      };
    } else {
      updatedMaterials[selectedMaterial][property] = value;
    }
    
    onUpdateMaterials(updatedMaterials);
  };

  /**
   * Handle deleting a material
   */
  const handleDeleteMaterial = (selectedMaterial) => {
    if (!selectedMaterial) return;
    
    const updatedMaterials = { ...materials };
    delete updatedMaterials[selectedMaterial];
    onUpdateMaterials(updatedMaterials);
    setSelectedMaterial(null);
  };

  /**
   * Handle adding an element to a material's composition
   * 
   * @param {string} elementName - Name of the element to add
   * @param {number} elementCount - Count of the element
   * @param {Object} newMaterial - The new material being created
   */
  const handleAddElement = (elementName, elementCount, newMaterial) => {
    if (!elementName) return;
    
    setNewMaterial({
      ...newMaterial,
      composition: {
        ...newMaterial.composition,
        [elementName]: parseFloat(elementCount) || 1
      }
    });
    
    setElementName('');
    setElementCount(1);
  };

  /**
   * Handle removing an element from a material's composition
   * 
   * @param {string} element - Element to remove
   * @param {Object} newMaterial - The new material being created
   */
  const handleRemoveElement = (element, newMaterial) => {
    const updatedComposition = { ...newMaterial.composition };
    delete updatedComposition[element];
    
    setNewMaterial({
      ...newMaterial,
      composition: updatedComposition
    });
  };

  /**
   * Handle adding a new material
   * 
   * @param {Object} newMaterial - The new material to add
   */
  const handleAddMaterial = (newMaterial) => {
    if (!newMaterial.name) return;
    
    const updatedMaterials = { ...materials };
    updatedMaterials[newMaterial.name] = { ...newMaterial };
    
    onUpdateMaterials(updatedMaterials);
    setDialogOpen(false);
    setNewMaterial({
      name: '',
      type: 'nist',
      density: 1.0,
      density_unit: 'g/cm3',
      state: 'solid',
      temperature: 293.15,
      temperature_unit: 'kelvin',
      composition: {},
      color: [0.5, 0.5, 0.5, 1.0] // Default color (RGBA)
    });
  };

  /**
   * Handle updating a material's color
   * 
   * @param {string} materialName - Name of the material
   * @param {Array} color - RGBA color array [r, g, b, a]
   */
  const handleUpdateColor = (materialName, color) => {
    if (!materialName) return;
    
    const updatedMaterials = { ...materials };
    updatedMaterials[materialName].color = color;
    
    onUpdateMaterials(updatedMaterials);
  };

  return {
    handleSelectMaterial,
    handleUpdateMaterial,
    handleDeleteMaterial,
    handleAddElement,
    handleRemoveElement,
    handleAddMaterial,
    handleUpdateColor
  };
};
