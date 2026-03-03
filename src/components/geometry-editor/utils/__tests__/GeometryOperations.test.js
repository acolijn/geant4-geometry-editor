import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateGeometry, addGeometry, removeGeometry } from '../GeometryOperations';

// Mock debugLog
vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

describe('GeometryOperations', () => {
  let setGeometries;
  let setSelectedGeometry;
  let baseGeometries;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setGeometries = vi.fn((updater) => {
      // Execute the updater if it's a function to test the logic inside
      if (typeof updater === 'function') {
        return updater(baseGeometries);
      }
    });
    setSelectedGeometry = vi.fn();
    baseGeometries = {
      world: { name: 'World', type: 'box', size: { x: 1000, y: 1000, z: 1000 }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [
        { name: 'Box1', type: 'box', size: { x: 10, y: 10, z: 10 }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, mother_volume: 'World' },
        { name: 'Cyl1', type: 'cylinder', radius: 5, height: 10, position: { x: 10, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, mother_volume: 'World' },
        { name: 'Child1', type: 'sphere', radius: 2, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, mother_volume: 'Box1' },
      ]
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('updateGeometry', () => {
    it('calls updateAssembliesFunc for assembly update via dialog', () => {
      const updateAssemblies = vi.fn();
      const extraData = { updateData: 'data', objectDefinition: 'def' };

      updateGeometry(
        baseGeometries, null, null, true, false, extraData,
        setGeometries, setSelectedGeometry, null, updateAssemblies, vi.fn()
      );

      expect(updateAssemblies).toHaveBeenCalledWith('data', 'def');
      expect(setGeometries).not.toHaveBeenCalled();
    });

    it('returns early when updatedObject is null and no extraData', () => {
      updateGeometry(
        baseGeometries, 'volume-0', null, true, false, null,
        setGeometries, setSelectedGeometry, null, null, vi.fn()
      );

      expect(setGeometries).not.toHaveBeenCalled();
    });

    it('updates world geometry', () => {
      const updatedWorld = { name: 'World', size: { x: 2000, y: 2000, z: 2000 } };

      updateGeometry(
        baseGeometries, 'world', updatedWorld, true, false, null,
        setGeometries, setSelectedGeometry, null, null, vi.fn()
      );

      expect(setGeometries).toHaveBeenCalled();
      expect(setSelectedGeometry).toHaveBeenCalledWith('world');
    });

    it('updates volume geometry', () => {
      const updated = { name: 'Box1', size: { x: 20, y: 20, z: 20 } };

      updateGeometry(
        baseGeometries, 'volume-0', updated, true, false, null,
        setGeometries, setSelectedGeometry, 'volume-0', null, vi.fn()
      );

      expect(setGeometries).toHaveBeenCalled();
      expect(setSelectedGeometry).toHaveBeenCalledWith('volume-0');
    });

    it('does not change selection when keepSelected is false', () => {
      const updated = { name: 'Box1', size: { x: 20, y: 20, z: 20 } };

      updateGeometry(
        baseGeometries, 'volume-0', updated, false, false, null,
        setGeometries, setSelectedGeometry, 'volume-0', null, vi.fn()
      );

      expect(setSelectedGeometry).not.toHaveBeenCalled();
    });

    it('updates daughter mother_volume when world name changes', () => {
      const updatedWorld = { name: 'NewWorld' };

      updateGeometry(
        baseGeometries, 'world', updatedWorld, true, false, null,
        setGeometries, setSelectedGeometry, null, null, vi.fn()
      );

      const updater = setGeometries.mock.calls[0][0];
      const result = updater(baseGeometries);

      // All volumes that had mother_volume 'World' should now reference 'NewWorld'
      const worldChildren = result.volumes.filter(v => v.mother_volume === 'NewWorld');
      expect(worldChildren.length).toBe(2); // Box1 and Cyl1
    });

    it('updates daughter mother_volume when volume name changes', () => {
      const updated = { name: 'RenamedBox' };

      updateGeometry(
        baseGeometries, 'volume-0', updated, true, false, null,
        setGeometries, setSelectedGeometry, 'volume-0', null, vi.fn()
      );

      const updater = setGeometries.mock.calls[0][0];
      const result = updater(baseGeometries);

      // Child1 had mother_volume 'Box1', should now be 'RenamedBox'
      const child = result.volumes.find(v => v.name === 'Child1');
      expect(child.mother_volume).toBe('RenamedBox');
    });
  });

  describe('addGeometry', () => {
    it('adds new geometry and calls setGeometries', () => {
      const propagate = vi.fn((name, id, vols) => vols);
      const newGeo = {
        name: 'NewBox',
        type: 'box',
        size: { x: 5, y: 5, z: 5 },
        mother_volume: 'World',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
      };

      const result = addGeometry(newGeo, baseGeometries, setGeometries, setSelectedGeometry, propagate);

      expect(result).toBe('NewBox');
      expect(setGeometries).toHaveBeenCalled();
    });

    it('auto-generates g4name if not provided', () => {
      const propagate = vi.fn((name, id, vols) => vols);
      const newGeo = {
        name: 'test',
        type: 'box',
        mother_volume: 'World',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
      };

      addGeometry(newGeo, baseGeometries, setGeometries, setSelectedGeometry, propagate);

      // Should have auto-generated g4name: Box_N (1 existing box + 1 = Box_2)
      expect(newGeo.g4name).toBe('Box_2');
    });

    it('propagates compoundId from assembly parent', () => {
      const propagate = vi.fn((name, id, vols) => vols);
      const geoWithAssembly = {
        ...baseGeometries,
        volumes: [
          ...baseGeometries.volumes,
          { name: 'Asm1', type: 'assembly', _compoundId: 'asm_compound', mother_volume: 'World' }
        ]
      };

      const newGeo = {
        name: 'InAsm',
        type: 'box',
        mother_volume: 'Asm1',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
      };

      addGeometry(newGeo, geoWithAssembly, setGeometries, setSelectedGeometry, propagate);

      expect(newGeo._compoundId).toBe('asm_compound');
    });
  });

  describe('removeGeometry', () => {
    it('refuses to remove world', () => {
      removeGeometry('world', baseGeometries, setGeometries, setSelectedGeometry, null);
      expect(setGeometries).not.toHaveBeenCalled();
    });

    it('removes a volume and its descendants', () => {
      removeGeometry('volume-0', baseGeometries, setGeometries, setSelectedGeometry, 'volume-0');

      expect(setGeometries).toHaveBeenCalled();
      const updater = setGeometries.mock.calls[0][0];
      const result = updater(baseGeometries);

      // Box1 (index 0) and Child1 (index 2, child of Box1) should be removed
      // Only Cyl1 should remain
      expect(result.volumes.length).toBe(1);
      expect(result.volumes[0].name).toBe('Cyl1');
    });

    it('removes a leaf volume without affecting others', () => {
      removeGeometry('volume-1', baseGeometries, setGeometries, setSelectedGeometry, 'volume-2');

      const updater = setGeometries.mock.calls[0][0];
      const result = updater(baseGeometries);

      // Only Cyl1 (index 1) should be removed
      expect(result.volumes.length).toBe(2);
      expect(result.volumes[0].name).toBe('Box1');
      expect(result.volumes[1].name).toBe('Child1');
    });

    it('deselects when selected volume is removed', () => {
      removeGeometry('volume-0', baseGeometries, setGeometries, setSelectedGeometry, 'volume-0');

      // The updater should call setSelectedGeometry(null)
      const updater = setGeometries.mock.calls[0][0];
      updater(baseGeometries);
      expect(setSelectedGeometry).toHaveBeenCalledWith(null);
    });
  });
});
