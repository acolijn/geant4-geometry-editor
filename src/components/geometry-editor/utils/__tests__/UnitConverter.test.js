import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toInternalUnit, fromInternalUnit, getAvailableUnits, formatValueWithUnit } from '../UnitConverter';

// Silence expected console.warn from unknown-unit tests
vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

describe('UnitConverter', () => {
  // ── toInternalUnit ──────────────────────────────────────────────
  describe('toInternalUnit', () => {
    it('converts cm to mm', () => {
      expect(toInternalUnit(1, 'cm', 'length')).toBe(10);
    });

    it('converts m to mm', () => {
      expect(toInternalUnit(2, 'm', 'length')).toBe(2000);
    });

    it('keeps mm unchanged', () => {
      expect(toInternalUnit(5, 'mm', 'length')).toBe(5);
    });

    it('converts inches to mm', () => {
      expect(toInternalUnit(1, 'in', 'length')).toBe(25.4);
    });

    it('converts micrometers to mm', () => {
      expect(toInternalUnit(1000, 'um', 'length')).toBe(1);
    });

    it('converts degrees to radians', () => {
      expect(toInternalUnit(180, 'deg', 'angle')).toBeCloseTo(Math.PI);
    });

    it('keeps radians unchanged', () => {
      expect(toInternalUnit(1, 'rad', 'angle')).toBe(1);
    });

    it('returns null/undefined as-is', () => {
      expect(toInternalUnit(null, 'cm')).toBeNull();
      expect(toInternalUnit(undefined, 'cm')).toBeUndefined();
    });

    it('returns value as-is for unknown unit', () => {
      expect(toInternalUnit(5, 'lightyear', 'length')).toBe(5);
    });
  });

  // ── fromInternalUnit ────────────────────────────────────────────
  describe('fromInternalUnit', () => {
    it('converts mm to cm', () => {
      expect(fromInternalUnit(10, 'cm', 'length')).toBe(1);
    });

    it('converts mm to m', () => {
      expect(fromInternalUnit(2000, 'm', 'length')).toBe(2);
    });

    it('keeps mm unchanged', () => {
      expect(fromInternalUnit(5, 'mm', 'length')).toBe(5);
    });

    it('converts radians to degrees', () => {
      expect(fromInternalUnit(Math.PI, 'deg', 'angle')).toBeCloseTo(180);
    });

    it('round-trips correctly (cm)', () => {
      const original = 42;
      const internal = toInternalUnit(original, 'cm', 'length');
      expect(fromInternalUnit(internal, 'cm', 'length')).toBeCloseTo(original);
    });

    it('round-trips correctly (deg)', () => {
      const original = 90;
      const internal = toInternalUnit(original, 'deg', 'angle');
      expect(fromInternalUnit(internal, 'deg', 'angle')).toBeCloseTo(original);
    });

    it('returns null/undefined as-is', () => {
      expect(fromInternalUnit(null, 'cm')).toBeNull();
      expect(fromInternalUnit(undefined, 'cm')).toBeUndefined();
    });
  });

  // ── getAvailableUnits ───────────────────────────────────────────
  describe('getAvailableUnits', () => {
    it('returns length units', () => {
      const units = getAvailableUnits('length');
      expect(units).toContain('mm');
      expect(units).toContain('cm');
      expect(units).toContain('m');
    });

    it('returns angle units', () => {
      const units = getAvailableUnits('angle');
      expect(units).toContain('rad');
      expect(units).toContain('deg');
    });

    it('defaults to length', () => {
      expect(getAvailableUnits()).toEqual(getAvailableUnits('length'));
    });
  });

  // ── formatValueWithUnit ─────────────────────────────────────────
  describe('formatValueWithUnit', () => {
    it('formats mm value displayed as cm', () => {
      expect(formatValueWithUnit(10, 'cm', 'length', 1)).toBe('1.0 cm');
    });

    it('returns empty string for null/undefined', () => {
      expect(formatValueWithUnit(null, 'cm')).toBe('');
      expect(formatValueWithUnit(undefined, 'cm')).toBe('');
    });

    it('respects precision parameter', () => {
      expect(formatValueWithUnit(10, 'cm', 'length', 3)).toBe('1.000 cm');
    });
  });
});
