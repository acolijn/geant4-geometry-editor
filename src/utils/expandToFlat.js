/**
 * expandToFlat.js
 * 
 * Pure function that derives a flat volume array from hierarchical JSON.
 * This is the forward-only replacement for jsonToGeometry — no inverse needed
 * because the JSON is the primary state.
 * 
 * Input:  { world, volumes, materials } (JSON format, as stored/loaded)
 * Output: { world, volumes[] }           (flat format, for rendering & tree)
 */

import { debugLog, debugWarn } from './logger.js';

// ---------------------------------------------------------------------------
// Stable key helpers
// ---------------------------------------------------------------------------

/**
 * Build a stable key for a flat volume entry.
 * Format: vol-{vi}-pl-{pi}  or  vol-{vi}-pl-{pi}-c-{ci}  or  vol-{vi}-pl-{pi}-c-{ci}-sc-{sci}
 */
export function buildVolumeKey(vi, pi, ci, sci) {
  let key = `vol-${vi}-pl-${pi}`;
  if (ci !== undefined) key += `-c-${ci}`;
  if (sci !== undefined) key += `-sc-${sci}`;
  return key;
}

/**
 * Check whether a selection key refers to a volume (not 'world').
 */
export function isVolumeKey(key) {
  return typeof key === 'string' && key.startsWith('vol-');
}

/**
 * Find the index of a flat volume by its _id.
 * Returns -1 if not found.
 */
export function findFlatIndex(volumes, key) {
  return volumes.findIndex(v => v._id === key);
}

/**
 * Expand hierarchical JSON geometry into a flat volume array.
 * Each placement becomes a separate entry. Assemblies/booleans are expanded
 * so that both the compound entry and its components appear as flat volumes.
 *
 * @param {Object} json - The JSON geometry { world, volumes, materials }
 * @returns {Object} { world, volumes[] } in flat internal format
 */
export function expandToFlat(json) {
  if (!json) return { world: defaultWorld(), volumes: [] };

  const world = json.world ? expandWorld(json.world) : defaultWorld();
  const flatVolumes = [];

  if (json.volumes && Array.isArray(json.volumes)) {
    json.volumes.forEach((volume, volumeIndex) => {
      if (!volume) return;
      if (volume.type === 'assembly' || volume.type === 'union' || volume.type === 'subtraction') {
        expandCompound(volume, volumeIndex, flatVolumes);
      } else {
        expandStandard(volume, volumeIndex, flatVolumes);
      }
    });
  }

  return { world, volumes: flatVolumes };
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

function defaultWorld() {
  return {
    type: 'box',
    name: 'World',
    material: 'G4_AIR',
    size: { x: 2000, y: 2000, z: 2000 },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  };
}

function expandWorld(w) {
  return {
    ...w,
    size: w.dimensions || w.size || { x: 1000, y: 1000, z: 1000 },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  };
}

// ---------------------------------------------------------------------------
// Standard volumes (one definition → N placements → N flat entries)
// ---------------------------------------------------------------------------

function expandStandard(volume, volumeIndex, flatVolumes) {
  if (!volume.placements || !Array.isArray(volume.placements)) {
    debugWarn(`expandStandard:: volume ${volume.name} has no placements`);
    return;
  }

  volume.placements.forEach((placement, placementIndex) => {
    if (!placement) return;
    const flat = {
      _id: buildVolumeKey(volumeIndex, placementIndex),
      name: placement.name || volume.name,
      g4name: placement.g4name || volume.g4name || volume.name,
      type: volume.type,
      material: volume.material,
      position: { x: placement.x || 0, y: placement.y || 0, z: placement.z || 0 },
      rotation: placement.rotation
        ? { x: placement.rotation.x || 0, y: placement.rotation.y || 0, z: placement.rotation.z || 0 }
        : { x: 0, y: 0, z: 0 },
      mother_volume: placement.parent || 'World',
      // Back-references to JSON source
      _volumeIndex: volumeIndex,
      _placementIndex: placementIndex
    };

    // Copy optional fields
    if (volume._compoundId !== undefined) flat._compoundId = volume._compoundId;
    if (volume._componentId !== undefined) flat._componentId = volume._componentId;
    if (volume.hitsCollectionName !== undefined) flat.hitsCollectionName = volume.hitsCollectionName;
    if (volume._displayGroup !== undefined) flat._displayGroup = volume._displayGroup;
    // Per-placement visibility takes precedence over volume-level visibility
    if (placement.visible !== undefined) flat.visible = placement.visible;
    else if (volume.visible !== undefined) flat.visible = volume.visible;
    if (volume.wireframe !== undefined) flat.wireframe = volume.wireframe;
    if (volume.boolean_operation !== undefined) flat.boolean_operation = volume.boolean_operation;
    if (volume._is_boolean_component !== undefined) flat._is_boolean_component = volume._is_boolean_component;
    if (volume._boolean_parent !== undefined) flat._boolean_parent = volume._boolean_parent;

    // Map dimensions from JSON format to internal flat format
    setDimensions(flat, volume);

    flatVolumes.push(flat);
  });
}

// ---------------------------------------------------------------------------
// Compound volumes (assembly / union / subtraction)
// ---------------------------------------------------------------------------

function expandCompound(volume, volumeIndex, flatVolumes) {
  if (!volume.placements || !Array.isArray(volume.placements)) {
    debugWarn(`expandCompound:: compound ${volume.name} has no placements`);
    return;
  }

  // Shared compound ID for grouping all instances
  const sharedCompoundId = volume._compoundId || volume.g4name || volume.name || 'compound';

  volume.placements.forEach((placement, placementIndex) => {
    const instanceId = `inst_${placementIndex}`;
    const compoundName = placement.name || volume.name;

    // 1. The compound entry itself (assembly/union/subtraction header)
    const compoundFlat = {
      _id: buildVolumeKey(volumeIndex, placementIndex),
      name: compoundName,
      g4name: placement.g4name || volume.g4name || volume.name,
      type: volume.type,
      material: volume.material || undefined,
      position: { x: placement.x || 0, y: placement.y || 0, z: placement.z || 0 },
      rotation: placement.rotation
        ? { x: placement.rotation.x || 0, y: placement.rotation.y || 0, z: placement.rotation.z || 0 }
        : { x: 0, y: 0, z: 0 },
      mother_volume: placement.parent || 'World',
      _compoundId: sharedCompoundId,
      _componentId: volume._componentId,
      _instanceId: instanceId,
      _volumeIndex: volumeIndex,
      _placementIndex: placementIndex
    };

    if (volume.hitsCollectionName !== undefined) compoundFlat.hitsCollectionName = volume.hitsCollectionName;
    if (volume._displayGroup !== undefined) compoundFlat._displayGroup = volume._displayGroup;
    // Per-placement visibility takes precedence over volume-level visibility
    if (placement.visible !== undefined) compoundFlat.visible = placement.visible;
    else if (volume.visible !== undefined) compoundFlat.visible = volume.visible;

    flatVolumes.push(compoundFlat);

    // 2. Expand components (one set per placement)
    if (volume.components && Array.isArray(volume.components)) {
      const seenComponents = new Set();

      volume.components.forEach((component, componentIndex) => {
        // Deduplicate by _componentId
        const componentKey = component._componentId || `${component.name || 'unnamed'}:${component.type || 'unknown'}`;
        if (seenComponents.has(componentKey)) return;
        seenComponents.add(componentKey);

        const compPlacement = (component.placements && component.placements[0]) || { x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } };

        // Derive component name for this instance
        const componentName = deriveComponentName(component.name || compPlacement.name, placementIndex);

        // Determine mother_volume: if parent is empty, use the compound name
        const parentName = compPlacement.parent;
        let motherVolume;
        if (!parentName || parentName === '') {
          motherVolume = compoundName;
        } else {
          motherVolume = deriveComponentName(parentName, placementIndex);
        }

        const componentFlat = {
          _id: buildVolumeKey(volumeIndex, placementIndex, componentIndex),
          name: componentName,
          g4name: component.g4name || component.name || componentName,
          type: component.type,
          material: component.material || undefined,
          position: { x: compPlacement.x || 0, y: compPlacement.y || 0, z: compPlacement.z || 0 },
          rotation: compPlacement.rotation
            ? { x: compPlacement.rotation.x || 0, y: compPlacement.rotation.y || 0, z: compPlacement.rotation.z || 0 }
            : { x: 0, y: 0, z: 0 },
          mother_volume: motherVolume,
          _compoundId: sharedCompoundId,
          _componentId: component._componentId || component.g4name || component.name,
          _instanceId: instanceId,
          _volumeIndex: volumeIndex,
          _placementIndex: placementIndex,
          _componentIndex: componentIndex
        };

        if (component.boolean_operation) {
          componentFlat.boolean_operation = component.boolean_operation;
          componentFlat._is_boolean_component = true;
          componentFlat._boolean_parent = compoundName;
        }
        if (component.hitsCollectionName !== undefined) componentFlat.hitsCollectionName = component.hitsCollectionName;
        if (component._displayGroup !== undefined) componentFlat._displayGroup = component._displayGroup;
        if (component.visible !== undefined) componentFlat.visible = component.visible;

        setDimensions(componentFlat, component);

        flatVolumes.push(componentFlat);

        // If this component is itself a compound (union/subtraction nested inside
        // an assembly), expand its own sub-components so UnionObject can find them.
        const nestedCompoundTypes = new Set(['union', 'subtraction']);
        if (nestedCompoundTypes.has(component.type) && component.components) {
          component.components.forEach((subComp, subCompIdx) => {
            const subPlacement = (subComp.placements && subComp.placements[0]) || { x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } };

            const subName = deriveComponentName(subComp.name || subPlacement.name, placementIndex);
            const subParentName = subPlacement.parent
              ? deriveComponentName(subPlacement.parent, placementIndex)
              : componentName; // default: direct child of the union

            const subFlat = {
              _id: buildVolumeKey(volumeIndex, placementIndex, componentIndex, subCompIdx),
              name: subName,
              g4name: subComp.g4name || subComp.name || subName,
              type: subComp.type,
              material: subComp.material || undefined,
              position: { x: subPlacement.x || 0, y: subPlacement.y || 0, z: subPlacement.z || 0 },
              rotation: subPlacement.rotation
                ? { x: subPlacement.rotation.x || 0, y: subPlacement.rotation.y || 0, z: subPlacement.rotation.z || 0 }
                : { x: 0, y: 0, z: 0 },
              mother_volume: subParentName,
              _compoundId: sharedCompoundId,
              _componentId: subComp._componentId || subComp.g4name || subComp.name,
              _instanceId: instanceId,
              _volumeIndex: volumeIndex,
              _placementIndex: placementIndex,
              _componentIndex: componentIndex,
              _subComponentIndex: subCompIdx,
            };

            if (subComp.boolean_operation) {
              subFlat.boolean_operation = subComp.boolean_operation;
              subFlat._is_boolean_component = true;
              subFlat._boolean_parent = componentName;
            }
            if (subComp.visible !== undefined) subFlat.visible = subComp.visible;

            setDimensions(subFlat, subComp);
            flatVolumes.push(subFlat);
          });
        }
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Name derivation for component instances  
// ---------------------------------------------------------------------------

/**
 * Derive an instance-specific name by incrementing the trailing number.
 * "PMTBody_0" + placementIndex=2 → "PMTBody_2"
 */
export function deriveComponentName(name, placementIndex) {
  if (placementIndex === 0) return name;
  if (!name) return name;

  const parts = name.split('_');
  const lastPart = parts[parts.length - 1];

  if (/^\d+$/.test(lastPart)) {
    const baseNumber = parseInt(lastPart, 10);
    const newNumber = baseNumber + placementIndex;
    parts[parts.length - 1] = newNumber.toString().padStart(lastPart.length, '0');
    return parts.join('_');
  }

  return `${name}_${placementIndex}`;
}

// ---------------------------------------------------------------------------
// Dimension mapping (JSON → flat internal format)
// Same logic as jsonToGeometry's setDimensions
// ---------------------------------------------------------------------------

function setDimensions(flat, source) {
  if (!source.dimensions) return;

  switch (source.type) {
    case 'box':
      flat.size = {
        x: source.dimensions.x,
        y: source.dimensions.y,
        z: source.dimensions.z
      };
      break;

    case 'cylinder':
      flat.radius = source.dimensions.radius;
      flat.height = source.dimensions.height;
      if (source.dimensions.inner_radius !== undefined) {
        flat.innerRadius = source.dimensions.inner_radius;
      }
      break;

    case 'sphere':
      flat.radius = source.dimensions.radius;
      break;

    case 'ellipsoid':
      flat.xRadius = source.dimensions.x_radius ?? source.dimensions.ax;
      flat.yRadius = source.dimensions.y_radius ?? source.dimensions.by;
      flat.zRadius = source.dimensions.z_radius ?? source.dimensions.cz;
      if (source.dimensions.zcut1 !== undefined) flat.zcut1 = source.dimensions.zcut1;
      if (source.dimensions.zcut2 !== undefined) flat.zcut2 = source.dimensions.zcut2;
      break;

    case 'trapezoid':
      flat.dx1 = source.dimensions.dx1;
      flat.dx2 = source.dimensions.dx2;
      flat.dy1 = source.dimensions.dy1;
      flat.dy2 = source.dimensions.dy2;
      flat.dz = source.dimensions.dz;
      break;

    case 'torus':
      flat.majorRadius = source.dimensions.major_radius;
      flat.minorRadius = source.dimensions.minor_radius;
      break;

    case 'polycone':
    case 'polyhedra':
      if (source.dimensions.z && source.dimensions.rmin && source.dimensions.rmax) {
        flat.zSections = source.dimensions.z.map((z, index) => ({
          z: z,
          rMin: source.dimensions.rmin[index],
          rMax: source.dimensions.rmax[index]
        }));
      }
      break;

    default:
      // Copy all dimension properties for unknown types
      if (source.dimensions) {
        Object.keys(source.dimensions).forEach(key => {
          flat[key] = source.dimensions[key];
        });
      }
  }
}
