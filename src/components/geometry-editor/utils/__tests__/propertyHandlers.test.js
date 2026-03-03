import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPropertyHandlers } from '../propertyHandlers';

// Mock logger
vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

describe('propertyHandlers', () => {
  let onUpdateGeometry;
  let handlers;
  let geometries;

  beforeEach(() => {
    onUpdateGeometry = vi.fn();
    geometries = {
      world: {
        name: 'World', type: 'box',
        size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
      },
      volumes: [
        {
          name: 'Box1', type: 'box',
          size: { x: 10, y: 10, z: 10 },
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World'
        },
        {
          name: 'Union1', type: 'union',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'World'
        },
      ]
    };
    handlers = createPropertyHandlers({
      onUpdateGeometry,
      selectedGeometry: 'volume-0',
      geometries,
    });
  });

  describe('getSelectedGeometryObjectLocal', () => {
    it('returns the selected volume', () => {
      const obj = handlers.getSelectedGeometryObjectLocal();
      expect(obj.name).toBe('Box1');
    });

    it('returns null when nothing is selected', () => {
      const h = createPropertyHandlers({
        onUpdateGeometry,
        selectedGeometry: null,
        geometries,
      });
      expect(h.getSelectedGeometryObjectLocal()).toBeNull();
    });

    it('returns world when world is selected', () => {
      const h = createPropertyHandlers({
        onUpdateGeometry,
        selectedGeometry: 'world',
        geometries,
      });
      expect(h.getSelectedGeometryObjectLocal().name).toBe('World');
    });
  });

  describe('handlePropertyChange', () => {
    it('updates a direct property', () => {
      handlers.handlePropertyChange('material', 'G4_WATER');

      expect(onUpdateGeometry).toHaveBeenCalledWith(
        'volume-0',
        expect.objectContaining({ material: 'G4_WATER' })
      );
    });

    it('updates a nested property like position.x', () => {
      handlers.handlePropertyChange('position.x', 42);

      const call = onUpdateGeometry.mock.calls[0];
      expect(call[1].position.x).toBe(42);
    });

    it('synchronizes box dimensions and size', () => {
      handlers.handlePropertyChange('dimensions.x', 99);

      const updated = onUpdateGeometry.mock.calls[0][1];
      expect(updated.dimensions.x).toBe(99);
      expect(updated.size.x).toBe(99);
    });

    it('synchronizes box size to dimensions', () => {
      handlers.handlePropertyChange('size.y', 77);

      const updated = onUpdateGeometry.mock.calls[0][1];
      expect(updated.size.y).toBe(77);
      expect(updated.dimensions.y).toBe(77);
    });

    it('does nothing when no geometry is selected', () => {
      const h = createPropertyHandlers({
        onUpdateGeometry,
        selectedGeometry: null,
        geometries,
      });
      h.handlePropertyChange('material', 'G4_WATER');
      expect(onUpdateGeometry).not.toHaveBeenCalled();
    });

    it('handles array values (e.g., zSections)', () => {
      const sections = [{ z: -5, rMin: 0, rMax: 3 }];
      handlers.handlePropertyChange('zSections', sections);

      const updated = onUpdateGeometry.mock.calls[0][1];
      expect(updated.zSections).toEqual(sections);
    });
  });

  describe('handleRotationChange', () => {
    it('updates rotation on a given axis', () => {
      handlers.handleRotationChange('x', 1.57);

      const updated = onUpdateGeometry.mock.calls[0][1];
      expect(updated.rotation.x).toBeCloseTo(1.57);
    });

    it('creates rotation object if missing', () => {
      // Create a volume without rotation
      geometries.volumes[0] = {
        name: 'NoRot', type: 'box',
        size: { x: 10, y: 10, z: 10 },
        position: { x: 0, y: 0, z: 0 },
        mother_volume: 'World'
      };
      const h = createPropertyHandlers({
        onUpdateGeometry,
        selectedGeometry: 'volume-0',
        geometries,
      });

      h.handleRotationChange('z', 0.5);
      const updated = onUpdateGeometry.mock.calls[0][1];
      expect(updated.rotation.z).toBe(0.5);
      expect(updated.rotation.x).toBe(0);
    });

    it('ignores NaN values', () => {
      handlers.handleRotationChange('x', 'not_a_number');
      expect(onUpdateGeometry).not.toHaveBeenCalled();
    });
  });

  describe('handleRelativePositionChange', () => {
    it('updates relative_position for union type', () => {
      const unionHandlers = createPropertyHandlers({
        onUpdateGeometry,
        selectedGeometry: 'volume-1',
        geometries,
      });

      unionHandlers.handleRelativePositionChange('x', 5.0);

      const updated = onUpdateGeometry.mock.calls[0][1];
      expect(updated.relative_position.x).toBe(5.0);
    });

    it('ignores non-union types', () => {
      // volume-0 is a box, not a union
      handlers.handleRelativePositionChange('x', 5.0);
      expect(onUpdateGeometry).not.toHaveBeenCalled();
    });

    it('ignores NaN values', () => {
      const unionHandlers = createPropertyHandlers({
        onUpdateGeometry,
        selectedGeometry: 'volume-1',
        geometries,
      });
      unionHandlers.handleRelativePositionChange('x', 'abc');
      expect(onUpdateGeometry).not.toHaveBeenCalled();
    });
  });

  describe('handleRelativeRotationChange', () => {
    it('updates relative_rotation for union type', () => {
      const unionHandlers = createPropertyHandlers({
        onUpdateGeometry,
        selectedGeometry: 'volume-1',
        geometries,
      });

      unionHandlers.handleRelativeRotationChange('y', 0.3);

      const updated = onUpdateGeometry.mock.calls[0][1];
      expect(updated.relative_rotation.y).toBe(0.3);
    });

    it('ignores non-union types', () => {
      handlers.handleRelativeRotationChange('y', 0.3);
      expect(onUpdateGeometry).not.toHaveBeenCalled();
    });
  });

  describe('handleInputFocus', () => {
    it('calls select on the event target', () => {
      const event = { target: { select: vi.fn() } };
      handlers.handleInputFocus(event);
      expect(event.target.select).toHaveBeenCalled();
    });
  });
});
