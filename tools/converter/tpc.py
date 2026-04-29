"""
TPC internals: bell, electrode rings/meshes, TPC wall, field shapers,
reflectors, copper plates.
"""

import math

from .parameters import (
    tp, dPTFECorrZ,
    BellPlateOffsetZ, BellWallOffsetZ, CuRingOffsetZ,
    GateRingOffsetZ, AnodeRingOffsetZ, TopMeshRingOffsetZ,
    TpcTopZ, TpcWallCenterZ, CathodeRingOffsetZ, BMRingOffsetZ,
    top_refl_offsetZ, top_cu_offsetZ, bot_refl_z, bot_cu_z,
    PTFEringBelowGateHeight, PTFERingBelowGateOffsetZ,
    BottomTPCRingHeight, BottomTPCRingOffsetZ,
    TeflonBMringHeight, TeflonBMRingOffsetZ,
    CuBelowPillarsOffsetZ,
    GuardCurvature, GuardEdgeMinorR, GuardTopOffsetZ,
    CathodeFrameOffsetZ,
)
from .helpers import placement, hexagonal_pmt_positions

# Hole radius in the copper plates (from mc-master TopCopperPlateHoleDiameter = 79 mm)
_CU_HOLE_RADIUS = 39.5   # mm
_PMT_PITCH      = 76.2   # mm (same pitch as PMT array)


def _copper_plate_with_holes(name, g4name, plate_r, plate_h, n_holes, offset_z, parent):
    """Return a subtraction volume: copper disc with n_holes cylindrical cutouts
    matching the hexagonal PMT positions.  The editor renders this with the
    approximate (Inside-test) path; Geant4 builds the full boolean chain.
    """
    # The hole height is slightly taller than the plate so the cut goes all the way through.
    hole_h = round(plate_h + 2.0, 3)

    components = [
        # Base: solid copper cylinder — must have boolean_operation "union" so
        # expandToFlat sets _is_boolean_component = true and UnionObject finds it.
        {
            "name": f"{name}_base",
            "g4name": g4name,
            "type": "cylinder",
            "material": "G4_Cu",
            "boolean_operation": "union",
            "dimensions": {"radius": round(plate_r, 3), "height": round(plate_h, 3)},
            "placements": [{"name": f"{name}_base", "x": 0, "y": 0, "z": 0,
                            "rotation": {"x": 0, "y": 0, "z": 0}, "parent": ""}],
            "visible": True,
        }
    ]

    for i, (px, py) in enumerate(hexagonal_pmt_positions(n_holes, _PMT_PITCH)):
        components.append({
            "name": f"{name}_hole_{i}",
            "type": "cylinder",
            "material": "G4_Cu",
            "boolean_operation": "subtract",
            "dimensions": {"radius": _CU_HOLE_RADIUS, "height": hole_h},
            "placements": [{"name": f"{name}_hole_{i}",
                            "x": round(px, 3), "y": round(py, 3), "z": 0,
                            "rotation": {"x": 0, "y": 0, "z": 0}, "parent": ""}],
            "visible": True,
        })

    return {
        "name": name,
        "g4name": g4name,
        "type": "union",
        "material": "G4_Cu",
        "components": components,
        "placements": [placement(0, 0, round(offset_z, 3), parent, g4name, name)],
        "visible": True,
    }


def build_tpc():
    """Return volumes for TPC internals."""
    volumes = []

    # Bell plate
    volumes.append({
        "name": "BellPlate",
        "g4name": "SS_BellPlate",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(0.5 * tp["BellPlateDiameter"], 3),
            "height": round(tp["BellPlateHeight"], 3),
        },
        "placements": [placement(0, 0, round(BellPlateOffsetZ, 3),
                                 "LXeVolume", "SS_BellPlate", "BellPlate")],
        "visible": True,
    })

    # Bell wall
    volumes.append({
        "name": "BellWall",
        "g4name": "SS_BellWall",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(0.5 * tp["BellWallOuterDiameter"], 3),
            "height": round(tp["BellWallHeight"], 3),
            "inner_radius": round(0.5 * tp["BellWallOuterDiameter"] - tp["BellWallThickness"], 3),
        },
        "placements": [placement(0, 0, round(BellWallOffsetZ, 3),
                                 "LXeVolume", "SS_BellWall", "BellWall")],
        "visible": True,
    })

    # Copper ring
    volumes.append({
        "name": "CopperRing",
        "g4name": "Cu_CopperRing",
        "type": "cylinder",
        "material": "G4_Cu",
        "dimensions": {
            "radius": round(0.5 * tp["BellWallOuterDiameter"], 3),
            "height": round(tp["CopperRingHeight"], 3),
            "inner_radius": round(0.5 * tp["CopperRingInnerDiameter"], 3),
        },
        "placements": [placement(0, 0, round(CuRingOffsetZ, 3),
                                 "LXeVolume", "Cu_CopperRing", "CopperRing")],
        "visible": True,
    })

    # Gate ring
    gate_outer_r = 0.5 * tp["GateRingInnerDiameterMax"] + tp["GateRingTotalWidth"]
    volumes.append({
        "name": "GateRing",
        "g4name": "SS_GateRing",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(gate_outer_r, 3),
            "height": round(tp["GateRingTotalHeight"], 3),
            "inner_radius": round(0.5 * tp["GateRingInnerDiameterMin"], 3),
        },
        "placements": [placement(0, 0, round(GateRingOffsetZ, 3),
                                 "LXeVolume", "SS_GateRing", "GateRing")],
        "visible": True,
    })

    # Gate mesh
    volumes.append({
        "name": "GateMesh",
        "g4name": "SS_GateMesh",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(0.5 * tp["GateMeshDiameter"], 3),
            "height": round(tp["GateMeshThickness"], 3),
        },
        "placements": [placement(0, 0, round(GateRingOffsetZ, 3),
                                 "LXeVolume", "SS_GateMesh", "GateMesh")],
        "visible": True,
    })

    # Anode ring
    anode_outer_r = 0.5 * tp["AnodeRingInnerDiameter"] + tp["AnodeRingWidth"]
    volumes.append({
        "name": "AnodeRing",
        "g4name": "SS_AnodeRing",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(anode_outer_r, 3),
            "height": round(tp["AnodeRingHeight"], 3),
            "inner_radius": round(0.5 * tp["AnodeRingInnerDiameter"], 3),
        },
        "placements": [placement(0, 0, round(AnodeRingOffsetZ, 3),
                                 "LXeVolume", "SS_AnodeRing", "AnodeRing")],
        "visible": True,
    })

    # Anode mesh
    volumes.append({
        "name": "AnodeMesh",
        "g4name": "SS_AnodeMesh",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(0.5 * tp["AnodeMeshDiameter"], 3),
            "height": round(tp["AnodeMeshThickness"], 3),
        },
        "placements": [placement(0, 0, round(AnodeRingOffsetZ, 3),
                                 "LXeVolume", "SS_AnodeMesh", "AnodeMesh")],
        "visible": True,
    })

    # Top screening mesh ring
    topmesh_outer_r = 0.5 * tp["TopMeshRingInnerDiameter"] + tp["TopMeshRingWidth"]
    volumes.append({
        "name": "TopMeshRing",
        "g4name": "SS_TopMeshRing",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(topmesh_outer_r, 3),
            "height": round(tp["TopMeshRingHeight"], 3),
            "inner_radius": round(0.5 * tp["TopMeshRingInnerDiameter"], 3),
        },
        "placements": [placement(0, 0, round(TopMeshRingOffsetZ, 3),
                                 "LXeVolume", "SS_TopMeshRing", "TopMeshRing")],
        "visible": True,
    })

    # Top mesh
    volumes.append({
        "name": "TopMesh",
        "g4name": "SS_TopMesh",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(0.5 * tp["TopMeshDiameter"], 3),
            "height": round(tp["TopMeshThickness"], 3),
        },
        "placements": [placement(0, 0, round(TopMeshRingOffsetZ, 3),
                                 "LXeVolume", "SS_TopMesh", "TopMesh")],
        "visible": True,
    })

    # TPC PTFE Wall
    tpc_wall_outer_r = 0.5 * tp["TpcWallDiameter"] + tp["TpcWallThickness"]
    tpc_wall_inner_r = 0.5 * tp["TpcWallDiameter"]
    tpc_wall_h = dPTFECorrZ * tp["TpcWallHeight"]

    volumes.append({
        "name": "TPCWall",
        "g4name": "PTFE_TPCWall",
        "type": "cylinder",
        "material": "PTFE",
        "dimensions": {
            "radius": round(tpc_wall_outer_r, 3),
            "height": round(tpc_wall_h, 3),
            "inner_radius": round(tpc_wall_inner_r, 3),
        },
        "placements": [placement(0, 0, round(TpcWallCenterZ, 3),
                                 "LXeVolume", "PTFE_TPCWall", "TPCWall")],
        "visible": True,
    })

    # Cathode ring
    cathode_outer_r = 0.5 * tp["CathodeRingInnerDiameter"] + tp["CathodeRingTubeWidth"]
    volumes.append({
        "name": "CathodeRing",
        "g4name": "SS_CathodeRing",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(cathode_outer_r, 3),
            "height": round(tp["CathodeRingTotalHeight"], 3),
            "inner_radius": round(0.5 * tp["CathodeRingInnerDiameter"], 3),
        },
        "placements": [placement(0, 0, round(CathodeRingOffsetZ, 3),
                                 "LXeVolume", "SS_CathodeRing", "CathodeRing")],
        "visible": True,
    })

    # Cathode mesh
    volumes.append({
        "name": "CathodeMesh",
        "g4name": "SS_CathodeMesh",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(0.5 * tp["CathodeMeshDiameter"], 3),
            "height": round(tp["CathodeMeshThickness"], 3),
        },
        "placements": [placement(0, 0, round(CathodeRingOffsetZ, 3),
                                 "LXeVolume", "SS_CathodeMesh", "CathodeMesh")],
        "visible": True,
    })

    # Bottom screening mesh ring
    bm_outer_r = 0.5 * tp["BMringInnerDiameter"] + tp["BMringTubeWidth"]
    volumes.append({
        "name": "BottomMeshRing",
        "g4name": "SS_BottomMeshRing",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(bm_outer_r, 3),
            "height": round(tp["BMringTotalHeight"], 3),
            "inner_radius": round(0.5 * tp["BMringInnerDiameter"], 3),
        },
        "placements": [placement(0, 0, round(BMRingOffsetZ, 3),
                                 "LXeVolume", "SS_BottomMeshRing", "BottomMeshRing")],
        "visible": True,
    })

    # Bottom mesh
    volumes.append({
        "name": "BottomMesh",
        "g4name": "SS_BottomMesh",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": round(0.5 * tp["BottomMeshDiameter"], 3),
            "height": round(tp["BottomMeshThickness"], 3),
        },
        "placements": [placement(0, 0, round(BMRingOffsetZ, 3),
                                 "LXeVolume", "SS_BottomMesh", "BottomMesh")],
        "visible": True,
    })

    # Top reflector plate (PTFE)
    volumes.append({
        "name": "TopReflector",
        "g4name": "PTFE_TopReflector",
        "type": "cylinder",
        "material": "PTFE",
        "dimensions": {
            "radius": round(0.5 * tp["TopReflectorDiameter"], 3),
            "height": round(tp["TopReflectorHeight"], 3),
        },
        "placements": [placement(0, 0, round(top_refl_offsetZ, 3),
                                 "LXeVolume", "PTFE_TopReflector", "TopReflector")],
        "visible": True,
    })

    # Top copper plate (253 PMT holes, same positions as top PMT array)
    volumes.append(_copper_plate_with_holes(
        name="TopCopperPlate",
        g4name="Cu_TopCopperPlate",
        plate_r=round(0.5 * tp["TopCopperPlateDiameter"], 3),
        plate_h=round(tp["TopCopperPlateHeight"], 3),
        n_holes=253,
        offset_z=round(top_cu_offsetZ, 3),
        parent="LXeVolume",
    ))

    # Bottom copper plate (241 PMT holes, same positions as bottom PMT array)
    volumes.append(_copper_plate_with_holes(
        name="BotCopperPlate",
        g4name="Cu_BotCopperPlate",
        plate_r=round(0.5 * tp["BotCopperPlateDiameter"], 3),
        plate_h=round(tp["BotCopperPlateHeight"], 3),
        n_holes=241,
        offset_z=round(bot_cu_z, 3),
        parent="LXeVolume",
    ))

    # Field shaper wires — single assembly placed once, with 71 wire components
    fs_radius = round(0.5 * tp["TpcWallDiameter"] + tp["TpcWallThickness"] + 2.0, 3)
    fs_inner = round(0.5 * tp["TpcWallDiameter"] + tp["TpcWallThickness"], 3)
    fs_height = round(tp["FieldShaperWireDiameter"], 3)

    fs_components = []
    for i in range(int(tp["NumberOfFieldShaperWires"])):
        wire_z = (TpcTopZ
                  - 21.3  # FieldShaperWireTopToTpcTop
                  - i * tp["FieldShaperWiresDistance"])
        fs_components.append({
            "name": f"FieldShaperWire_{i}",
            "g4name": f"Cu_FieldShaper_{i}",
            "type": "cylinder",
            "material": "G4_Cu",
            "dimensions": {
                "radius": fs_radius,
                "height": fs_height,
                "inner_radius": fs_inner,
            },
            "placements": [placement(0, 0, round(wire_z, 3), "FieldShaper",
                                     f"Cu_FieldShaper_{i}", f"FieldShaperWire_{i}")],
            "visible": True,
        })

    volumes.append({
        "name": "FieldShaper",
        "g4name": "FieldShaper",
        "type": "assembly",
        "material": "G4_Cu",
        "placements": [placement(0, 0, 0, "LXeVolume",
                                 "FieldShaper", "FieldShaper")],
        "components": fs_components,
        "visible": True,
    })

    # ---- Phase 2: field guard rings ----
    # Each guard is a union of a central tube + two torus edges (rounded cross-section).
    # All 64 guards share the same logical volume; only their Z position differs.
    guard_placements = []
    for i in range(int(tp["NumerOfFieldGuards"])):
        gz = GuardTopOffsetZ - i * dPTFECorrZ * tp["FieldGuardsDistance"]
        guard_placements.append({
            "name": f"FieldGuard_{i}",
            "x": 0, "y": 0, "z": round(gz, 3),
            "rotation": {"x": 0, "y": 0, "z": 0},
        })

    guard_component = {
        "name": "FieldGuard",
        "g4name": "Copper_FieldGuard",
        "type": "union",
        "material": "G4_Cu",
        "components": [
            {
                "name": "GuardTube",
                "type": "cylinder",
                "material": "G4_Cu",
                "dimensions": {
                    "radius": round(GuardCurvature + 0.5 * tp["FieldGuardsWidth"], 3),
                    "height": round(tp["FieldGuardsTubeHeight"], 3),
                    "inner_radius": round(GuardCurvature - 0.5 * tp["FieldGuardsWidth"], 3),
                },
                "placements": [{"name": "GuardTube", "x": 0, "y": 0, "z": 0,
                                 "rotation": {"x": 0, "y": 0, "z": 0}, "parent": ""}],
            },
            {
                "name": "GuardEdgeTop",
                "type": "torus",
                "material": "G4_Cu",
                "dimensions": {
                    "tube_radius": round(GuardEdgeMinorR, 3),
                    "torus_radius": round(GuardCurvature, 3),
                },
                "placements": [{"name": "GuardEdgeTop", "x": 0, "y": 0,
                                 "z": round(0.5 * tp["FieldGuardsTubeHeight"], 3),
                                 "rotation": {"x": 0, "y": 0, "z": 0}, "parent": ""}],
            },
            {
                "name": "GuardEdgeBot",
                "type": "torus",
                "material": "G4_Cu",
                "dimensions": {
                    "tube_radius": round(GuardEdgeMinorR, 3),
                    "torus_radius": round(GuardCurvature, 3),
                },
                "placements": [{"name": "GuardEdgeBot", "x": 0, "y": 0,
                                 "z": round(-0.5 * tp["FieldGuardsTubeHeight"], 3),
                                 "rotation": {"x": 0, "y": 0, "z": 0}, "parent": ""}],
            },
        ],
        "placements": guard_placements,
        "visible": True,
    }

    volumes.append({
        "name": "FieldGuards",
        "g4name": "FieldGuards",
        "type": "assembly",
        "material": "G4_Cu",
        "placements": [placement(0, 0, 0, "LXeVolume", "FieldGuards", "FieldGuards")],
        "components": [guard_component],
        "visible": True,
    })

    # ---- Phase 2: PTFE cathode frames (24 polycone sectors above cathode ring) ----
    cathode_sep = tp["PTFECathodeAngularSeparation"]
    cathode_delta = tp["PillarsDeltaTheta"]
    cathode_h = tp["PTFEAboveCathodeHeight"]
    cathode_z0 = round(-0.5 * cathode_h, 3)
    cathode_z1 = round(cathode_z0 + tp["PTFEAboveCathodeBotHeight"], 3)
    cathode_z3 = round(cathode_z1 + tp["PTFEAboveCathodeMiddleHeight"], 3)
    cathode_z5 = round(0.5 * cathode_h, 3)

    cathode_placements = []
    for i in range(int(tp["NumberOfPillars"])):
        # C++ uses rotateZ(step*i - offset); JSON convention negates the angle
        rz = -(i * cathode_delta - tp["CathodeFrameAngularOffset"])
        cathode_placements.append({
            "name": f"CathodeFrame_{i}",
            "x": 0, "y": 0, "z": round(CathodeFrameOffsetZ, 3),
            "rotation": {"x": 0, "y": 0, "z": round(rz, 6)},
        })

    cathode_component = {
        "name": "CathodeFrame",
        "g4name": "Teflon_CathodeRingFrame",
        "type": "polycone",
        "material": "PTFE",
        "dimensions": {
            "start_phi": round(0.5 * cathode_sep, 6),
            "delta_phi": round(cathode_delta - cathode_sep, 6),
            "z":    [cathode_z0, cathode_z1, cathode_z1, cathode_z3, cathode_z3, cathode_z5],
            "rmin": [tp["PTFEAboveCathodeBotInnerR"]] * 2
                    + [tp["PTFEAboveCathodeTopInnerR"]] * 4,
            "rmax": [tp["PTFEAboveCathodeBotInnerR"] + tp["PTFEAboveCathodeBotWidth"]] * 4
                    + [tp["PTFEAboveCathodeTopInnerR"] + tp["PTFEAboveCathodeTopWidth"]] * 2,
        },
        "placements": cathode_placements,
        "visible": True,
    }

    volumes.append({
        "name": "CathodeFrames",
        "g4name": "CathodeFrames",
        "type": "assembly",
        "material": "PTFE",
        "placements": [placement(0, 0, 0, "LXeVolume", "CathodeFrames", "CathodeFrames")],
        "components": [cathode_component],
        "visible": True,
    })

    # ---- Phase 1: simple missing volumes ----

    # PTFE ring below gate frame (fills gap between copper ring and gate ring)
    ptfe_gate_inner_r = 0.5 * tp["RingBelowGateInnerDiameter"] + 0.2  # +0.2 mm for pillar clearance
    volumes.append({
        "name": "PTFERingBelowGate",
        "g4name": "Teflon_RingBelowGate",
        "type": "cylinder",
        "material": "PTFE",
        "dimensions": {
            "radius": round(ptfe_gate_inner_r + tp["RingBelowGateWidth"], 3),
            "height": round(PTFEringBelowGateHeight, 3),
            "inner_radius": round(ptfe_gate_inner_r, 3),
        },
        "placements": [placement(0, 0, round(PTFERingBelowGateOffsetZ, 3),
                                 "LXeVolume", "Teflon_RingBelowGate", "PTFERingBelowGate")],
        "visible": True,
    })

    # Bottom TPC ring (PTFE ring below the TPC wall)
    volumes.append({
        "name": "BottomTPCRing",
        "g4name": "Teflon_BottomTPC",
        "type": "cylinder",
        "material": "PTFE",
        "dimensions": {
            "radius": round(0.5 * tp["TpcWallDiameter"] + tp["TpcWallThickness"], 3),
            "height": round(BottomTPCRingHeight, 3),
            "inner_radius": round(0.5 * tp["TpcWallDiameter"], 3),
        },
        "placements": [placement(0, 0, round(BottomTPCRingOffsetZ, 3),
                                 "LXeVolume", "Teflon_BottomTPC", "BottomTPCRing")],
        "visible": True,
    })

    # PTFE ring below BM ring (thin ring between bottom mesh ring and bottom reflector)
    volumes.append({
        "name": "PTFERingBelowBMRing",
        "g4name": "Teflon_RingBelowBottomMesh",
        "type": "cylinder",
        "material": "PTFE",
        "dimensions": {
            "radius": round(0.5 * tp["TeflonBMringInnerD"] + tp["TeflonBMringWidth"], 3),
            "height": round(TeflonBMringHeight, 3),
            "inner_radius": round(0.5 * tp["TeflonBMringInnerD"], 3),
        },
        "placements": [placement(0, 0, round(TeflonBMRingOffsetZ, 3),
                                 "LXeVolume", "Teflon_RingBelowBottomMesh", "PTFERingBelowBMRing")],
        "visible": True,
    })

    # Copper ring below pillars (structural ring at the bottom of the 24 PTFE pillars)
    volumes.append({
        "name": "CopperRingBelowPillars",
        "g4name": "Copper_LowerRing",
        "type": "cylinder",
        "material": "G4_Cu",
        "dimensions": {
            "radius": round(0.5 * tp["CuBelowPillarsInnerDiameter"] + tp["CuBelowPillarsWidth"], 3),
            "height": round(tp["CuBelowPillarsHeight"], 3),
            "inner_radius": round(0.5 * tp["CuBelowPillarsInnerDiameter"], 3),
        },
        "placements": [placement(0, 0, round(CuBelowPillarsOffsetZ, 3),
                                 "LXeVolume", "Copper_LowerRing", "CopperRingBelowPillars")],
        "visible": True,
    })

    return volumes
