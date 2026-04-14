import { describe, it, expect, vi } from 'vitest';
import {
  extractSubtreeFromJson,
  mergeJsonVolumes,
} from '../jsonOperations';

vi.mock('../logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

describe('extractSubtreeFromJson', () => {
  const makeScene = () => ({
    world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
    volumes: [
      {
        name: 'myBox',
        type: 'box',
        material: 'LXe',
        dimensions: { x: 100, y: 100, z: 100 },
        placements: [{ name: 'myBox_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
      },
      {
        name: 'myCylinder',
        type: 'cylinder',
        material: 'G4_Al',
        dimensions: { radius: 50, height: 100, inner_radius: 0 },
        placements: [{ name: 'myCylinder_000', x: 0, y: 0, z: 80, rotation: { x: 0, y: 0, z: 0 }, parent: 'myBox_000' }],
      },
      {
        name: 'otherBox',
        type: 'box',
        material: 'G4_AIR',
        dimensions: { x: 50, y: 50, z: 50 },
        placements: [{ name: 'otherBox_000', x: 100, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
      },
    ],
  });

  it('extracts a standard volume with daughter using volume name', () => {
    const scene = makeScene();
    const subtree = extractSubtreeFromJson(scene, 'myBox');
    expect(subtree.volumes).toHaveLength(2);
    expect(subtree.volumes.map(v => v.name).sort()).toEqual(['myBox', 'myCylinder']);
  });

  it('extracts a standard volume with daughter using placement name', () => {
    const scene = makeScene();
    const subtree = extractSubtreeFromJson(scene, 'myBox_000');
    expect(subtree.volumes).toHaveLength(2);
    expect(subtree.volumes.map(v => v.name).sort()).toEqual(['myBox', 'myCylinder']);
  });

  it('does not include unrelated volumes', () => {
    const scene = makeScene();
    const subtree = extractSubtreeFromJson(scene, 'myBox');
    expect(subtree.volumes.find(v => v.name === 'otherBox')).toBeUndefined();
  });

  it('extracts assembly with components', () => {
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'myAssembly',
          type: 'assembly',
          material: 'G4_AIR',
          _compoundId: 'myAssembly',
          placements: [{ name: 'myAssembly_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
          components: [
            {
              name: 'compBox',
              type: 'box',
              material: 'LXe',
              dimensions: { x: 10, y: 10, z: 10 },
              placements: [{ name: 'compBox_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            },
          ],
        },
        {
          name: 'childOfAssembly',
          type: 'cylinder',
          material: 'G4_Al',
          dimensions: { radius: 5, height: 20, inner_radius: 0 },
          placements: [{ name: 'childOfAssembly_000', x: 0, y: 0, z: 50, rotation: { x: 0, y: 0, z: 0 }, parent: 'myAssembly_000' }],
        },
        {
          name: 'unrelated',
          type: 'box',
          material: 'G4_AIR',
          dimensions: { x: 50, y: 50, z: 50 },
          placements: [{ name: 'unrelated_000', x: 100, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
        },
      ],
    };

    const subtree = extractSubtreeFromJson(scene, 'myAssembly');
    // Assembly + its external child (childOfAssembly should be restructured into components)
    const names = subtree.volumes.map(v => v.name);
    expect(names).toContain('myAssembly');
    expect(names).not.toContain('unrelated');
    // childOfAssembly should either be in volumes or restructured into assembly components
    const assembly = subtree.volumes.find(v => v.name === 'myAssembly');
    const hasChildExternal = names.includes('childOfAssembly');
    const hasChildInComponents = assembly.components?.some(c => c.name === 'childOfAssembly');
    expect(hasChildExternal || hasChildInComponents).toBe(true);
  });

  it('extracts assembly using placement name', () => {
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'myAssembly',
          type: 'assembly',
          material: 'G4_AIR',
          _compoundId: 'myAssembly',
          placements: [{ name: 'myAssembly_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
          components: [
            {
              name: 'compBox',
              type: 'box',
              material: 'LXe',
              dimensions: { x: 10, y: 10, z: 10 },
              placements: [{ name: 'compBox_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            },
          ],
        },
      ],
    };

    const subtree = extractSubtreeFromJson(scene, 'myAssembly_000');
    expect(subtree.volumes).toHaveLength(1);
    expect(subtree.volumes[0].name).toBe('myAssembly');
    expect(subtree.volumes[0].components).toHaveLength(1);
  });
});

describe('mergeJsonVolumes — import with daughters', () => {
  it('imports a standard volume with daughter into an existing scene', () => {
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'existingBox',
          type: 'box',
          material: 'G4_AIR',
          dimensions: { x: 50, y: 50, z: 50 },
          placements: [{ name: 'existingBox_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
        },
      ],
    };

    const incoming = [
      {
        name: 'Hubba',
        type: 'box',
        material: 'LXe',
        dimensions: { x: 100, y: 100, z: 100 },
        placements: [{ name: 'Hubba_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
      },
      {
        name: 'HubbaCyl',
        type: 'cylinder',
        material: 'G4_Al',
        dimensions: { radius: 50, height: 100, inner_radius: 0 },
        placements: [{ name: 'HubbaCyl_000', x: 0, y: 0, z: 80, rotation: { x: 0, y: 0, z: 0 }, parent: 'Hubba_000' }],
      },
    ];

    const merged = mergeJsonVolumes(scene, incoming);
    expect(merged.volumes).toHaveLength(3);
    expect(merged.volumes.find(v => v.name === 'Hubba')).toBeDefined();
    expect(merged.volumes.find(v => v.name === 'HubbaCyl')).toBeDefined();
    // Daughter still points to parent
    const cyl = merged.volumes.find(v => v.name === 'HubbaCyl');
    expect(cyl.placements[0].parent).toBe('Hubba_000');
  });

  it('renames placement names and parent references on collision', () => {
    // Scene already has Hubba + HubbaCyl
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'Hubba',
          type: 'box',
          material: 'LXe',
          dimensions: { x: 100, y: 100, z: 100 },
          placements: [{ name: 'Hubba_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
        },
        {
          name: 'HubbaCyl',
          type: 'cylinder',
          material: 'G4_Al',
          dimensions: { radius: 50, height: 100, inner_radius: 0 },
          placements: [{ name: 'HubbaCyl_000', x: 0, y: 0, z: 80, rotation: { x: 0, y: 0, z: 0 }, parent: 'Hubba_000' }],
        },
      ],
    };

    // Import the same object again at a different position
    const incoming = [
      {
        name: 'Hubba',
        type: 'box',
        material: 'LXe',
        dimensions: { x: 100, y: 100, z: 100 },
        placements: [{ name: 'Hubba_000', x: 200, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
      },
      {
        name: 'HubbaCyl',
        type: 'cylinder',
        material: 'G4_Al',
        dimensions: { radius: 50, height: 100, inner_radius: 0 },
        placements: [{ name: 'HubbaCyl_000', x: 0, y: 0, z: 80, rotation: { x: 0, y: 0, z: 0 }, parent: 'Hubba_000' }],
      },
    ];

    const merged = mergeJsonVolumes(scene, incoming);
    // Still 2 volumes — placements merged, not new volumes
    expect(merged.volumes).toHaveLength(2);

    // Hubba has 2 placements: _000 and _001
    const hubba = merged.volumes.find(v => v.name === 'Hubba');
    expect(hubba.placements).toHaveLength(2);
    expect(hubba.placements[0].name).toBe('Hubba_000');
    expect(hubba.placements[1].name).toBe('Hubba_001');
    expect(hubba.placements[1].x).toBe(200);

    // HubbaCyl also has 2 placements: _000 → parent Hubba_000, _001 → parent Hubba_001
    const cyl = merged.volumes.find(v => v.name === 'HubbaCyl');
    expect(cyl.placements).toHaveLength(2);
    expect(cyl.placements[0].parent).toBe('Hubba_000');
    expect(cyl.placements[1].name).toBe('HubbaCyl_001');
    expect(cyl.placements[1].parent).toBe('Hubba_001');
  });
});
