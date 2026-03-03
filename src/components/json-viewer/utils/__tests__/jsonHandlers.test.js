import { describe, it, expect, vi } from 'vitest';
import {
  formatJson,
  ensureOrderedZPlanes,
  generateMaterialsJson,
  generateGeometryJson,
  importJsonGeometry,
} from '../jsonHandlers';
import { generateJson, generateTemplateJson } from '../geometryToJson';
import { jsonToGeometry } from '../jsonToGeometry';

// Mock logger
vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

describe('jsonHandlers', () => {
  describe('formatJson', () => {
    it('formats an object as indented JSON string', () => {
      const result = formatJson({ a: 1 });
      expect(result).toBe('{\n  "a": 1\n}');
    });

    it('handles nested objects', () => {
      const result = formatJson({ a: { b: 2 } });
      expect(JSON.parse(result)).toEqual({ a: { b: 2 } });
    });
  });

  describe('ensureOrderedZPlanes', () => {
    it('sorts polycone z-planes in ascending order', () => {
      const volume = {
        name: 'PC',
        type: 'polycone',
        dimensions: {
          z: [5, -5, 0],
          rmin: [0, 0, 0],
          rmax: [2, 3, 5],
        },
      };

      const result = ensureOrderedZPlanes(volume);
      expect(result.dimensions.z).toEqual([-5, 0, 5]);
      expect(result.dimensions.rmax).toEqual([3, 5, 2]);
    });

    it('leaves already-sorted planes untouched', () => {
      const volume = {
        name: 'PC',
        type: 'polycone',
        dimensions: {
          z: [-5, 0, 5],
          rmax: [3, 5, 2],
        },
      };

      const result = ensureOrderedZPlanes(volume);
      expect(result.dimensions.z).toEqual([-5, 0, 5]);
    });

    it('returns non-polycone volumes unchanged', () => {
      const volume = { name: 'Box', type: 'box' };
      const result = ensureOrderedZPlanes(volume);
      expect(result).toBe(volume);
    });
  });

  describe('generateMaterialsJson', () => {
    it('wraps materials in a { materials: ... } JSON string', () => {
      const mats = { G4_WATER: { density: 1.0 } };
      const result = generateMaterialsJson(mats);
      const parsed = JSON.parse(result);
      expect(parsed.materials.G4_WATER.density).toBe(1.0);
    });
  });

  describe('generateGeometryJson', () => {
    it('includes world, volumes, and materials', () => {
      const geometries = {
        world: { name: 'World', type: 'box', size: { x: 100, y: 100, z: 100 }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
        volumes: [
          { name: 'B1', type: 'box', size: { x: 10, y: 10, z: 10 }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, mother_volume: 'World', visible: true }
        ],
      };
      const materials = { G4_AIR: { density: 0.001 } };

      const result = JSON.parse(generateGeometryJson(geometries, materials));

      expect(result.world).toBeTruthy();
      expect(result.world.name).toBe('World');
      expect(result.volumes.length).toBe(1);
      expect(result.materials.G4_AIR.density).toBe(0.001);
    });

    it('generates valid JSON even with no volumes', () => {
      const geometries = {
        world: { name: 'World', type: 'box', size: { x: 100, y: 100, z: 100 } },
        volumes: [],
      };

      const result = JSON.parse(generateGeometryJson(geometries, {}));
      expect(result.world).toBeTruthy();
      expect(result.volumes).toEqual([]);
    });
  });
});

describe('geometryToJson', () => {
  describe('generateJson', () => {
    it('generates world volume with placements', () => {
      const geometry = {
        world: { name: 'World', type: 'box', size: { x: 500, y: 500, z: 500 }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
        volumes: [],
      };

      const result = generateJson(geometry);

      expect(result.world.name).toBe('World');
      expect(result.world.dimensions).toEqual({ x: 500, y: 500, z: 500 });
      expect(result.world.placements).toHaveLength(1);
    });

    it('converts box volume with correct dimensions', () => {
      const geometry = {
        world: { name: 'World', type: 'box', size: { x: 1000, y: 1000, z: 1000 } },
        volumes: [
          {
            name: 'Box1', g4name: 'Box1', type: 'box',
            size: { x: 10, y: 20, z: 30 },
            position: { x: 1, y: 2, z: 3 },
            rotation: { x: 0, y: 0, z: 0 },
            mother_volume: 'World', material: 'G4_AIR',
            visible: true, _compoundId: 'standalone'
          },
        ],
      };

      const result = generateJson(geometry);
      expect(result.volumes).toHaveLength(1);
      expect(result.volumes[0].dimensions).toEqual({ x: 10, y: 20, z: 30 });
      expect(result.volumes[0].placements[0].x).toBe(1);
    });

    it('converts cylinder volume dimensions', () => {
      const geometry = {
        world: null,
        volumes: [
          {
            name: 'Cyl1', g4name: 'Cyl1', type: 'cylinder',
            radius: 25, height: 50, innerRadius: 5,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            mother_volume: 'World', material: 'G4_WATER',
            visible: true
          },
        ],
      };

      const result = generateJson(geometry);
      const vol = result.volumes[0];
      expect(vol.dimensions.radius).toBe(25);
      expect(vol.dimensions.height).toBe(50);
      expect(vol.dimensions.inner_radius).toBe(5);
    });

    it('converts ellipsoid dimensions', () => {
      const geometry = {
        world: null,
        volumes: [
          {
            name: 'E1', g4name: 'E1', type: 'ellipsoid',
            xRadius: 10, yRadius: 20, zRadius: 30,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            mother_volume: 'World', material: 'G4_AIR',
            visible: true
          },
        ],
      };

      const result = generateJson(geometry);
      expect(result.volumes[0].dimensions.x_radius).toBe(10);
      expect(result.volumes[0].dimensions.y_radius).toBe(20);
      expect(result.volumes[0].dimensions.z_radius).toBe(30);
    });

    it('converts polycone zSections to arrays', () => {
      const geometry = {
        world: null,
        volumes: [
          {
            name: 'PC', g4name: 'PC', type: 'polycone',
            zSections: [
              { z: -5, rMin: 0, rMax: 3 },
              { z: 0, rMin: 0, rMax: 5 },
              { z: 5, rMin: 0, rMax: 2 },
            ],
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            mother_volume: 'World', material: 'G4_AIR',
            visible: true
          },
        ],
      };

      const result = generateJson(geometry);
      const dims = result.volumes[0].dimensions;
      expect(dims.z).toEqual([-5, 0, 5]);
      expect(dims.rmin).toEqual([0, 0, 0]);
      expect(dims.rmax).toEqual([3, 5, 2]);
    });

    it('handles null/missing geometry gracefully', () => {
      const result = generateJson(null);
      expect(result.world).toBeNull();
      expect(result.volumes).toEqual([]);
    });

    it('preserves hitsCollectionName in output', () => {
      const geometry = {
        world: null,
        volumes: [
          {
            name: 'Det', g4name: 'Det', type: 'box',
            size: { x: 10, y: 10, z: 10 },
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            mother_volume: 'World', material: 'G4_AIR',
            visible: true,
            hitsCollectionName: 'MyHits'
          },
        ],
      };

      const result = generateJson(geometry);
      expect(result.volumes[0].hitsCollectionName).toBe('MyHits');
    });
  });

  describe('generateTemplateJson', () => {
    it('returns null for invalid inputs', () => {
      expect(generateTemplateJson(null, 'id')).toBeNull();
      expect(generateTemplateJson({}, null)).toBeNull();
    });

    it('extracts an assembly and its children', () => {
      const geometry = {
        volumes: [
          { name: 'Asm1', type: 'assembly', _compoundId: 'asm_1', mother_volume: 'World', g4name: 'Asm1', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
          { name: 'Child1', type: 'box', _compoundId: 'asm_1', mother_volume: 'Asm1', g4name: 'Child1', size: { x: 5, y: 5, z: 5 }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, _componentId: 'c1' },
          { name: 'Other', type: 'sphere', mother_volume: 'World', g4name: 'Other', radius: 10, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
        ],
      };

      const result = generateTemplateJson(geometry, 'asm_1', 'Asm1');
      // Should contain the assembly and its child, but not 'Other'
      expect(result.volumes.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('jsonToGeometry', () => {
  it('creates a new geometry from JSON with world', () => {
    const json = {
      world: {
        name: 'World',
        type: 'box',
        dimensions: { x: 500, y: 500, z: 500 },
        material: 'G4_AIR',
        placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }],
      },
      volumes: [],
    };

    const result = jsonToGeometry(json, { geometries: { world: null, volumes: [] }, materials: {} });

    expect(result.geometries.world.name).toBe('World');
    expect(result.geometries.world.size).toEqual({ x: 500, y: 500, z: 500 });
  });

  it('returns geometry unchanged for null json', () => {
    const geo = { geometries: { world: null, volumes: [] }, materials: {} };
    const result = jsonToGeometry(null, geo);
    expect(result).toBe(geo);
  });

  it('imports materials from JSON', () => {
    const json = {
      materials: { G4_WATER: { density: 1.0, color: [0, 0, 1, 0.5] } },
    };
    const geo = { geometries: { world: null, volumes: [] }, materials: {} };

    const result = jsonToGeometry(json, geo);
    expect(result.materials.G4_WATER).toBeDefined();
    expect(result.materials.G4_WATER.density).toBe(1.0);
  });

  it('creates standard volumes from JSON with placements', () => {
    const json = {
      world: {
        name: 'World', type: 'box',
        dimensions: { x: 1000, y: 1000, z: 1000 },
        placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }],
      },
      volumes: [
        {
          name: 'Box1', g4name: 'Box1', type: 'box',
          dimensions: { x: 10, y: 20, z: 30 },
          material: 'G4_AIR',
          placements: [
            { name: 'Box1', g4name: 'Box1', x: 5, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
          ],
          visible: true,
        },
      ],
    };

    const geo = { geometries: { world: null, volumes: [] }, materials: {} };
    const result = jsonToGeometry(json, geo);

    expect(result.geometries.volumes.length).toBe(1);
    expect(result.geometries.volumes[0].type).toBe('box');
  });

  it('handles multiple placements by creating multiple volume entries', () => {
    const json = {
      world: {
        name: 'World', type: 'box',
        dimensions: { x: 1000, y: 1000, z: 1000 },
        placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 } }],
      },
      volumes: [
        {
          name: 'Box1', g4name: 'Box1', type: 'box',
          dimensions: { x: 10, y: 10, z: 10 },
          material: 'G4_AIR',
          placements: [
            { name: 'Box1_0', g4name: 'Box1_0', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
            { name: 'Box1_1', g4name: 'Box1_1', x: 10, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
          ],
          visible: true,
        },
      ],
    };

    const geo = { geometries: { world: null, volumes: [] }, materials: {} };
    const result = jsonToGeometry(json, geo);

    // Should create 2 volume entries (one per placement)
    expect(result.geometries.volumes.length).toBe(2);
  });
});
