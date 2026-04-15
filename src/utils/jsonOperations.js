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
import { deriveComponentName } from './expandToFlat.js';

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

  const placementName = flat.name;
  vol.placements = [{
    name: placementName,
    g4name: flat.g4name || placementName,
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
  // Also map component names and component placement names → compound
  const parentLookup = new Map();       // name → compound volume
  const componentParentMap = new Map();  // component placement/name → component name
  for (const vol of json.volumes) {
    if (!compoundTypes.has(vol.type)) continue;
    parentLookup.set(vol.name, vol);
    for (const pl of (vol.placements || [])) {
      if (pl.name) parentLookup.set(pl.name, vol);
    }
    // Also index component names and their placement names
    for (const comp of (vol.components || [])) {
      parentLookup.set(comp.name, vol);
      componentParentMap.set(comp.name, comp.name);
      for (const pl of (comp.placements || [])) {
        if (pl.name) {
          parentLookup.set(pl.name, vol);
          componentParentMap.set(pl.name, comp.name);
        }
      }
    }
  }

  // Collect indices of volumes to move (in reverse order for safe splicing)
  const toMove = [];
  for (let i = json.volumes.length - 1; i >= 0; i--) {
    const vol = json.volumes[i];

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

    // Don't move a compound into itself
    if (targetCompound === vol) continue;

    if (allSameCompound && targetCompound) {
      toMove.push({ volumeIndex: i, targetCompound, vol });
    }
  }

  // Move volumes into their compound's components array
  for (const { volumeIndex, targetCompound, vol } of toMove) {
    if (!targetCompound.components) targetCompound.components = [];
    const component = structuredClone(vol);
    // Resolve parent: if parent matches a component, keep that reference;
    // if it matches the compound itself, set to ''
    for (const pl of (component.placements || [])) {
      const compParent = componentParentMap.get(pl.parent);
      if (compParent) {
        pl.parent = compParent; // nested inside a component
      } else {
        pl.parent = ''; // direct child of compound
      }
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
  if (patch.boolean_operation !== undefined) targetDef.boolean_operation = patch.boolean_operation;
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
    if (patch.mother_volume !== undefined && ci === undefined) {
      // Only reparent for top-level volumes, not for components inside compounds.
      // Component parent references are managed by the compound structure itself.
      targetPlacement.parent = patch.mother_volume;
    }
  }

  // ── Dimensions ──
  const effectiveType = patch.type || flatVol.type || targetDef.type;
  const dimPatch = flatDimsToJson(effectiveType, patch);
  if (Object.keys(dimPatch).length > 0) {
    targetDef.dimensions = { ...(targetDef.dimensions || {}), ...dimPatch };
  }

  // ── Boolean component: move volume into/out of a union's components ──
  const compoundTypes = new Set(['assembly', 'union', 'subtraction']);
  if ('_boolean_parent' in patch || '_is_boolean_component' in patch) {
    const wantBoolean = patch._is_boolean_component !== false && !!patch._boolean_parent;
    const targetUnionName = patch._boolean_parent;

    if (wantBoolean && targetUnionName && ci === undefined) {
      // Top-level volume → move INTO a union's components array
      const unionVol = json.volumes.find(v =>
        v.name === targetUnionName && compoundTypes.has(v.type)
      ) || json.volumes.find(v =>
        compoundTypes.has(v.type) &&
        (v.placements || []).some(pl => pl.name === targetUnionName)
      );

      if (unionVol) {
        if (!unionVol.components) unionVol.components = [];
        const component = structuredClone(json.volumes[vi]);
        component.boolean_operation = patch.boolean_operation || 'union';
        // Set placement parent to '' (direct child of compound)
        for (const pl of (component.placements || [])) {
          pl.parent = '';
        }
        unionVol.components.push(component);
        json.volumes.splice(vi, 1);
      }
    } else if (!wantBoolean && ci !== undefined) {
      // Component inside a compound → move OUT to top-level
      const compound = json.volumes[vi];
      if (compound.components && compound.components[ci]) {
        const comp = structuredClone(compound.components[ci]);
        delete comp.boolean_operation;
        // Set placement parent to the compound's own parent (typically 'World')
        const compoundParent = (compound.placements && compound.placements[0]?.parent) || 'World';
        for (const pl of (comp.placements || [])) {
          pl.parent = compoundParent;
        }
        compound.components.splice(ci, 1);
        json.volumes.push(comp);
      }
    }
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
  // The parent may be a volume name OR a placement name (e.g. "MyAssembly_000").
  let parentVol = null;
  let componentParentName = ''; // parent value to set on the new component's placement
  if (parentName) {
    // 1. Direct match: parent is a compound by volume name
    parentVol = json.volumes.find(v => v.name === parentName && compoundTypes.has(v.type));
    if (!parentVol) {
      // 2. Match by compound placement name
      parentVol = json.volumes.find(v =>
        compoundTypes.has(v.type) &&
        (v.placements || []).some(pl => pl.name === parentName)
      ) || null;
    }
    if (!parentVol) {
      // 3. Parent is a component INSIDE a compound (e.g. mother_volume = "box_xxx_000"
      //    which is a component's flat name inside an assembly).
      //    Also handles instance-derived names (e.g. "box_xxx_002" from placement 2).
      //    Search all compounds' components by name, placement name, or derived name.
      for (const vol of json.volumes) {
        if (!compoundTypes.has(vol.type)) continue;
        for (const comp of (vol.components || [])) {
          // Direct match by component name or placement name
          if (comp.name === parentName) {
            parentVol = vol;
            componentParentName = comp.name;
            break;
          }
          for (const pl of (comp.placements || [])) {
            if (pl.name === parentName) {
              parentVol = vol;
              componentParentName = comp.name;
              break;
            }
          }
          if (parentVol) break;
          // Instance-derived name match: for each placement index, check if
          // deriveComponentName(comp.name, idx) produces the parentName
          for (let pi = 0; pi < (vol.placements || []).length; pi++) {
            const derivedName = deriveComponentName(comp.name, pi);
            if (derivedName === parentName) {
              parentVol = vol;
              componentParentName = comp.name;
              break;
            }
            // Also try component placement names
            for (const pl of (comp.placements || [])) {
              const derivedPlName = deriveComponentName(pl.name, pi);
              if (derivedPlName === parentName) {
                parentVol = vol;
                componentParentName = comp.name;
                break;
              }
            }
            if (parentVol) break;
          }
          if (parentVol) break;
        }
        if (parentVol) break;
      }
    }
  }

  if (parentVol) {
    // Add as a component inside the compound
    if (!parentVol.components) parentVol.components = [];
    const component = { ...newVol };
    delete component.placements;
    component.placements = (newVol.placements || []).map(pl => ({
      ...pl,
      parent: componentParentName, // '' for direct child, component name for nested
    }));

    // For union/subtraction compounds, auto-set the boolean operation
    // so expandCompound correctly marks the component as _is_boolean_component.
    if ((parentVol.type === 'union' || parentVol.type === 'subtraction') && !component.boolean_operation) {
      component.boolean_operation = parentVol.type === 'subtraction' ? 'subtract' : 'union';
    }

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
  const ci = flatVol._componentIndex;
  const jsonVol = json.volumes[vi];

  // ── Component inside a compound (assembly/union/subtraction) ──
  if (ci !== undefined && jsonVol.components && jsonVol.components[ci]) {
    const component = jsonVol.components[ci];
    const compName = component.name;

    // Also remove any child components whose parent references this component
    const namesToRemove = new Set([compName]);
    for (const pl of (component.placements || [])) {
      if (pl.name) namesToRemove.add(pl.name);
    }

    // Walk other components to find nested children
    let changed = true;
    while (changed) {
      changed = false;
      for (const comp of jsonVol.components) {
        if (namesToRemove.has(comp.name)) continue;
        for (const pl of (comp.placements || [])) {
          if (namesToRemove.has(pl.parent)) {
            namesToRemove.add(comp.name);
            changed = true;
            break;
          }
        }
      }
    }

    jsonVol.components = jsonVol.components.filter(c => !namesToRemove.has(c.name));
    return json;
  }

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

export function extractSubtreeFromJson(jsonData, volumeName, materialsMap) {
  if (!jsonData || !jsonData.volumes || !volumeName) return null;

  // volumeName may be a volume name OR a placement name (flat entries use
  // the placement name, e.g. "box_xxx_000").  Resolve to the actual volume.
  let rootVol = jsonData.volumes.find(v => v.name === volumeName);
  if (!rootVol) {
    // Try matching by placement name
    rootVol = jsonData.volumes.find(v =>
      (v.placements || []).some(pl => pl.name === volumeName)
    );
  }

  // Collect all names (volume names AND placement names) that are reachable
  // as children of the root volume.
  const selectedNames = new Set();

  // Helper: seed component names and placement names for a compound volume.
  // Daughters of components are top-level volumes whose parent is the
  // component's placement name, so we must add those names to the set.
  const seedComponents = (vol) => {
    for (const comp of (vol.components || [])) {
      selectedNames.add(comp.name);
      for (const pl of (comp.placements || [])) {
        if (pl.name) selectedNames.add(pl.name);
      }
    }
  };

  if (rootVol) {
    selectedNames.add(rootVol.name);
    for (const pl of (rootVol.placements || [])) {
      if (pl.name) selectedNames.add(pl.name);
    }
    seedComponents(rootVol);
  } else {
    // Fallback: use the supplied name as-is
    selectedNames.add(volumeName);
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
          // If this is a compound, seed its component names too
          seedComponents(vol);
          changed = true;
          break;
        }
      }
    }
  }

  // Clone matching volumes (filter by volume name, not placement names)
  const compoundTypes = new Set(['assembly', 'union', 'subtraction']);
  const volumes = [];
  const isRoot = (vol) => vol === rootVol || vol.name === rootVol?.name;

  for (const vol of jsonData.volumes) {
    if (selectedNames.has(vol.name)) {
      const clone = structuredClone(vol);

      // Root volume: reduce to a single canonical placement at origin.
      // Multi-placement is an import-time concern, not part of the definition.
      if (isRoot(vol)) {
        const canonicalPlacement = {
          name: `${clone.name}_${pad3(0)}`,
          g4name: `${clone.name}_${pad3(0)}`,
          x: 0, y: 0, z: 0,
          rotation: { x: 0, y: 0, z: 0 },
          parent: 'World',
        };
        clone.placements = [canonicalPlacement];

        // Assemblies: material is irrelevant for the definition
        if (compoundTypes.has(clone.type)) {
          delete clone.material;
        }
      } else if (clone.placements && clone.placements.length > 1) {
        // Non-root with multiple placements: keep only first
        clone.placements = [clone.placements[0]];
      }

      volumes.push(clone);
    }
  }

  // Restructure: move misplaced top-level volumes into compound components
  const result = { world: null, volumes };
  restructureCompounds(result);

  // Generate unique internal names for compound components so the saved
  // definition doesn't collide with the source assembly when re-imported
  // into the same scene.
  for (const vol of result.volumes) {
    if (!compoundTypes.has(vol.type) || !vol.components) continue;

    const nameMap = new Map(); // old name → new name (for component names AND placement names)
    const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // Pass 1: build the rename map
    for (let ci = 0; ci < vol.components.length; ci++) {
      const comp = vol.components[ci];
      const baseName = comp.g4name || comp.name;
      const newName = `${baseName}_${uniqueId}_${ci}`;
      nameMap.set(comp.name, newName);
      // Preserve the original identity as g4name
      if (!comp.g4name) comp.g4name = comp.name;
      comp.name = newName;

      // Rename placements
      for (let pi = 0; pi < (comp.placements || []).length; pi++) {
        const pl = comp.placements[pi];
        const newPlName = `${newName}_${pad3(pi)}`;
        if (pl.name) nameMap.set(pl.name, newPlName);
        pl.name = newPlName;
        pl.g4name = newPlName;
      }
    }

    // Pass 2: update parent references within components
    for (const comp of vol.components) {
      for (const pl of (comp.placements || [])) {
        const mapped = nameMap.get(pl.parent);
        if (mapped) pl.parent = mapped;
      }
    }
  }

  // Collect materials used by the subtree
  if (materialsMap && typeof materialsMap === 'object') {
    const usedMaterials = {};
    for (const vol of result.volumes) {
      if (vol.material && materialsMap[vol.material]) {
        usedMaterials[vol.material] = materialsMap[vol.material];
      }
      for (const comp of (vol.components || [])) {
        if (comp.material && materialsMap[comp.material]) {
          usedMaterials[comp.material] = materialsMap[comp.material];
        }
      }
    }
    if (Object.keys(usedMaterials).length > 0) {
      result.materials = usedMaterials;
    }
  }

  return result;
}

// ──────────────────────────────────────────────────────────
// PLACEMENT DETECTION — find an existing volume that matches
// an incoming volume's definition (type, dimensions, material,
// components, _displayGroup).  Used during import/merge to
// add as a new placement instead of duplicating the definition.
// ──────────────────────────────────────────────────────────

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a == b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => deepEqual(a[k], b[k]));
}

function volumeDefinitionMatches(a, b) {
  if (a.type !== b.type) return false;
  if (a.material !== b.material) return false;
  if ((a._displayGroup || '') !== (b._displayGroup || '')) return false;
  if (!deepEqual(a.dimensions, b.dimensions)) return false;
  // Compare components for compounds
  const aComps = a.components || [];
  const bComps = b.components || [];
  if (aComps.length !== bComps.length) return false;
  for (let i = 0; i < aComps.length; i++) {
    if (aComps[i].type !== bComps[i].type) return false;
    if (aComps[i].material !== bComps[i].material) return false;
    if (!deepEqual(aComps[i].dimensions, bComps[i].dimensions)) return false;
  }
  return true;
}

/**
 * Find an existing volume in JSON whose definition matches the incoming volume.
 * Returns the matching volume object, or null if no match.
 */
export function findMatchingVolume(jsonData, incomingVolume) {
  if (!jsonData?.volumes) return null;
  for (const vol of jsonData.volumes) {
    if (vol.name === incomingVolume.name) continue; // same-name handled separately
    if (volumeDefinitionMatches(vol, incomingVolume)) return vol;
  }
  return null;
}

// ──────────────────────────────────────────────────────────
// ADD PLACEMENT — add a new placement of an existing volume
// ──────────────────────────────────────────────────────────

export function applyAddPlacementToJson(jsonData, flatVolumes, flatIndex) {
  const json = structuredClone(jsonData);
  const flatVol = flatVolumes[flatIndex];

  if (flatVol._volumeIndex === undefined) {
    debugWarn('applyAddPlacementToJson: volume has no _volumeIndex');
    return json;
  }

  const vi = flatVol._volumeIndex;
  const jsonVol = json.volumes[vi];
  if (!jsonVol || !jsonVol.placements) return json;

  // Determine next placement index for naming.
  // Use the volume definition name, stripping any trailing _NNN suffix
  // so that e.g. clicking on R11410_000 produces R11410_002, not R11410_000_002.
  let maxIdx = -1;
  for (const pl of jsonVol.placements) {
    const match = pl.name?.match(/_(\d+)$/);
    if (match) maxIdx = Math.max(maxIdx, parseInt(match[1], 10));
  }
  if (maxIdx < 0) maxIdx = jsonVol.placements.length - 1;
  const newIdx = maxIdx + 1;
  const rawName = jsonVol.g4name || jsonVol.name;
  const baseName = rawName.replace(/_\d+$/, '');
  const newPlName = `${baseName}_${pad3(newIdx)}`;

  // Copy position/rotation/parent from the source placement, offset slightly
  const sourcePl = jsonVol.placements[flatVol._placementIndex] || jsonVol.placements[0];
  const newPlacement = {
    name: newPlName,
    g4name: newPlName,
    x: (sourcePl.x || 0) + 50,
    y: (sourcePl.y || 0),
    z: (sourcePl.z || 0),
    rotation: sourcePl.rotation
      ? { ...sourcePl.rotation }
      : { x: 0, y: 0, z: 0 },
    parent: sourcePl.parent || 'World',
  };

  jsonVol.placements.push(newPlacement);
  return json;
}

// ──────────────────────────────────────────────────────────
// DUPLICATE VOLUME — deep copy a volume definition with a new name.
// Creates a fully independent copy (new definition + single placement).
// For compounds, all components are cloned and internal references updated.
// ──────────────────────────────────────────────────────────

export function applyDuplicateVolumeToJson(jsonData, flatVolumes, flatIndex) {
  const json = structuredClone(jsonData);
  const flatVol = flatVolumes[flatIndex];

  if (flatVol._volumeIndex === undefined) {
    debugWarn('applyDuplicateVolumeToJson: volume has no _volumeIndex');
    return json;
  }

  const vi = flatVol._volumeIndex;
  const original = json.volumes[vi];
  if (!original) return json;

  // Generate a unique name: "VolName_copy", "VolName_copy2", etc.
  const allNames = new Set(json.volumes.map(v => v.name));
  let newName = `${original.name}_copy`;
  let suffix = 2;
  while (allNames.has(newName)) {
    newName = `${original.name}_copy${suffix++}`;
  }

  const clone = structuredClone(original);
  const oldName = clone.name;
  clone.name = newName;
  clone.g4name = newName;
  if (clone._compoundId === oldName) clone._compoundId = newName;

  // Keep only one placement, offset slightly, and rename it
  if (clone.placements && clone.placements.length > 0) {
    const srcPl = clone.placements[0];
    clone.placements = [{
      ...srcPl,
      name: `${newName}_000`,
      g4name: `${newName}_000`,
      x: (srcPl.x || 0) + 50,
    }];
  }

  // For compounds: update internal component references from old name to new name
  if (clone.components) {
    const nameMap = new Map();
    nameMap.set(oldName, newName);

    // Build rename map for all components
    for (const comp of clone.components) {
      const oldCompName = comp.name;
      const newCompName = oldCompName.replace(oldName, newName);
      if (newCompName !== oldCompName) {
        nameMap.set(oldCompName, newCompName);
        comp.name = newCompName;
        if (comp.g4name === oldCompName) comp.g4name = newCompName;
      }
      // Rename placements inside components
      for (const pl of (comp.placements || [])) {
        if (pl.name) {
          const newPlName = pl.name.replace(oldName, newName);
          if (newPlName !== pl.name) {
            nameMap.set(pl.name, newPlName);
            pl.name = newPlName;
            if (pl.g4name === pl.name) pl.g4name = newPlName;
          }
        }
      }
    }

    // Update parent references inside components
    for (const comp of clone.components) {
      for (const pl of (comp.placements || [])) {
        if (pl.parent && nameMap.has(pl.parent)) {
          pl.parent = nameMap.get(pl.parent);
        }
      }
    }
  }

  json.volumes.push(clone);
  return json;
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

  // Placement rename map — built up as we process each incoming volume.
  // When a placement is merged under a new name (e.g. Hubba_000 → Hubba_001),
  // daughters processed later can update their parent references.
  const placementRenameMap = new Map();

  for (const incoming of incomingVolumes) {
    const clone = structuredClone(incoming);

    // Apply accumulated placement renames to parent references
    for (const pl of (clone.placements || [])) {
      const renamed = placementRenameMap.get(pl.parent);
      if (renamed) pl.parent = renamed;
    }
    for (const comp of (clone.components || [])) {
      for (const pl of (comp.placements || [])) {
        const renamed = placementRenameMap.get(pl.parent);
        if (renamed) pl.parent = renamed;
      }
    }

    const existingIdx = existingByName.get(clone.name);

    if (existingIdx !== undefined) {
      // Volume already exists — merge placements (add new instances)
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
          const newPlName = `${existing.name}_${pad3(maxIdx)}`;
          if (pl.name && pl.name !== newPlName) {
            placementRenameMap.set(pl.name, newPlName);
          }
          pl.name = newPlName;
          pl.g4name = newPlName;
          existingPlacements.push(pl);
        } else {
          // Map the incoming name to the existing duplicate so daughters resolve
          const dup = existingPlacements.find(ep =>
            ep.x === pl.x && ep.y === pl.y && ep.z === pl.z &&
            ep.parent === pl.parent
          );
          if (dup && pl.name && pl.name !== dup.name) {
            placementRenameMap.set(pl.name, dup.name);
          }
        }
      }
      existing.placements = existingPlacements;
    } else {
      // New volume — add it
      json.volumes.push(clone);
      existingByName.set(clone.name, json.volumes.length - 1);
    }
  }

  return json;
}
