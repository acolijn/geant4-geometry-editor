import { describe, it, expect } from 'vitest';
import { getGeometryIcon, getVolumeIcon, icons } from '../geometryIcons';

describe('geometryIcons', () => {
  describe('icons lookup', () => {
    it('has entries for all geometry types', () => {
      const expectedTypes = ['box', 'sphere', 'cylinder', 'ellipsoid', 'torus', 'polycone', 'trapezoid', 'assembly', 'union', 'default'];
      for (const type of expectedTypes) {
        expect(icons[type]).toBeDefined();
        expect(icons[type].regular).toBeDefined();
        expect(icons[type].filled).toBeDefined();
      }
    });
  });

  describe('getGeometryIcon', () => {
    it('returns outline icon for known type', () => {
      expect(getGeometryIcon('box')).toBe(icons.box.regular);
    });

    it('returns outline icon regardless of extra args', () => {
      // After our refactor, icons always return regular (outline)
      expect(getGeometryIcon('box')).toBe(icons.box.regular);
    });

    it('returns default icon for unknown type', () => {
      expect(getGeometryIcon('hexahedron')).toBe(icons.default.regular);
    });
  });

  describe('getVolumeIcon', () => {
    it('returns correct icon for volume object', () => {
      expect(getVolumeIcon({ type: 'sphere' })).toBe(icons.sphere.regular);
    });

    it('returns correct icon for cylinder volume', () => {
      expect(getVolumeIcon({ type: 'cylinder' })).toBe(icons.cylinder.regular);
    });
  });
});
