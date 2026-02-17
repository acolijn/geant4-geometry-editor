import { useState } from 'react';
import { updateGeometry, addGeometry, removeGeometry } from '../components/geometry-editor/utils/GeometryOperations';
import { defaultGeometry, defaultMaterials } from '../utils/defaults';
import { propagateCompoundIdToDescendants } from '../components/geometry-editor/utils/compoundIdPropagator';
import { debugLog } from '../utils/logger';

const cloneData = (data) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data));
};

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

    const geometriesCopy = cloneData(importData);
    debugLog('handleImportGeometries:: Setting geometries state with:', geometriesCopy);

    let updatedVolumes = [...geometriesCopy.volumes];
    geometriesCopy.volumes.forEach((volume, index) => {
      if (volume.type === 'assembly' || volume.type === 'union') {
        if (!volume._compoundId) {
          updatedVolumes[index] = { ...volume, _compoundId: volume.name };
          debugLog(`handleImportGeometries:: Assigned _compoundId ${volume.name} to imported ${volume.type}: ${volume.name}`);
        }

        const compoundId = updatedVolumes[index]._compoundId;
        updatedVolumes = propagateCompoundIdToDescendants(volume.name, compoundId, updatedVolumes);
      }
    });
    geometriesCopy.volumes = updatedVolumes;

    setGeometries(geometriesCopy);
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

  const handleUpdateMaterials = (updatedMaterials) => {
    setMaterials(updatedMaterials);
  };

  const handleLoadProject = (loadedGeometries, loadedMaterials, loadedHitCollections) => {
    setGeometries(loadedGeometries);
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
    handleLoadProject
  };
};
