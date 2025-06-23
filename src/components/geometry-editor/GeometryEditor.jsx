import React, { useState, useRef, useEffect } from 'react';
import {
  Paper,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

// Import utility handlers
import {
  createPropertyHandlers,
  //createImportExportHandlers,
  createGeometryHandlers,
  createUpdateHandlers
} from './utils';

// Import assembly manager utility
import { generateAssemblyId } from './utils/assemblyManager';

// Import components
import PropertyEditor from './components/PropertyEditor';
import AddNewTab from './components/AddNewTab';
import UpdateObjectsDialog from './components/UpdateObjectsDialog';
import ImportObjectDialog from './components/ImportObjectDialog';
import SaveObjectDialog from './components/SaveObjectDialog';
import HitCollectionsDialog from './components/HitCollectionsDialog';

/**
 * Main GeometryEditor component - Refactored Version
 * 
 * This component provides a comprehensive interface for creating, editing, and managing
 * geometries for Geant4 simulations.
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
 * @param {Object} props.updateDialogData - Data for the update dialog
 * @param {boolean} props.updateDialogOpen - State of the update dialog
 * @param {Function} props.setUpdateDialogOpen - Callback to set the update dialog state
 */
const RefactoredGeometryEditor = ({
  geometries,
  materials,
  selectedGeometry,
  hitCollections,
  onUpdateHitCollections,
  onUpdateGeometry,
  onAddGeometry,
  onRemoveGeometry,
  extractObjectWithDescendants,
  handleImportPartialFromAddNew,
  handleImportGeometries,
  handleImportMaterials,
  externalUpdateDialogData,
  updateDialogOpen,
  setUpdateDialogOpen,
  updateAssembliesFunc
}) => {
  // ===== Refs =====
  // Reference to the file input for importing object JSON files
  const fileInputRef = useRef(null);
  
  // ===== State =====
  // Current tab index (0 = Properties, 1 = Add New)
  const [tabIndex, setTabIndex] = useState(0);
  
  // Alert state for showing import/export notifications
  const [importAlert, setImportAlert] = useState({ show: false, message: '', severity: 'info' });
  
  // ===== Geometry Creation State =====
  // Type of geometry to create (box, cylinder, sphere, etc.)
  const [newGeometryType, setNewGeometryType] = useState('box');
  // Default mother volume for new geometries
  const [newMotherVolume, setNewMotherVolume] = useState('World');
  // For union solids: first solid selection
  ////const [firstSolid, setFirstSolid] = useState('');
  // For union solids: second solid selection
  ////const [secondSolid, setSecondSolid] = useState('');
  // For multi-component union solids: number of additional components beyond the first two
  ////const [additionalComponents, setAdditionalComponents] = useState(0);
  // For multi-component union solids: values of the additional components
  ////const [additionalComponentsValues, setAdditionalComponentsValues] = useState([]);

  // ===== Dialog States =====
  // Save Object Dialog
  const [saveObjectDialogOpen, setSaveObjectDialogOpen] = useState(false);
  const [objectToSave, setObjectToSave] = useState(null);
  const [objectFileName, setObjectFileName] = useState('');
  
  // Load Object Dialog
  const [loadObjectDialogOpen, setLoadObjectDialogOpen] = useState(false);
  
  // Import Object Dialog
  const [importObjectDialogOpen, setImportObjectDialogOpen] = useState(false);
  
  // Hit Collections Dialog
  const [hitCollectionsDialogOpen, setHitCollectionsDialogOpen] = useState(false);

  // ===== Create handlers using utility functions =====
 

  // Property handlers
  const {
    getSelectedGeometryObject,
    handleInputFocus,
    handlePropertyChange,
    handleRotationChange,
    handleRelativePositionChange,
    handleRelativeRotationChange
  } = createPropertyHandlers({
    onUpdateGeometry,
    selectedGeometry,
    geometries
  });

  // Import/Export handlers
/*   const {
    applyStructuredNaming,
    handleExportObject,
    handleImportObjectFile
  } = createImportExportHandlers({
    handleImportPartialFromAddNew,
    extractObjectWithDescendants,
    geometries,
    selectedGeometry,
    setObjectToSave,
    setSaveObjectDialogOpen,
    setImportAlert
  }); */

  // Geometry handlers
  const {
    handleAddGeometry,
    handleUpdateObjects
  } = createGeometryHandlers(
    {
      onAddGeometry,
      onUpdateGeometry,
      geometries,
      materials,
      setImportAlert
    },
    {
      newGeometryType,
      newMotherVolume,
    }
  );

  // Update handlers
  const {
    updateAssemblies
  } = createUpdateHandlers({
    onUpdateGeometry,
    geometries
  });

  // ===== Event Handlers =====
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  // Handle closing of alert notifications
  const handleCloseAlert = () => {
    setImportAlert({ ...importAlert, show: false });
  };

  // We'll use the handleLoadObject function from the importExportHandlers utility

  // Handle saving an object to a file
/*   const handleSaveObject = async () => {
    if (!objectToSave) return;
    
    try {
      // Import the FileSystemManager
      const { FileSystemManager } = await import('../../utils/FileSystemManager');
      
      // Generate a default file name if none is provided
      const fileName = objectFileName || `${objectToSave.object.name || 'geometry'}.json`;
      
      // Save the object to a file
      await FileSystemManager.saveTextFile(
        JSON.stringify(objectToSave, null, 2),
        fileName
      );
      
      // Close the dialog
      setSaveObjectDialogOpen(false);
      setObjectFileName('');
      
      // Show success message
      setImportAlert({
        show: true,
        message: `Object saved as ${fileName}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving object:', error);
      setImportAlert({
        show: true,
        message: `Error saving object: ${error.message}`,
        severity: 'error'
      });
    }
  }; */

  // Render the property editor tab
  const renderPropertyEditor = () => {
    return (
      <PropertyEditor
        geometries={geometries}
        materials={materials}
        selectedGeometry={selectedGeometry}
        hitCollections={hitCollections}
        onUpdateHitCollections={onUpdateHitCollections}
        onUpdateGeometry={onUpdateGeometry}
        onRemoveGeometry={onRemoveGeometry}
        handlePropertyChange={handlePropertyChange}
        handleRotationChange={handleRotationChange}
        handleRelativePositionChange={handleRelativePositionChange}
        handleRelativeRotationChange={handleRelativeRotationChange}
        handleInputFocus={handleInputFocus}
        //handleExportObject={handleExportObject}
      />
    );
  };

  // Render the "Add New" tab
  const renderAddNewTab = () => {
    return (
      <AddNewTab
        geometries={geometries}
        newGeometryType={newGeometryType}
        setNewGeometryType={setNewGeometryType}
        newMotherVolume={newMotherVolume}
        setNewMotherVolume={setNewMotherVolume}
        handleAddGeometry={handleAddGeometry}
        fileInputRef={fileInputRef}
        //handleImportObjectFile={handleImportObjectFile}
        importAlert={importAlert}
        handleCloseAlert={handleCloseAlert}
        setLoadObjectDialogOpen={setLoadObjectDialogOpen}
        setImportObjectDialogOpen={setImportObjectDialogOpen}
        setHitCollectionsDialogOpen={setHitCollectionsDialogOpen}
        setUpdateObjectsDialogOpen={setUpdateDialogOpen}
      />
    );
  };

  return (
    <Paper id="geometry-editor" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tabs for switching between Properties and Add New */}
      <Tabs 
        value={tabIndex} 
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Properties" />
        <Tab label="Add New" />
      </Tabs>
      
      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {tabIndex === 0 ? renderPropertyEditor() : renderAddNewTab()}
      </div>
      
      {/* Alert for showing import/export notifications */}
      <Snackbar
        open={importAlert.show}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={importAlert.severity} sx={{ width: '100%' }}>
          {importAlert.message}
        </Alert>
      </Snackbar>
      

      
      {/* Update Objects Dialog */}
      <UpdateObjectsDialog
        open={updateDialogOpen}
        onClose={() => setUpdateDialogOpen(false)}
        onUpdate={handleUpdateObjects}
        geometries={geometries}
        preSelectedData={externalUpdateDialogData}
        directUpdateFunc={updateAssemblies}
      />
      
      {/* Load Object Dialog */}

      
      {/* Import Object Dialog */}
      <ImportObjectDialog
        open={importObjectDialogOpen}
        onClose={() => {
          setImportObjectDialogOpen(false);
          setImportAlert({
            show: true,
            message: 'Object imported successfully!',
            severity: 'success'
          });
        }}
        geometries={geometries}
        materials={materials}
        onImportGeometries={handleImportGeometries}
        onImportMaterials={handleImportMaterials}
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

export default RefactoredGeometryEditor;
