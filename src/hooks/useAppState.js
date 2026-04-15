import { useState } from 'react';
import { defaultGeometry, defaultMaterials } from '../utils/defaults';
import { propagateCompoundIdToDescendants } from '../components/geometry-editor/utils/compoundIdPropagator';
import { expandToFlat, isVolumeKey, findFlatIndex } from '../utils/expandToFlat';
import {
  applyUpdateToJson,
  applyWorldUpdateToJson,
  applyAddToJson,
  applyRemoveFromJson,
  applyAddPlacementToJson,
  flatToJsonVolume,
  mergeJsonVolumes,
  restructureCompounds,
  findMatchingVolume,
} from '../utils/jsonOperations';
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
  // JSON-primary state: the hierarchical JSON is the source of truth
  const [jsonData, setJsonData] = useState(null);

  // ─── Helper: re-derive flat view from JSON ────────────────
  // Called after every JSON mutation. Stores jsonData, derives flat,
  // propagates compound IDs, and sets geometries.
  const reDeriveFlat = (newJson) => {
    setJsonData(newJson);
    const flat = expandToFlat(newJson);

    let updatedVolumes = [...flat.volumes];
    flat.volumes.forEach((volume, index) => {
      if (['assembly', 'union', 'subtraction'].includes(volume.type)) {
        if (!volume._compoundId) {
          updatedVolumes[index] = { ...volume, _compoundId: volume.name };
        }
        const compoundId = updatedVolumes[index]._compoundId;
        updatedVolumes = propagateCompoundIdToDescendants(volume.name, compoundId, updatedVolumes);
      }
    });

    const result = { world: flat.world, volumes: updatedVolumes };
    setGeometries(result);
    return result;
  };

  // ─── Helper: get current JSON (lazy-init from flat if needed) ──
  const getOrInitJson = () => {
    if (jsonData) return jsonData;
    // No JSON loaded yet — seed from current default state
    const world = geometries.world;
    return {
      world: {
        name: world?.name || 'World',
        type: world?.type || 'box',
        material: world?.material || 'G4_AIR',
        dimensions: world?.size
          ? { x: world.size.x, y: world.size.y, z: world.size.z }
          : { x: 2000, y: 2000, z: 2000 },
      },
      volumes: (geometries.volumes || []).map(v => flatToJsonVolume(v)),
    };
  };

  // ─── REFRESH: re-derive flat view from current JSON ────────
  // Clones the JSON, runs restructureCompounds to move any stray volumes
  // into their proper assembly/union component arrays, then re-derives flat.
  const refreshView = () => {
    if (jsonData) {
      const fixed = restructureCompounds(structuredClone(jsonData));
      reDeriveFlat(fixed);
    }
  };

  // ─── EDIT: update a volume or the world ───────────────────
  const handleUpdateGeometry = (id, updatedObject, keepSelected = true) => {
    const currentJson = getOrInitJson();
    let newJson;

    if (id === 'world') {
      newJson = applyWorldUpdateToJson(currentJson, geometries.world, updatedObject);
    } else {
      const flatIndex = findFlatIndex(geometries.volumes, id);
      if (flatIndex < 0) return;
      newJson = applyUpdateToJson(currentJson, geometries.volumes, flatIndex, updatedObject);
    }

    reDeriveFlat(newJson);

    if (keepSelected) {
      setSelectedGeometry(id);
    }
  };

  // ─── EDIT: add a new volume ───────────────────────────────
  const handleAddGeometry = (newGeometry) => {
    const currentJson = getOrInitJson();

    // Auto-generate g4name if missing
    if (!newGeometry.g4name) {
      const typeName = newGeometry.type.charAt(0).toUpperCase() + newGeometry.type.slice(1);
      const count = geometries.volumes.filter(v => v.type === newGeometry.type).length;
      newGeometry.g4name = `${typeName}_${count}`;
    }

    const newJson = applyAddToJson(currentJson, newGeometry);
    const derived = reDeriveFlat(newJson);

    // Select the newly added volume (appears at end of flat list)
    const newVol = derived.volumes[derived.volumes.length - 1];
    if (newVol) {
      setTimeout(() => setSelectedGeometry(newVol._id), 50);
    }

    return newGeometry.name;
  };

  // ─── EDIT: remove a volume ────────────────────────────────
  const handleRemoveGeometry = (id) => {
    if (id === 'world') return;
    const currentJson = getOrInitJson();

    const flatIndex = findFlatIndex(geometries.volumes, id);
    if (flatIndex < 0) return;

    // Remember selected volume name before removal
    let selectedName = null;
    if (selectedGeometry && selectedGeometry !== 'world' && selectedGeometry !== id) {
      const selIdx = findFlatIndex(geometries.volumes, selectedGeometry);
      if (selIdx >= 0) selectedName = geometries.volumes[selIdx]?.name;
    }

    const newJson = applyRemoveFromJson(currentJson, geometries.volumes, flatIndex);
    const derived = reDeriveFlat(newJson);

    // Re-select by name if possible, otherwise deselect
    if (selectedName) {
      const found = derived.volumes.find(v => v.name === selectedName);
      setSelectedGeometry(found ? found._id : null);
    } else {
      setSelectedGeometry(null);
    }
  };

  // ─── EDIT: add a new placement of an existing volume ──────
  const handleAddPlacement = (id) => {
    if (id === 'world') return;
    const currentJson = getOrInitJson();

    const flatIndex = findFlatIndex(geometries.volumes, id);
    if (flatIndex < 0) return;

    const newJson = applyAddPlacementToJson(currentJson, geometries.volumes, flatIndex);
    const derived = reDeriveFlat(newJson);

    // Select the newly added placement (last entry for that volume)
    const flatVol = geometries.volumes[flatIndex];
    const vi = flatVol._volumeIndex;
    const lastPlacement = derived.volumes.filter(v => v._volumeIndex === vi).pop();
    if (lastPlacement) {
      setTimeout(() => setSelectedGeometry(lastPlacement._id), 50);
    }
  };

  // ─── BATCH: set visibility on multiple volumes at once ─────
  // updates: array of { id: 'vol-...', visible: boolean }
  const handleBatchSetVisibility = (updates) => {
    if (!updates || updates.length === 0) return;
    const currentJson = getOrInitJson();
    const newJson = structuredClone(currentJson);

    for (const { id, visible } of updates) {
      const flatIndex = findFlatIndex(geometries.volumes, id);
      if (flatIndex < 0) continue;
      const flatVol = geometries.volumes[flatIndex];
      if (!flatVol || flatVol._volumeIndex === undefined) continue;

      const vi = flatVol._volumeIndex;
      const ci = flatVol._componentIndex;
      const pi = flatVol._placementIndex;

      if (ci !== undefined && newJson.volumes[vi]?.components?.[ci]) {
        newJson.volumes[vi].components[ci].visible = visible;
      } else if (pi !== undefined && newJson.volumes[vi]?.placements?.[pi]) {
        // Store visibility on the individual placement so each instance
        // can be toggled independently.
        newJson.volumes[vi].placements[pi].visible = visible;
      } else if (newJson.volumes[vi]) {
        newJson.volumes[vi].visible = visible;
      }
    }

    reDeriveFlat(newJson);
  };

  // ─── IMPORT: replace all geometry from hierarchical JSON ──
  const handleImportGeometries = (importData) => {
    debugLog('handleImportGeometries:: Received data:', importData);

    if (!importData || !importData.volumes || !Array.isArray(importData.volumes)) {
      console.error('Invalid geometries format');
      return { success: false, message: 'Invalid geometries format' };
    }

    const jsonCopy = cloneData(importData);
    reDeriveFlat(jsonCopy);
    return { success: true, message: 'Geometries imported successfully' };
  };

  const handleImportMaterials = (importedMaterials) => {
    debugLog('handleImportMaterials:: Received data:', importedMaterials);

    if (!isValidMaterialsMap(importedMaterials)) {
      console.error('Invalid materials format');
      return { success: false, message: 'Invalid materials format' };
    }

    const materialsCopy = cloneData(importedMaterials);
    setMaterials(materialsCopy);
    return { success: true, message: 'Materials imported successfully' };
  };

  // ─── APPEND: merge JSON volumes into existing JSON (used by ImportObjectDialog) ──
  // If a volume with the same name exists, its placements are merged.
  // If a volume matches an existing definition (same type, dims, material, components),
  // its placements are added to the matching volume (automatic placement detection).
  // Otherwise the volume is added as new.
  const handleAppendJsonVolumes = (jsonVolumes) => {
    if (!jsonVolumes || !Array.isArray(jsonVolumes) || jsonVolumes.length === 0) return;
    const currentJson = getOrInitJson();

    // Auto-detect: if an incoming volume matches an existing definition by
    // type+dimensions+material+components, redirect its placements to the
    // existing volume instead of creating a duplicate definition.
    const processedVolumes = jsonVolumes.map(vol => {
      const match = findMatchingVolume(currentJson, vol);
      if (match) {
        debugLog(`Auto-placement: "${vol.name}" matches existing "${match.name}" — merging as placement`);
        // Return a clone with the name changed to the existing volume's name
        // so mergeJsonVolumes recognises it as the same volume and appends placements.
        return { ...structuredClone(vol), name: match.name };
      }
      return vol;
    });

    const merged = mergeJsonVolumes(currentJson, processedVolumes);
    reDeriveFlat(merged);
  };

  const handleUpdateMaterials = (updatedMaterials) => {
    setMaterials(updatedMaterials);
  };

  // ─── LOAD PROJECT: replace everything from JSON ───────────
  const handleLoadProject = (loadedJsonData, loadedMaterials, loadedHitCollections) => {
    const jsonCopy = cloneData(loadedJsonData);
    reDeriveFlat(jsonCopy);
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
    handleAddPlacement,
    handleBatchSetVisibility,
    refreshView,
    handleImportGeometries,
    handleImportMaterials,
    handleUpdateMaterials,
    handleAppendJsonVolumes,
    handleLoadProject
  };
};
