import { describe, it, expect } from 'vitest';
import {
  expandToFlat,
  buildVolumeKey,
  isVolumeKey,
  findFlatIndex,
  deriveComponentName
} from '../expandToFlat';

// ───────────────────────────────────────────────────
// Helper key functions
// ───────────────────────────────────────────────────

describe('buildVolumeKey', () => {
  it('builds a simple vol-pl key', () => {
    expect(buildVolumeKey(0, 0)).toBe('vol-0-pl-0');
    expect(buildVolumeKey(3, 2)).toBe('vol-3-pl-2');
  });

  it('appends component index', () => {
    expect(buildVolumeKey(1, 0, 2)).toBe('vol-1-pl-0-c-2');
  });

  it('appends sub-component index', () => {
    expect(buildVolumeKey(1, 0, 2, 3)).toBe('vol-1-pl-0-c-2-sc-3');
  });
});

describe('isVolumeKey', () => {
  it('returns true for vol- prefixed strings', () => {
    expect(isVolumeKey('vol-0-pl-0')).toBe(true);
    expect(isVolumeKey('vol-1-pl-0-c-2')).toBe(true);
  });

  it('returns false for non-volume keys', () => {
    expect(isVolumeKey('world')).toBe(false);
    expect(isVolumeKey(null)).toBe(false);
    expect(isVolumeKey(undefined)).toBe(false);
    expect(isVolumeKey('')).toBe(false);
    expect(isVolumeKey(42)).toBe(false);
  });
});

describe('findFlatIndex', () => {
  const volumes = [
    { _id: 'vol-0-pl-0', name: 'A' },
    { _id: 'vol-1-pl-0', name: 'B' },
    { _id: 'vol-1-pl-1', name: 'B' },
  ];

  it('finds by _id', () => {
    expect(findFlatIndex(volumes, 'vol-1-pl-0')).toBe(1);
    expect(findFlatIndex(volumes, 'vol-1-pl-1')).toBe(2);
  });

  it('returns -1 for unknown key', () => {
    expect(findFlatIndex(volumes, 'vol-99-pl-0')).toBe(-1);
  });
});

describe('deriveComponentName', () => {
  it('returns original name for placementIndex 0', () => {
    expect(deriveComponentName('PMTBody_0', 0)).toBe('PMTBody_0');
  });

  it('increments trailing number', () => {
    expect(deriveComponentName('PMTBody_0', 2)).toBe('PMTBody_2');
    expect(deriveComponentName('Window_000', 3)).toBe('Window_003');
  });

  it('appends index if no trailing number', () => {
    expect(deriveComponentName('MyVolume', 1)).toBe('MyVolume_1');
  });

  it('handles null/empty gracefully', () => {
    expect(deriveComponentName(null, 1)).toBe(null);
    expect(deriveComponentName('', 1)).toBe('');
  });
});

// ───────────────────────────────────────────────────
// expandToFlat
// ───────────────────────────────────────────────────

describe('expandToFlat', () => {
  it('returns default world and empty volumes for null input', () => {
    const result = expandToFlat(null);
    expect(result.world).toBeDefined();
    expect(result.world.type).toBe('box');
    expect(result.volumes).toEqual([]);
  });

  it('expands world from JSON', () => {
    const json = {
      world: {
        name: 'TestWorld',
        type: 'box',
        material: 'G4_Galactic',
        dimensions: { x: 500, y: 500, z: 500 }
      },
      volumes: []
    };
    const result = expandToFlat(json);
    expect(result.world.name).toBe('TestWorld');
    expect(result.world.material).toBe('G4_Galactic');
    expect(result.world.size).toEqual({ x: 500, y: 500, z: 500 });
  });

  // ──── Standard volumes ────

  it('expands a standard box volume with one placement', () => {
    const json = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 1000, y: 1000, z: 1000 } },
      volumes: [{
        name: 'MyBox',
        type: 'box',
        material: 'G4_WATER',
        dimensions: { x: 10, y: 20, z: 30 },
        placements: [{ name: 'MyBox', x: 1, y: 2, z: 3, parent: 'World' }]
      }]
    };
    const result = expandToFlat(json);
    expect(result.volumes).toHaveLength(1);
    const vol = result.volumes[0];
    expect(vol._id).toBe('vol-0-pl-0');
    expect(vol.name).toBe('MyBox');
    expect(vol.type).toBe('box');
    expect(vol.material).toBe('G4_WATER');
    expect(vol.size).toEqual({ x: 10, y: 20, z: 30 });
    expect(vol.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(vol.mother_volume).toBe('World');
    expect(vol._volumeIndex).toBe(0);
    expect(vol._placementIndex).toBe(0);
  });

  it('expands multiple placements of the same volume', () => {
    const json = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 1000, y: 1000, z: 1000 } },
      volumes: [{
        name: 'Detector',
        type: 'cylinder',
        material: 'G4_Si',
        dimensions: { radius: 5, height: 10 },
        placements: [
          { name: 'Detector_000', x: 0, y: 0, z: 100, parent: 'World' },
          { name: 'Detector_001', x: 0, y: 0, z: -100, parent: 'World' }
        ]
      }]
    };
    const result = expandToFlat(json);
    expect(result.volumes).toHaveLength(2);
    expect(result.volumes[0]._id).toBe('vol-0-pl-0');
    expect(result.volumes[0].name).toBe('Detector_000');
    expect(result.volumes[0].position.z).toBe(100);
    expect(result.volumes[1]._id).toBe('vol-0-pl-1');
    expect(result.volumes[1].name).toBe('Detector_001');
    expect(result.volumes[1].position.z).toBe(-100);
  });

  it('maps cylinder dimensions correctly', () => {
    const json = {
      volumes: [{
        name: 'Cyl', type: 'cylinder', material: 'G4_WATER',
        dimensions: { radius: 50, height: 200, inner_radius: 10 },
        placements: [{ name: 'Cyl', x: 0, y: 0, z: 0, parent: 'World' }]
      }]
    };
    const vol = expandToFlat(json).volumes[0];
    expect(vol.radius).toBe(50);
    expect(vol.height).toBe(200);
    expect(vol.innerRadius).toBe(10);
  });

  it('maps sphere dimensions correctly', () => {
    const json = {
      volumes: [{
        name: 'Sph', type: 'sphere', material: 'G4_WATER',
        dimensions: { radius: 100 },
        placements: [{ name: 'Sph', x: 0, y: 0, z: 0, parent: 'World' }]
      }]
    };
    expect(expandToFlat(json).volumes[0].radius).toBe(100);
  });

  it('maps trapezoid dimensions correctly', () => {
    const json = {
      volumes: [{
        name: 'Trap', type: 'trapezoid', material: 'G4_WATER',
        dimensions: { dx1: 1, dx2: 2, dy1: 3, dy2: 4, dz: 5 },
        placements: [{ name: 'Trap', x: 0, y: 0, z: 0, parent: 'World' }]
      }]
    };
    const vol = expandToFlat(json).volumes[0];
    expect(vol.dx1).toBe(1);
    expect(vol.dx2).toBe(2);
    expect(vol.dz).toBe(5);
  });

  it('maps polycone dimensions correctly', () => {
    const json = {
      volumes: [{
        name: 'Poly', type: 'polycone', material: 'G4_WATER',
        dimensions: { z: [0, 10, 20], rmin: [0, 0, 0], rmax: [5, 10, 5] },
        placements: [{ name: 'Poly', x: 0, y: 0, z: 0, parent: 'World' }]
      }]
    };
    const vol = expandToFlat(json).volumes[0];
    expect(vol.zSections).toHaveLength(3);
    expect(vol.zSections[1]).toEqual({ z: 10, rMin: 0, rMax: 10 });
  });

  it('maps torus dimensions correctly', () => {
    const json = {
      volumes: [{
        name: 'Tor', type: 'torus', material: 'G4_WATER',
        dimensions: { major_radius: 100, minor_radius: 10 },
        placements: [{ name: 'Tor', x: 0, y: 0, z: 0, parent: 'World' }]
      }]
    };
    const vol = expandToFlat(json).volumes[0];
    expect(vol.majorRadius).toBe(100);
    expect(vol.minorRadius).toBe(10);
  });

  it('maps ellipsoid dimensions correctly', () => {
    const json = {
      volumes: [{
        name: 'Ell', type: 'ellipsoid', material: 'G4_WATER',
        dimensions: { x_radius: 10, y_radius: 20, z_radius: 30, zcut1: -5, zcut2: 5 },
        placements: [{ name: 'Ell', x: 0, y: 0, z: 0, parent: 'World' }]
      }]
    };
    const vol = expandToFlat(json).volumes[0];
    expect(vol.xRadius).toBe(10);
    expect(vol.yRadius).toBe(20);
    expect(vol.zRadius).toBe(30);
    expect(vol.zcut1).toBe(-5);
    expect(vol.zcut2).toBe(5);
  });

  // ──── Optional fields ────

  it('copies optional fields: visible, wireframe, hitsCollectionName, _displayGroup', () => {
    const json = {
      volumes: [{
        name: 'V', type: 'box', material: 'G4_WATER',
        dimensions: { x: 10, y: 10, z: 10 },
        visible: true,
        wireframe: true,
        hitsCollectionName: 'MyHits',
        _displayGroup: 'TPC',
        placements: [{ name: 'V', x: 0, y: 0, z: 0, parent: 'World' }]
      }]
    };
    const vol = expandToFlat(json).volumes[0];
    expect(vol.visible).toBe(true);
    expect(vol.wireframe).toBe(true);
    expect(vol.hitsCollectionName).toBe('MyHits');
    expect(vol._displayGroup).toBe('TPC');
  });

  it('per-placement visibility overrides volume-level', () => {
    const json = {
      volumes: [{
        name: 'V', type: 'box', material: 'G4_WATER',
        dimensions: { x: 10, y: 10, z: 10 },
        visible: true,
        placements: [
          { name: 'V_000', x: 0, y: 0, z: 0, parent: 'World', visible: false },
          { name: 'V_001', x: 10, y: 0, z: 0, parent: 'World' }
        ]
      }]
    };
    const vols = expandToFlat(json).volumes;
    expect(vols[0].visible).toBe(false);
    expect(vols[1].visible).toBe(true);
  });

  it('handles rotation defaults', () => {
    const json = {
      volumes: [{
        name: 'V', type: 'box', material: 'G4_WATER',
        dimensions: { x: 10, y: 10, z: 10 },
        placements: [{ name: 'V', x: 0, y: 0, z: 0, parent: 'World' }]
      }]
    };
    expect(expandToFlat(json).volumes[0].rotation).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('copies rotation from placement', () => {
    const json = {
      volumes: [{
        name: 'V', type: 'box', material: 'G4_WATER',
        dimensions: { x: 10, y: 10, z: 10 },
        placements: [{ name: 'V', x: 0, y: 0, z: 0, parent: 'World', rotation: { x: 90, y: 0, z: 0 } }]
      }]
    };
    expect(expandToFlat(json).volumes[0].rotation.x).toBe(90);
  });

  // ──── Compound volumes (assembly) ────

  it('expands an assembly with components', () => {
    const json = {
      volumes: [{
        name: 'PMTArray',
        type: 'assembly',
        _compoundId: 'PMTArray',
        components: [
          {
            name: 'Body', type: 'cylinder', material: 'Steel',
            dimensions: { radius: 5, height: 20 },
            placements: [{ name: 'Body_0', x: 0, y: 0, z: 0, parent: '' }]
          },
          {
            name: 'Window', type: 'sphere', material: 'Glass',
            dimensions: { radius: 5 },
            placements: [{ name: 'Window_0', x: 0, y: 0, z: 10, parent: '' }]
          }
        ],
        placements: [
          { name: 'PMTArray_000', x: 0, y: 0, z: 100, parent: 'World' },
          { name: 'PMTArray_001', x: 0, y: 0, z: -100, parent: 'World' }
        ]
      }]
    };
    const result = expandToFlat(json);
    // 2 placements × (1 compound header + 2 components) = 6
    expect(result.volumes).toHaveLength(6);

    // First placement: compound + 2 components
    expect(result.volumes[0]._id).toBe('vol-0-pl-0');
    expect(result.volumes[0].type).toBe('assembly');
    expect(result.volumes[0].name).toBe('PMTArray_000');

    expect(result.volumes[1]._id).toBe('vol-0-pl-0-c-0');
    expect(result.volumes[1].name).toBe('Body');
    expect(result.volumes[1].mother_volume).toBe('PMTArray_000');

    expect(result.volumes[2]._id).toBe('vol-0-pl-0-c-1');
    expect(result.volumes[2].name).toBe('Window');

    // Second placement: derives component names
    expect(result.volumes[3]._id).toBe('vol-0-pl-1');
    expect(result.volumes[3].name).toBe('PMTArray_001');

    expect(result.volumes[4]._id).toBe('vol-0-pl-1-c-0');
    expect(result.volumes[4].name).toBe('Body_1');
    expect(result.volumes[4].mother_volume).toBe('PMTArray_001');
  });

  // ──── Boolean compounds (union/subtraction) ────

  it('expands a union with components', () => {
    const json = {
      volumes: [{
        name: 'BoolShape',
        type: 'union',
        material: 'G4_WATER',
        components: [
          {
            name: 'SubBox', type: 'box', material: 'G4_WATER',
            boolean_operation: 'union',
            dimensions: { x: 5, y: 5, z: 5 },
            placements: [{ name: 'SubBox_0', x: 5, y: 0, z: 0, parent: '' }]
          }
        ],
        placements: [
          { name: 'BoolShape', x: 0, y: 0, z: 0, parent: 'World' }
        ]
      }]
    };
    const result = expandToFlat(json);
    expect(result.volumes).toHaveLength(2);
    expect(result.volumes[0].type).toBe('union');
    expect(result.volumes[1]._is_boolean_component).toBe(true);
    expect(result.volumes[1].boolean_operation).toBe('union');
    expect(result.volumes[1]._componentIndex).toBe(0);
  });

  // ──── Edge cases ────

  it('skips null volumes in the array', () => {
    const json = { volumes: [null, { name: 'V', type: 'box', material: 'M', dimensions: { x: 1, y: 1, z: 1 }, placements: [{ name: 'V', x: 0, y: 0, z: 0, parent: 'World' }] }] };
    // The null is skipped; the second volume is at volumeIndex=1
    const result = expandToFlat(json);
    expect(result.volumes).toHaveLength(1);
    expect(result.volumes[0]._volumeIndex).toBe(1);
  });

  it('handles volume with no placements gracefully', () => {
    const json = { volumes: [{ name: 'V', type: 'box', material: 'M', dimensions: { x: 1, y: 1, z: 1 } }] };
    const result = expandToFlat(json);
    expect(result.volumes).toHaveLength(0);
  });

  it('handles empty volumes array', () => {
    const json = { world: { name: 'W', type: 'box', material: 'G4_AIR', dimensions: { x: 100, y: 100, z: 100 } }, volumes: [] };
    const result = expandToFlat(json);
    expect(result.volumes).toHaveLength(0);
    expect(result.world.name).toBe('W');
  });

  it('preserves _compoundId on standard volumes', () => {
    const json = {
      volumes: [{
        name: 'V', type: 'box', material: 'M', _compoundId: 'myCompound',
        dimensions: { x: 1, y: 1, z: 1 },
        placements: [{ name: 'V', x: 0, y: 0, z: 0, parent: 'World' }]
      }]
    };
    expect(expandToFlat(json).volumes[0]._compoundId).toBe('myCompound');
  });
});
