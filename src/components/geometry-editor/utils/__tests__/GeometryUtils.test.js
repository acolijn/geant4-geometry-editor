import { describe, it, expect } from 'vitest';
import {
  extractObjectWithDescendants,
  findAllDescendants,
  hasChildren,
  getSelectedGeometryObject
} from '../GeometryUtils';

const makeGeometries = () => ({
  world: { name: 'World', type: 'box', material: 'G4_AIR', size: { x: 1000, y: 1000, z: 1000 } },
  volumes: [
    { _id: 'vol-0-pl-0', name: 'Parent', type: 'box', mother_volume: 'World', material: 'G4_WATER' },
    { _id: 'vol-1-pl-0', name: 'Child1', type: 'box', mother_volume: 'Parent', material: 'G4_WATER' },
    { _id: 'vol-2-pl-0', name: 'Child2', type: 'box', mother_volume: 'Parent', material: 'G4_WATER' },
    { _id: 'vol-3-pl-0', name: 'Grandchild', type: 'box', mother_volume: 'Child1', material: 'G4_WATER' },
  ]
});

describe('findAllDescendants', () => {
  it('finds direct children', () => {
    const geo = makeGeometries();
    const desc = findAllDescendants('Parent', geo.volumes);
    expect(desc.map(d => d.name)).toContain('Child1');
    expect(desc.map(d => d.name)).toContain('Child2');
  });

  it('finds grandchildren recursively', () => {
    const geo = makeGeometries();
    const desc = findAllDescendants('Parent', geo.volumes);
    expect(desc.map(d => d.name)).toContain('Grandchild');
    expect(desc).toHaveLength(3);
  });

  it('returns empty for leaf nodes', () => {
    const geo = makeGeometries();
    expect(findAllDescendants('Grandchild', geo.volumes)).toHaveLength(0);
  });

  it('returns empty for non-existent parent', () => {
    const geo = makeGeometries();
    expect(findAllDescendants('NoSuchVolume', geo.volumes)).toHaveLength(0);
  });
});

describe('hasChildren', () => {
  it('returns true for nodes with children', () => {
    const geo = makeGeometries();
    expect(hasChildren('Parent', geo.volumes)).toBe(true);
    expect(hasChildren('Child1', geo.volumes)).toBe(true);
  });

  it('returns false for leaf nodes', () => {
    const geo = makeGeometries();
    expect(hasChildren('Grandchild', geo.volumes)).toBe(false);
  });

  it('returns false for non-existent names', () => {
    const geo = makeGeometries();
    expect(hasChildren('NoSuchVolume', geo.volumes)).toBe(false);
  });
});

describe('getSelectedGeometryObject', () => {
  it('returns null when no selection', () => {
    const geo = makeGeometries();
    expect(getSelectedGeometryObject(null, geo)).toBeNull();
    expect(getSelectedGeometryObject(undefined, geo)).toBeNull();
  });

  it('returns world when world is selected', () => {
    const geo = makeGeometries();
    const result = getSelectedGeometryObject('world', geo);
    expect(result.name).toBe('World');
  });

  it('returns the volume by _id key', () => {
    const geo = makeGeometries();
    const result = getSelectedGeometryObject('vol-1-pl-0', geo);
    expect(result.name).toBe('Child1');
  });

  it('returns null for unknown key', () => {
    const geo = makeGeometries();
    expect(getSelectedGeometryObject('vol-99-pl-0', geo)).toBeNull();
  });

  it('returns null for non-volume-key strings', () => {
    const geo = makeGeometries();
    expect(getSelectedGeometryObject('some-random-string', geo)).toBeNull();
  });
});

describe('extractObjectWithDescendants', () => {
  it('extracts world by id', () => {
    const geo = makeGeometries();
    const result = extractObjectWithDescendants('world', geo);
    expect(result.isWorld).toBe(true);
    expect(result.object.name).toBe('World');
  });

  it('extracts volume by _id key', () => {
    const geo = makeGeometries();
    const result = extractObjectWithDescendants('vol-0-pl-0', geo);
    expect(result.object.name).toBe('Parent');
    expect(result.objectType).toBe('volume');
    expect(result.descendants).toHaveLength(3);
  });

  it('extracts volume by name', () => {
    const geo = makeGeometries();
    const result = extractObjectWithDescendants('Child1', geo);
    expect(result.object.name).toBe('Child1');
    expect(result.descendants).toHaveLength(1); // Grandchild
  });

  it('extracts by object reference', () => {
    const geo = makeGeometries();
    const result = extractObjectWithDescendants(geo.volumes[0], geo);
    expect(result.object.name).toBe('Parent');
    expect(result.isWorld).toBe(false);
  });

  it('returns null for non-existent identifier', () => {
    const geo = makeGeometries();
    const result = extractObjectWithDescendants('NoSuch', geo);
    expect(result).toBeNull();
  });

  it('strips g4name from extracted object', () => {
    const geo = makeGeometries();
    geo.volumes[0].g4name = 'test_g4name';
    const result = extractObjectWithDescendants('vol-0-pl-0', geo);
    expect(result.object.g4name).toBeUndefined();
  });
});
