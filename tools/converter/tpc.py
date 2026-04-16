"""
TPC internals: bell, electrode rings/meshes, TPC wall, field shapers,
reflectors, copper plates.
"""

from .parameters import (
    tp, dPTFECorrZ,
    BellPlateOffsetZ, BellWallOffsetZ, CuRingOffsetZ,
    GateRingOffsetZ, AnodeRingOffsetZ, TopMeshRingOffsetZ,
    TpcTopZ, TpcWallCenterZ, CathodeRingOffsetZ, BMRingOffsetZ,
    top_refl_offsetZ, top_cu_offsetZ, bot_refl_z, bot_cu_z,
)
from .helpers import placement


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

    # Top copper plate
    volumes.append({
        "name": "TopCopperPlate",
        "g4name": "Cu_TopCopperPlate",
        "type": "cylinder",
        "material": "G4_Cu",
        "dimensions": {
            "radius": round(0.5 * tp["TopCopperPlateDiameter"], 3),
            "height": round(tp["TopCopperPlateHeight"], 3),
        },
        "placements": [placement(0, 0, round(top_cu_offsetZ, 3),
                                 "LXeVolume", "Cu_TopCopperPlate", "TopCopperPlate")],
        "visible": True,
    })

    # Bottom copper plate
    volumes.append({
        "name": "BotCopperPlate",
        "g4name": "Cu_BotCopperPlate",
        "type": "cylinder",
        "material": "G4_Cu",
        "dimensions": {
            "radius": round(0.5 * tp["BotCopperPlateDiameter"], 3),
            "height": round(tp["BotCopperPlateHeight"], 3),
        },
        "placements": [placement(0, 0, round(bot_cu_z, 3),
                                 "LXeVolume", "Cu_BotCopperPlate", "BotCopperPlate")],
        "visible": True,
    })

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

    return volumes
