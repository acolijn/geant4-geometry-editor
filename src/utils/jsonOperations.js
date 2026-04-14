/**
 * jsonOperations.js
 *
 * Pure functions that apply flat-state edits to the hierarchical JSON data structure.
 * Every edit in the geometry editor calls one of these to mutate jsonData,
 * after which expandToFlat re-derives the flat view.
 *
 * Property mapping between flat and JSON:
 *   flat.position.{x,y,z}     ↔  placement.{x,y,z}
 *   flat.rotation.{x,y,z}     ↔  placement.rotation.{x,y,z}
 *   flat.mother_volume         ↔  placement.parent
 *   flat.name                  ↔  placement.name / volume.name
 *   flat.size / flat.radius …  ↔  volume.dimensions.*
 *   flat.material, type, …    ↔  volume.material, type, …
 */

import { debugWarn } from './logger.js';

// Zero-padded 3-digit index for placement naming
const pad3 = (n) => String(n).padStart(3, '0');

// ──────────────────────────────────────────────────────────
// Dimension mapping  (flat → JSON)  — inverse of expandToFlat.setDimensions
// ──────────────────────────────────────────────────────────

function flatDimsToJson(type, patch) {
  const dims = {};
  switch (type) {
    case 'box':
      if (patch.size) {
        if (patch.size.x !== undefined) dims.x = patch.size.x;
        if (patch.size.y !== undefined) dims.y = patch.size.y;
        if (patch.size.z !== undefined) dims.z = patch.size.z;
      }
      break;
    case 'cylinder':
      if (patch.radius !== undefined) dims.radius = patch.radius;
      if (patch.height !== undefined) dims.height = patch.height;
      if (patch.innerRadius !== undefined) dims.inner_radius = patch.innerRadius;
      break;
    case 'sphere':
      if (patch.radius !== undefined) dims.radius = patch.radius;
      break;
    case 'ellipsoid':
      if (patch.xRadius !== undefined) dims.x_radius = patch.xRadius;
      if (patch.yRadius !== undefined) dims.y_radius = patch.yRadius;
      if (patch.zRadius !== undefined) dims.z_radius = patch.zRadius;
      if (patch.zcut1 !== undefined) dims.zcut1 = patch.zcut1;
      if (patch.zcut2 !== undefined) dims.zcut2 = patch.zcut2;
      break;
    case 'trapezoid':
      if (patch.dx1 !== undefined) dims.dx1 = patch.dx1;
      if (patch.dx2 !== undefined) dims.dx2 = patch.dx2;
      if (patch.dy1 !== undefined) dims.dy1 = patch.dy1;
      if (patch.dy2 !== undefined) dims.dy2 = patch.dy2;
      if (patch.dz !== undefined) dims.dz = patch.dz;
      break;
    case 'torus':
      if (patch.majorRadius !== undefined) dims.major_radius = patch.majorRadius;
      if (patch.minorRadius !== undefined) dims.minor_radius = patch.minorRadius;
      break;
    case 'polycone':
    case 'polyhedra':
      if (patch.zSections) {
        dims.z = patch.zSections.map(s => s.z);
        dims.rmin = patch.zSections.map(s => s.rMin);
        dims.rmax = patch.zSections.map(s => s.rMax);
      }
      if (type === 'polyhedra' && patch.numSides !== undefined) {
        dims.numSides = patch.numSides;
      }
      break;
    default:
      break;
  }
  return dims;
}

// ──────────────────────────────────────────────────────────
// Flat → JSON volume conversion  (used by add)
// ──────────────────────────────────────────────────────────

export function flatToJsonVolume(flat) {
  const vol = {
    name: flat.name,
    type: flat.type,
    material: flat.material,
  };

  if (flat.g4name) vol.g4name = flat.g4name;
  if (flat.visible !== undefined) vol.visible = flat.visible;
  if (flat.wireframe !== undefined) vol.wireframe = flat.wireframe;
  if (flat.hitsCollectionName) vol.hitsCollectionName = flat.hitsCollectionName;
  if (flat._displayGroup) vol._displayGroup = flat._displayGroup;

  const dims = flatDimsToJson(flat.type, flat);
  if (Object.keys(dims).length > 0) vol.dimensions = dims;

  const placementName = `${flat.name}_${pad3(0)}`;
  vol.placements = [{
    name: placementName,
    g4name: placementName,
    x: flat.position?.x || 0,
    y: flat.position?.y || 0,
    z: flat.position?.z || 0,
    rotation: flat.rotation ? { ...flat.rotation } : { x: 0, y: 0, z: 0 },
    parent: flat.mother_volume || 'World',
  }];

  // Compound types need a components array
  if (flat.type === 'assembly' || flat.type === 'union' || flat.type === 'subtraction') {
    vol.components = [];
    if (flat._compoundId) vol._compoundId = flat._compoundId;
  }

  return vol;
}

// ──────────────────────────────────────────────────────────
// Cascade parent name rename
// ──────────────────────────────────────────────────────────

function cascadeParentRename(json, oldName, newName) {
  for (const vol of json.volumes) {
    for (const pl of (vol.placements || [])) {
      if (pl.parent === oldName) pl.parent = newName;
    }
    for (const comp of (vol.components || [])) {
      for (const pl of (comp.placements || [])) {
        if (pl.parent === oldName) pl.parent = newName;
      }
    }
  }
}

// ──────────────────────────────────────────────────────────
// RESTRUCTURE — move top-level volumes that reference a compound
// (by volume name or placement name) into that compound's components.
// This fixes data created before the applyAddToJson compound-aware fix.
// ──────────────────────────────────────────────────────────

export function restructureCompounds(json) {
  const compoundTypes = new Set(['assembly', 'union', 'subtraction']);

  // Build a map: placement name OR volume name → compound volume object
  const parentLookup = new Map();
  for (const vol of json.volumes) {
    if (!compoundTypes.has(vol.type)) continue;
    parentLookup.set(vol.name, vol);
    for (const pl of (vol.placements || [])) {
      if (pl.name) parentLookup.set(pl.name, vol);
    }
  }

  // Collect indices of volumes to move (in reverse order for safe splicing)
  const toMove = [];
  for (let i = json.volumes.length - 1; i >= 0; i--) {
    const vol = json.volumes[i];
    if (compoundTypes.has(vol.type)) continue; // skip compounds themselves

    // Check if ALL placements reference the same compound
    const placements = vol.placements || [];
    if (placements.length === 0) continue;

    let targetCompound = null;
    let allSameCompound = true;
    for (const pl of placements) {
      const compound = parentLookup.get(pl.parent);
      if (!compound) { allSameCompound = false; break; }
      if (!targetCompound) targetCompound = compound;
      else if (targetCompound !== compound) { allSameCompound = false; break; }
    }

    if (allSameCompound && targetCompound) {
      toMove.push({ volumeIndex: i, targetCompound, vol });
    }
  }

  // Move volumes into their compound's components array
  for (const { volumeIndex, targetCompound, vol } of toMove) {
    if (!targetCompound.components) targetCompound.components = [];
    const component = structuredClone(vol);
    // Set placement parent to '' (relative to compound)
    for (const pl of (component.placements || [])) {
      pl.parent = '';
    }
    targetCompound.components.push(component);
    json.volumes.splice(volumeIndex, 1);
  }

  return json;
}

// ──────────────────────────────────────────────────────────
// UPDATE — apply a flat patch to JSON
// ──────────────────────────────────────────────────────────

export function applyUpdateToJson(jsonData, flatVolumes, flatIndex, patch) {
  const json = structuredClone(jsonData);
  const flatVol = flatVolumes[flatIndex];

  if (flatVol._volumeIndex === undefined) {
    debugWarn('applyUpdateToJson: volume has no _volumeIndex, cannot map to JSON');
    return json;
  }

  const vi = flatVol._volumeIndex;
  const pi = flatVol._placementIndex;
  const ci = flatVol._componentIndex;

  const jsonVol = json.volumes[vi];
  const isMultiPlacement = jsonVol.placements && jsonVol.placements.length > 1;

  // Determine the target definition and placement
  let targetDef, targetPlacement;
  if (ci !== undefined && jsonVol.components) {
    targetDef = jsonVol.components[ci];
    targetPlacement = targetDef.placements?.[0];
  } else {
    targetDef = jsonVol;
    targetPlacement = jsonVol.placements?.[pi];
  }

  const oldName = flatVol.name;

  // ── Volume-level (definition) properties ──
  if (patch.material !== undefined) targetDef.material = patch.material;
  if (patch.type !== undefined) targetDef.type = patch.type;
  if (patch.visible !== undefined) targetDef.visible = patch.visible;
  if (patch.wireframe !== undefined) targetDef.wireframe = patch.wireframe;
  if ('hitsCollectionName' in patch) {
    if (patch.hitsCollectionName) targetDef.hitsCollectionName = patch.hitsCollectionName;
    else delete targetDef.hitsCollectionName;
  }
  if ('isActive' in patch) {
    if (patch.isActive) targetDef.isActive = patch.isActive;
    else delete targetDef.isActive;
  }

  // ── Name ──
  if (patch.name !== undefined && patch.name !== oldName) {
    if (!isMultiPlacement || ci !== undefined) {
      targetDef.name = patch.name;
    }
    if (targetPlacement) targetPlacement.name = patch.name;
    if (patch.g4name === undefined) {
      if (targetDef.g4name === oldName || !targetDef.g4name) {
        targetDef.g4name = patch.name;
      }
    }
    cascadeParentRename(json, oldName, patch.name);
  }
  if (patch.g4name !== undefined) {
    if (!isMultiPlacement || ci !== undefined) targetDef.g4name = patch.g4name;
    if (targetPlacement) targetPlacement.g4name = patch.g4name;
  }

  // ── Placement-level properties ──
  if (targetPlacement) {
    if (patch.position) {
      if (patch.position.x !== undefined) targetPlacement.x = patch.position.x;
      if (patch.position.y !== undefined) targetPlacement.y = patch.position.y;
      if (patch.position.z !== undefined) targetPlacement.z = patch.position.z;
    }
    if (patch.rotation) {
      targetPlacement.rotation = {
        ...(targetPlacement.rotation || { x: 0, y: 0, z: 0 }),
        ...patch.rotation,
      };
    }
    if (patch.mother_volume !== undefined) {
      targetPlacement.parent = patch.mother_volume;
    }
  }

  // ── Dimensions ──
  const effectiveType = patch.type || flatVol.type || targetDef.type;
  const dimPatch = flatDimsToJson(effectiveType, patch);
  if (Object.keys(dimPatch).length > 0) {
    targetDef.dimensions = { ...(targetDef.dimensions || {}), ...dimPatch };
  }

  return json;
}

// ──────────────────────────────────────────────────────────
// UPDATE WORLD
// ──────────────────────────────────────────────────────────

export function applyWorldUpdateToJson(jsonData, currentWorld, patch) {
  const json = structuredClone(jsonData);
  if (!json.world) json.world = {};

  const oldName = currentWorld?.name || json.world.name || 'World';

  if (patch.name !== undefined) json.world.name = patch.name;
  if (patch.material !== undefined) json.world.material = patch.material;
  if (patch.type !== undefined) json.world.type = patch.type;

  if (patch.size) {
    json.world.dimensions = {
      ...(json.world.dimensions || {}),
      x: patch.size.x !== undefined ? patch.size.x : json.world.dimensions?.x,
      y: patch.size.y !== undefined ? patch.size.y : json.world.dimensions?.y,
      z: patch.size.z !== undefined ? patch.size.z : json.world.dimensions?.z,
    };
  }

  if (patch.name && patch.name !== oldName) {
    cascadeParentRename(json, oldName, patch.name);
  }

  return json;
}

// ──────────────────────────────────────────────────────────
// ADD — insert a new flat volume into JSON
// If the parent is a compound type (assembly/union/subtraction),
// the volume is added as a component inside that compound.
// Otherwise it is added as a top-level volume.
// ──────────────────────────────────────────────────────────

export function applyAddToJson(jsonData, flatNewVolume) {
  const json = structuredClone(jsonData);
  const newVol = flatToJsonVolume(flatNewVolume);
  const parentName = flatNewVolume.mother_volume;
  const compoundTypes = new Set(['assembly', 'union', 'subtraction']);

  // Check if parent is a compound volume.
  // The parent may be a volume name OR a placement name (e.g. "MyAssembly_0").
  // Try matching by volume name first, then by any placement name.
  let parentVol = null;
  if (parentName) {
    parentVol = json.volumes.find(v => v.name === parentName && compoundTypes.has(v.type));
    if (!parentVol) {
      parentVol = json.volumes.find(v =>
        compoundTypes.has(v.type) &&
        (v.placements || []).some(pl => pl.name === parentName)
      ) || null;
    }
  }

  if (parentVol) {
    // Add as a component inside the compound
    if (!parentVol.components) parentVol.components = [];
    // For components, the placement parent should be empty (relative to assembly)
    const component = { ...newVol };
    delete component.placements;
    component.placements = (newVol.placements || []).map(pl => ({
      ...pl,
      parent: '',
    }));
    parentVol.components.push(component);
  } else {
    // Standard top-level volume
    json.volumes.push(newVol);
  }

  return json;
}

// ──────────────────────────────────────────────────────────
// REMOVE — delete volume (or single placement) from JSON
// ──────────────────────────────────────────────────────────

export function applyRemoveFromJson(jsonData, flatVolumes, flatIndex) {
  const json = structuredClone(jsonData);
  const flatVol = flatVolumes[flatIndex];

  if (flatVol._volumeIndex === undefined) {
    debugWarn('applyRemoveFromJson: volume has no _volumeIndex');
    return json;
  }

  const vi = flatVol._volumeIndex;
  const pi = flatVol._placementIndex;
  const jsonVol = json.volumes[vi];

  if (jsonVol.placements && jsonVol.placements.length > 1) {
    // Multi-placement: remove only this placement
    jsonVol.placements.splice(pi, 1);
  } else {
    // Single placement: remove volume + descendants
    const namesToRemove = new Set();
    namesToRemove.add(jsonVol.name);
    for (const pl of (jsonVol.placements || [])) {
      if (pl.name) namesToRemove.add(pl.name);
    }

    // Walk descendants transitively
    let changed = true;
    while (changed) {
      changed = false;
      for (const vol of json.volumes) {
        if (namesToRemove.has(vol.name)) continue;
        for (const pl of (vol.placements || [])) {
          if (namesToRemove.has(pl.parent)) {
            namesToRemove.add(vol.name);
            changed = true;
            break;
          }
        }
      }
    }

    json.volumes = json.volumes.filter(v => !namesToRemove.has(v.name));
  }

  return json;
}

// ──────────────────────────────────────────────────────────
// EXTRACT SUBTREE — extract a volume and its descendants from JSON
// Used by "Save as Object" to pull a subtree without flat→JSON reconstruction.
// ──────────────────────────────────────────────────────────

export function extractSubtreeFromJson(jsonData, volumeName) {
  if (!jsonData || !jsonData.volumes || !volumeName) return null;

  // Collect all names (volume names AND placement names) that are reachable
  // as children of volumeName. A JSON volume is a child if any of its
  // placements has parent matching a name in the set.
  const selectedNames = new Set([volumeName]);

  // Also add all placement names of the root volume
  const rootVol = jsonData.volumes.find(v => v.name === volumeName);
  if (rootVol) {
    for (const pl of (rootVol.placements || [])) {
      if (pl.name) selectedNames.add(pl.name);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const vol of jsonData.volumes) {
      if (selectedNames.has(vol.name)) continue;
      for (const pl of (vol.placements || [])) {
        if (selectedNames.has(pl.parent)) {
          selectedNames.add(vol.name);
          // Also add this volume's placement names so grandchildren can be found
          for (const vpl of (vol.placements || [])) {
            if (vpl.name) selectedNames.add(vpl.name);
          }
          changed = true;
          break;
        }
      }
      // Also check components for compound volumes
      for (const comp of (vol.components || [])) {
        if (selectedNames.has(comp.name)) continue;
        for (const pl of (comp.placements || [])) {
          if (selectedNames.has(pl.parent)) {
            selectedNames.add(comp.name);
            changed = true;
            break;
          }
        }
      }
    }
  }

  // Clone matching volumes (filter by volume name, not placement names)
  const volumes = [];
  for (const vol of jsonData.volumes) {
    if (selectedNames.has(vol.name)) {
      volumes.push(structuredClone(vol));
    }
  }

  // Restructure: move misplaced top-level volumes into compound components
  const result = { world: null, volumes };
  restructureCompounds(result);

  return result;
}

// ──────────────────────────────────────────────────────────
// MERGE VOLUMES — merge imported JSON volumes into existing JSON.
// Compound types (assembly/union/subtraction) with the same name:
//   → merge placements (add new instances of the compound).
// Standard volumes with the same name:
//   → rename to make unique, updating internal parent references.
// New volumes: add as-is.
// ──────────────────────────────────────────────────────────

export function mergeJsonVolumes(jsonData, incomingVolumes) {
  const json = structuredClone(jsonData);
  if (!incomingVolumes || !Array.isArray(incomingVolumes)) return json;

  // Index existing volumes by name for fast lookup
  const existingByName = new Map();
  json.volumes.forEach((vol, idx) => existingByName.set(vol.name, idx));

  // Also index incoming volumes by name so we can detect internal references
  const incomingNames = new Set(incomingVolumes.map(v => v.name));

  // Phase 1: Build a rename map for standard volumes that collide with existing names
  const renameMap = new Map(); // oldName → newName
  const compoundTypes = new Set(['assembly', 'union', 'subtraction']);

  for (const incoming of incomingVolumes) {
    if (existingByName.has(incoming.name) && !compoundTypes.has(incoming.type)) {
      // Standard volume name collision — generate a unique name
      let suffix = 1;
      let newName = `${incoming.name}_${suffix}`;
      while (existingByName.has(newName) || incomingNames.has(newName) || renameMap.has(newName)) {
        suffix++;
        newName = `${incoming.name}_${suffix}`;
      }
      renameMap.set(incoming.name, newName);
    }
  }

  // Phase 2: Apply renames and add/merge volumes
  for (const incoming of incomingVolumes) {
    const clone = structuredClone(incoming);

    // Apply rename to this volume if needed
    const renamedName = renameMap.get(clone.name);
    if (renamedName) {
      clone.name = renamedName;
      if (clone.g4name) clone.g4name = renamedName;
      // Update placement names too
      for (const pl of (clone.placements || [])) {
        if (pl.name === incoming.name) pl.name = renamedName;
        if (pl.g4name === incoming.name) pl.g4name = renamedName;
      }
    }

    // Update parent references that point to renamed incoming volumes
    for (const pl of (clone.placements || [])) {
      const parentRenamed = renameMap.get(pl.parent);
      if (parentRenamed) {
        pl.parent = parentRenamed;
      }
    }
    // Same for components
    for (const comp of (clone.components || [])) {
      for (const pl of (comp.placements || [])) {
        const parentRenamed = renameMap.get(pl.parent);
        if (parentRenamed) {
          pl.parent = parentRenamed;
        }
      }
    }

    const existingIdx = existingByName.get(clone.name);

    if (existingIdx !== undefined && compoundTypes.has(clone.type)) {
      // Compound volume already exists — merge placements
      const existing = json.volumes[existingIdx];
      const existingPlacements = existing.placements || [];

      // Find the highest existing placement index for naming
      let maxIdx = -1;
      for (const ep of existingPlacements) {
        const match = ep.name?.match(/_(\d+)$/);
        if (match) maxIdx = Math.max(maxIdx, parseInt(match[1], 10));
      }
      if (maxIdx < 0) maxIdx = existingPlacements.length - 1;

      for (const pl of (clone.placements || [])) {
        const isDuplicate = existingPlacements.some(ep =>
          ep.x === pl.x && ep.y === pl.y && ep.z === pl.z &&
          ep.parent === pl.parent
        );
        if (!isDuplicate) {
          maxIdx++;
          const placementName = `${existing.name}_${pad3(maxIdx)}`;
          pl.name = placementName;
          pl.g4name = placementName;
          existingPlacements.push(pl);
        }
      }
      existing.placements = existingPlacements;
    } else {
      // New volume (or renamed) — add it
      json.volumes.push(clone);
      existingByName.set(clone.name, json.volumes.length - 1);
    }
  }

  return json;
}
