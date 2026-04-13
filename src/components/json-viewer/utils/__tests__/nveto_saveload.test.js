import { describe, it, expect, vi } from 'vitest';
import { generateJson } from '../geometryToJson';
import { jsonToGeometry } from '../jsonToGeometry';
import { propagateCompoundIdToDescendants } from '../../../../components/geometry-editor/utils/compoundIdPropagator';
import fs from 'fs';
import path from 'path';

vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

describe('nVeto/mVeto save-load cycle', () => {
  const emptyGeo = () => ({
    geometries: { world: null, volumes: [] },
    materials: {},
  });

  /** Simulate editor import: jsonToGeometry + propagateCompoundIdToDescendants */
  function importIntoEditor(json) {
    const imported = jsonToGeometry(json, emptyGeo());
    let updatedVolumes = [...imported.geometries.volumes];
    imported.geometries.volumes.forEach((volume, index) => {
      if (volume.type === 'assembly' || volume.type === 'union') {
        if (!volume._compoundId) {
          updatedVolumes[index] = { ...volume, _compoundId: volume.name };
        }
        const compoundId = updatedVolumes[index]._compoundId;
        updatedVolumes = propagateCompoundIdToDescendants(volume.name, compoundId, updatedVolumes);
      }
    });
    return {
      world: imported.geometries.world,
      volumes: updatedVolumes,
    };
  }

  /** Simulate editor save */
  function saveFromEditor(editorState) {
    return generateJson(editorState);
  }

  it('nVeto PMTArray survives 3 save-load cycles', () => {
    const mcMasterPath = path.resolve(__dirname, '../../../../../../mc-master/xenonnt_geometry.json');
    const mcMasterJson = JSON.parse(fs.readFileSync(mcMasterPath, 'utf8'));

    // Find nVeto assembly in original
    const nVetoOrig = mcMasterJson.volumes.find(v => v.name === 'nVetoPMTArray');
    expect(nVetoOrig).toBeDefined();
    expect(nVetoOrig.placements).toHaveLength(120);
    expect(nVetoOrig.components).toHaveLength(7);

    // Cycle 1: Load → Save
    let editorState = importIntoEditor(mcMasterJson);
    let nVetoAssemblies = editorState.volumes.filter(v => v.type === 'assembly' && v._compoundId?.includes('nVeto'));
    let nVetoComponents = editorState.volumes.filter(v => v.type !== 'assembly' && v._compoundId?.includes('nVeto'));
    console.log(`Cycle 1 import: ${nVetoAssemblies.length} assembly instances, ${nVetoComponents.length} components`);
    expect(nVetoAssemblies).toHaveLength(120);
    expect(nVetoComponents).toHaveLength(120 * 7);

    // Check all have correct _compoundId
    nVetoAssemblies.forEach(v => expect(v._compoundId).toBe('nVetoPMTArray'));
    nVetoComponents.forEach(v => expect(v._compoundId).toBe('nVetoPMTArray'));

    // Check children per assembly
    const first = nVetoAssemblies[0];
    const firstChildren = nVetoComponents.filter(c => c.mother_volume === first.name);
    console.log(`  First assembly (${first.name}): ${firstChildren.length} children`);
    expect(firstChildren).toHaveLength(7);

    let savedJson = saveFromEditor(editorState);
    let savedNVeto = savedJson.volumes.filter(v => v._compoundId?.includes('nVeto'));
    console.log(`Cycle 1 save: ${savedNVeto.length} nVeto assemblies`);
    expect(savedNVeto).toHaveLength(1);
    expect(savedNVeto[0].placements).toHaveLength(120);
    expect(savedNVeto[0].components).toHaveLength(7);

    // Cycle 2: Load saved → Save again
    editorState = importIntoEditor(savedJson);
    nVetoAssemblies = editorState.volumes.filter(v => v.type === 'assembly' && v._compoundId?.includes('nVeto'));
    nVetoComponents = editorState.volumes.filter(v => v.type !== 'assembly' && v._compoundId?.includes('nVeto'));
    console.log(`Cycle 2 import: ${nVetoAssemblies.length} assembly instances, ${nVetoComponents.length} components`);
    expect(nVetoAssemblies).toHaveLength(120);
    expect(nVetoComponents).toHaveLength(120 * 7);

    savedJson = saveFromEditor(editorState);
    savedNVeto = savedJson.volumes.filter(v => v._compoundId?.includes('nVeto'));
    console.log(`Cycle 2 save: ${savedNVeto.length} nVeto assemblies`);
    expect(savedNVeto).toHaveLength(1);
    expect(savedNVeto[0].placements).toHaveLength(120);
    expect(savedNVeto[0].components).toHaveLength(7);

    // Cycle 3: One more
    editorState = importIntoEditor(savedJson);
    nVetoAssemblies = editorState.volumes.filter(v => v.type === 'assembly' && v._compoundId?.includes('nVeto'));
    nVetoComponents = editorState.volumes.filter(v => v.type !== 'assembly' && v._compoundId?.includes('nVeto'));
    console.log(`Cycle 3 import: ${nVetoAssemblies.length} assembly instances, ${nVetoComponents.length} components`);
    expect(nVetoAssemblies).toHaveLength(120);
    expect(nVetoComponents).toHaveLength(120 * 7);

    savedJson = saveFromEditor(editorState);
    savedNVeto = savedJson.volumes.filter(v => v._compoundId?.includes('nVeto'));
    console.log(`Cycle 3 save: ${savedNVeto.length} nVeto assemblies`);
    expect(savedNVeto).toHaveLength(1);
    expect(savedNVeto[0].placements).toHaveLength(120);
    expect(savedNVeto[0].components).toHaveLength(7);
  });

  it('mVeto PMTArray survives 3 save-load cycles', () => {
    const mcMasterPath = path.resolve(__dirname, '../../../../../../mc-master/xenonnt_geometry.json');
    const mcMasterJson = JSON.parse(fs.readFileSync(mcMasterPath, 'utf8'));

    const mVetoOrig = mcMasterJson.volumes.find(v => v.name === 'mVetoPMTArray');
    expect(mVetoOrig).toBeDefined();
    expect(mVetoOrig.placements).toHaveLength(84);
    expect(mVetoOrig.components).toHaveLength(7);

    // Cycle 1
    let editorState = importIntoEditor(mcMasterJson);
    let mVetoAssemblies = editorState.volumes.filter(v => v.type === 'assembly' && v._compoundId?.includes('mVeto'));
    let mVetoComponents = editorState.volumes.filter(v => v.type !== 'assembly' && v._compoundId?.includes('mVeto'));
    console.log(`mVeto Cycle 1 import: ${mVetoAssemblies.length} assemblies, ${mVetoComponents.length} components`);
    expect(mVetoAssemblies).toHaveLength(84);
    expect(mVetoComponents).toHaveLength(84 * 7);

    let savedJson = saveFromEditor(editorState);
    let savedMVeto = savedJson.volumes.filter(v => v._compoundId?.includes('mVeto'));
    expect(savedMVeto).toHaveLength(1);
    expect(savedMVeto[0].placements).toHaveLength(84);
    expect(savedMVeto[0].components).toHaveLength(7);

    // Cycle 2
    editorState = importIntoEditor(savedJson);
    mVetoAssemblies = editorState.volumes.filter(v => v.type === 'assembly' && v._compoundId?.includes('mVeto'));
    mVetoComponents = editorState.volumes.filter(v => v.type !== 'assembly' && v._compoundId?.includes('mVeto'));
    console.log(`mVeto Cycle 2 import: ${mVetoAssemblies.length} assemblies, ${mVetoComponents.length} components`);
    expect(mVetoAssemblies).toHaveLength(84);
    expect(mVetoComponents).toHaveLength(84 * 7);

    savedJson = saveFromEditor(editorState);
    savedMVeto = savedJson.volumes.filter(v => v._compoundId?.includes('mVeto'));
    expect(savedMVeto).toHaveLength(1);
    expect(savedMVeto[0].placements).toHaveLength(84);
    expect(savedMVeto[0].components).toHaveLength(7);

    // Cycle 3
    editorState = importIntoEditor(savedJson);
    mVetoAssemblies = editorState.volumes.filter(v => v.type === 'assembly' && v._compoundId?.includes('mVeto'));
    mVetoComponents = editorState.volumes.filter(v => v.type !== 'assembly' && v._compoundId?.includes('mVeto'));
    console.log(`mVeto Cycle 3 import: ${mVetoAssemblies.length} assemblies, ${mVetoComponents.length} components`);
    expect(mVetoAssemblies).toHaveLength(84);
    expect(mVetoComponents).toHaveLength(84 * 7);
  });

  it('all 4 assemblies coexist without cross-contamination', () => {
    const mcMasterPath = path.resolve(__dirname, '../../../../../../mc-master/xenonnt_geometry.json');
    const mcMasterJson = JSON.parse(fs.readFileSync(mcMasterPath, 'utf8'));

    // Full cycle
    const editorState = importIntoEditor(mcMasterJson);
    const savedJson = saveFromEditor(editorState);
    const reloaded = importIntoEditor(savedJson);

    // Count assemblies by _compoundId
    const compoundIds = {};
    reloaded.volumes.forEach(v => {
      if (v._compoundId) {
        compoundIds[v._compoundId] = (compoundIds[v._compoundId] || 0) + 1;
      }
    });
    console.log('CompoundId counts after save-load:', compoundIds);

    // Verify no cross-contamination: each compoundId should have the expected count
    const assemblies = savedJson.volumes.filter(v => v.type === 'assembly');
    console.log('Assemblies in saved JSON:');
    assemblies.forEach(a => {
      console.log(`  ${a.name} (_compoundId=${a._compoundId}): ${a.placements?.length} placements, ${a.components?.length} components`);
    });
    expect(assemblies).toHaveLength(4);

    // No orphaned volumes
    const allNames = new Set(reloaded.volumes.map(v => v.name));
    const orphans = reloaded.volumes.filter(v =>
      v.mother_volume && v.mother_volume !== 'World' && !allNames.has(v.mother_volume)
    );
    if (orphans.length > 0) {
      console.log('ORPHANS:');
      orphans.slice(0, 10).forEach(v => console.log(`  ${v.name} → mother=${v.mother_volume}`));
    }
    expect(orphans).toHaveLength(0);

    // No standalone volumes that should be assembly components
    const standaloneWithCompoundId = savedJson.volumes.filter(v => 
      v.type !== 'assembly' && v.type !== 'union' && v.type !== 'subtraction' && v._compoundId
    );
    if (standaloneWithCompoundId.length > 0) {
      console.log('LEAKED components (standalone with _compoundId):');
      standaloneWithCompoundId.forEach(v => console.log(`  ${v.name} (_compoundId=${v._compoundId})`));
    }
    expect(standaloneWithCompoundId).toHaveLength(0);
  });
});
