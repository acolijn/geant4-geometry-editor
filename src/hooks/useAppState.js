import { useState, useMemo, useRef, useEffect } from 'react';
import { defaultGeometry, defaultMaterials } from '../utils/defaults';
import { propagateCompoundIdToDescendants } from '../components/geometry-editor/utils/compoundIdPropagator';
import { expandToFlat, isVolumeKey, findFlatIndex } from '../utils/expandToFlat';
import {
  applyUpdateToJson,
  applyWorldUpdateToJson,
  applyAddToJson,
  applyRemoveFromJson,
  applyAddPlacementToJson,
  applyDuplicateVolumeToJson,
  mergeJsonVolumes,
  replaceJsonVolumeDefinition,
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
  const [materials, setMaterials] = useState(defaultMaterials);
  const [selectedGeometry, setSelectedGeometry] = useState(null);
  const [hitCollections, setHitCollections] = useState(['MyHitsCollection']);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  // JSON-primary state: the hierarchical JSON is the source of truth
  const [jsonData, setJsonData] = useState(null);

  // Flat view derived automatically from JSON via useMemo (no manual sync)
  const geometries = useMemo(() => {
    if (!jsonData) return defaultGeometry;
    const flat = expandToFlat(jsonData);
    let updatedVolumes = [...flat.volumes];
    flat.volumes.forEach((volume, index) => {
      if (['assembly', 'union'].includes(volume.type)) {
        if (!volume._compoundId) {
          updatedVolumes[index] = { ...volume, _compoundId: volume.name };
        }
        const compoundId = updatedVolumes[index]._compoundId;
        updatedVolumes = propagateCompoundIdToDescendants(volume.name, compoundId, updatedVolumes);
      }
    });
    return { world: flat.world, volumes: updatedVolumes };
  }, [jsonData]);

  // Post-mutation selection: handlers store a finder function here;
  // the effect runs it after geometries recomputes.
  const pendingSelectionRef = useRef(null);
  useEffect(() => {
    if (pendingSelectionRef.current) {
      const finder = pendingSelectionRef.current;
      pendingSelectionRef.current = null;
      const key = finder(geometries.volumes);
      if (key !== undefined) setSelectedGeometry(key);
    }
  }, [geometries]);

  // ─── Helper: get current JSON (or default if not loaded yet) ──
  const getOrInitJson = () => {
    if (jsonData) return jsonData;
    return {
      world: {
        name: 'World',
        type: 'box',
        material: 'G4_AIR',
        dimensions: { x: 2000, y: 2000, z: 2000 },
      },
      volumes: [],
    };
  };

  // ─── REFRESH: restructure compounds and update JSON ────────
  const refreshView = () => {
    if (jsonData) {
      const fixed = restructureCompounds(structuredClone(jsonData));
      setJsonData(fixed);
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

    setJsonData(newJson);

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
    setJsonData(newJson);

    // Select the newly added volume after geometries recompute
    pendingSelectionRef.current = (volumes) => {
      const newVol = volumes[volumes.length - 1];
      return newVol?._id || null;
    };

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
    setJsonData(newJson);

    // Re-select by name if possible, otherwise deselect
    if (selectedName) {
      pendingSelectionRef.current = (volumes) => {
        const found = volumes.find(v => v.name === selectedName);
        return found?._id || null;
      };
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

    const flatVol = geometries.volumes[flatIndex];
    const vi = flatVol._volumeIndex;
    const newJson = applyAddPlacementToJson(currentJson, geometries.volumes, flatIndex);
    setJsonData(newJson);

    // Select the newly added placement after geometries recompute
    pendingSelectionRef.current = (volumes) => {
      const lastPlacement = volumes.filter(v => v._volumeIndex === vi).pop();
      return lastPlacement?._id || null;
    };
  };

  // ─── EDIT: duplicate a volume definition (independent copy) ─
  const handleDuplicateVolume = (id) => {
    if (id === 'world') return;
    const currentJson = getOrInitJson();

    const flatIndex = findFlatIndex(geometries.volumes, id);
    if (flatIndex < 0) return;

    const newJson = applyDuplicateVolumeToJson(currentJson, geometries.volumes, flatIndex);
    setJsonData(newJson);

    // Select the newly created volume (last in the list)
    pendingSelectionRef.current = (volumes) => {
      const newVol = volumes[volumes.length - 1];
      return newVol?._id || null;
    };
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

    setJsonData(newJson);
  };

  // ─── IMPORT: replace all geometry from hierarchical JSON ──
  const handleImportGeometries = (importData) => {
    debugLog('handleImportGeometries:: Received data:', importData);

    if (!importData || !importData.volumes || !Array.isArray(importData.volumes)) {
      console.error('Invalid geometries format');
      return { success: false, message: 'Invalid geometries format' };
    }

    const jsonCopy = cloneData(importData);
    setJsonData(jsonCopy);
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
    setJsonData(merged);
  };

  // ─── REPLACE: swap volume definitions, keep existing placements ──────────
  // Used by the import conflict dialog "Replace definition, keep placements" option.
  // Conflicting volumes get their definitions replaced; new volumes are appended.
  const handleReplaceJsonVolumes = (incomingVolumes) => {
    if (!incomingVolumes || !Array.isArray(incomingVolumes) || incomingVolumes.length === 0) return;
    let current = getOrInitJson();
    const existingNames = new Set(current.volumes.map(v => v.name));

    for (const vol of incomingVolumes) {
      if (existingNames.has(vol.name)) {
        current = replaceJsonVolumeDefinition(current, vol);
      }
    }

    const newVolumes = incomingVolumes.filter(v => !existingNames.has(v.name));
    if (newVolumes.length > 0) {
      current = mergeJsonVolumes(current, newVolumes);
    }

    setJsonData(current);
  };

  const handleUpdateMaterials = (updatedMaterials) => {
    setMaterials(updatedMaterials);
  };

  // ─── LOAD PROJECT: replace everything from JSON ───────────
  const handleLoadProject = (loadedJsonData, loadedMaterials, loadedHitCollections) => {
    const jsonCopy = cloneData(loadedJsonData);
    setJsonData(jsonCopy);
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
    handleDuplicateVolume,
    handleBatchSetVisibility,
    refreshView,
    handleImportGeometries,
    handleImportMaterials,
    handleUpdateMaterials,
    handleAppendJsonVolumes,
    handleReplaceJsonVolumes,
    handleLoadProject
  };
};
