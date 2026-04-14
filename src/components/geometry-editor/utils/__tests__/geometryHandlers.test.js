import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGeometryHandlers, generateUniqueName } from '../geometryHandlers';

// Mock logger
vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

describe('geometryHandlers', () => {
  // Silence expected console.error from validation tests
  let consoleErrorSpy;
  beforeEach(() => { consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { consoleErrorSpy.mockRestore(); });

  describe('generateUniqueName', () => {
    it('generates a name with the type prefix', () => {
      const name = generateUniqueName('box');
      expect(name).toMatch(/^box_\d+_\d+$/);
    });

    it('generates unique names on successive calls', () => {
      const a = generateUniqueName('sphere');
      const b = generateUniqueName('sphere');
      expect(a).not.toBe(b);
    });
  });

  describe('createGeometryHandlers', () => {
    let onAddGeometry;
    let onUpdateGeometry;
    let setImportAlert;
    let handlers;
    let geometries;

    beforeEach(() => {
      onAddGeometry = vi.fn();
      onUpdateGeometry = vi.fn();
      setImportAlert = vi.fn();
      geometries = {
        world: { name: 'World', type: 'box', size: { x: 1000, y: 1000, z: 1000 } },
        volumes: []
      };
      handlers = createGeometryHandlers(
        { onAddGeometry, onUpdateGeometry, geometries, materials: [], setImportAlert },
        { newGeometryType: 'box', newMotherVolume: 'World' }
      );
    });

    describe('handleAddGeometry', () => {
      it('calls onAddGeometry with a box object', () => {
        handlers.handleAddGeometry();

        expect(onAddGeometry).toHaveBeenCalledTimes(1);
        const added = onAddGeometry.mock.calls[0][0];
        expect(added.type).toBe('box');
        expect(added.mother_volume).toBe('World');
        expect(added.size).toEqual({ x: 100, y: 100, z: 100 });
        expect(added.position).toEqual({ x: 0, y: 0, z: 0 });
      });

      it('creates cylinder with correct defaults', () => {
        const h = createGeometryHandlers(
          { onAddGeometry, onUpdateGeometry, geometries, materials: [], setImportAlert },
          { newGeometryType: 'cylinder', newMotherVolume: 'World' }
        );
        h.handleAddGeometry();

        const added = onAddGeometry.mock.calls[0][0];
        expect(added.type).toBe('cylinder');
        expect(added.radius).toBe(50);
        expect(added.height).toBe(100);
        expect(added.innerRadius).toBe(0);
        expect(added.spanningAngle).toBeCloseTo(2 * Math.PI);
      });

      it('creates sphere with correct defaults', () => {
        const h = createGeometryHandlers(
          { onAddGeometry, onUpdateGeometry, geometries, materials: [], setImportAlert },
          { newGeometryType: 'sphere', newMotherVolume: 'World' }
        );
        h.handleAddGeometry();

        const added = onAddGeometry.mock.calls[0][0];
        expect(added.type).toBe('sphere');
        expect(added.radius).toBe(50);
        expect(added.spanningPhi).toBeCloseTo(2 * Math.PI);
        expect(added.spanningTheta).toBeCloseTo(Math.PI);
      });

      it('creates ellipsoid with correct defaults', () => {
        const h = createGeometryHandlers(
          { onAddGeometry, onUpdateGeometry, geometries, materials: [], setImportAlert },
          { newGeometryType: 'ellipsoid', newMotherVolume: 'World' }
        );
        h.handleAddGeometry();

        const added = onAddGeometry.mock.calls[0][0];
        expect(added.type).toBe('ellipsoid');
        expect(added.xRadius).toBe(50);
        expect(added.yRadius).toBe(30);
        expect(added.zRadius).toBe(40);
      });

      it('creates torus with correct defaults', () => {
        const h = createGeometryHandlers(
          { onAddGeometry, onUpdateGeometry, geometries, materials: [], setImportAlert },
          { newGeometryType: 'torus', newMotherVolume: 'World' }
        );
        h.handleAddGeometry();

        const added = onAddGeometry.mock.calls[0][0];
        expect(added.majorRadius).toBe(50);
        expect(added.minorRadius).toBe(10);
      });

      it('creates polycone with zSections', () => {
        const h = createGeometryHandlers(
          { onAddGeometry, onUpdateGeometry, geometries, materials: [], setImportAlert },
          { newGeometryType: 'polycone', newMotherVolume: 'World' }
        );
        h.handleAddGeometry();

        const added = onAddGeometry.mock.calls[0][0];
        expect(added.zSections).toHaveLength(3);
        expect(added.zSections[0]).toEqual({ z: -50, rMin: 0, rMax: 30 });
      });

      it('creates trapezoid with correct defaults', () => {
        const h = createGeometryHandlers(
          { onAddGeometry, onUpdateGeometry, geometries, materials: [], setImportAlert },
          { newGeometryType: 'trapezoid', newMotherVolume: 'World' }
        );
        h.handleAddGeometry();

        const added = onAddGeometry.mock.calls[0][0];
        expect(added.dx1).toBe(50);
        expect(added.dz).toBe(50);
      });

      it('creates assembly with _compoundId matching name', () => {
        const h = createGeometryHandlers(
          { onAddGeometry, onUpdateGeometry, geometries, materials: [], setImportAlert },
          { newGeometryType: 'assembly', newMotherVolume: 'World' }
        );
        h.handleAddGeometry();

        const added = onAddGeometry.mock.calls[0][0];
        expect(added.type).toBe('assembly');
        expect(added._compoundId).toBe(added.name);
      });

      it('creates union with _compoundId matching name', () => {
        const h = createGeometryHandlers(
          { onAddGeometry, onUpdateGeometry, geometries, materials: [], setImportAlert },
          { newGeometryType: 'union', newMotherVolume: 'World' }
        );
        h.handleAddGeometry();

        const added = onAddGeometry.mock.calls[0][0];
        expect(added.type).toBe('union');
        expect(added._compoundId).toBe(added.name);
      });

      it('each new object gets a unique _componentId', () => {
        handlers.handleAddGeometry();
        const first = onAddGeometry.mock.calls[0][0];

        handlers.handleAddGeometry();
        const second = onAddGeometry.mock.calls[1][0];

        expect(first._componentId).toBeTruthy();
        expect(second._componentId).toBeTruthy();
        expect(first._componentId).not.toBe(second._componentId);
      });
    });

    describe('handleUpdateObjects', () => {
      it('returns error when no instances selected', () => {
        const result = handlers.handleUpdateObjects([], {});
        expect(result.success).toBe(false);
      });

      it('returns error when no object data provided', () => {
        const result = handlers.handleUpdateObjects(['vol-0-pl-0'], null);
        expect(result.success).toBe(false);
      });

      it('updates a volume instance', () => {
        const g = {
          world: { name: 'World', type: 'box', size: { x: 1000, y: 1000, z: 1000 } },
          volumes: [
            { _id: 'vol-0-pl-0', name: 'Box1', type: 'box', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, mother_volume: 'World' }
          ]
        };
        const h = createGeometryHandlers(
          { onAddGeometry, onUpdateGeometry, geometries: g, materials: [], setImportAlert },
          { newGeometryType: 'box', newMotherVolume: 'World' }
        );

        const result = h.handleUpdateObjects(
          ['vol-0-pl-0'],
          { object: { type: 'box', size: { x: 50, y: 50, z: 50 } } }
        );

        expect(result.success).toBe(true);
        expect(result.updatedCount).toBe(1);
        expect(onUpdateGeometry).toHaveBeenCalled();
      });
    });
  });
});
