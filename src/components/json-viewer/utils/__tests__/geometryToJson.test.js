import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateJson, generateTemplateJson } from '../geometryToJson';

vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

describe('geometryToJson', () => {
  describe('generateJson', () => {
    it('returns empty structure for null geometry', () => {
      const result = generateJson(null);
      expect(result.world).toBeNull();
      expect(result.volumes).toEqual([]);
    });

    it('returns empty structure for undefined geometry', () => {
      const result = generateJson(undefined);
      expect(result.world).toBeNull();
      expect(result.volumes).toEqual([]);
    });

    it('generates world with correct structure', () => {
      const geo = {
        world: {
          name: 'World', type: 'box',
          size: { x: 500, y: 500, z: 500 },
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          material: 'G4_AIR',
        },
        volumes: [],
      };

      const result = generateJson(geo);
      expect(result.world.name).toBe('World');
      expect(result.world.type).toBe('box');
      expect(result.world.dimensions).toEqual({ x: 500, y: 500, z: 500 });
      expect(result.world.material).toBe('G4_AIR');
      expect(result.world.visible).toBe(false);
      expect(result.world.wireframe).toBe(true);
      expect(result.world.placements).toHaveLength(1);
    });

    it('provides default world values for missing fields', () => {
      const geo = {
        world: {},
        volumes: [],
      };

      const result = generateJson(geo);
      expect(result.world.name).toBe('World');
      expect(result.world.type).toBe('box');
      expect(result.world.material).toBe('G4_AIR');
      expect(result.world.dimensions).toEqual({ x: 1000, y: 1000, z: 1000 });
    });

    it('converts a box volume', () => {
      const geo = {
        world: { name: 'World', type: 'box', size: { x: 1000, y: 1000, z: 1000 } },
        volumes: [{
          name: 'Box1', g4name: 'Box1', type: 'box',
          size: { x: 10, y: 20, z: 30 },
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 0.1, y: 0.2, z: 0.3 },
          mother_volume: 'World', material: 'G4_AIR', visible: true,
        }],
      };

      const result = generateJson(geo);
      expect(result.volumes).toHaveLength(1);
      const vol = result.volumes[0];
      expect(vol.type).toBe('box');
      expect(vol.dimensions).toEqual({ x: 10, y: 20, z: 30 });
      expect(vol.placements[0].x).toBe(1);
      expect(vol.placements[0].y).toBe(2);
      expect(vol.placements[0].z).toBe(3);
      expect(vol.placements[0].rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
    });

    it('converts a cylinder volume with inner radius', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'Cyl', g4name: 'Cyl', type: 'cylinder',
          radius: 25, height: 50, innerRadius: 5,
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World', material: 'G4_WATER', visible: true,
        }],
      };

      const result = generateJson(geo);
      const dim = result.volumes[0].dimensions;
      expect(dim.radius).toBe(25);
      expect(dim.height).toBe(50);
      expect(dim.inner_radius).toBe(5);
    });

    it('converts a sphere volume', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'Sph', g4name: 'Sph', type: 'sphere',
          radius: 42,
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World', material: 'G4_AIR', visible: true,
        }],
      };

      const result = generateJson(geo);
      expect(result.volumes[0].dimensions.radius).toBe(42);
    });

    it('converts an ellipsoid volume', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'Ell', g4name: 'Ell', type: 'ellipsoid',
          xRadius: 10, yRadius: 20, zRadius: 30,
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World', material: 'G4_AIR', visible: true,
        }],
      };

      const result = generateJson(geo);
      const dim = result.volumes[0].dimensions;
      expect(dim.x_radius).toBe(10);
      expect(dim.y_radius).toBe(20);
      expect(dim.z_radius).toBe(30);
    });

    it('converts a trapezoid volume', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'Trap', g4name: 'Trap', type: 'trapezoid',
          dx1: 2, dx2: 5, dy1: 1, dy2: 5, dz: 9,
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World', material: 'G4_AIR', visible: true,
        }],
      };

      const result = generateJson(geo);
      const dim = result.volumes[0].dimensions;
      expect(dim.dx1).toBe(2);
      expect(dim.dx2).toBe(5);
      expect(dim.dy1).toBe(1);
      expect(dim.dy2).toBe(5);
      expect(dim.dz).toBe(9);
    });

    it('converts a torus volume', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'Tor', g4name: 'Tor', type: 'torus',
          majorRadius: 30, minorRadius: 5,
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World', material: 'G4_AIR', visible: true,
        }],
      };

      const result = generateJson(geo);
      const dim = result.volumes[0].dimensions;
      expect(dim.major_radius).toBe(30);
      expect(dim.minor_radius).toBe(5);
    });

    it('converts a polycone volume', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'PC', g4name: 'PC', type: 'polycone',
          zSections: [
            { z: -5, rMin: 0, rMax: 3 },
            { z: 0, rMin: 1, rMax: 5 },
            { z: 5, rMin: 0, rMax: 2 },
          ],
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World', material: 'G4_AIR', visible: true,
        }],
      };

      const result = generateJson(geo);
      const dim = result.volumes[0].dimensions;
      expect(dim.z).toEqual([-5, 0, 5]);
      expect(dim.rmin).toEqual([0, 1, 0]);
      expect(dim.rmax).toEqual([3, 5, 2]);
    });

    it('preserves hitsCollectionName on standard volumes', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'Det', g4name: 'Det', type: 'box',
          size: { x: 10, y: 10, z: 10 },
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World', material: 'G4_AIR', visible: true,
          hitsCollectionName: 'MyHits',
        }],
      };

      const result = generateJson(geo);
      expect(result.volumes[0].hitsCollectionName).toBe('MyHits');
    });

    it('does not include hitsCollectionName when undefined', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'Det', g4name: 'Det', type: 'box',
          size: { x: 10, y: 10, z: 10 },
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World', material: 'G4_AIR', visible: true,
        }],
      };

      const result = generateJson(geo);
      expect(result.volumes[0].hitsCollectionName).toBeUndefined();
    });

    it('preserves boolean_operation fields on components', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'U1', g4name: 'U1', type: 'union',
          material: 'G4_AIR',
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World',
          _compoundId: 'union_1', _componentId: 'comp_root',
        }, {
          name: 'Part1', g4name: 'Part1', type: 'box',
          size: { x: 5, y: 5, z: 5 },
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'U1', material: 'G4_AIR', visible: true,
          _compoundId: 'union_1', _componentId: 'comp_1',
          boolean_operation: 'union', _is_boolean_component: true, _boolean_parent: 'U1',
        }, {
          name: 'Part2', g4name: 'Part2', type: 'box',
          size: { x: 3, y: 3, z: 3 },
          position: { x: 5, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'U1', material: 'G4_AIR', visible: true,
          _compoundId: 'union_1', _componentId: 'comp_2',
          boolean_operation: 'subtract', _is_boolean_component: true, _boolean_parent: 'U1',
        }],
      };

      const result = generateJson(geo);
      // The union should be a single entry with components
      const union = result.volumes.find(v => v.type === 'union');
      expect(union).toBeTruthy();
      expect(union.components).toHaveLength(2);
      // union components should be sorted: union first, subtract second
      expect(union.components[0].boolean_operation).toBe('union');
      expect(union.components[1].boolean_operation).toBe('subtract');
    });

    it('preserves hitsCollectionName on union volumes', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'U1', g4name: 'U1', type: 'union',
          material: 'G4_AIR',
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World',
          _compoundId: 'union_1', _componentId: 'comp_root',
          hitsCollectionName: 'UnionHits',
        }, {
          name: 'Part1', g4name: 'Part1', type: 'box',
          size: { x: 5, y: 5, z: 5 },
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'U1',
          _compoundId: 'union_1', _componentId: 'comp_1',
          boolean_operation: 'union', _is_boolean_component: true,
          visible: true,
        }],
      };

      const result = generateJson(geo);
      const union = result.volumes.find(v => v.type === 'union');
      expect(union.hitsCollectionName).toBe('UnionHits');
    });

    it('generates assembly with placements and components', () => {
      const geo = {
        world: { name: 'World', type: 'box', size: { x: 1000, y: 1000, z: 1000 } },
        volumes: [{
          name: 'Asm_0', g4name: 'Asm_0', type: 'assembly',
          position: { x: 10, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World',
          _compoundId: 'asm_1', _componentId: 'asm_root',
        }, {
          name: 'Comp1', g4name: 'Comp1', type: 'box',
          size: { x: 5, y: 5, z: 5 },
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'Asm_0', material: 'G4_AIR', visible: true,
          _compoundId: 'asm_1', _componentId: 'comp_1',
        }],
      };

      const result = generateJson(geo);
      const asm = result.volumes.find(v => v.type === 'assembly');
      expect(asm).toBeTruthy();
      expect(asm.components).toHaveLength(1);
      expect(asm.placements).toHaveLength(1);
    });

    it('handles volumes with missing position/rotation gracefully', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'NoPos', g4name: 'NoPos', type: 'box',
          size: { x: 10, y: 10, z: 10 },
          mother_volume: 'World', material: 'G4_AIR', visible: true,
        }],
      };

      const result = generateJson(geo);
      const pl = result.volumes[0].placements[0];
      expect(pl.x).toBe(0);
      expect(pl.y).toBe(0);
      expect(pl.z).toBe(0);
      expect(pl.rotation).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('defaults visible to true when undefined', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'V1', g4name: 'V1', type: 'sphere', radius: 5,
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World', material: 'G4_AIR',
        }],
      };

      const result = generateJson(geo);
      expect(result.volumes[0].visible).toBe(true);
    });

    it('preserves visible=false', () => {
      const geo = {
        world: null,
        volumes: [{
          name: 'V1', g4name: 'V1', type: 'sphere', radius: 5,
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World', material: 'G4_AIR', visible: false,
        }],
      };

      const result = generateJson(geo);
      expect(result.volumes[0].visible).toBe(false);
    });

    it('skips null volumes', () => {
      const geo = {
        world: null,
        volumes: [
          null,
          {
            name: 'V1', g4name: 'V1', type: 'box',
            size: { x: 10, y: 10, z: 10 },
            position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
            mother_volume: 'World', material: 'G4_AIR', visible: true,
          },
        ],
      };

      const result = generateJson(geo);
      expect(result.volumes).toHaveLength(1);
    });
  });

  describe('generateTemplateJson', () => {
    it('returns null for null geometry', () => {
      expect(generateTemplateJson(null, 'id')).toBeNull();
    });

    it('returns null for null compoundId', () => {
      expect(generateTemplateJson({ volumes: [] }, null)).toBeNull();
    });

    it('returns null when root volume not found', () => {
      const geo = { volumes: [{ name: 'Other', _compoundId: 'x' }] };
      expect(generateTemplateJson(geo, 'missing_id')).toBeNull();
    });

    it('extracts only volumes belonging to the compound', () => {
      const geo = {
        volumes: [
          { name: 'Asm1', type: 'assembly', _compoundId: 'asm_1', mother_volume: 'World', g4name: 'Asm1', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
          { name: 'C1', type: 'box', _compoundId: 'asm_1', mother_volume: 'Asm1', g4name: 'C1', size: { x: 5, y: 5, z: 5 }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, _componentId: 'c1' },
          { name: 'Unrelated', type: 'sphere', mother_volume: 'World', g4name: 'Unr', radius: 10, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
        ],
      };

      const result = generateTemplateJson(geo, 'asm_1', 'Asm1');
      // Should include Asm1 + C1, not Unrelated
      const names = result.volumes.flatMap(v => v.components ? v.components.map(c => c.name) : [v.name]);
      expect(names).not.toContain('Unrelated');
    });

    it('includes nested children of compound components', () => {
      const geo = {
        volumes: [
          { name: 'Asm1', type: 'assembly', _compoundId: 'a1', mother_volume: 'World', g4name: 'Asm1', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
          { name: 'C1', type: 'box', _compoundId: 'a1', mother_volume: 'Asm1', g4name: 'C1', size: { x: 5, y: 5, z: 5 }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, _componentId: 'c1' },
          { name: 'Nested', type: 'sphere', mother_volume: 'C1', g4name: 'Nested', radius: 1, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, _compoundId: 'a1', _componentId: 'c2' },
        ],
      };

      const result = generateTemplateJson(geo, 'a1', 'Asm1');
      // Should have the assembly with components including C1 and Nested
      const asm = result.volumes.find(v => v.type === 'assembly');
      expect(asm).toBeTruthy();
      expect(asm.components.length).toBeGreaterThanOrEqual(2);
    });
  });
});
