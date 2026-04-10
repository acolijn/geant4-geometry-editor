import { describe, it, expect, vi } from 'vitest';
import { generateJson } from '../geometryToJson';
import { jsonToGeometry } from '../jsonToGeometry';
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
    expect(pmtArrays).toHaveLength(2); // TopPMTArray, BotPMTArray
    
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
  });
});
