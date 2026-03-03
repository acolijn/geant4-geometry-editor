import { describe, it, expect, vi } from 'vitest';
import { jsonToGeometry } from '../jsonToGeometry';

vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

describe('jsonToGeometry', () => {
  const emptyGeo = () => ({
    geometries: { world: null, volumes: [] },
    materials: {},
  });

  describe('input validation', () => {
    it('returns geometry unchanged for null json', () => {
      const geo = emptyGeo();
      expect(jsonToGeometry(null, geo)).toBe(geo);
    });

    it('returns geometry unchanged for undefined json', () => {
      const geo = emptyGeo();
      expect(jsonToGeometry(undefined, geo)).toBe(geo);
    });
  });

  describe('world creation', () => {
    it('creates world from JSON with dimensions', () => {
      const json = {
        world: {
          name: 'TestWorld', type: 'box',
          dimensions: { x: 500, y: 600, z: 700 },
          material: 'G4_AIR',
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }],
        },
        volumes: [],
      };

      const result = jsonToGeometry(json, emptyGeo());
      expect(result.geometries.world.name).toBe('TestWorld');
      expect(result.geometries.world.size).toEqual({ x: 500, y: 600, z: 700 });
    });

    it('provides default world size when dimensions are missing', () => {
      const json = { world: { name: 'W' }, volumes: [] };
      const result = jsonToGeometry(json, emptyGeo());
      expect(result.geometries.world.size).toEqual({ x: 1000, y: 1000, z: 1000 });
    });

    it('resets volumes when creating from world JSON', () => {
      const geo = {
        geometries: {
          world: { name: 'OldWorld' },
          volumes: [{ name: 'OldVolume' }],
        },
        materials: {},
      };

      const json = {
        world: { name: 'NewWorld', dimensions: { x: 100, y: 100, z: 100 } },
        volumes: [],
      };

      const result = jsonToGeometry(json, geo);
      expect(result.geometries.volumes).toEqual([]);
    });
  });

  describe('standard volume import', () => {
    it('creates a box volume from JSON', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'B1', g4name: 'B1', type: 'box',
          dimensions: { x: 10, y: 20, z: 30 },
          material: 'G4_AIR',
          placements: [{ name: 'B1', g4name: 'B1', x: 5, y: 6, z: 7, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          visible: true,
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      expect(result.geometries.volumes).toHaveLength(1);
      const vol = result.geometries.volumes[0];
      expect(vol.type).toBe('box');
      expect(vol.size).toEqual({ x: 10, y: 20, z: 30 });
      expect(vol.position).toEqual({ x: 5, y: 6, z: 7 });
      expect(vol.material).toBe('G4_AIR');
    });

    it('creates a cylinder volume from JSON', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'C1', g4name: 'C1', type: 'cylinder',
          dimensions: { radius: 25, height: 50, inner_radius: 5 },
          material: 'G4_WATER',
          placements: [{ name: 'C1', g4name: 'C1', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          visible: true,
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      const vol = result.geometries.volumes[0];
      expect(vol.radius).toBe(25);
      expect(vol.height).toBe(50);
      expect(vol.innerRadius).toBe(5);
    });

    it('creates a sphere volume from JSON', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'S1', g4name: 'S1', type: 'sphere',
          dimensions: { radius: 42 },
          material: 'G4_AIR',
          placements: [{ name: 'S1', g4name: 'S1', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          visible: true,
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      expect(result.geometries.volumes[0].radius).toBe(42);
    });

    it('creates an ellipsoid volume from JSON', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'E1', g4name: 'E1', type: 'ellipsoid',
          dimensions: { x_radius: 10, y_radius: 20, z_radius: 30 },
          material: 'G4_AIR',
          placements: [{ name: 'E1', g4name: 'E1', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          visible: true,
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      const vol = result.geometries.volumes[0];
      expect(vol.xRadius).toBe(10);
      expect(vol.yRadius).toBe(20);
      expect(vol.zRadius).toBe(30);
    });

    it('creates a trapezoid volume from JSON', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'T1', g4name: 'T1', type: 'trapezoid',
          dimensions: { dx1: 2, dx2: 5, dy1: 1, dy2: 5, dz: 9 },
          material: 'G4_AIR',
          placements: [{ name: 'T1', g4name: 'T1', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          visible: true,
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      const vol = result.geometries.volumes[0];
      expect(vol.dx1).toBe(2);
      expect(vol.dx2).toBe(5);
      expect(vol.dy1).toBe(1);
      expect(vol.dy2).toBe(5);
      expect(vol.dz).toBe(9);
    });

    it('creates a torus volume from JSON', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'Tor', g4name: 'Tor', type: 'torus',
          dimensions: { major_radius: 30, minor_radius: 5 },
          material: 'G4_AIR',
          placements: [{ name: 'Tor', g4name: 'Tor', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          visible: true,
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      const vol = result.geometries.volumes[0];
      expect(vol.majorRadius).toBe(30);
      expect(vol.minorRadius).toBe(5);
    });

    it('creates a polycone volume with zSections from JSON', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'PC', g4name: 'PC', type: 'polycone',
          dimensions: { z: [-5, 0, 5], rmin: [0, 1, 0], rmax: [3, 5, 2] },
          material: 'G4_AIR',
          placements: [{ name: 'PC', g4name: 'PC', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          visible: true,
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      const vol = result.geometries.volumes[0];
      expect(vol.zSections).toHaveLength(3);
      expect(vol.zSections[0]).toEqual({ z: -5, rMin: 0, rMax: 3 });
      expect(vol.zSections[2]).toEqual({ z: 5, rMin: 0, rMax: 2 });
    });

    it('creates multiple volumes from multiple placements', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'B1', g4name: 'B1', type: 'box',
          dimensions: { x: 10, y: 10, z: 10 },
          material: 'G4_AIR',
          placements: [
            { name: 'B1_0', g4name: 'B1_0', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' },
            { name: 'B1_1', g4name: 'B1_1', x: 20, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' },
          ],
          visible: true,
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      expect(result.geometries.volumes).toHaveLength(2);
      expect(result.geometries.volumes[0].position.x).toBe(0);
      expect(result.geometries.volumes[1].position.x).toBe(20);
    });

    it('preserves hitsCollectionName on standard volumes', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'Det', g4name: 'Det', type: 'box',
          dimensions: { x: 10, y: 10, z: 10 },
          material: 'G4_AIR',
          placements: [{ name: 'Det', g4name: 'Det', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          visible: true,
          hitsCollectionName: 'MyHits',
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      expect(result.geometries.volumes[0].hitsCollectionName).toBe('MyHits');
    });
  });

  describe('assembly import', () => {
    it('creates assembly root + components', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'Asm', g4name: 'Asm', type: 'assembly',
          _compoundId: 'asm_1', _componentId: 'root',
          placements: [{ name: 'Asm_0', g4name: 'Asm_0', x: 10, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          components: [{
            name: 'C1', g4name: 'C1', type: 'box',
            dimensions: { x: 5, y: 5, z: 5 },
            material: 'G4_AIR', _componentId: 'comp_1',
            placements: [{ name: 'C1_0', g4name: 'C1_0', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            visible: true,
          }],
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      // Should have at least 2 volumes: assembly root + 1 component
      expect(result.geometries.volumes.length).toBeGreaterThanOrEqual(2);
      const asm = result.geometries.volumes.find(v => v.type === 'assembly');
      expect(asm).toBeTruthy();
      const comp = result.geometries.volumes.find(v => v.type === 'box');
      expect(comp).toBeTruthy();
    });
  });

  describe('union import', () => {
    it('creates union root + boolean components', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'U1', g4name: 'U1', type: 'union',
          material: 'G4_AIR',
          _compoundId: 'union_1', _componentId: 'root',
          placements: [{ name: 'U1_0', g4name: 'U1_0', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          components: [{
            name: 'P1', g4name: 'P1', type: 'box',
            dimensions: { x: 5, y: 5, z: 5 },
            _componentId: 'c1',
            boolean_operation: 'union', _is_boolean_component: true,
            placements: [{ name: 'P1_0', g4name: 'P1_0', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            visible: true,
          }, {
            name: 'P2', g4name: 'P2', type: 'sphere',
            dimensions: { radius: 3 },
            _componentId: 'c2',
            boolean_operation: 'subtract', _is_boolean_component: true,
            placements: [{ name: 'P2_0', g4name: 'P2_0', x: 5, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            visible: true,
          }],
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      const union = result.geometries.volumes.find(v => v.type === 'union');
      expect(union).toBeTruthy();
      const boolComps = result.geometries.volumes.filter(v => v._is_boolean_component);
      expect(boolComps).toHaveLength(2);
    });

    it('preserves hitsCollectionName on union root when loading', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'U1', g4name: 'U1', type: 'union',
          material: 'G4_AIR',
          _compoundId: 'union_1', _componentId: 'root',
          hitsCollectionName: 'UnionHits',
          placements: [{ name: 'U1_0', g4name: 'U1_0', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          components: [{
            name: 'P1', g4name: 'P1', type: 'box',
            dimensions: { x: 5, y: 5, z: 5 },
            _componentId: 'c1',
            boolean_operation: 'union', _is_boolean_component: true,
            placements: [{ name: 'P1_0', g4name: 'P1_0', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            visible: true,
          }],
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      const union = result.geometries.volumes.find(v => v.type === 'union');
      expect(union.hitsCollectionName).toBe('UnionHits');
    });

    it('preserves hitsCollectionName on assembly components', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'Asm', g4name: 'Asm', type: 'assembly',
          _compoundId: 'asm_1', _componentId: 'root',
          placements: [{ name: 'Asm_0', g4name: 'Asm_0', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'W' }],
          components: [{
            name: 'C1', g4name: 'C1', type: 'box',
            dimensions: { x: 5, y: 5, z: 5 },
            material: 'G4_AIR', _componentId: 'comp_1',
            hitsCollectionName: 'CompHits',
            placements: [{ name: 'C1_0', g4name: 'C1_0', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            visible: true,
          }],
        }],
      };

      const result = jsonToGeometry(json, emptyGeo());
      const comp = result.geometries.volumes.find(v => v.type === 'box');
      expect(comp.hitsCollectionName).toBe('CompHits');
    });
  });

  describe('materials import', () => {
    it('imports materials from JSON', () => {
      const json = {
        materials: {
          G4_WATER: { density: 1.0, density_unit: 'g/cm3', color: [0, 0, 1, 0.5] },
          LXe: { density: 3.02, type: 'element_based', composition: { Xe: 1.0 } },
        },
      };

      const result = jsonToGeometry(json, emptyGeo());
      expect(result.materials.G4_WATER).toBeDefined();
      expect(result.materials.G4_WATER.density).toBe(1.0);
      expect(result.materials.LXe).toBeDefined();
      expect(result.materials.LXe.density).toBe(3.02);
    });

    it('overwrites existing materials on import', () => {
      const geo = emptyGeo();
      geo.materials = { Old: { density: 999 } };

      const json = {
        materials: { New: { density: 1.0 } },
      };

      const result = jsonToGeometry(json, geo);
      expect(result.materials.Old).toBeUndefined();
      expect(result.materials.New).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('skips null volumes in the array', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [null, undefined],
      };

      const result = jsonToGeometry(json, emptyGeo());
      expect(result.geometries.volumes).toEqual([]);
    });

    it('handles volumes without placements', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 1000, y: 1000, z: 1000 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
        volumes: [{
          name: 'NoPl', type: 'box', dimensions: { x: 10, y: 10, z: 10 },
        }],
      };

      // Should not crash, just skip the volume
      const result = jsonToGeometry(json, emptyGeo());
      expect(result.geometries.volumes).toEqual([]);
    });

    it('handles JSON with only world and no volumes key', () => {
      const json = {
        world: { name: 'W', dimensions: { x: 100, y: 100, z: 100 },
          placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }] },
      };

      const result = jsonToGeometry(json, emptyGeo());
      expect(result.geometries.world.name).toBe('W');
      expect(result.geometries.volumes).toEqual([]);
    });
  });
});
