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

describe('Save→Load with real mc-master data', () => {
  const emptyGeo = () => ({
    geometries: { world: null, volumes: [] },
    materials: {},
  });

  it('preserves PMT structure through save→load cycle', () => {
    // Load actual mc-master geometry
    const mcMasterPath = path.resolve(__dirname, '../../../../../../mc-master/xenonnt_geometry.json');
    const mcMasterJson = JSON.parse(fs.readFileSync(mcMasterPath, 'utf8'));

    // Verify input
    const pmtArrays = mcMasterJson.volumes.filter(v => v.name.includes('PMTArray'));
    expect(pmtArrays).toHaveLength(4); // TopPMTArray, BotPMTArray, mVetoPMTArray, nVetoPMTArray
    
    const topArr = pmtArrays.find(a => a.name === 'TopPMTArray');
    const botArr = pmtArrays.find(a => a.name === 'BotPMTArray');
    console.log(`Input: TopPMTArray: ${topArr.placements.length} placements, ${topArr.components.length} components`);
    console.log(`Input: BotPMTArray: ${botArr.placements.length} placements, ${botArr.components.length} components`);

    // Step 1: Import
    const imported = jsonToGeometry(mcMasterJson, emptyGeo());
    const allVolumes = imported.geometries.volumes;
    const asmVolumes = allVolumes.filter(v => v.type === 'assembly');
    const nonAsmVolumes = allVolumes.filter(v => v.type !== 'assembly');
    
    console.log(`\nAfter import: ${allVolumes.length} total, ${asmVolumes.length} assemblies, ${nonAsmVolumes.length} non-assembly`);

    const topPMTs = asmVolumes.filter(v => v.name?.startsWith('TopPMT'));
    const botPMTs = asmVolumes.filter(v => v.name?.startsWith('BotPMT'));
    console.log(`TopPMT instances: ${topPMTs.length}, BotPMT instances: ${botPMTs.length}`);

    expect(topPMTs).toHaveLength(topArr.placements.length);
    expect(botPMTs).toHaveLength(botArr.placements.length);

    // Check _compoundId sharing
    const topCIDs = new Set(topPMTs.map(v => v._compoundId));
    const botCIDs = new Set(botPMTs.map(v => v._compoundId));
    console.log(`TopPMT _compoundIds: ${topCIDs.size} unique → [${[...topCIDs].slice(0,3).join(', ')}]`);
    console.log(`BotPMT _compoundIds: ${botCIDs.size} unique → [${[...botCIDs].slice(0,3).join(', ')}]`);

    expect(topCIDs.size).toBe(1); // All TopPMT instances share one _compoundId
    expect(botCIDs.size).toBe(1); // All BotPMT instances share one _compoundId

    // Check children
    const firstTop = topPMTs[0];
    const topChildren = nonAsmVolumes.filter(v => v.mother_volume === firstTop.name);
    console.log(`First TopPMT (${firstTop.name}) has ${topChildren.length} children`);
    topChildren.forEach(c => console.log(`  ${c.name} (${c.type}) cid=${c._componentId}`));
    expect(topChildren).toHaveLength(topArr.components.length);

    // Step 2: Save (generateJson)
    const savedJson = generateJson({
      world: imported.geometries.world,
      volumes: imported.geometries.volumes,
    });

    const savedAsm = savedJson.volumes.filter(v => v.type === 'assembly');
    console.log(`\nAfter save: ${savedJson.volumes.length} volumes total, ${savedAsm.length} assemblies`);
    savedAsm.forEach(a => {
      console.log(`  ${a.name} (${a.type}): ${a.placements?.length} placements, ${a.components?.length} components`);
      if (a.components) {
        a.components.forEach(c => console.log(`    ${c.name} (${c.type}) cid=${c._componentId} parent=${c.placements?.[0]?.parent}`));
      }
    });

    // Verify save output structure
    const savedTopAsm = savedAsm.filter(a => a.name === 'TopPMTArray' || a._compoundId?.includes('TopPMTArray'));
    const savedBotAsm = savedAsm.filter(a => a.name === 'BotPMTArray' || a._compoundId?.includes('BotPMTArray'));
    console.log(`Saved TopPMT assemblies: ${savedTopAsm.length}`);
    console.log(`Saved BotPMT assemblies: ${savedBotAsm.length}`);

    // Step 3: Load (jsonToGeometry on saved JSON)
    const loaded = jsonToGeometry(savedJson, emptyGeo());
    const loadedAll = loaded.geometries.volumes;
    const loadedAsm = loadedAll.filter(v => v.type === 'assembly');
    const loadedNonAsm = loadedAll.filter(v => v.type !== 'assembly');

    console.log(`\nAfter load: ${loadedAll.length} total, ${loadedAsm.length} assemblies, ${loadedNonAsm.length} non-assembly`);

    const loadedTopPMTs = loadedAsm.filter(v => v.name?.startsWith('TopPMT'));
    const loadedBotPMTs = loadedAsm.filter(v => v.name?.startsWith('BotPMT'));
    console.log(`Loaded TopPMT instances: ${loadedTopPMTs.length}, BotPMT instances: ${loadedBotPMTs.length}`);

    // Must match original counts
    expect(loadedTopPMTs.length).toBe(topArr.placements.length);
    expect(loadedBotPMTs.length).toBe(botArr.placements.length);

    // Check _compoundId sharing
    const loadedTopCIDs = new Set(loadedTopPMTs.map(v => v._compoundId));
    const loadedBotCIDs = new Set(loadedBotPMTs.map(v => v._compoundId));
    console.log(`Loaded TopPMT _compoundIds: ${loadedTopCIDs.size} unique`);
    console.log(`Loaded BotPMT _compoundIds: ${loadedBotCIDs.size} unique`);

    expect(loadedTopCIDs.size).toBe(1);
    expect(loadedBotCIDs.size).toBe(1);

    // Check children count
    const firstLoadedTop = loadedTopPMTs[0];
    if (firstLoadedTop) {
      const children = loadedNonAsm.filter(v => v.mother_volume === firstLoadedTop.name);
      console.log(`First loaded TopPMT (${firstLoadedTop.name}) has ${children.length} children`);
      children.forEach(c => console.log(`  ${c.name} (${c.type})`));
      expect(children).toHaveLength(topArr.components.length);
    }

    // Step 4: Second save→load
    const savedJson2 = generateJson({
      world: loaded.geometries.world,
      volumes: loaded.geometries.volumes,
    });
    const savedAsm2 = savedJson2.volumes.filter(v => v.type === 'assembly');
    console.log(`\nSecond save: ${savedJson2.volumes.length} volumes, ${savedAsm2.length} assemblies`);
    savedAsm2.forEach(a => {
      if (a.type === 'assembly') {
        console.log(`  ${a.name}: ${a.placements?.length} placements, ${a.components?.length} components`);
      }
    });

    // Step 5: Verify name uniqueness (critical for GeometryTree parent resolution)
    const allNames = loaded.geometries.volumes.map(v => v.name);
    const nameCounts = {};
    allNames.forEach(n => { nameCounts[n] = (nameCounts[n] || 0) + 1; });
    const duplicates = Object.entries(nameCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log(`\nWARNING: ${duplicates.length} duplicate names found!`);
      duplicates.slice(0, 10).forEach(([name, count]) => {
        console.log(`  "${name}" appears ${count} times`);
      });
    } else {
      console.log('\nNo duplicate names - all volume names are unique');
    }

    // Step 6: Verify parent resolution (every volume's mother_volume must exist)
    const allNameSet = new Set(allNames);
    const orphans = loaded.geometries.volumes.filter(v => 
      v.mother_volume && v.mother_volume !== 'World' && !allNameSet.has(v.mother_volume)
    );
    if (orphans.length > 0) {
      console.log(`\nWARNING: ${orphans.length} orphaned volumes (mother_volume not found)!`);
      orphans.slice(0, 10).forEach(v => {
        console.log(`  "${v.name}" → mother="${v.mother_volume}" (NOT FOUND)`);
      });
    } else {
      console.log('All parent references resolve correctly');
    }
  });

  it('propagateCompoundIdToDescendants does not corrupt _compoundId with duplicate names', () => {
    // Load actual mc-master geometry
    const mcMasterPath = path.resolve(__dirname, '../../../../../../mc-master/xenonnt_geometry.json');
    const mcMasterJson = JSON.parse(fs.readFileSync(mcMasterPath, 'utf8'));

    // Step 1: Import
    const imported = jsonToGeometry(mcMasterJson, emptyGeo());
    const volumes = imported.geometries.volumes;

    // Verify initial _compoundId correctness
    const topPMTs = volumes.filter(v => v.type === 'assembly' && v.name?.startsWith('TopPMT'));
    const botPMTs = volumes.filter(v => v.type === 'assembly' && v.name?.startsWith('BotPMT'));

    // All TopPMT components should have _compoundId = "TopPMTArray"
    const topPMT0Children = volumes.filter(v => v.mother_volume === 'TopPMT_0');
    const botPMT0Children = volumes.filter(v => v.mother_volume === 'BotPMT_0');
    console.log(`Before propagation: TopPMT_0 children _compoundIds:`, 
      topPMT0Children.map(c => `${c.name}:${c._compoundId}`));
    console.log(`Before propagation: BotPMT_0 children _compoundIds:`, 
      botPMT0Children.map(c => `${c.name}:${c._compoundId}`));

    // All should be TopPMTArray / BotPMTArray respectively
    topPMT0Children.forEach(c => {
      expect(c._compoundId).toBe('TopPMTArray');
    });
    botPMT0Children.forEach(c => {
      expect(c._compoundId).toBe('BotPMTArray');
    });

    // Step 2: Simulate handleImportGeometries / handleLoadProject propagation
    let updatedVolumes = [...volumes];
    volumes.forEach((volume, index) => {
      if (volume.type === 'assembly' || volume.type === 'union') {
        if (!volume._compoundId) {
          updatedVolumes[index] = { ...volume, _compoundId: volume.name };
        }
        const compoundId = updatedVolumes[index]._compoundId;
        updatedVolumes = propagateCompoundIdToDescendants(volume.name, compoundId, updatedVolumes);
      }
    });

    // Step 3: Check _compoundId after propagation
    const topPMT0ChildrenAfter = updatedVolumes.filter(v => v.mother_volume === 'TopPMT_0');
    const botPMT0ChildrenAfter = updatedVolumes.filter(v => v.mother_volume === 'BotPMT_0');
    console.log(`\nAfter propagation: TopPMT_0 children _compoundIds:`, 
      topPMT0ChildrenAfter.map(c => `${c.name}:${c._compoundId}`));
    console.log(`After propagation: BotPMT_0 children _compoundIds:`, 
      botPMT0ChildrenAfter.map(c => `${c.name}:${c._compoundId}`));

    // CRITICAL: TopPMT_0's children must still have _compoundId "TopPMTArray"
    // not "BotPMTArray" (the bug would cause BotPMT propagation to overwrite it)
    topPMT0ChildrenAfter.forEach(c => {
      expect(c._compoundId).toBe('TopPMTArray');
    });
    botPMT0ChildrenAfter.forEach(c => {
      expect(c._compoundId).toBe('BotPMTArray');
    });

    // Also check a few more instances
    const topPMT100ChildrenAfter = updatedVolumes.filter(v => v.mother_volume === 'TopPMT_100');
    topPMT100ChildrenAfter.forEach(c => {
      expect(c._compoundId).toBe('TopPMTArray');
    });

    // Step 4: Verify save after propagation produces correct output
    const savedJson = generateJson({
      world: imported.geometries.world,
      volumes: updatedVolumes,
    });

    const savedAsm = savedJson.volumes.filter(v => v.type === 'assembly');
    console.log(`\nAfter propagation + save: ${savedAsm.length} assemblies`);
    savedAsm.forEach(a => {
      if (a.type === 'assembly') {
        console.log(`  ${a.name} (_compoundId=${a._compoundId}): ${a.placements?.length} placements, ${a.components?.length} components`);
      }
    });

    // Should have exactly 4 PMT assemblies, not more
    const pmtAssemblies = savedAsm.filter(a => a.name?.includes('PMT'));
    expect(pmtAssemblies.length).toBe(4);
    
    const savedTop = pmtAssemblies.find(a => a._compoundId === 'TopPMTArray');
    const savedBot = pmtAssemblies.find(a => a._compoundId === 'BotPMTArray');
    expect(savedTop).toBeDefined();
    expect(savedBot).toBeDefined();
    expect(savedTop.placements).toHaveLength(253);
    expect(savedBot.placements).toHaveLength(241);
    expect(savedTop.components).toHaveLength(5);
    expect(savedBot.components).toHaveLength(5);
  });
});
