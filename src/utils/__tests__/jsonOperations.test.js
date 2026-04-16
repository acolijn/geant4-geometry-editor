import { describe, it, expect, vi } from 'vitest';
import {
  extractSubtreeFromJson,
  mergeJsonVolumes,
  applyAddToJson,
  applyUpdateToJson,
  applyRemoveFromJson,
  applyDuplicateVolumeToJson,
} from '../jsonOperations';
import { expandToFlat } from '../expandToFlat';

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
    // childOfAssembly should be restructured into assembly components (with unique name)
    const assembly = subtree.volumes.find(v => v.name === 'myAssembly');
    const hasChildInComponents = assembly.components?.some(c => c.g4name === 'childOfAssembly' || c.name.startsWith('childOfAssembly'));
    expect(hasChildInComponents).toBe(true);
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

  it('reduces multi-placement volumes to a single canonical placement', () => {
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'PMT',
          type: 'assembly',
          material: 'G4_AIR',
          _compoundId: 'PMT',
          placements: [
            { name: 'PMT_000', x: 100, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
            { name: 'PMT_001', x: 200, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
            { name: 'PMT_002', x: 300, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
          ],
          components: [
            {
              name: 'base',
              type: 'box',
              material: 'LXe',
              dimensions: { x: 10, y: 10, z: 10 },
              placements: [{ name: 'base_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            },
          ],
        },
      ],
    };

    const subtree = extractSubtreeFromJson(scene, 'PMT');
    expect(subtree.volumes).toHaveLength(1);
    // Only 1 placement, at origin
    const pmt = subtree.volumes[0];
    expect(pmt.placements).toHaveLength(1);
    expect(pmt.placements[0].name).toBe('PMT_000');
    expect(pmt.placements[0].x).toBe(0);
    expect(pmt.placements[0].y).toBe(0);
    expect(pmt.placements[0].z).toBe(0);
    // Components preserved
    expect(pmt.components).toHaveLength(1);
  });

  it('extracts assembly with daughter of component (top-level volume) and restructures it into components', () => {
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'housing',
          type: 'cylinder',
          material: 'G4_PLASTIC',
          dimensions: { radius: 50, height: 100, inner_radius: 0 },
          placements: [{ name: 'housing_000', x: 0, y: 0, z: 80, rotation: { x: 0, y: 0, z: 0 }, parent: 'base_000' }],
        },
        {
          name: 'myAssembly',
          type: 'assembly',
          material: 'G4_AIR',
          _compoundId: 'myAssembly',
          placements: [{ name: 'myAssembly_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
          components: [
            {
              name: 'base',
              type: 'box',
              material: 'LXe',
              dimensions: { x: 100, y: 100, z: 100 },
              placements: [{ name: 'base_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            },
          ],
        },
        {
          name: 'unrelated',
          type: 'box',
          material: 'G4_AIR',
          dimensions: { x: 50, y: 50, z: 50 },
          placements: [{ name: 'unrelated_000', x: 200, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
        },
      ],
    };

    const subtree = extractSubtreeFromJson(scene, 'myAssembly');
    // Should only have the assembly (housing restructured into components)
    expect(subtree.volumes).toHaveLength(1);
    const assembly = subtree.volumes[0];
    expect(assembly.name).toBe('myAssembly');
    // Should have 2 components: base + housing (moved from top-level)
    expect(assembly.components).toHaveLength(2);
    // Component names are uniquified during extract, so match by g4name
    const compG4names = assembly.components.map(c => c.g4name || c.name).sort();
    expect(compG4names).toEqual(expect.arrayContaining(['base', 'housing']));
    // housing should have parent = the base component's NEW name (not the original)
    const housing = assembly.components.find(c => (c.g4name || c.name) === 'housing');
    const base = assembly.components.find(c => (c.g4name || c.name) === 'base');
    expect(housing.placements[0].parent).toBe(base.name);
    // unrelated should NOT be included
    expect(subtree.volumes.map(v => v.name)).not.toContain('unrelated');
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

describe('applyAddToJson — daughter of assembly component', () => {
  it('adds a volume as component when parent is a component inside an assembly', () => {
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
              name: 'base',
              type: 'box',
              material: 'LXe',
              dimensions: { x: 100, y: 100, z: 100 },
              placements: [{ name: 'base_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            },
          ],
        },
      ],
    };

    // Add a cylinder with mother = the box component's flat name
    const newCyl = {
      name: 'housing',
      type: 'cylinder',
      material: 'G4_Al',
      mother_volume: 'base',  // component name
      position: { x: 0, y: 0, z: 100 },
      rotation: { x: 0, y: 0, z: 0 },
    };

    const result = applyAddToJson(scene, newCyl);

    // Cylinder should NOT be a top-level volume
    expect(result.volumes).toHaveLength(1);

    // Should be added as a component of the assembly
    const assembly = result.volumes[0];
    expect(assembly.components).toHaveLength(2);

    const addedComp = assembly.components[1];
    expect(addedComp.name).toBe('housing');
    expect(addedComp.type).toBe('cylinder');
    // Parent should reference the box component name, not ''
    expect(addedComp.placements[0].parent).toBe('base');
  });

  it('also works when parent is the component placement name', () => {
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
              name: 'base',
              type: 'box',
              material: 'LXe',
              dimensions: { x: 100, y: 100, z: 100 },
              placements: [{ name: 'base_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            },
          ],
        },
      ],
    };

    // Use the placement name as mother
    const newCyl = {
      name: 'housing',
      type: 'cylinder',
      material: 'G4_Al',
      mother_volume: 'base_000',  // component placement name
      position: { x: 0, y: 0, z: 100 },
      rotation: { x: 0, y: 0, z: 0 },
    };

    const result = applyAddToJson(scene, newCyl);
    expect(result.volumes).toHaveLength(1);
    const assembly = result.volumes[0];
    expect(assembly.components).toHaveLength(2);
    expect(assembly.components[1].placements[0].parent).toBe('base');
  });

  it('resolves instance-derived component names (e.g. base_002 from placement 2)', () => {
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'myAssembly',
          type: 'assembly',
          material: 'G4_AIR',
          _compoundId: 'myAssembly',
          placements: [
            { name: 'myAssembly_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
            { name: 'myAssembly_001', x: 100, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
            { name: 'myAssembly_002', x: 200, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
          ],
          components: [
            {
              name: 'base',
              type: 'box',
              material: 'LXe',
              dimensions: { x: 100, y: 100, z: 100 },
              placements: [{ name: 'base_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
            },
          ],
        },
      ],
    };

    // User selects base_002 (instance 2's derived name) as mother
    const newCyl = {
      name: 'housing',
      type: 'cylinder',
      material: 'G4_Al',
      mother_volume: 'base_002',
      position: { x: 0, y: 0, z: 100 },
      rotation: { x: 0, y: 0, z: 0 },
    };

    const result = applyAddToJson(scene, newCyl);
    // Should be added as component, not top-level
    expect(result.volumes).toHaveLength(1);
    const assembly = result.volumes[0];
    expect(assembly.components).toHaveLength(2);
    expect(assembly.components[1].name).toBe('housing');
    expect(assembly.components[1].placements[0].parent).toBe('base');
  });
});

describe('applyAddToJson — union solid components', () => {
  it('adds a volume as component when mother is a union volume name', () => {
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'myUnion',
          type: 'union',
          material: 'G4_Al',
          _compoundId: 'myUnion',
          placements: [{ name: 'myUnion_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
          components: [],
        },
      ],
    };

    const newBox = {
      name: 'part1',
      type: 'box',
      material: 'LXe',
      mother_volume: 'myUnion',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 100, y: 100, z: 100 },
    };

    const result = applyAddToJson(scene, newBox);
    expect(result.volumes).toHaveLength(1);
    expect(result.volumes[0].components).toHaveLength(1);
    expect(result.volumes[0].components[0].name).toBe('part1');
    expect(result.volumes[0].components[0].placements[0].parent).toBe('');
  });

  it('adds a volume as component when mother is a union placement name', () => {
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'myUnion',
          type: 'union',
          material: 'G4_Al',
          _compoundId: 'myUnion',
          placements: [{ name: 'myUnion_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
          components: [],
        },
      ],
    };

    const newBox = {
      name: 'part1',
      type: 'box',
      material: 'LXe',
      mother_volume: 'myUnion_000',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 100, y: 100, z: 100 },
    };

    const result = applyAddToJson(scene, newBox);
    expect(result.volumes).toHaveLength(1);
    expect(result.volumes[0].components).toHaveLength(1);
    expect(result.volumes[0].components[0].name).toBe('part1');
    expect(result.volumes[0].components[0].placements[0].parent).toBe('');
  });

  it('auto-sets boolean_operation on components added to a union', () => {
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'myUnion',
          type: 'union',
          material: 'G4_Al',
          _compoundId: 'myUnion',
          placements: [{ name: 'myUnion_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
          components: [],
        },
      ],
    };

    const newBox = {
      name: 'part1',
      type: 'box',
      material: 'LXe',
      mother_volume: 'myUnion_000',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 100, y: 100, z: 100 },
    };

    const result = applyAddToJson(scene, newBox);
    expect(result.volumes[0].components[0].boolean_operation).toBe('union');
  });
});

describe('applyUpdateToJson — boolean component movement', () => {
  it('moves a top-level volume into a union when _boolean_parent is set', () => {
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'myUnion',
          type: 'union',
          material: 'G4_Al',
          _compoundId: 'myUnion',
          placements: [{ name: 'myUnion_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
          components: [],
        },
        {
          name: 'myBox',
          type: 'box',
          material: 'LXe',
          dimensions: { x: 100, y: 100, z: 100 },
          placements: [{ name: 'myBox_000', x: 50, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
        },
      ],
    };

    // flat volumes as expandToFlat would produce
    const flatVolumes = [
      { name: 'myUnion_000', type: 'union', _volumeIndex: 0, _placementIndex: 0 },
      { name: 'myBox_000', type: 'box', _volumeIndex: 1, _placementIndex: 0 },
    ];

    const patch = {
      _is_boolean_component: true,
      _boolean_parent: 'myUnion_000',
      boolean_operation: 'union',
    };

    const result = applyUpdateToJson(scene, flatVolumes, 1, patch);
    // myBox should be removed from top-level
    expect(result.volumes).toHaveLength(1);
    // myBox should now be a component of the union
    expect(result.volumes[0].components).toHaveLength(1);
    expect(result.volumes[0].components[0].name).toBe('myBox');
    expect(result.volumes[0].components[0].boolean_operation).toBe('union');
    expect(result.volumes[0].components[0].placements[0].parent).toBe('');
  });
});

describe('add-to-assembly + expandToFlat propagation', () => {
  it('adding a component to one instance expands to ALL placements', () => {
    // Assembly with 3 placements and 1 existing component
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [
        {
          name: 'PMT',
          type: 'assembly',
          _compoundId: 'PMT',
          placements: [
            { name: 'PMT_000', x: 0, y: 0, z: 0, parent: 'World' },
            { name: 'PMT_001', x: 100, y: 0, z: 0, parent: 'World' },
            { name: 'PMT_002', x: 200, y: 0, z: 0, parent: 'World' },
          ],
          components: [
            {
              name: 'Body_0',
              type: 'cylinder',
              material: 'G4_Al',
              dimensions: { radius: 10, height: 20 },
              placements: [{ name: 'Body_0', x: 0, y: 0, z: 0, parent: '' }],
            },
          ],
        },
      ],
    };

    // Add a new box component via mother_volume = 'PMT_000' (instance 0)
    const newComponent = {
      name: 'Cap_0',
      type: 'box',
      material: 'LXe',
      mother_volume: 'PMT_000',
      position: { x: 0, y: 0, z: 15 },
      rotation: { x: 0, y: 0, z: 0 },
      size: { x: 5, y: 5, z: 2 },
    };

    const updatedJson = applyAddToJson(scene, newComponent);

    // The shared definition should now have 2 components
    expect(updatedJson.volumes[0].components).toHaveLength(2);

    // Expand to flat — all 3 placements should each have the new component
    const flat = expandToFlat(updatedJson);

    // 3 assembly headers + 3 instances of Body + 3 instances of Cap = 9
    expect(flat.volumes).toHaveLength(9);

    // Check each instance has a Cap descendant
    const capVolumes = flat.volumes.filter(v => v.name.startsWith('Cap_'));
    expect(capVolumes).toHaveLength(3);

    // Each Cap should have the correct mother_volume
    expect(capVolumes[0].mother_volume).toBe('PMT_000');
    expect(capVolumes[1].mother_volume).toBe('PMT_001');
    expect(capVolumes[2].mother_volume).toBe('PMT_002');
  });
});

describe('applyRemoveFromJson – remove component from assembly', () => {
  const makeAssemblyScene = () => ({
    world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
    volumes: [
      {
        name: 'myAssembly',
        type: 'assembly',
        _compoundId: 'myAssembly',
        placements: [
          { name: 'myAssembly_000', x: 0, y: 0, z: 0, parent: 'World' },
          { name: 'myAssembly_001', x: 100, y: 0, z: 0, parent: 'World' },
        ],
        components: [
          {
            name: 'boxA',
            type: 'box',
            material: 'LXe',
            dimensions: { x: 10, y: 10, z: 10 },
            placements: [{ name: 'boxA_000', x: 0, y: 0, z: 0, parent: '' }],
          },
          {
            name: 'boxB',
            type: 'box',
            material: 'LXe',
            dimensions: { x: 20, y: 20, z: 20 },
            placements: [{ name: 'boxB_000', x: 10, y: 0, z: 0, parent: '' }],
          },
          {
            name: 'childOfA',
            type: 'cylinder',
            material: 'G4_Al',
            dimensions: { radius: 5, height: 10, inner_radius: 0 },
            placements: [{ name: 'childOfA_000', x: 0, y: 0, z: 5, parent: 'boxA' }],
          },
        ],
      },
    ],
  });

  it('removes a single component from the assembly', () => {
    const scene = makeAssemblyScene();
    const flat = expandToFlat(scene);

    // Find boxB in flat (instance 0)
    const boxBIdx = flat.volumes.findIndex(v => v.name === 'boxB' && v._componentIndex === 1);
    expect(boxBIdx).toBeGreaterThanOrEqual(0);

    const newJson = applyRemoveFromJson(scene, flat.volumes, boxBIdx);
    expect(newJson.volumes[0].components).toHaveLength(2);
    expect(newJson.volumes[0].components.map(c => c.name)).toEqual(['boxA', 'childOfA']);
  });

  it('removes component and its nested children', () => {
    const scene = makeAssemblyScene();
    const flat = expandToFlat(scene);

    // Find boxA in flat (instance 0) — childOfA has parent='boxA'
    const boxAIdx = flat.volumes.findIndex(v => v.name === 'boxA' && v._componentIndex === 0);
    expect(boxAIdx).toBeGreaterThanOrEqual(0);

    const newJson = applyRemoveFromJson(scene, flat.volumes, boxAIdx);
    // Both boxA and childOfA should be removed
    expect(newJson.volumes[0].components).toHaveLength(1);
    expect(newJson.volumes[0].components[0].name).toBe('boxB');
  });

  it('does not remove the assembly itself', () => {
    const scene = makeAssemblyScene();
    const flat = expandToFlat(scene);

    const boxBIdx = flat.volumes.findIndex(v => v.name === 'boxB' && v._componentIndex === 1);
    const newJson = applyRemoveFromJson(scene, flat.volumes, boxBIdx);

    // Assembly still exists with its placements
    expect(newJson.volumes).toHaveLength(1);
    expect(newJson.volumes[0].name).toBe('myAssembly');
    expect(newJson.volumes[0].placements).toHaveLength(2);
  });

  it('propagates removal to all instances via expandToFlat', () => {
    const scene = makeAssemblyScene();
    const flat = expandToFlat(scene);

    const boxBIdx = flat.volumes.findIndex(v => v.name === 'boxB' && v._componentIndex === 1);
    const newJson = applyRemoveFromJson(scene, flat.volumes, boxBIdx);
    const newFlat = expandToFlat(newJson);

    // No boxB in any instance
    const boxBs = newFlat.volumes.filter(v => v.name.startsWith('boxB'));
    expect(boxBs).toHaveLength(0);

    // boxA and childOfA still present in both instances
    const boxAs = newFlat.volumes.filter(v => v.name.startsWith('boxA'));
    expect(boxAs).toHaveLength(2);
  });
});

describe('applyUpdateToJson – component stays in assembly', () => {
  const makeScene = () => ({
    world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
    volumes: [
      {
        name: 'asm',
        type: 'assembly',
        _compoundId: 'asm',
        placements: [
          { name: 'asm_000', x: 0, y: 0, z: 0, parent: 'World' },
        ],
        components: [
          {
            name: 'innerBox',
            type: 'box',
            material: 'LXe',
            dimensions: { x: 10, y: 10, z: 10 },
            placements: [{ name: 'innerBox_000', x: 0, y: 0, z: 0, parent: '' }],
          },
        ],
      },
    ],
  });

  it('updating material of a component does not change its parent', () => {
    const scene = makeScene();
    const flat = expandToFlat(scene);

    // Find the component in flat
    const idx = flat.volumes.findIndex(v => v.name === 'innerBox');
    expect(idx).toBeGreaterThanOrEqual(0);

    // Simulate what PropertyEditor does: clone the flat vol and change material
    const patch = structuredClone(flat.volumes[idx]);
    patch.material = 'G4_Al';

    const newJson = applyUpdateToJson(scene, flat.volumes, idx, patch);

    // Component should still be inside the assembly with parent ''
    expect(newJson.volumes[0].components).toHaveLength(1);
    expect(newJson.volumes[0].components[0].material).toBe('G4_Al');
    expect(newJson.volumes[0].components[0].placements[0].parent).toBe('');
  });

  it('updating dimensions of a component keeps it in the assembly', () => {
    const scene = makeScene();
    const flat = expandToFlat(scene);

    const idx = flat.volumes.findIndex(v => v.name === 'innerBox');
    const patch = structuredClone(flat.volumes[idx]);
    patch.size = { x: 20, y: 20, z: 20 };

    const newJson = applyUpdateToJson(scene, flat.volumes, idx, patch);

    expect(newJson.volumes[0].components[0].dimensions.x).toBe(20);
    expect(newJson.volumes[0].components[0].placements[0].parent).toBe('');
  });
});

describe('applyDuplicateVolumeToJson', () => {
  const makeScene = () => ({
    world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
    volumes: [
      {
        name: 'myBox',
        type: 'box',
        material: 'LXe',
        dimensions: { x: 100, y: 100, z: 100 },
        placements: [
          { name: 'myBox_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
          { name: 'myBox_001', x: 200, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' },
        ],
      },
    ],
  });

  it('creates an independent copy with a new name', () => {
    const scene = makeScene();
    const flat = expandToFlat(scene);
    const idx = flat.volumes.findIndex(v => v.name === 'myBox_000');

    const newJson = applyDuplicateVolumeToJson(scene, flat.volumes, idx);

    expect(newJson.volumes).toHaveLength(2);
    expect(newJson.volumes[1].name).toBe('myBox_copy');
    expect(newJson.volumes[1].type).toBe('box');
    expect(newJson.volumes[1].material).toBe('LXe');
    expect(newJson.volumes[1].dimensions).toEqual({ x: 100, y: 100, z: 100 });
  });

  it('keeps only one placement in the copy', () => {
    const scene = makeScene();
    const flat = expandToFlat(scene);
    const idx = flat.volumes.findIndex(v => v.name === 'myBox_000');

    const newJson = applyDuplicateVolumeToJson(scene, flat.volumes, idx);

    expect(newJson.volumes[1].placements).toHaveLength(1);
    expect(newJson.volumes[1].placements[0].name).toBe('myBox_copy_000');
  });

  it('offsets the copy position by 50 in x', () => {
    const scene = makeScene();
    const flat = expandToFlat(scene);
    const idx = flat.volumes.findIndex(v => v.name === 'myBox_000');

    const newJson = applyDuplicateVolumeToJson(scene, flat.volumes, idx);

    expect(newJson.volumes[1].placements[0].x).toBe(50);
  });

  it('does not modify the original volume', () => {
    const scene = makeScene();
    const flat = expandToFlat(scene);
    const idx = flat.volumes.findIndex(v => v.name === 'myBox_000');

    const newJson = applyDuplicateVolumeToJson(scene, flat.volumes, idx);

    expect(newJson.volumes[0].name).toBe('myBox');
    expect(newJson.volumes[0].placements).toHaveLength(2);
  });

  it('generates unique names when _copy already exists', () => {
    const scene = makeScene();
    scene.volumes.push({
      name: 'myBox_copy',
      type: 'box',
      material: 'LXe',
      dimensions: { x: 50, y: 50, z: 50 },
      placements: [{ name: 'myBox_copy_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
    });

    const flat = expandToFlat(scene);
    const idx = flat.volumes.findIndex(v => v.name === 'myBox_000');

    const newJson = applyDuplicateVolumeToJson(scene, flat.volumes, idx);

    expect(newJson.volumes[2].name).toBe('myBox_copy2');
  });

  it('duplicates a compound volume with components', () => {
    const scene = {
      world: { name: 'World', type: 'box', material: 'G4_AIR', dimensions: { x: 2000, y: 2000, z: 2000 } },
      volumes: [{
        name: 'myAssembly',
        type: 'assembly',
        placements: [{ name: 'myAssembly_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }],
        components: [
          {
            name: 'myAssembly_body',
            type: 'box',
            material: 'LXe',
            dimensions: { x: 50, y: 50, z: 50 },
            placements: [{ name: 'myAssembly_body_000', x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: '' }],
          },
        ],
      }],
    };

    const flat = expandToFlat(scene);
    const idx = flat.volumes.findIndex(v => v.name === 'myAssembly_000');

    const newJson = applyDuplicateVolumeToJson(scene, flat.volumes, idx);

    expect(newJson.volumes).toHaveLength(2);
    const dup = newJson.volumes[1];
    expect(dup.name).toBe('myAssembly_copy');
    expect(dup.components).toHaveLength(1);
    expect(dup.components[0].name).toBe('myAssembly_copy_body');
    expect(dup.placements[0].name).toBe('myAssembly_copy_000');
  });
});
