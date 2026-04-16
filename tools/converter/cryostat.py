"""
Outer & inner cryostats, vacuum space, LXe and GXe volumes.
"""

from .parameters import (
    p, tp,
    OuterCryoZPos, InnerCryoZPos,
    BellPlateOffsetZ, GateRingOffsetZ,
)
from .helpers import make_vessel_polycone, placement


def build_cryostats():
    """Return volumes for outer/inner cryostats, vacuum, LXe, GXe."""
    volumes = []

    # --- Outer Cryostat ---
    oc_L = p["OuterCryostatCylinderHeight"]
    oc_D = p["OuterCryostatOuterDiameter"]
    oc_h_ring1 = p["OuterCryostatRingsHeight"]
    oc_dR_ring1 = p["OuterCryostatRingsThickness"]
    oc_z_ring1 = (-oc_L * 0.5
                  + p["OuterCryostatCylinderBaseToRing1BotZ"]
                  + oc_h_ring1 * 0.5)
    oc_z_ring2 = (oc_z_ring1 + oc_h_ring1 * 0.5
                  + p["OuterCryostatRing1TopToRing2BotZ"]
                  + oc_h_ring1 * 0.5)
    oc_z_flange = (oc_z_ring2 + oc_h_ring1 * 0.5
                   + p["OuterCryostatRing2TopToFlangeBotZ"]
                   + p["OuterCryostatFlangeHeight"] * 0.5)

    oc_z, oc_rmin, oc_rmax = make_vessel_polycone(
        oc_D, oc_L,
        p["OuterCryostatR0top"], p["OuterCryostatR1top"],
        p["OuterCryostatR0bot"], p["OuterCryostatR1bot"],
        p["OuterCryostatFlangeHeight"], p["OuterCryostatFlangeThickness"], oc_z_flange,
        oc_h_ring1, oc_dR_ring1, oc_z_ring1,
        oc_h_ring1, oc_dR_ring1, oc_z_ring2,
        has_rings=True,
    )

    volumes.append({
        "name": "OuterCryostat",
        "g4name": "SS_OuterCryostat",
        "type": "polycone",
        "material": "SS316Ti",
        "dimensions": {"z": oc_z, "rmin": oc_rmin, "rmax": oc_rmax},
        "placements": [placement(0, 0, round(OuterCryoZPos, 3),
                                 "Water", "SS_OuterCryostat", "OuterCryostat")],
        "visible": True,
        "wireframe": False,
    })

    # --- Outer Cryostat Vacuum ---
    oc_inner_D = oc_D - 2 * p["OuterCryostatThickness"]
    oc_inner_R0top = p["OuterCryostatR0top"] - p["OuterCryostatThicknessTop"]
    oc_inner_R1top = p["OuterCryostatR1top"] - p["OuterCryostatThicknessTop"]
    oc_inner_R0bot = p["OuterCryostatR0bot"] - p["OuterCryostatThicknessBot"]
    oc_inner_R1bot = p["OuterCryostatR1bot"] - p["OuterCryostatThicknessBot"]

    ocv_z, ocv_rmin, ocv_rmax = make_vessel_polycone(
        oc_inner_D, oc_L,
        oc_inner_R0top, oc_inner_R1top,
        oc_inner_R0bot, oc_inner_R1bot,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        has_rings=False,
    )

    volumes.append({
        "name": "OuterCryostatVacuum",
        "g4name": "OuterCryostatVacuum",
        "type": "polycone",
        "material": "G4_Galactic",
        "dimensions": {"z": ocv_z, "rmin": ocv_rmin, "rmax": ocv_rmax},
        "placements": [placement(0, 0, 0, "OuterCryostat",
                                 "OuterCryostatVacuum", "OuterCryostatVacuum")],
        "visible": False,
    })

    # --- Inner Cryostat ---
    ic_L = p["InnerCryostatCylinderHeight"]
    ic_D = p["InnerCryostatOuterDiameter"]
    ic_h_ring1 = p["InnerCryostatRingsHeight"]
    ic_dR_ring1 = p["InnerCryostatRingsThickness"]
    ic_z_ring1 = (-ic_L * 0.5
                  + p["InnerCryostatCylinderBaseToRing1BotZ"]
                  + ic_h_ring1 * 0.5)
    ic_z_ring2 = (ic_z_ring1 + ic_h_ring1 * 0.5
                  + p["InnerCryostatRing1TopToRing2BotZ"]
                  + ic_h_ring1 * 0.5)
    ic_z_flange = (ic_z_ring2 + ic_h_ring1 * 0.5
                   + p["InnerCryostatRing2TopToFlangeBotZ"]
                   + p["InnerCryostatFlangeHeight"] * 0.5)

    ic_z, ic_rmin, ic_rmax = make_vessel_polycone(
        ic_D, ic_L,
        p["InnerCryostatR0top"], p["InnerCryostatR1top"],
        p["InnerCryostatR0bot"], p["InnerCryostatR1bot"],
        p["InnerCryostatFlangeHeight"], p["InnerCryostatFlangeThickness"], ic_z_flange,
        ic_h_ring1, ic_dR_ring1, ic_z_ring1,
        ic_h_ring1, ic_dR_ring1, ic_z_ring2,
        has_rings=True,
    )

    volumes.append({
        "name": "InnerCryostat",
        "g4name": "SS_InnerCryostat",
        "type": "polycone",
        "material": "SS316Ti",
        "dimensions": {"z": ic_z, "rmin": ic_rmin, "rmax": ic_rmax},
        "placements": [placement(0, 0, round(InnerCryoZPos, 3),
                                 "OuterCryostatVacuum", "SS_InnerCryostat", "InnerCryostat")],
        "visible": True,
        "wireframe": False,
    })

    # --- LXe volume ---
    lxe_D = p["InnerCryostatOuterDiameter"] - 2 * p["InnerCryostatThickness"]
    lxe_R0top = p["InnerCryostatR0top"] - p["InnerCryostatThicknessTop"]
    lxe_R1top = p["InnerCryostatR1top"] - p["InnerCryostatThicknessTop"]
    lxe_R0bot = p["InnerCryostatR0bot"] - p["InnerCryostatThicknessBot"]
    lxe_R1bot = p["InnerCryostatR1bot"] - p["InnerCryostatThicknessBot"]
    lxe_H = p["InnerCryostatCylinderHeight"]

    lxe_z, lxe_rmin, lxe_rmax = make_vessel_polycone(
        lxe_D, lxe_H,
        lxe_R0top, lxe_R1top,
        lxe_R0bot, lxe_R1bot,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        has_rings=False,
    )

    volumes.append({
        "name": "LXeVolume",
        "g4name": "LXe",
        "type": "polycone",
        "material": "LXe",
        "dimensions": {"z": lxe_z, "rmin": lxe_rmin, "rmax": lxe_rmax},
        "placements": [placement(0, 0, 0, "InnerCryostat", "LXe", "LXeVolume")],
        "visible": True,
        "wireframe": True,
    })

    # --- GXe volume ---
    gxe_top = BellPlateOffsetZ + 0.5 * tp["BellPlateHeight"]
    gxe_bot = GateRingOffsetZ + 0.5 * tp["GateRingTotalHeight"] + tp["GateRingTopToGXeInterface"]
    gxe_height = gxe_top - gxe_bot
    gxe_center_z = 0.5 * (gxe_top + gxe_bot)
    gxe_radius = 0.5 * tp["BellWallOuterDiameter"] - tp["BellWallThickness"]

    volumes.append({
        "name": "GXeVolume",
        "g4name": "GXe",
        "type": "cylinder",
        "material": "GXe",
        "dimensions": {
            "radius": round(gxe_radius, 3),
            "height": round(max(1.0, gxe_height), 3),
        },
        "placements": [placement(0, 0, round(gxe_center_z, 3),
                                 "LXeVolume", "GXe", "GXeVolume")],
        "visible": True,
        "wireframe": False,
    })

    return volumes
