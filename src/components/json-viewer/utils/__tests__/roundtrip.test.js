import { describe, it, expect, vi } from 'vitest';
import { generateJson } from '../geometryToJson';
import { jsonToGeometry } from '../jsonToGeometry';

vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

/**
 * Round-trip tests — convert internal geometry → JSON → internal geometry
 * and verify that critical data survives the trip.
 */
describe('JSON round-trip (geometryToJson → jsonToGeometry)', () => {
  const emptyGeo = () => ({
    geometries: { world: null, volumes: [] },
    materials: {},
  });

  /** Helper: internal → JSON → internal */
  const roundTrip = (geometry) => {
    const json = generateJson(geometry);
    return jsonToGeometry(json, emptyGeo());
  };

  it('round-trips a world volume', () => {
    const geo = {
      world: {
        name: 'World', type: 'box',
        size: { x: 2000, y: 2000, z: 2000 },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        material: 'G4_AIR',
      },
      volumes: [],
    };

    const result = roundTrip(geo);
    expect(result.geometries.world.name).toBe('World');
    expect(result.geometries.world.size).toEqual({ x: 2000, y: 2000, z: 2000 });
  });

  it('round-trips a box volume dimensions', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'B1', g4name: 'B1', type: 'box',
        size: { x: 10, y: 20, z: 30 },
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.type).toBe('box');
    expect(vol.size).toEqual({ x: 10, y: 20, z: 30 });
    expect(vol.position.x).toBe(1);
    expect(vol.position.y).toBe(2);
    expect(vol.position.z).toBe(3);
  });

  it('round-trips a cylinder volume dimensions', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'C1', g4name: 'C1', type: 'cylinder',
        radius: 25, height: 50, innerRadius: 5,
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_WATER', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.radius).toBe(25);
    expect(vol.height).toBe(50);
    expect(vol.innerRadius).toBe(5);
  });

  it('round-trips a sphere volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'S1', g4name: 'S1', type: 'sphere',
        radius: 42,
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    expect(result.geometries.volumes[0].radius).toBe(42);
  });

  it('round-trips an ellipsoid volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'E1', g4name: 'E1', type: 'ellipsoid',
        xRadius: 10, yRadius: 20, zRadius: 30,
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.xRadius).toBe(10);
    expect(vol.yRadius).toBe(20);
    expect(vol.zRadius).toBe(30);
  });

  it('round-trips a trapezoid volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'T1', g4name: 'T1', type: 'trapezoid',
        dx1: 2, dx2: 5, dy1: 1, dy2: 5, dz: 9,
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.dx1).toBe(2);
    expect(vol.dx2).toBe(5);
    expect(vol.dy1).toBe(1);
    expect(vol.dy2).toBe(5);
    expect(vol.dz).toBe(9);
  });

  it('round-trips a torus volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'Tor', g4name: 'Tor', type: 'torus',
        majorRadius: 30, minorRadius: 5,
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.majorRadius).toBe(30);
    expect(vol.minorRadius).toBe(5);
  });

  it('round-trips a polycone volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'PC', g4name: 'PC', type: 'polycone',
        zSections: [
          { z: -5, rMin: 0, rMax: 3 },
          { z: 0, rMin: 1, rMax: 5 },
          { z: 5, rMin: 0, rMax: 2 },
        ],
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.zSections).toHaveLength(3);
    expect(vol.zSections[0]).toEqual({ z: -5, rMin: 0, rMax: 3 });
    expect(vol.zSections[1]).toEqual({ z: 0, rMin: 1, rMax: 5 });
    expect(vol.zSections[2]).toEqual({ z: 5, rMin: 0, rMax: 2 });
  });

  it('round-trips hitsCollectionName on a standard volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'Det', g4name: 'Det', type: 'box',
        size: { x: 10, y: 10, z: 10 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
        hitsCollectionName: 'DetHits',
      }],
    };

    const result = roundTrip(geo);
    expect(result.geometries.volumes[0].hitsCollectionName).toBe('DetHits');
  });

  it('round-trips hitsCollectionName on a union volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'U1', g4name: 'U1', type: 'union',
        material: 'G4_AIR',
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W',
        _compoundId: 'union_1', _componentId: 'root',
        hitsCollectionName: 'UnionHits',
      }, {
        name: 'P1', g4name: 'P1', type: 'box',
        size: { x: 5, y: 5, z: 5 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'U1',
        _compoundId: 'union_1', _componentId: 'comp_1',
        boolean_operation: 'union', _is_boolean_component: true, _boolean_parent: 'U1',
        visible: true,
      }],
    };

    const result = roundTrip(geo);
    const union = result.geometries.volumes.find(v => v.type === 'union');
    expect(union).toBeTruthy();
    expect(union.hitsCollectionName).toBe('UnionHits');
  });

  it('round-trips multiple volumes preserving count', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [
        { name: 'B1', g4name: 'B1', type: 'box', size: { x: 10, y: 10, z: 10 },
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'W', material: 'G4_AIR', visible: true },
        { name: 'S1', g4name: 'S1', type: 'sphere', radius: 5,
          position: { x: 20, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'W', material: 'G4_WATER', visible: true },
        { name: 'C1', g4name: 'C1', type: 'cylinder', radius: 3, height: 10,
          position: { x: -20, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'W', material: 'G4_AIR', visible: true },
      ],
    };

    const result = roundTrip(geo);
    expect(result.geometries.volumes).toHaveLength(3);
  });

  it('round-trips parent-child relationships', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [
        { name: 'Parent', g4name: 'Parent', type: 'box', size: { x: 50, y: 50, z: 50 },
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'W', material: 'G4_AIR', visible: true },
        { name: 'Child', g4name: 'Child', type: 'sphere', radius: 5,
          position: { x: 10, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'Parent', material: 'G4_WATER', visible: true },
      ],
    };

    const result = roundTrip(geo);
    const child = result.geometries.volumes.find(v => v.type === 'sphere');
    expect(child.mother_volume).toBe('Parent');
  });

  it('round-trips rotation values', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'Rot', g4name: 'Rot', type: 'box',
        size: { x: 10, y: 10, z: 10 },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0.5, y: 1.0, z: 1.5 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.rotation.x).toBe(0.5);
    expect(vol.rotation.y).toBe(1.0);
    expect(vol.rotation.z).toBe(1.5);
  });

  it('round-trips a volume without hitsCollectionName (stays absent)', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'Plain', g4name: 'Plain', type: 'box',
        size: { x: 10, y: 10, z: 10 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    expect(result.geometries.volumes[0].hitsCollectionName).toBeUndefined();
  });

  it('round-trips a multi-placement assembly preserving all components', () => {
    // Simulates the mc-master PMT pattern: one assembly with N placements and M components
    const inputJson = {
      world: { name: 'World', type: 'box', dimensions: { x: 2000, y: 2000, z: 2000 },
        material: 'G4_AIR' },
      volumes: [{
        name: 'PMTArray',
        g4name: 'PMTArray',
        type: 'assembly',
        material: 'LXe',
        placements: [
          { name: 'PMT_0', x: 0, y: 0, z: 10, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
          { name: 'PMT_1', x: 50, y: 0, z: 10, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
          { name: 'PMT_2', x: 100, y: 0, z: 10, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
        ],
        components: [
          {
            name: 'Body_0', g4name: 'Body', type: 'cylinder',
            dimensions: { radius: 20, height: 50 },
            material: 'Kovar',
            placements: [{ name: 'Body_0', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
          },
          {
            name: 'Window_0', g4name: 'Window', type: 'cylinder',
            dimensions: { radius: 18, height: 3 },
            material: 'Quartz',
            placements: [{ name: 'Window_0', x: 0, y: 0, z: -23, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
          },
          {
            name: 'Cathode_0', g4name: 'Cathode', type: 'cylinder',
            dimensions: { radius: 16, height: 0.1 },
            material: 'Aluminium',
            placements: [{ name: 'Cathode_0', x: 0, y: 0, z: -22.5, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
          },
        ],
      }],
    };

    // Import → internal → export roundtrip
    const imported = jsonToGeometry(inputJson, emptyGeo());
    
    // After import: should have 3 assembly instances × (1 root + 3 components) = 12 flat volumes
    const assemblies = imported.geometries.volumes.filter(v => v.type === 'assembly');
    const components = imported.geometries.volumes.filter(v => v.type !== 'assembly');
    expect(assemblies).toHaveLength(3);
    expect(components).toHaveLength(9); // 3 components × 3 instances

    // All instances should share the same _compoundId
    const compoundIds = new Set(assemblies.map(a => a._compoundId));
    expect(compoundIds.size).toBe(1);

    // Components should have _componentId set
    components.forEach(c => {
      expect(c._componentId).toBeTruthy();
    });

    // Export back to JSON
    const exported = generateJson({
      world: imported.geometries.world,
      volumes: imported.geometries.volumes,
    });

    // Should produce ONE assembly volume with 3 placements and 3 components
    const asmVolumes = exported.volumes.filter(v => v.type === 'assembly');
    expect(asmVolumes).toHaveLength(1);
    expect(asmVolumes[0].placements).toHaveLength(3);
    expect(asmVolumes[0].components).toHaveLength(3);

    // Verify component types are preserved
    const compTypes = asmVolumes[0].components.map(c => c.type);
    expect(compTypes).toContain('cylinder');
    expect(asmVolumes[0].components.length).toBe(3);
  });

  it('round-trips assembly components without _componentId (legacy format)', () => {
    // Tests that components without _componentId are not incorrectly deduplicated
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [
        {
          name: 'Asm1', g4name: 'Asm1', type: 'assembly',
          material: 'G4_AIR',
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'W',
          _compoundId: 'asm_1',
          // Note: no _componentId set (legacy/imported data)
        },
        {
          name: 'Part1', g4name: 'Part1', type: 'box',
          size: { x: 5, y: 5, z: 5 },
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'Asm1',
          _compoundId: 'asm_1',
          material: 'G4_AIR', visible: true,
          // No _componentId
        },
        {
          name: 'Part2', g4name: 'Part2', type: 'cylinder',
          radius: 3, height: 10,
          position: { x: 10, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'Asm1',
          _compoundId: 'asm_1',
          material: 'G4_WATER', visible: true,
          // No _componentId
        },
        {
          name: 'Part3', g4name: 'Part3', type: 'sphere',
          radius: 2,
          position: { x: -10, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'Asm1',
          _compoundId: 'asm_1',
          material: 'G4_AIR', visible: true,
          // No _componentId
        },
      ],
    };

    const exported = generateJson(geo);
    const asm = exported.volumes.find(v => v.type === 'assembly');
    expect(asm).toBeTruthy();
    // All 3 components must survive (previously only 1 survived due to undefined dedup bug)
    expect(asm.components).toHaveLength(3);
    expect(asm.components.map(c => c.type).sort()).toEqual(['box', 'cylinder', 'sphere']);
  });

  it('save→load roundtrip preserves assembly structure (PMT pattern)', () => {
    // Simulates exact save→load cycle:
    // 1. Import mc-master JSON → flat internal format
    // 2. Save: generateJson → stored JSON
    // 3. Load: jsonToGeometry on stored JSON → flat internal format
    // 4. Verify structure is the same as after step 1

    const mcMasterJson = {
      world: { name: 'World', type: 'box', dimensions: { x: 2000, y: 2000, z: 2000 },
        material: 'G4_AIR' },
      volumes: [{
        name: 'PMTArray',
        g4name: 'PMTArray',
        type: 'assembly',
        material: 'LXe',
        placements: [
          { name: 'PMT_0', x: 0, y: 0, z: 10, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
          { name: 'PMT_1', x: 50, y: 0, z: 10, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
          { name: 'PMT_2', x: 100, y: 0, z: 10, rotation: { x: Math.PI, y: 0, z: 0 }, parent: 'World' },
        ],
        components: [
          { name: 'Body_0', g4name: 'Body', type: 'polycone',
            dimensions: { z: [-57, 57], rmin: [0, 0], rmax: [38, 26.65] },
            material: 'Kovar',
            placements: [{ name: 'Body_0', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }] },
          { name: 'Window_0', g4name: 'Window', type: 'cylinder',
            dimensions: { radius: 35, height: 3.5 },
            material: 'Quartz',
            placements: [{ name: 'Window_0', x: 0, y: 0, z: -55.25, rotation: { x: 0, y: 0, z: 0 }, parent: '' }] },
          { name: 'Vacuum_0', g4name: 'Vacuum', type: 'polycone',
            dimensions: { z: [-53.5, 0], rmin: [0, 0], rmax: [25.65, 37] },
            material: 'Vacuum', visible: false,
            placements: [{ name: 'Vacuum_0', x: 0, y: 0, z: -53.5, rotation: { x: 0, y: 0, z: 0 }, parent: '' }] },
          { name: 'Cathode_0', g4name: 'Cathode', type: 'cylinder',
            dimensions: { radius: 32, height: 0.1 },
            material: 'PhotoCathodeAluminium',
            placements: [{ name: 'Cathode_0', x: 0, y: 0, z: -53.45, rotation: { x: 0, y: 0, z: 0 }, parent: '' }] },
          { name: 'Ceramic_0', g4name: 'Ceramic', type: 'cylinder',
            dimensions: { radius: 21.65, height: 4.0 },
            material: 'Ceramic',
            placements: [{ name: 'Ceramic_0', x: 0, y: 0, z: 55.0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }] },
        ],
      }],
    };

    // Step 1: Import
    const imported = jsonToGeometry(mcMasterJson, emptyGeo());
    const importedAssemblies = imported.geometries.volumes.filter(v => v.type === 'assembly');
    const importedComponents = imported.geometries.volumes.filter(v => v.type !== 'assembly');
    expect(importedAssemblies).toHaveLength(3);
    expect(importedComponents).toHaveLength(15); // 5 components × 3 instances

    // Each assembly root should have 5 children
    importedAssemblies.forEach(asm => {
      const children = importedComponents.filter(c => c.mother_volume === asm.name);
      expect(children).toHaveLength(5);
    });

    // Step 2: Save (generateJson)
    const savedJson = generateJson({
      world: imported.geometries.world,
      volumes: imported.geometries.volumes,
    });
    expect(savedJson.volumes).toHaveLength(1);
    expect(savedJson.volumes[0].placements).toHaveLength(3);
    expect(savedJson.volumes[0].components).toHaveLength(5);

    // Step 3: Load (jsonToGeometry on saved JSON)
    const loaded = jsonToGeometry(savedJson, emptyGeo());
    const loadedAssemblies = loaded.geometries.volumes.filter(v => v.type === 'assembly');
    const loadedComponents = loaded.geometries.volumes.filter(v => v.type !== 'assembly');

    // Must have same structure as after initial import
    expect(loadedAssemblies).toHaveLength(3);
    expect(loadedComponents).toHaveLength(15); // 5 × 3

    // All share the same _compoundId
    const compoundIds = new Set(loaded.geometries.volumes.map(v => v._compoundId));
    expect(compoundIds.size).toBe(1);

    // Each assembly root has 5 children
    loadedAssemblies.forEach(asm => {
      const children = loadedComponents.filter(c => c.mother_volume === asm.name);
      expect(children).toHaveLength(5);
    });

    // Verify positions are preserved
    expect(loadedAssemblies[0].position.x).toBe(0);
    expect(loadedAssemblies[1].position.x).toBe(50);
    expect(loadedAssemblies[2].position.x).toBe(100);

    // Verify rotation is preserved
    expect(loadedAssemblies[2].rotation.x).toBeCloseTo(Math.PI);

    // Step 4: Second save→load cycle (the acid test)
    const savedJson2 = generateJson({
      world: loaded.geometries.world,
      volumes: loaded.geometries.volumes,
    });
    expect(savedJson2.volumes).toHaveLength(1);
    expect(savedJson2.volumes[0].placements).toHaveLength(3);
    expect(savedJson2.volumes[0].components).toHaveLength(5);

    const loaded2 = jsonToGeometry(savedJson2, emptyGeo());
    const loaded2Assemblies = loaded2.geometries.volumes.filter(v => v.type === 'assembly');
    const loaded2Components = loaded2.geometries.volumes.filter(v => v.type !== 'assembly');
    expect(loaded2Assemblies).toHaveLength(3);
    expect(loaded2Components).toHaveLength(15);

    loaded2Assemblies.forEach(asm => {
      const children = loaded2Components.filter(c => c.mother_volume === asm.name);
      expect(children).toHaveLength(5);
    });
  });
});
