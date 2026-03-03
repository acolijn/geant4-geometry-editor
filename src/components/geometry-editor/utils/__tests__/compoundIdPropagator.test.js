import { describe, it, expect, vi } from 'vitest';
import { propagateCompoundId, propagateCompoundIdToDescendants } from '../compoundIdPropagator';

// Mock debugLog
vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

describe('compoundIdPropagator', () => {
  describe('propagateCompoundId', () => {
    it('adds _compoundId to an object', () => {
      const obj = { name: 'Box1', type: 'box' };
      const result = propagateCompoundId(obj, 'asm_1');

      expect(result._compoundId).toBe('asm_1');
      expect(result.name).toBe('Box1');
    });

    it('does not mutate the original object', () => {
      const obj = { name: 'Box1', type: 'box' };
      propagateCompoundId(obj, 'asm_1');

      expect(obj._compoundId).toBeUndefined();
    });

    it('returns the object as-is if object is null', () => {
      expect(propagateCompoundId(null, 'asm_1')).toBeNull();
    });

    it('returns the object as-is if compoundId is null', () => {
      const obj = { name: 'Box1' };
      expect(propagateCompoundId(obj, null)).toEqual({ name: 'Box1' });
    });
  });

  describe('propagateCompoundIdToDescendants', () => {
    it('propagates to direct children', () => {
      const volumes = [
        { name: 'Parent', type: 'assembly', _compoundId: 'parent_id', mother_volume: 'World' },
        { name: 'Child1', type: 'box', mother_volume: 'Parent' },
        { name: 'Child2', type: 'sphere', mother_volume: 'Parent' },
        { name: 'Other', type: 'box', mother_volume: 'World' },
      ];

      const result = propagateCompoundIdToDescendants('Parent', 'parent_id', volumes);

      expect(result[1]._compoundId).toBe('parent_id');
      expect(result[2]._compoundId).toBe('parent_id');
      expect(result[3]._compoundId).toBeUndefined(); // 'Other' should not be affected
    });

    it('propagates recursively to grandchildren', () => {
      const volumes = [
        { name: 'Root', type: 'assembly', mother_volume: 'World' },
        { name: 'Child', type: 'box', mother_volume: 'Root' },
        { name: 'Grandchild', type: 'sphere', mother_volume: 'Child' },
      ];

      const result = propagateCompoundIdToDescendants('Root', 'root_id', volumes);

      expect(result[1]._compoundId).toBe('root_id');
      expect(result[2]._compoundId).toBe('root_id');
    });

    it('returns original array when no descendants found', () => {
      const volumes = [
        { name: 'Lonely', type: 'box', mother_volume: 'World' },
      ];

      const result = propagateCompoundIdToDescendants('Lonely', 'lonely_id', volumes);

      expect(result).toEqual(volumes);
    });

    it('returns original array for null/undefined inputs', () => {
      const volumes = [{ name: 'Box', type: 'box' }];

      expect(propagateCompoundIdToDescendants(null, 'id', volumes)).toEqual(volumes);
      expect(propagateCompoundIdToDescendants('name', null, volumes)).toEqual(volumes);
      expect(propagateCompoundIdToDescendants('name', 'id', null)).toBeNull();
    });

    it('handles deep nesting (3+ levels)', () => {
      const volumes = [
        { name: 'L0', type: 'assembly', mother_volume: 'World' },
        { name: 'L1', type: 'box', mother_volume: 'L0' },
        { name: 'L2', type: 'cylinder', mother_volume: 'L1' },
        { name: 'L3', type: 'sphere', mother_volume: 'L2' },
      ];

      const result = propagateCompoundIdToDescendants('L0', 'deep_id', volumes);

      expect(result[1]._compoundId).toBe('deep_id');
      expect(result[2]._compoundId).toBe('deep_id');
      expect(result[3]._compoundId).toBe('deep_id');
    });
  });
});
