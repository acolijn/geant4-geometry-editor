import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Silence console.error output from validation rejection tests
let consoleErrorSpy;

// Collect setter mocks for each useState call
let stateSetters;
let stateValues;
let callIndex;

// Mock React's useState to capture state and setters
vi.mock('react', () => ({
  useState: (initial) => {
    const idx = callIndex++;
    if (stateValues[idx] === undefined) {
      stateValues[idx] = initial;
    }
    if (!stateSetters[idx]) {
      stateSetters[idx] = vi.fn((val) => {
        stateValues[idx] = typeof val === 'function' ? val(stateValues[idx]) : val;
      });
    }
    return [stateValues[idx], stateSetters[idx]];
  },
}));

// Mock dependencies — paths relative to THIS test file (src/hooks/__tests__/)
vi.mock('../../components/geometry-editor/utils/compoundIdPropagator', () => ({
  propagateCompoundIdToDescendants: vi.fn((_name, _compoundId, vols) => vols),
}));

vi.mock('../../utils/defaults', () => ({
  defaultGeometry: { world: null, volumes: [] },
  defaultMaterials: {},
}));

vi.mock('../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

// Mock expandToFlat — pass-through by default (returns input with a default world)
vi.mock('../../utils/expandToFlat', () => ({
  expandToFlat: vi.fn((json) => ({
    world: json.world || { name: 'World', type: 'box', size: { x: 2000, y: 2000, z: 2000 }, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, material: 'G4_AIR' },
    volumes: json.volumes || [],
  })),
  isVolumeKey: vi.fn((key) => typeof key === 'string' && key.startsWith('vol-')),
  findFlatIndex: vi.fn((volumes, key) => volumes.findIndex(v => v._id === key)),
}));

// Mock jsonOperations — pass-through clones
vi.mock('../../utils/jsonOperations', () => ({
  applyUpdateToJson: vi.fn((json) => structuredClone(json)),
  applyWorldUpdateToJson: vi.fn((json) => structuredClone(json)),
  applyAddToJson: vi.fn((json, vol) => {
    const copy = structuredClone(json);
    copy.volumes.push({ name: vol.name, type: vol.type, placements: [{ x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, parent: 'World' }] });
    return copy;
  }),
  applyRemoveFromJson: vi.fn((json) => structuredClone(json)),
  flatToJsonVolume: vi.fn((flat) => ({ name: flat.name, type: flat.type, placements: [{ x: 0, y: 0, z: 0, parent: 'World' }] })),
}));

// useState call order in useAppState:
// 0: tabValue, 1: geometries, 2: materials, 3: selectedGeometry, 4: hitCollections, 5: updateDialogOpen, 6: jsonData
const GEO = 1, MAT = 2, SEL = 3, HITS = 4, JSONDATA = 6;

// Import the hook — path relative to test file
import { useAppState } from '../useAppState';

describe('useAppState', () => {
  beforeEach(() => {
    stateSetters = {};
    stateValues = {};
    callIndex = 0;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('handleImportGeometries', () => {
    it('rejects null input', () => {
      const { handleImportGeometries } = useAppState();
      const result = handleImportGeometries(null);
      expect(result).toEqual({ success: false, message: 'Invalid geometries format' });
    });

    it('rejects input without volumes array', () => {
      const { handleImportGeometries } = useAppState();
      const result = handleImportGeometries({ volumes: 'not-array' });
      expect(result).toEqual({ success: false, message: 'Invalid geometries format' });
    });

    it('rejects input without volumes key', () => {
      const { handleImportGeometries } = useAppState();
      const result = handleImportGeometries({ world: {} });
      expect(result).toEqual({ success: false, message: 'Invalid geometries format' });
    });

    it('accepts valid geometry data', () => {
      const { handleImportGeometries } = useAppState();
      const result = handleImportGeometries({
        world: { name: 'W', type: 'box', size: { x: 100, y: 100, z: 100 } },
        volumes: [{ name: 'V1', type: 'box' }],
      });
      expect(result).toEqual({ success: true, message: 'Geometries imported successfully' });
    });

    it('calls setGeometries on valid import', () => {
      const { handleImportGeometries } = useAppState();
      handleImportGeometries({
        world: null,
        volumes: [{ name: 'X', type: 'box' }],
      });
      expect(stateSetters[GEO]).toHaveBeenCalled();
      // Also stores JSON as primary state
      expect(stateSetters[JSONDATA]).toHaveBeenCalled();
    });
  });

  describe('handleImportMaterials', () => {
    it('rejects null input', () => {
      const { handleImportMaterials } = useAppState();
      const result = handleImportMaterials(null);
      expect(result).toEqual({ success: false, message: 'Invalid materials format' });
    });

    it('rejects arrays', () => {
      const { handleImportMaterials } = useAppState();
      const result = handleImportMaterials([{ name: 'mat' }]);
      expect(result).toEqual({ success: false, message: 'Invalid materials format' });
    });

    it('rejects primitive values', () => {
      const { handleImportMaterials } = useAppState();
      expect(handleImportMaterials('string')).toEqual({ success: false, message: 'Invalid materials format' });
    });

    it('rejects numbers', () => {
      const { handleImportMaterials } = useAppState();
      expect(handleImportMaterials(42)).toEqual({ success: false, message: 'Invalid materials format' });
    });

    it('accepts valid materials object', () => {
      const { handleImportMaterials } = useAppState();
      const result = handleImportMaterials({ G4_AIR: { density: 0.001 } });
      expect(result).toEqual({ success: true, message: 'Materials imported successfully' });
    });

    it('accepts empty object as valid materials', () => {
      const { handleImportMaterials } = useAppState();
      const result = handleImportMaterials({});
      expect(result).toEqual({ success: true, message: 'Materials imported successfully' });
    });
  });

  describe('handleLoadProject', () => {
    it('sets geometries and materials', () => {
      const { handleLoadProject } = useAppState();
      const geo = { world: null, volumes: [] };
      const mats = { G4_WATER: {} };

      handleLoadProject(geo, mats, null);

      // handleLoadProject now passes JSON through expandToFlat, which derives a default world
      expect(stateSetters[GEO]).toHaveBeenCalled();
      expect(stateSetters[MAT]).toHaveBeenCalledWith(mats);
      // Also stores JSON as primary state
      expect(stateSetters[JSONDATA]).toHaveBeenCalled();
    });

    it('sets hitCollections when provided valid array', () => {
      const { handleLoadProject } = useAppState();
      const hits = ['HC1', 'HC2'];

      handleLoadProject({ world: null, volumes: [] }, {}, hits);

      expect(stateSetters[HITS]).toHaveBeenCalledWith(hits);
    });

    it('does not overwrite hitCollections when null is provided', () => {
      const { handleLoadProject } = useAppState();

      handleLoadProject({ world: null, volumes: [] }, {}, null);

      expect(stateSetters[HITS]).not.toHaveBeenCalled();
    });

    it('does not overwrite hitCollections when non-array is provided', () => {
      const { handleLoadProject } = useAppState();

      handleLoadProject({ world: null, volumes: [] }, {}, 'not-array');

      expect(stateSetters[HITS]).not.toHaveBeenCalled();
    });

    it('clears selectedGeometry', () => {
      const { handleLoadProject } = useAppState();

      handleLoadProject({ world: null, volumes: [] }, {}, null);

      expect(stateSetters[SEL]).toHaveBeenCalledWith(null);
    });
  });

  describe('returned shape', () => {
    it('returns all expected keys', () => {
      const result = useAppState();
      const expectedKeys = [
        'tabValue', 'setTabValue',
        'geometries', 'materials',
        'jsonData', 'setJsonData',
        'selectedGeometry', 'setSelectedGeometry',
        'hitCollections', 'setHitCollections',
        'updateDialogOpen', 'setUpdateDialogOpen',
        'handleUpdateGeometry', 'handleAddGeometry', 'handleRemoveGeometry',
        'handleImportGeometries', 'handleImportMaterials',
        'handleUpdateMaterials', 'handleAppendJsonVolumes', 'handleLoadProject',
      ];
      for (const key of expectedKeys) {
        expect(result).toHaveProperty(key);
      }
    });
  });
});
