# XENONnT Geometry Converter — Status & Roadmap

## 1. Current State

The JSON converter (`mc-master/converter/`) currently generates **31 volumes** covering these subsystems:

### What We Have

| Subsystem | Volumes | Status |
|-----------|---------|--------|
| Water Tank | 3 (tank, water, air cone) | ✅ Complete |
| Cryostat | 5 (outer, vacuum, inner, LXe, GXe) | ✅ Complete |
| Bell | 2 (plate, wall) | ✅ Complete |
| Copper Ring | 1 | ✅ Complete |
| Electrode Rings | 4 (gate, anode, top mesh, bottom mesh) | ⚠️ Simplified |
| Electrode Meshes | 4 (gate, anode, top, bottom, cathode) | ⚠️ Disc approximation only |
| TPC Wall | 1 | ✅ Complete |
| Cathode | 2 (ring, mesh) | ⚠️ Simplified ring shape |
| Field Shaper Wires | 1 assembly (71 wires) | ✅ Complete |
| Top Reflector | 1 | ⚠️ Simple cylinder (no PMT holes) |
| Top Copper Plate | 1 | ⚠️ Simple cylinder (no PMT holes) |
| Bottom Copper Plate | 1 | ⚠️ Simple cylinder (no PMT holes) |
| PMTs (R11410) | 1 assembly (5 components, 494 placements) | ✅ Complete |
| Support Structure | 7 assemblies (31 placements) | ✅ Complete |
| Neutron Veto | 10 panels + 1 PMT assembly (120 PMTs) | ✅ Complete |
| Muon Veto | 1 PMT assembly (84 PMTs) | ✅ Complete |
| Calibration | 2 (tube, source) | ✅ Complete |

### What the Reference C++ Has That We Don't

The `XenonNtTPC.cc` reference implementation (~2,700 lines) constructs **~50 distinct volume types** with **~2,000+ physical placements**. Below is a gap analysis:

---

## 2. Gap Analysis

### 2.1 Missing Components

| Component | Reference (C++) | Converter (JSON) | Gap |
|-----------|----------------|-------------------|-----|
| **PTFE Ring Below Gate** | Teflon ring below gate frame | ❌ Missing | New volume |
| **Top Electrode Frame** | Complex Torlon/PTFE frame with subtracted ring shapes, gas feedthrough | ❌ Missing | Complex boolean solid |
| **64 Field Guard Rings** | Copper torus+tube union solids, placed circumferentially | ❌ Missing | New assembly |
| **24 PTFE Pillars** | Complex union solid (box+trapezoid+box+box) with 135 wire subtractions each | ❌ Missing | Complex boolean + many placements |
| **24 PTFE Cathode Frames** | Polycone segments above cathode ring | ❌ Missing | New assembly |
| **Bottom TPC Ring** | Teflon ring below TPC wall | ❌ Missing | Simple volume |
| **PTFE Ring Below BM Ring** | Teflon support ring | ❌ Missing | Simple volume |
| **Copper Ring Below Pillars** | Copper structural ring at bottom of pillars | ❌ Missing | Simple volume |
| **Top PMT Holder** | PTFE plate with 225/253 subtracted PMT holes | ❌ Missing | Boolean solid (MultiUnion) |
| **Bottom PMT Holder** | PTFE plate with 241 subtracted PMT holes | ❌ Missing | Boolean solid (MultiUnion) |
| **Bottom Reflector** | PTFE plate with complex polycone holes for 241 PMTs | ❌ Missing | Boolean solid |
| **PMT Bases** | Cirlex discs per PMT (466 total) | ❌ Missing | New assembly or parameterized |
| **Wire Meshes** | Optional individual wire construction (G4MultiUnion) for all 5 grids | ❌ Missing | Optional enhancement |
| **HVFT (HV Feedthrough)** | Commented out in reference, but exists | ❌ Missing | Optional |

### 2.2 Simplified Components (Present but Not Fully Detailed)

| Component | Reference Detail | Current JSON | Gap |
|-----------|-----------------|--------------|-----|
| **Electrode Rings** | Gate ring has stepped inner diameter (two-region shape); cathode/BM rings have toroidal edges (G4UnionSolid of tubes + torus) | Simple hollow cylinders | Need boolean/union solids |
| **Top Reflector** | Cylinder with 225/253 complex polycone holes (cone+tube1+tube2+tube3 per PMT) | Plain cylinder | Need boolean subtraction |
| **Top Copper Plate** | Cylinder with 225/253 PMT holes subtracted | Plain cylinder | Need boolean subtraction |
| **Bottom Copper Plate** | Cylinder with 241 PMT holes subtracted | Plain cylinder | Need boolean subtraction |
| **Cathode Mesh** | Disc or wire mesh with 0.304mm wires at 7.5mm pitch | Thin cylinder disc | Acceptable simplification |
| **PTFE Shrinkage** | All PTFE dimensions corrected by 1.4% (Z) and 1.1% (R) | ❌ Not applied | Need parameter correction |

### 2.3 Features the Converter Handles That the Reference Doesn't

| Feature | Notes |
|---------|-------|
| Support Structure | The JSON converter builds this; XenonNtTPC.cc doesn't include it |
| Neutron/Muon Veto PMTs | Separate from TPC; converter handles these |
| Calibration System | Converter has basic calibration tube/source |

---

## 3. Implementation Roadmap

### Phase 1 — Simple Missing Volumes ✅ COMPLETE

| Task | Shape | Status |
|------|-------|--------|
| PTFE Ring Below Gate | cylinder | ✅ Done |
| Bottom TPC Ring | cylinder | ✅ Done |
| PTFE Ring Below BM Ring | cylinder | ✅ Done |
| Copper Ring Below Pillars | cylinder | ✅ Done |
| PTFE Shrinkage corrections | parameter math | ✅ Done |

All Phase 1 volumes added in `tpc.py`; parameters in `parameters.py`. Volume count: 27 → 31.

### Phase 2 — Assemblies with Simple Components ✅ COMPLETE

| Task | Description | Status |
|------|-------------|--------|
| Field Guard Rings | 64 copper torus+tube unions (FieldGuards assembly) | ✅ Done |
| PMT Bases | 466 Cirlex discs added as 6th component of R11410 assembly | ✅ Done |
| PTFE Cathode Frames | 24 polycone sectors (CathodeFrames assembly) | ✅ Done |

Volume count: 31 → 33 (+2 assemblies). Cirlex material added.

### Phase 3 — Boolean Solids (Significant effort)

These require the converter to generate boolean operations (union/subtraction), which the G4 simulation parser already supports:

| Task | Description | Effort |
|------|-------------|--------|
| Improved Electrode Rings | Gate ring with stepped ID; cathode/BM rings with torus edges | 4 hrs |
| Top Electrode Frame | Complex subtraction solid (frame minus ring cutouts minus feedthrough) | 4 hrs |
| Top/Bottom PMT Holders | PTFE plates with 225+241 holes (MultiUnion subtraction) | 4 hrs |
| Top/Bottom Reflectors with PMT holes | Complex polycone hole patterns | 5 hrs |
| Top/Bottom Copper Plates with PMT holes | Cylinder with PMT hole subtractions | 3 hrs |

**Total Phase 3: ~20 hours**

### Phase 4 — Complex Structures (Major effort)

| Task | Description | Effort |
|------|-------------|--------|
| 24 PTFE Pillars | Union of 4 sub-solids, then 135 wire subtractions per pillar | 8 hrs |
| Wire mesh option | Individual wire construction for 5 electrode meshes (~1,200 wires) | 6 hrs |

**Total Phase 4: ~14 hours**

---

## 4. Effort Summary

| Phase | Description | Effort | Cumulative |
|-------|-------------|--------|------------|
| **Phase 1** | Simple missing volumes + shrinkage | ~3 hrs | 3 hrs |
| **Phase 2** | Medium assemblies (guards, bases, frames) | ~7 hrs | 10 hrs |
| **Phase 3** | Boolean solids (holders, reflectors, electrode frame) | ~20 hrs | 30 hrs |
| **Phase 4** | Complex pillars + wire meshes | ~14 hrs | 44 hrs |

### Priority Recommendation

- **Phase 1** should be done first — low effort, fills obvious gaps.
- **Phase 2** adds physically important components (field guards define the drift field; PMT bases affect backgrounds).
- **Phase 3** matters mainly for background studies where material near PMTs is important. The simple cylinder approximation is good enough for most drift-field and optical simulations.
- **Phase 4** is needed only for detailed background modeling or engineering validation.

---

## 5. Converter vs Reference Completeness

```
Reference (XenonNtTPC.cc):  ████████████████████████████████████████ 100%
Current Converter (TPC):    ██████████████████░░░░░░░░░░░░░░░░░░░░░░  45%
After Phase 1:              ████████████████████░░░░░░░░░░░░░░░░░░░░  50% ✅
After Phase 2:              █████████████████████████░░░░░░░░░░░░░░░░  62% ✅
After Phase 3:              ████████████████████████████████░░░░░░░░░░  80%
After Phase 4:              ███████████████████████████████████████░░░  95%
```

The remaining ~5% gap would be things like exact optical surface definitions, parameterised mesh options, and the HV feedthrough — items that are either commented out in the reference or are runtime configuration details rather than geometry.

---

## 6. Technical Prerequisites

| Requirement | Status |
|-------------|--------|
| Boolean solids in JSON format | ✅ Supported by GeometryParser |
| Assembly volumes | ✅ Supported |
| Polycone shapes | ✅ Supported |
| Torus shapes | ✅ Supported |
| Trapezoid shapes | ✅ Supported |
| Nested assemblies | ❌ Not supported (but not needed) |
| G4MultiUnion equivalent | ⚠️ Can be done via sequential boolean ops |
| Parameterised placements | ❌ Not implemented in parser (not needed) |

The GeometryParser already supports all solid types and boolean operations needed for Phases 1–4. No parser changes are required.
