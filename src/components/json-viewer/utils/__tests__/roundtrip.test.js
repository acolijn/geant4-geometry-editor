import { describe, it, expect, vi } from 'vitest';
import { generateJson } from '../geometryToJson';
import { jsonToGeometry } from '../jsonToGeometry';

vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

/**
 * Round-trip tests — convert internal geometry → JSON → internal geometry
 * and verify that critical data survives the trip.
 */
describe('JSON round-trip (geometryToJson → jsonToGeometry)', () => {
  const emptyGeo = () => ({
    geometries: { world: null, volumes: [] },
    materials: {},
  });

  /** Helper: internal → JSON → internal */
  const roundTrip = (geometry) => {
    const json = generateJson(geometry);
    return jsonToGeometry(json, emptyGeo());
  };

  it('round-trips a world volume', () => {
    const geo = {
      world: {
        name: 'World', type: 'box',
        size: { x: 2000, y: 2000, z: 2000 },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        material: 'G4_AIR',
      },
      volumes: [],
    };

    const result = roundTrip(geo);
    expect(result.geometries.world.name).toBe('World');
    expect(result.geometries.world.size).toEqual({ x: 2000, y: 2000, z: 2000 });
  });

  it('round-trips a box volume dimensions', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'B1', g4name: 'B1', type: 'box',
        size: { x: 10, y: 20, z: 30 },
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.type).toBe('box');
    expect(vol.size).toEqual({ x: 10, y: 20, z: 30 });
    expect(vol.position.x).toBe(1);
    expect(vol.position.y).toBe(2);
    expect(vol.position.z).toBe(3);
  });

  it('round-trips a cylinder volume dimensions', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'C1', g4name: 'C1', type: 'cylinder',
        radius: 25, height: 50, innerRadius: 5,
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_WATER', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.radius).toBe(25);
    expect(vol.height).toBe(50);
    expect(vol.innerRadius).toBe(5);
  });

  it('round-trips a sphere volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'S1', g4name: 'S1', type: 'sphere',
        radius: 42,
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    expect(result.geometries.volumes[0].radius).toBe(42);
  });

  it('round-trips an ellipsoid volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'E1', g4name: 'E1', type: 'ellipsoid',
        xRadius: 10, yRadius: 20, zRadius: 30,
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.xRadius).toBe(10);
    expect(vol.yRadius).toBe(20);
    expect(vol.zRadius).toBe(30);
  });

  it('round-trips a trapezoid volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'T1', g4name: 'T1', type: 'trapezoid',
        dx1: 2, dx2: 5, dy1: 1, dy2: 5, dz: 9,
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.dx1).toBe(2);
    expect(vol.dx2).toBe(5);
    expect(vol.dy1).toBe(1);
    expect(vol.dy2).toBe(5);
    expect(vol.dz).toBe(9);
  });

  it('round-trips a torus volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'Tor', g4name: 'Tor', type: 'torus',
        majorRadius: 30, minorRadius: 5,
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.majorRadius).toBe(30);
    expect(vol.minorRadius).toBe(5);
  });

  it('round-trips a polycone volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'PC', g4name: 'PC', type: 'polycone',
        zSections: [
          { z: -5, rMin: 0, rMax: 3 },
          { z: 0, rMin: 1, rMax: 5 },
          { z: 5, rMin: 0, rMax: 2 },
        ],
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.zSections).toHaveLength(3);
    expect(vol.zSections[0]).toEqual({ z: -5, rMin: 0, rMax: 3 });
    expect(vol.zSections[1]).toEqual({ z: 0, rMin: 1, rMax: 5 });
    expect(vol.zSections[2]).toEqual({ z: 5, rMin: 0, rMax: 2 });
  });

  it('round-trips hitsCollectionName on a standard volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'Det', g4name: 'Det', type: 'box',
        size: { x: 10, y: 10, z: 10 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
        hitsCollectionName: 'DetHits',
      }],
    };

    const result = roundTrip(geo);
    expect(result.geometries.volumes[0].hitsCollectionName).toBe('DetHits');
  });

  it('round-trips hitsCollectionName on a union volume', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'U1', g4name: 'U1', type: 'union',
        material: 'G4_AIR',
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W',
        _compoundId: 'union_1', _componentId: 'root',
        hitsCollectionName: 'UnionHits',
      }, {
        name: 'P1', g4name: 'P1', type: 'box',
        size: { x: 5, y: 5, z: 5 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'U1',
        _compoundId: 'union_1', _componentId: 'comp_1',
        boolean_operation: 'union', _is_boolean_component: true, _boolean_parent: 'U1',
        visible: true,
      }],
    };

    const result = roundTrip(geo);
    const union = result.geometries.volumes.find(v => v.type === 'union');
    expect(union).toBeTruthy();
    expect(union.hitsCollectionName).toBe('UnionHits');
  });

  it('round-trips multiple volumes preserving count', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [
        { name: 'B1', g4name: 'B1', type: 'box', size: { x: 10, y: 10, z: 10 },
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'W', material: 'G4_AIR', visible: true },
        { name: 'S1', g4name: 'S1', type: 'sphere', radius: 5,
          position: { x: 20, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'W', material: 'G4_WATER', visible: true },
        { name: 'C1', g4name: 'C1', type: 'cylinder', radius: 3, height: 10,
          position: { x: -20, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'W', material: 'G4_AIR', visible: true },
      ],
    };

    const result = roundTrip(geo);
    expect(result.geometries.volumes).toHaveLength(3);
  });

  it('round-trips parent-child relationships', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [
        { name: 'Parent', g4name: 'Parent', type: 'box', size: { x: 50, y: 50, z: 50 },
          position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'W', material: 'G4_AIR', visible: true },
        { name: 'Child', g4name: 'Child', type: 'sphere', radius: 5,
          position: { x: 10, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
          mother_volume: 'Parent', material: 'G4_WATER', visible: true },
      ],
    };

    const result = roundTrip(geo);
    const child = result.geometries.volumes.find(v => v.type === 'sphere');
    expect(child.mother_volume).toBe('Parent');
  });

  it('round-trips rotation values', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'Rot', g4name: 'Rot', type: 'box',
        size: { x: 10, y: 10, z: 10 },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0.5, y: 1.0, z: 1.5 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    const vol = result.geometries.volumes[0];
    expect(vol.rotation.x).toBe(0.5);
    expect(vol.rotation.y).toBe(1.0);
    expect(vol.rotation.z).toBe(1.5);
  });

  it('round-trips a volume without hitsCollectionName (stays absent)', () => {
    const geo = {
      world: { name: 'W', type: 'box', size: { x: 1000, y: 1000, z: 1000 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
      volumes: [{
        name: 'Plain', g4name: 'Plain', type: 'box',
        size: { x: 10, y: 10, z: 10 },
        position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
        mother_volume: 'W', material: 'G4_AIR', visible: true,
      }],
    };

    const result = roundTrip(geo);
    expect(result.geometries.volumes[0].hitsCollectionName).toBeUndefined();
  });
});
