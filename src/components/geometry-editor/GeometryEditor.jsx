import React, { useState, useRef } from 'react';
import {
  Paper,
  Tabs,
  Tab,
  Snackbar,
  Alert
} from '@mui/material';

// Import utility handlers
import {
  createPropertyHandlers,
  createGeometryHandlers,
  createUpdateHandlers
} from './utils';

// Import components
import PropertyEditor from './components/PropertyEditor';
import AddNewTab from './components/AddNewTab';
import UpdateObjectsDialog from './components/UpdateObjectsDialog';
import ImportObjectDialog from './components/ImportObjectDialog';
import HitCollectionsDialog from './components/HitCollectionsDialog';

// Import context
import { useAppContext } from '../../contexts/useAppContext';

/**
 * Main GeometryEditor component - Refactored Version
 * 
 * This component provides a comprehensive interface for creating, editing, and managing
 * geometries for Geant4 simulations.
 * 
 * All state is consumed from AppStateContext.
 */
const RefactoredGeometryEditor = () => {
  const {
    geometries,
    materials,
    selectedGeometry,
    hitCollections,
    setHitCollections: onUpdateHitCollections,
    handleUpdateGeometry: onUpdateGeometry,
    handleAddGeometry: onAddGeometry,
    handleRemoveGeometry: onRemoveGeometry,
    handleImportGeometries,
    handleImportMaterials,
    handleAppendJsonVolumes,
    updateDialogOpen,
    setUpdateDialogOpen,
  } = useAppContext();
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

  // ===== Dialog States =====
  // Import Object Dialog
  const [importObjectDialogOpen, setImportObjectDialogOpen] = useState(false);
  
  // Hit Collections Dialog
  const [hitCollectionsDialogOpen, setHitCollectionsDialogOpen] = useState(false);

  // ===== Create handlers using utility functions =====
 

  // Property handlers
  const {
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
        importAlert={importAlert}
        handleCloseAlert={handleCloseAlert}
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
        preSelectedData={null}
        directUpdateFunc={updateAssemblies}
      />
      
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
        onImportMaterials={handleImportMaterials}
        onAppendJsonVolumes={handleAppendJsonVolumes}
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
