import { describe, it, expect } from 'vitest';
import { getMaterialColor } from '../materialColorUtils';

describe('getMaterialColor', () => {
  const DEFAULT = 'rgba(180, 180, 180, 0.7)';

  it('returns default when materialName is falsy', () => {
    expect(getMaterialColor(null, {})).toBe(DEFAULT);
    expect(getMaterialColor('', {})).toBe(DEFAULT);
    expect(getMaterialColor(undefined, {})).toBe(DEFAULT);
  });

  it('returns default when materials is empty', () => {
    expect(getMaterialColor('steel', {})).toBe(DEFAULT);
  });

  it('returns default when materials is null/undefined', () => {
    expect(getMaterialColor('steel', null)).toBe(DEFAULT);
    expect(getMaterialColor('steel', undefined)).toBe(DEFAULT);
  });

  it('returns correct rgba for a material with color', () => {
    const materials = {
      copper: { color: [0.72, 0.45, 0.2, 0.8] }
    };
    expect(getMaterialColor('copper', materials)).toBe('rgba(183, 114, 51, 0.8)');
  });

  it('uses 0.7 alpha when color has no alpha channel', () => {
    const materials = {
      iron: { color: [0.5, 0.5, 0.5] }
    };
    expect(getMaterialColor('iron', materials)).toBe('rgba(127, 127, 127, 0.7)');
  });

  it('returns default when material exists but has no color', () => {
    const materials = {
      vacuum: { density: 0 }
    };
    expect(getMaterialColor('vacuum', materials)).toBe(DEFAULT);
  });

  it('returns default when material name not found in dictionary', () => {
    const materials = {
      copper: { color: [0.72, 0.45, 0.2, 0.8] }
    };
    expect(getMaterialColor('gold', materials)).toBe(DEFAULT);
  });

  it('respects custom default color', () => {
    const custom = 'rgba(255, 0, 0, 1)';
    expect(getMaterialColor('missing', {}, custom)).toBe(custom);
  });

  it('handles pure white [1,1,1,1]', () => {
    const materials = { white: { color: [1, 1, 1, 1] } };
    expect(getMaterialColor('white', materials)).toBe('rgba(255, 255, 255, 1)');
  });

  it('handles pure black [0,0,0,0]', () => {
    const materials = { black: { color: [0, 0, 0, 0] } };
    expect(getMaterialColor('black', materials)).toBe('rgba(0, 0, 0, 0)');
  });
});
