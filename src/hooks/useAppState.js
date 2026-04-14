import { useState } from 'react';
import { updateGeometry, addGeometry, removeGeometry } from '../components/geometry-editor/utils/GeometryOperations';
import { defaultGeometry, defaultMaterials } from '../utils/defaults';
import { propagateCompoundIdToDescendants } from '../components/geometry-editor/utils/compoundIdPropagator';
import { expandToFlat } from '../utils/expandToFlat';
import { debugLog } from '../utils/logger';

const cloneData = (data) => structuredClone(data);

const isValidMaterialsMap = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const useAppState = () => {
  const [tabValue, setTabValue] = useState(0);
  const [geometries, setGeometries] = useState(defaultGeometry);
  const [materials, setMaterials] = useState(defaultMaterials);
  const [selectedGeometry, setSelectedGeometry] = useState(null);
  const [hitCollections, setHitCollections] = useState(['MyHitsCollection']);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  // JSON-primary state: the hierarchical JSON is the source of truth for load/save
  const [jsonData, setJsonData] = useState(null);

  const handleUpdateGeometry = (id, updatedObject, keepSelected = true, isLiveUpdate = false, extraData = null) => {
    updateGeometry(
      geometries,
      id,
      updatedObject,
      keepSelected,
      isLiveUpdate,
      extraData,
      setGeometries,
      setSelectedGeometry,
      selectedGeometry,
      null,
      propagateCompoundIdToDescendants
    );
  };

  const handleAddGeometry = (newGeometry) => {
    return addGeometry(
      newGeometry,
      geometries,
      setGeometries,
      setSelectedGeometry,
      propagateCompoundIdToDescendants
    );
  };

  const handleRemoveGeometry = (id) => {
    removeGeometry(
      id,
      geometries,
      setGeometries,
      setSelectedGeometry,
      selectedGeometry
    );
  };

  const handleImportGeometries = (importData) => {
    debugLog('handleImportGeometries:: Received data:', importData);

    if (!importData || !importData.volumes || !Array.isArray(importData.volumes)) {
      console.error('Invalid geometries format');
      return { success: false, message: 'Invalid geometries format' };
    }

    // Store the hierarchical JSON as primary state
    const jsonCopy = cloneData(importData);
    setJsonData(jsonCopy);

    // Derive flat geometry from JSON
    const flat = expandToFlat(jsonCopy);
    debugLog('handleImportGeometries:: Derived flat geometry:', flat);

    // Propagate compound IDs for existing edit handlers
    let updatedVolumes = [...flat.volumes];
    flat.volumes.forEach((volume, index) => {
      if (volume.type === 'assembly' || volume.type === 'union' || volume.type === 'subtraction') {
        if (!volume._compoundId) {
          updatedVolumes[index] = { ...volume, _compoundId: volume.name };
        }
        const compoundId = updatedVolumes[index]._compoundId;
        updatedVolumes = propagateCompoundIdToDescendants(volume.name, compoundId, updatedVolumes);
      }
    });

    setGeometries({ world: flat.world, volumes: updatedVolumes });
    return { success: true, message: 'Geometries imported successfully' };
  };

  const handleImportMaterials = (importedMaterials) => {
    debugLog('handleImportMaterials:: Received data:', importedMaterials);

    if (!isValidMaterialsMap(importedMaterials)) {
      console.error('Invalid materials format');
      return { success: false, message: 'Invalid materials format' };
    }

    const materialsCopy = cloneData(importedMaterials);
    debugLog('handleImportMaterials:: Setting materials state with:', materialsCopy);

    setMaterials(materialsCopy);
    return { success: true, message: 'Materials imported successfully' };
  };

  // Append flat volumes to existing geometry (used by ImportObjectDialog)
  const handleAppendVolumes = (flatVolumes) => {
    if (!flatVolumes || !Array.isArray(flatVolumes) || flatVolumes.length === 0) return;

    let updatedVolumes = [...(geometries.volumes || []), ...flatVolumes];
    flatVolumes.forEach((volume) => {
      if (volume.type === 'assembly' || volume.type === 'union' || volume.type === 'subtraction') {
        const idx = updatedVolumes.lastIndexOf(volume);
        if (!volume._compoundId) {
          updatedVolumes[idx] = { ...volume, _compoundId: volume.name };
        }
        const compoundId = updatedVolumes[idx]._compoundId;
        updatedVolumes = propagateCompoundIdToDescendants(volume.name, compoundId, updatedVolumes);
      }
    });

    setGeometries({ world: geometries.world, volumes: updatedVolumes });
  };

  const handleUpdateMaterials = (updatedMaterials) => {
    setMaterials(updatedMaterials);
  };

  const handleLoadProject = (loadedJsonData, loadedMaterials, loadedHitCollections) => {
    // Store the hierarchical JSON as primary state
    const jsonCopy = cloneData(loadedJsonData);
    setJsonData(jsonCopy);

    // Derive flat geometry from JSON
    const flat = expandToFlat(jsonCopy);

    // Propagate compound IDs for existing edit handlers
    let updatedVolumes = [...flat.volumes];
    flat.volumes.forEach((volume, index) => {
      if (volume.type === 'assembly' || volume.type === 'union' || volume.type === 'subtraction') {
        if (!volume._compoundId) {
          updatedVolumes[index] = { ...volume, _compoundId: volume.name };
        }
        const compoundId = updatedVolumes[index]._compoundId;
        updatedVolumes = propagateCompoundIdToDescendants(volume.name, compoundId, updatedVolumes);
      }
    });

    setGeometries({ world: flat.world, volumes: updatedVolumes });
    setMaterials(loadedMaterials);

    if (loadedHitCollections && Array.isArray(loadedHitCollections)) {
      setHitCollections(loadedHitCollections);
    }

    setSelectedGeometry(null);
  };

  return {
    tabValue,
    setTabValue,
    geometries,
    materials,
    jsonData,
    setJsonData,
    selectedGeometry,
    setSelectedGeometry,
    hitCollections,
    setHitCollections,
    updateDialogOpen,
    setUpdateDialogOpen,
    handleUpdateGeometry,
    handleAddGeometry,
    handleRemoveGeometry,
    handleImportGeometries,
    handleImportMaterials,
    handleUpdateMaterials,
    handleAppendVolumes,
    handleLoadProject
  };
};
