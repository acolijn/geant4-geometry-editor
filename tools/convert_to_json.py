#!/usr/bin/env python3
"""
Convert XENONnT mc-master geometry to geant4-geometry-editor JSON format.

Extracts main structure: World, Water Tank, Water, Cryostats, LXe/GXe,
Bell, TPC PTFE walls, Electrode rings, PMT assemblies.

Skips: optical surfaces, pipes, support structure, calibration sources,
       wire grids, reflector foils.

All dimensions in mm (the editor convention).
"""

import json
import math
import sys

# ============================================================
# 1. Geometry Parameters (from DefineGeometryParameters + nT branch)
# ============================================================

p = {}  # parameter dictionary

# --- Laboratory ---
p["LabAxisLength"] = 100_000.0  # 100 m
p["LabSide"] = 18_479.0
p["LabHeight"] = 20_939.0
p["LabRealHeight"] = 16_065.0
p["ConcreteThickness"] = 500.0
p["RockThickness"] = 5_000.0
p["WorldThickness"] = 5_000.0

# --- Water tank ---
p["WaterTankHeight"] = 10_500.0
p["WaterHeight"] = 10_200.0
p["WaterTankOuterRadius"] = 4_800.0
p["WaterTankThickness"] = 2.0
p["TankConsR1"] = p["WaterTankOuterRadius"]
p["TankConsR2"] = 1_202.82
p["TankConsHeight"] = 1_490.0
p["WaterLineBase"] = 1_923.0

p["WaterTankCylinderHeight"] = p["WaterTankHeight"] - p["TankConsHeight"]
p["WaterTankCylinderInnerHeight"] = p["WaterTankCylinderHeight"] - p["WaterTankThickness"]
p["WaterTankInnerRadius"] = p["WaterTankOuterRadius"] - p["WaterTankThickness"]
p["TankOffset"] = p["WaterHeight"] - p["WaterTankCylinderHeight"]

p["WaterConsR1"] = p["TankConsR1"] - p["WaterTankThickness"]
p["WaterConsR2"] = p["TankConsR2"] - p["WaterTankThickness"]
p["WaterConsHeight"] = p["TankConsHeight"] - p["WaterTankThickness"]

p["AirConsR1"] = p["WaterLineBase"] - p["WaterTankThickness"]
p["AirConsR2"] = p["TankConsR2"] - p["WaterTankThickness"]
p["AirConsHeight"] = p["WaterTankHeight"] - p["WaterHeight"] - p["WaterTankThickness"]
p["AirConsOffset"] = p["WaterHeight"] - p["WaterTankCylinderHeight"]

p["Cryo1T_TankOffsetZ"] = 530.0

# --- XENONnT Cryostat ---
p["RockOffsetZ"] = 27.5905
p["WaterTubeFrameOffsetZWrt1T"] = 59.879
p["TankOffsetX"] = 2_360.0
p["TankOffsetZ"] = -469.3

# Outer cryostat (nT)
p["OuterCryostatThickness"] = 5.0
p["OuterCryostatThicknessTop"] = 5.0
p["OuterCryostatThicknessBot"] = 5.0
p["OuterCryostatOuterDiameter"] = 1_630.0
p["OuterCryostatCylinderHeight"] = 2_066.0
p["OuterCryostatR0top"] = 1_309.0
p["OuterCryostatR1top"] = 256.02
p["OuterCryostatR0bot"] = 1_309.0
p["OuterCryostatR1bot"] = 256.02
p["OuterCryostatFlangeHeight"] = 96.0
p["OuterCryostatFlangeThickness"] = 100.0
p["OuterCryostatRingsHeight"] = 5.0
p["OuterCryostatRingsThickness"] = 80.0
p["OuterCryostatCylinderBaseToRing1BotZ"] = 700.0
p["OuterCryostatRing1TopToRing2BotZ"] = 464.0
p["OuterCryostatRing2TopToFlangeBotZ"] = 776.0
p["OuterCryostatOffsetZ"] = 343.0
p["z_nVetoOffset"] = 0.0  # no nVeto

# Inner cryostat (nT)
p["InnerCryostatThickness"] = 5.0
p["InnerCryostatThicknessTop"] = 5.0
p["InnerCryostatThicknessBot"] = 5.0
p["InnerCryostatOuterDiameter"] = 1_470.0
p["InnerCryostatCylinderHeight"] = 1_895.921
p["InnerCryostatR0top"] = 1_205.0
p["InnerCryostatR1top"] = 225.0
p["InnerCryostatR0bot"] = 1_205.0
p["InnerCryostatR1bot"] = 225.0
p["InnerCryostatFlangeHeight"] = 90.0
p["InnerCryostatFlangeThickness"] = 60.0
p["InnerCryostatRingsHeight"] = 5.0
p["InnerCryostatRingsThickness"] = 40.0
p["InnerCryostatCylinderBaseToRing1BotZ"] = 611.338
p["InnerCryostatRing1TopToRing2BotZ"] = 580.0
p["InnerCryostatRing2TopToFlangeBotZ"] = 581.903
p["InnerCryostatOffsetZ"] = -39.284

p["CorrectionCryoPlacementZ"] = 98.0
p["HeightDiff_1t_nT_cryostat"] = 379.0

# PMTs
p["NbOfTopPMTs"] = 253  # hexagonal
p["NbOfBottomPMTs"] = 241

# --- TPC parameters (from XenonNtTPC) ---
tp = {}  # TPC parameters

tp["PTFE_ShrinkageZ"] = 0.014
tp["PTFE_ShrinkageR"] = 0.011
tp["Torlon_ShrinkageZ"] = 0.0025

# Bell
tp["BellPlateHeight"] = 5.0
tp["BellPlateDiameter"] = 1416.0
tp["BellPlateTopToIVcylinderTop"] = 48.681
tp["BellWallOuterDiameter"] = 1426.0
tp["BellWallHeight"] = 264.0
tp["BellWallThickness"] = 5.0

# Copper ring
tp["CopperRingHeight"] = 10.0
tp["CopperRingInnerDiameter"] = 1358.0

# Gate ring
tp["GateRingTotalHeight"] = 20.0
tp["GateRingTotalWidth"] = 31.0
tp["GateRingInnerDiameterMax"] = 1354.0
tp["GateRingInnerDiameterMin"] = 1334.0

# Anode ring
tp["AnodeRingHeight"] = 18.0
tp["AnodeRingWidth"] = 31.0
tp["AnodeRingInnerDiameter"] = 1334.0

# Top mesh ring
tp["TopMeshRingHeight"] = 15.0
tp["TopMeshRingWidth"] = 31.0
tp["TopMeshRingInnerDiameter"] = 1334.0

# Cathode ring
tp["CathodeRingTotalHeight"] = 20.0
tp["CathodeRingTubeWidth"] = 24.0
tp["CathodeRingTubeHeight"] = 10.0
tp["CathodeRingInnerDiameter"] = 1347.0

# Bottom mesh ring
tp["BMringTotalHeight"] = 15.0
tp["BMringTubeWidth"] = 25.0
tp["BMringTubeHeight"] = 7.5
tp["BMringInnerDiameter"] = 1345.0

# TPC wall
tp["TpcWallDiameter"] = 1328.0
tp["TpcWallHeight"] = 1500.8
tp["TpcWallThickness"] = 3.0
tp["TopGateRingToTopTPC"] = 2.8

# Meshes (thin discs)
tp["GateMeshDiameter"] = 1334.0
tp["GateMeshThickness"] = 0.216
tp["AnodeMeshDiameter"] = 1334.0
tp["AnodeMeshThickness"] = 0.216
tp["TopMeshDiameter"] = 1334.0
tp["TopMeshThickness"] = 0.216
tp["CathodeMeshDiameter"] = 1347.0
tp["CathodeMeshThickness"] = 0.304
tp["BottomMeshDiameter"] = 1345.0
tp["BottomMeshThickness"] = 0.216

# Spacing
tp["BellWallBotToGateRingBot"] = 5.0
tp["GateRingTopToAnodeRingBot"] = 8.0
tp["AnodeRingTopToTopMeshRingBot"] = 10.0
tp["TpcBotToCathodeRingTop"] = 4.2
tp["BMringTopToCathodeRingBot"] = 20.195

# LXe level
tp["GateRingTopToGXeInterface"] = 4.5
tp["GateRingTopToOuterGXeInterface"] = 41.3

# Bottom TPC
tp["BottomTpcTopToTpcBot"] = 4.907
tp["BottomTpcHeight"] = 53.78
tp["BottomTpcWidth"] = 3.0

# PMT assembly
tp["PMTheight"] = 114.0
tp["TopReflectorDiameter"] = 1412.0
tp["TopReflectorHeight"] = 8.0
tp["TopCopperPlateDiameter"] = 1412.0
tp["TopCopperPlateHeight"] = 20.0
tp["BotReflectorDiameter"] = 1395.0
tp["BotCopperPlateDiameter"] = 1425.0
tp["BotCopperPlateHeight"] = 25.0

# Field shapers
tp["NumberOfFieldShaperWires"] = 71
tp["FieldShaperWireDiameter"] = 2.0
tp["FieldShaperWiresDistance"] = 22.0

# ============================================================
# 2. Computed positions
# ============================================================

# Bell plate Z in inner cryostat frame
BellPlateOffsetZ = (0.5 * p["InnerCryostatCylinderHeight"]
                    - tp["BellPlateTopToIVcylinderTop"]
                    - 0.5 * tp["BellPlateHeight"])

# Bell wall Z
BellWallOffsetZ = BellPlateOffsetZ + 0.5 * tp["BellPlateHeight"] - 0.5 * tp["BellWallHeight"]

# Copper ring Z
dPTFECorrZ = 1.0 - tp["PTFE_ShrinkageZ"]
CuRingOffsetZ = BellWallOffsetZ - 0.5 * tp["BellWallHeight"] - 0.5 * tp["CopperRingHeight"]

# Gate ring Z in inner cryostat frame
GateRingOffsetZ = (CuRingOffsetZ + 0.5 * tp["CopperRingHeight"]
                   + dPTFECorrZ * tp["BellWallBotToGateRingBot"]
                   + 0.5 * tp["GateRingTotalHeight"])

# Anode ring Z
AnodeRingOffsetZ = (GateRingOffsetZ + 0.5 * tp["GateRingTotalHeight"]
                    + tp["GateRingTopToAnodeRingBot"]
                    + 0.5 * tp["AnodeRingHeight"])

# Top mesh ring Z
TopMeshRingOffsetZ = (AnodeRingOffsetZ + 0.5 * tp["AnodeRingHeight"]
                      + tp["AnodeRingTopToTopMeshRingBot"]
                      + 0.5 * tp["TopMeshRingHeight"])

# TPC top Z (above gate ring)
TpcTopZ = GateRingOffsetZ + 0.5 * tp["GateRingTotalHeight"] + tp["TopGateRingToTopTPC"]

# TPC wall center Z
TpcWallCenterZ = TpcTopZ - 0.5 * dPTFECorrZ * tp["TpcWallHeight"]

# Cathode ring Z
CathodeRingOffsetZ = (TpcTopZ - dPTFECorrZ * tp["TpcWallHeight"]
                      - tp["TpcBotToCathodeRingTop"]
                      - 0.5 * tp["CathodeRingTotalHeight"])

# Bottom mesh ring Z
BMRingOffsetZ = (CathodeRingOffsetZ - 0.5 * tp["CathodeRingTotalHeight"]
                 - tp["BMringTopToCathodeRingBot"]
                 - 0.5 * tp["BMringTotalHeight"])

# Outer cryostat offset (in water frame)
OuterCryoZPos = (p["OuterCryostatOffsetZ"] + p["CorrectionCryoPlacementZ"]
                 - p["z_nVetoOffset"])

# Inner cryostat Z in outer cryostat vacuum frame
InnerCryoZPos = p["InnerCryostatOffsetZ"]

# Water tank position (hardcoded from code)
WaterTankOffsetZ = -1090.3  # mm - hardcoded in ConstructMuonVeto

# ============================================================
# 3. Helper: approximate torospherical vessel as polycone
# ============================================================

def make_vessel_polycone(D, L, R0top, R1top, R0bot, R1bot,
                         h_flange, dR_flange, z_flange,
                         h_ring1, dR_ring1, z_ring1,
                         h_ring2, dR_ring2, z_ring2,
                         has_rings=True):
    """
    Create z, rmin, rmax arrays for a torospherical vessel approximated
    as a polycone.  The dome envelope is computed as max(r_torus, r_sphere)
    at each sampled Z value, matching the G4UnionSolid in ConstructVessel().

    Sphere centres follow C++ convention:
        bottom: z_sc = -L/2 + dZ   (placed ABOVE cylinder bottom)
        top:    z_sc = +L/2 - dZ   (placed BELOW cylinder top)
    """
    R = D / 2.0
    n_dome = 16  # number of sample points per dome

    # --- Bottom dome geometry ---
    rc0_bot = R - R1bot
    dR0_bot = R0bot - R1bot
    if abs(dR0_bot) < 1e-6:
        theta_bot = 0
        dZ_bot = 0
    else:
        sin_val = min(1.0, rc0_bot / dR0_bot)
        theta_bot = math.asin(sin_val)
        dZ_bot = math.sqrt(max(0, dR0_bot**2 - rc0_bot**2))

    # --- Top dome geometry ---
    rc0_top = R - R1top
    dR0_top = R0top - R1top
    if abs(dR0_top) < 1e-6:
        theta_top = 0
        dZ_top = 0
    else:
        sin_val = min(1.0, rc0_top / dR0_top)
        theta_top = math.asin(sin_val)
        dZ_top = math.sqrt(max(0, dR0_top**2 - rc0_top**2))

    z_arr = []
    rmin_arr = []
    rmax_arr = []

    # ----------------------------------------------------------
    # Bottom dome: sample Z from pole upward to cylinder edge
    # ----------------------------------------------------------
    z_sc_bot = -L/2 + dZ_bot           # sphere centre
    z_pole_bot = z_sc_bot - R0bot      # pole (most negative Z)
    # sphere cap upper edge (theta = pi - theta_bot)
    z_cap_edge_bot = z_sc_bot - R0bot * math.cos(theta_bot)

    for i in range(n_dome + 1):
        frac = i / n_dome
        z = z_pole_bot + frac * (-L/2 - z_pole_bot)  # from pole to -L/2

        # Torus outer surface: exists for -L/2 - R1bot <= z <= -L/2
        dz_t = z - (-L/2)
        if -R1bot <= dz_t <= 0:
            r_torus = rc0_bot + math.sqrt(max(0, R1bot**2 - dz_t**2))
        else:
            r_torus = 0

        # Sphere surface: exists for z_pole <= z <= z_cap_edge
        if z_pole_bot <= z <= z_cap_edge_bot + 0.01:
            dz_s = z - z_sc_bot
            r_sphere = math.sqrt(max(0, R0bot**2 - dz_s**2))
        else:
            r_sphere = 0

        r = max(r_torus, r_sphere, 0.001)
        if i == 0:
            r = 0.001  # pole tip

        z_arr.append(round(z, 3))
        rmin_arr.append(0)
        rmax_arr.append(round(r, 3))

    # ----------------------------------------------------------
    # Cylinder body (rings / flanges)
    # ----------------------------------------------------------
    if has_rings and dR_ring1 > 0:
        eps = 0.01
        ring_z_data = [
            (z_ring1, h_ring1, dR_ring1),
            (z_ring2, h_ring2, dR_ring2),
            (z_flange, h_flange, dR_flange),
        ]
        for zr, hr, dr in ring_z_data:
            z_arr.extend([
                round(zr - hr/2 - eps, 3),
                round(zr - hr/2, 3),
                round(zr + hr/2, 3),
                round(zr + hr/2 + eps, 3),
            ])
            rmin_arr.extend([0, 0, 0, 0])
            rmax_arr.extend([
                round(R, 3),
                round(R + dr, 3),
                round(R + dr, 3),
                round(R, 3),
            ])
    else:
        if h_flange > 0:
            eps = 0.01
            z_arr.extend([
                round(z_flange - h_flange/2 - eps, 3),
                round(z_flange - h_flange/2, 3),
                round(z_flange + h_flange/2, 3),
                round(z_flange + h_flange/2 + eps, 3),
            ])
            rmin_arr.extend([0, 0, 0, 0])
            rmax_arr.extend([
                round(R, 3),
                round(R + dR_flange, 3),
                round(R + dR_flange, 3),
                round(R, 3),
            ])

    # ----------------------------------------------------------
    # Top dome: sample Z from cylinder edge upward to pole
    # ----------------------------------------------------------
    z_sc_top = L/2 - dZ_top             # sphere centre (FIXED: was L/2 + dZ_top)
    z_pole_top = z_sc_top + R0top       # pole (most positive Z)
    z_cap_edge_top = z_sc_top + R0top * math.cos(theta_top)

    for i in range(n_dome + 1):
        frac = i / n_dome
        z = L/2 + frac * (z_pole_top - L/2)  # from +L/2 to pole

        # Torus outer surface: exists for L/2 <= z <= L/2 + R1top
        dz_t = z - L/2
        if 0 <= dz_t <= R1top:
            r_torus = rc0_top + math.sqrt(max(0, R1top**2 - dz_t**2))
        else:
            r_torus = 0

        # Sphere surface: exists for z_cap_edge_top <= z <= z_pole_top
        if z_cap_edge_top - 0.01 <= z <= z_pole_top:
            dz_s = z - z_sc_top
            r_sphere = math.sqrt(max(0, R0top**2 - dz_s**2))
        else:
            r_sphere = 0

        r = max(r_torus, r_sphere, 0.001)
        if i == n_dome:
            r = 0.001  # pole tip

        z_arr.append(round(z, 3))
        rmin_arr.append(0)
        rmax_arr.append(round(r, 3))

    # Sort by z and remove near-duplicates
    combined = sorted(zip(z_arr, rmin_arr, rmax_arr), key=lambda x: x[0])
    filtered = [combined[0]]
    for i in range(1, len(combined)):
        if combined[i][0] - filtered[-1][0] > 0.005:
            filtered.append(combined[i])

    z_arr = [x[0] for x in filtered]
    rmin_arr = [x[1] for x in filtered]
    rmax_arr = [x[2] for x in filtered]

    return z_arr, rmin_arr, rmax_arr


# ============================================================
# 4. Build JSON
# ============================================================

def rot(x=0, y=0, z=0):
    return {"x": x, "y": y, "z": z}

def placement(x=0, y=0, z=0, parent="World", g4name=None, name=None):
    pl = {"x": round(x, 3), "y": round(y, 3), "z": round(z, 3),
          "rotation": rot(), "parent": parent}
    if g4name:
        pl["g4name"] = g4name
    if name:
        pl["name"] = name
    return pl

volumes = []

# ---- 4a. Water Tank (cylinder + cone approximated as polycone) ----
# The water tank is a union of a cylinder and a cone, placed in the Lab.
# In the original code it's rotated -90° around X and placed at
# (TankOffsetX, -WaterTankOffsetZ, 0) in the Lab frame.
# We simplify: place it upright in the World, centered at the lab position.
# The water tank body: polycone with cylinder + cone
wt_cyl_hz = 0.5 * p["WaterTankCylinderHeight"]
wt_cone_hz = 0.5 * p["TankConsHeight"]
wt_z = []
wt_rmin = []
wt_rmax = []
# bottom of cylinder
wt_z.append(round(-wt_cyl_hz, 3))
wt_rmin.append(0); wt_rmax.append(round(p["WaterTankOuterRadius"], 3))
# top of cylinder = bottom of cone
wt_z.append(round(wt_cyl_hz, 3))
wt_rmin.append(0); wt_rmax.append(round(p["TankConsR1"], 3))
# top of cone
wt_z.append(round(wt_cyl_hz + 2 * wt_cone_hz, 3))
wt_rmin.append(0); wt_rmax.append(round(p["TankConsR2"], 3))

volumes.append({
    "name": "WaterTank",
    "g4name": "SS_WaterTank",
    "type": "polycone",
    "material": "SS304LSteel",
    "dimensions": {"z": wt_z, "rmin": wt_rmin, "rmax": wt_rmax},
    "placements": [placement(0, 0, 0, "World", "SS_WaterTank", "WaterTank")],
    "visible": True,
    "wireframe": True,
})

# ---- 4b. Water inside tank (simplified cylinder) ----
w_cyl_hz = 0.5 * p["WaterTankCylinderInnerHeight"]
volumes.append({
    "name": "Water",
    "g4name": "Water_Tube",
    "type": "cylinder",
    "material": "G4_WATER",
    "dimensions": {
        "radius": round(p["WaterTankInnerRadius"], 3),
        "height": round(p["WaterTankCylinderInnerHeight"], 3),
    },
    "placements": [placement(0, 0, 0.5 * p["WaterTankThickness"],
                             "WaterTank", "Water_Tube", "Water")],
    "visible": True,
    "wireframe": True,
})

# ---- 4c. Outer Cryostat (nT) ----
# Compute ring/flange positions
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

# ---- 4d. Outer Cryostat Vacuum ----
oc_inner_D = oc_D - 2 * p["OuterCryostatThickness"]
oc_inner_R0top = p["OuterCryostatR0top"] - p["OuterCryostatThicknessTop"]
oc_inner_R1top = p["OuterCryostatR1top"] - p["OuterCryostatThicknessTop"]
oc_inner_R0bot = p["OuterCryostatR0bot"] - p["OuterCryostatThicknessBot"]
oc_inner_R1bot = p["OuterCryostatR1bot"] - p["OuterCryostatThicknessBot"]

ocv_z, ocv_rmin, ocv_rmax = make_vessel_polycone(
    oc_inner_D, oc_L,
    oc_inner_R0top, oc_inner_R1top,
    oc_inner_R0bot, oc_inner_R1bot,
    0, 0, 0,
    0, 0, 0,
    0, 0, 0,
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

# ---- 4e. Inner Cryostat (nT) ----
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

# ---- 4f. LXe volume (fills inner cryostat, torospherical polycone) ----
# In the actual mc-master code LXe is a G4UnionSolid (cyl + top dome + bot dome)
# that fills the entire inner cryostat interior.  We approximate it as a polycone.
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
    0, 0, 0,   # no flange
    0, 0, 0,   # no ring1
    0, 0, 0,   # no ring2
    has_rings=False,
)

volumes.append({
    "name": "LXeVolume",
    "g4name": "LXe",
    "type": "polycone",
    "material": "LXe",
    "dimensions": {
        "z": lxe_z,
        "rmin": lxe_rmin,
        "rmax": lxe_rmax,
    },
    "placements": [placement(0, 0, 0, "InnerCryostat", "LXe", "LXeVolume")],
    "visible": True,
    "wireframe": True,
})

# ---- 4g. GXe volume (above LXe level, inside bell) ----
# GXe is gas above the LXe level. Level is tp["GateRingTopToGXeInterface"]
# above gate ring top.
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

# ---- 4h. Bell plate ----
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

# ---- 4i. Bell wall ----
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

# ---- 4j. Copper ring (below bell) ----
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

# ---- 4k. Gate ring ----
# Simplified as a single annular cylinder
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

# ---- 4l. Gate mesh ----
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

# ---- 4m. Anode ring ----
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

# ---- 4n. Anode mesh ----
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

# ---- 4o. Top screening mesh ring + mesh ----
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

# ---- 4p. TPC PTFE Wall (cylindrical shell) ----
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

# ---- 4q. Cathode ring ----
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

# ---- 4r. Cathode mesh ----
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

# ---- 4s. Bottom screening mesh ring ----
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

# ---- 4t. Bottom mesh ----
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

# ---- 4u. Top reflector plate (PTFE) ----
# Positioned below the anode area, above PMTs
top_refl_z = (TopMeshRingOffsetZ + 0.5 * tp["TopMeshRingHeight"]
              + 60.0  # TopReflectorTopToCopperPlateBot
              + tp["TopCopperPlateHeight"]
              + 29.15  # TopCopperPlateTopToPTFEholderBot
              + 5.1  # TopPTFEholderHeight
              )
# Actually let's place it more simply based on the bell geometry
# Top reflector is positioned some distance below the bell
top_refl_offsetZ = (BellPlateOffsetZ - 0.5 * tp["BellPlateHeight"]
                    - 37.3  # TopBasesToBottomBellPlate
                    - 8.0   # TopPmtStemToBases + bases
                    - tp["PMTheight"]
                    - 60.0  # gap (TopReflectorTopToCopperPlateBot)
                    - tp["TopCopperPlateHeight"]
                    - 0.5 * tp["TopReflectorHeight"])

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

# ---- 4v. Top copper plate ----
top_cu_offsetZ = top_refl_offsetZ + 0.5 * tp["TopReflectorHeight"] + 60.0 + 0.5 * tp["TopCopperPlateHeight"]

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

# ---- 4w. Bottom copper plate ----
# Position relative to bottom reflector (which is below cathode/BM ring area)
bot_refl_z = (BMRingOffsetZ - 0.5 * tp["BMringTotalHeight"]
              - 2.005  # BMringBotToPTFEReflectorTop (gap)
              - 0.5 * tp["TopReflectorHeight"])

bot_cu_z = bot_refl_z - 0.5 * tp["TopReflectorHeight"] - 55.0 - 0.5 * tp["BotCopperPlateHeight"]

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

# ---- 4x. Field shaper wires (simplified as thin cylinders) ----
# 71 wires spaced 22mm apart along Z, starting from TPC top
for i in range(int(tp["NumberOfFieldShaperWires"])):
    wire_z = (TpcTopZ
              - 21.3  # FieldShaperWireTopToTpcTop
              - i * tp["FieldShaperWiresDistance"])
    volumes.append({
        "name": f"FieldShaper_{i}",
        "g4name": f"Cu_FieldShaper_{i}",
        "type": "cylinder",
        "material": "G4_Cu",
        "dimensions": {
            "radius": round(0.5 * tp["TpcWallDiameter"] + tp["TpcWallThickness"] + 2.0, 3),
            "height": round(tp["FieldShaperWireDiameter"], 3),
            "inner_radius": round(0.5 * tp["TpcWallDiameter"] + tp["TpcWallThickness"], 3),
        },
        "placements": [placement(0, 0, round(wire_z, 3),
                                 "LXeVolume", f"Cu_FieldShaper_{i}", f"FieldShaper_{i}")],
        "visible": True,
    })

# ---- 4y. PMT R11410 (assembly with 5 basic-shape components) ----
# PMT dimensions (from Xenon1tPMTsR11410)
pmt_outer_r = 38.0
pmt_ring_bot_z = 9.0
pmt_ring_h = 5.0
pmt_ring_r = 38.75
pmt_window_r = 35.0
pmt_window_t = 3.5
pmt_window_gap = 0.6
pmt_thickness = 1.0
pmt_height = 114.0
pmt_dinode_cut_z = 11.8
pmt_funnel_cut_z = 11.8
pmt_base_r = 26.65
pmt_photocathode_r = 32.0
pmt_photocathode_t = 0.1
pmt_ceramic_r = pmt_base_r - 5.0   # 21.65
pmt_ceramic_t = 4.0

# PMT body polycone profile (16 planes)
pmt_z0 = -0.5 * pmt_height
pmt_z_planes = [
    pmt_z0,
    pmt_z0 + pmt_ring_bot_z,
    pmt_z0 + pmt_ring_bot_z,  # ring start
    pmt_z0 + pmt_ring_bot_z + pmt_ring_h,  # ring end
    pmt_z0 + pmt_ring_bot_z + pmt_ring_h,  # back to body
    pmt_z0 + pmt_ring_bot_z + pmt_ring_h + pmt_dinode_cut_z,
    pmt_z0 + pmt_ring_bot_z + pmt_ring_h + pmt_dinode_cut_z + pmt_funnel_cut_z,
    pmt_z0 + pmt_ring_bot_z + pmt_ring_h + pmt_dinode_cut_z + pmt_funnel_cut_z + 10.0,
    pmt_z0 + pmt_ring_bot_z + pmt_ring_h + pmt_dinode_cut_z + pmt_funnel_cut_z + 10.0,
    pmt_z0 + pmt_ring_bot_z + pmt_ring_h + pmt_dinode_cut_z + pmt_funnel_cut_z + 11.0,
    pmt_z0 + pmt_ring_bot_z + pmt_ring_h + pmt_dinode_cut_z + pmt_funnel_cut_z + 11.0,
    0.5 * pmt_height - 6.0,
    0.5 * pmt_height - 6.0,
    0.5 * pmt_height - 5.0,
    0.5 * pmt_height - 5.0,
    0.5 * pmt_height,
]
pmt_r_outer = [
    pmt_outer_r,
    pmt_outer_r,
    pmt_ring_r,
    pmt_ring_r,
    pmt_outer_r,
    pmt_outer_r,
    pmt_base_r,
    pmt_base_r,
    pmt_base_r + 0.5,
    pmt_base_r + 0.5,
    pmt_base_r,
    pmt_base_r,
    pmt_base_r + 0.5,
    pmt_base_r + 0.5,
    pmt_base_r,
    pmt_base_r,
]
pmt_r_inner = [0] * 16

# Inner vacuum polycone (simplified — no subtraction, just fill interior)
vac_z0 = 0.0
vac_z1 = vac_z0 + pmt_dinode_cut_z + pmt_ring_bot_z + pmt_ring_h - pmt_window_t
vac_z2 = vac_z1 + pmt_funnel_cut_z
vac_z3 = pmt_height - pmt_window_t - pmt_thickness
vac_r0 = pmt_outer_r - pmt_thickness
vac_r2 = pmt_base_r - pmt_thickness
vac_offset_z = round(-0.5 * pmt_height + pmt_window_t, 3)

# 5 components per PMT assembly — all basic shapes the editor can render
pmt_assembly_components = [
    # 1. PMT Body (Kovar shell — solid polycone)
    {
        "name": "PMTBody_0",
        "g4name": "PMTBody",
        "type": "polycone",
        "material": "Kovar",
        "dimensions": {
            "z": [round(z, 3) for z in pmt_z_planes],
            "rmin": pmt_r_inner,
            "rmax": [round(r, 3) for r in pmt_r_outer],
        },
        "placements": [{"name": "PMTBody_0", "x": 0, "y": 0, "z": 0,
                        "rotation": rot(), "parent": ""}],
        "visible": True,
    },
    # 2. PMT Quartz window
    {
        "name": "PMTWindow_0",
        "g4name": "Quartz_PMTWindow",
        "type": "cylinder",
        "material": "Quartz",
        "dimensions": {"radius": pmt_window_r, "height": pmt_window_t},
        "placements": [{"name": "PMTWindow_0", "x": 0, "y": 0,
                        "z": round(0.5 * (pmt_window_t - pmt_height), 3),
                        "rotation": rot(), "parent": ""}],
        "visible": True,
    },
    # 3. PMT Inner Vacuum (polycone)
    {
        "name": "PMTInnerVacuum_0",
        "g4name": "PMTInnerVacuum",
        "type": "polycone",
        "material": "Vacuum",
        "dimensions": {
            "z": [round(vac_z0, 3), round(vac_z1, 3), round(vac_z2, 3), round(vac_z3, 3)],
            "rmin": [0, 0, 0, 0],
            "rmax": [round(vac_r0, 3), round(vac_r0, 3), round(vac_r2, 3), round(vac_r2, 3)],
        },
        "placements": [{"name": "PMTInnerVacuum_0", "x": 0, "y": 0,
                        "z": vac_offset_z,
                        "rotation": rot(), "parent": ""}],
        "visible": False,
    },
    # 4. PMT Photocathode
    {
        "name": "PMTPhotocathode_0",
        "g4name": "PMTPhotocathode",
        "type": "cylinder",
        "material": "PhotoCathodeAluminium",
        "dimensions": {"radius": pmt_photocathode_r, "height": pmt_photocathode_t},
        "placements": [{"name": "PMTPhotocathode_0", "x": 0, "y": 0,
                        "z": round(vac_offset_z + 0.5 * pmt_photocathode_t, 3),
                        "rotation": rot(), "parent": ""}],
        "visible": True,
    },
    # 5. PMT Ceramic stem
    {
        "name": "PMTCeramic_0",
        "g4name": "Ceramic_PMTStem",
        "type": "cylinder",
        "material": "Ceramic",
        "dimensions": {"radius": pmt_ceramic_r, "height": pmt_ceramic_t},
        "placements": [{"name": "PMTCeramic_0", "x": 0, "y": 0,
                        "z": round(0.5 * (pmt_height - pmt_ceramic_t), 3),
                        "rotation": rot(), "parent": ""}],
        "visible": True,
    },
]

# ---- PMT positions (hexagonal pattern) ----
def hexagonal_pmt_positions(n_target, pitch=76.2):
    """Generate approximate hexagonal grid PMT positions."""
    positions = [(0, 0)]
    ring = 1
    while len(positions) < n_target:
        for side in range(6):
            for step in range(ring):
                if len(positions) >= n_target:
                    break
                angle = math.radians(60 * side + 30)
                x = ring * pitch * math.cos(math.radians(60 * side))
                y = ring * pitch * math.sin(math.radians(60 * side))
                dx = pitch * math.cos(math.radians(60 * (side + 2)))
                dy = pitch * math.sin(math.radians(60 * (side + 2)))
                px = x + step * dx
                py = y + step * dy
                r = math.sqrt(px**2 + py**2)
                if r <= 650:
                    positions.append((round(px, 2), round(py, 2)))
        ring += 1
    return positions[:n_target]

# Top PMT Z: positioned above the top reflector, inside the bell
top_pmt_base_z_lxe = (BellPlateOffsetZ - 0.5 * tp["BellPlateHeight"]
                      - 37.3  # TopBasesToBottomBellPlate
                      - 8.0 * 0.5   # some gap
                      - 0.5 * pmt_height)
top_pmt_base_z = top_pmt_base_z_lxe - gxe_center_z

# Bottom PMT Z: below the bottom screening mesh
bot_pmt_base_z = (BMRingOffsetZ - 0.5 * tp["BMringTotalHeight"]
                  - 2.005  # gap
                  - 3.15  # BotReflectorTopToPMTtop
                  - 0.5 * pmt_height)

# Top PMT assembly (253 PMTs in GXeVolume)
top_pmt_positions = hexagonal_pmt_positions(253, 76.2)
top_pmt_placements = []
for i, (px, py) in enumerate(top_pmt_positions):
    top_pmt_placements.append({
        "name": f"TopPMT_{i}",
        "g4name": f"TopPMT_{i}",
        "x": px,
        "y": py,
        "z": round(top_pmt_base_z, 3),
        "rotation": rot(),
        "parent": "GXeVolume",
    })

volumes.append({
    "name": "TopPMTArray",
    "g4name": "TopPMTArray",
    "type": "assembly",
    "material": "GXe",
    "placements": top_pmt_placements,
    "components": pmt_assembly_components,
    "visible": True,
})

# Bottom PMT assembly (241 PMTs in LXeVolume)
bot_pmt_positions_list = hexagonal_pmt_positions(241, 76.2)
bot_pmt_placements = []
for i, (px, py) in enumerate(bot_pmt_positions_list):
    bot_pmt_placements.append({
        "name": f"BotPMT_{i}",
        "g4name": f"BotPMT_{i}",
        "x": px,
        "y": py,
        "z": round(bot_pmt_base_z, 3),
        "rotation": {"x": round(math.pi, 6), "y": 0, "z": 0},
        "parent": "LXeVolume",
    })

volumes.append({
    "name": "BotPMTArray",
    "g4name": "BotPMTArray",
    "type": "assembly",
    "material": "LXe",
    "placements": bot_pmt_placements,
    "components": pmt_assembly_components,
    "visible": True,
})


# ============================================================
# 5. Materials
# ============================================================
materials = {
    "G4_AIR": {
        "type": "nist",
        "density": 0.00120479,
        "density_unit": "g/cm3",
        "color": [0.9, 0.9, 1.0, 0.05],
    },
    "G4_WATER": {
        "type": "nist",
        "density": 1.0,
        "density_unit": "g/cm3",
        "color": [0.0, 0.4, 0.8, 0.15],
    },
    "G4_Galactic": {
        "type": "nist",
        "density": 1e-25,
        "density_unit": "g/cm3",
        "color": [0.1, 0.1, 0.1, 0.02],
    },
    "G4_Cu": {
        "type": "nist",
        "density": 8.96,
        "density_unit": "g/cm3",
        "color": [0.72, 0.45, 0.2, 0.8],
    },
    "G4_Al": {
        "type": "nist",
        "density": 2.7,
        "density_unit": "g/cm3",
        "color": [0.75, 0.75, 0.75, 0.5],
    },
    "LXe": {
        "type": "element_based",
        "density": 2.862,
        "density_unit": "g/cm3",
        "state": "liquid",
        "temperature": 177.0,
        "temperature_unit": "kelvin",
        "composition": {"Xe": 1},
        "color": [0.094, 0.718, 0.812, 0.15],
    },
    "GXe": {
        "type": "element_based",
        "density": 0.005887,
        "density_unit": "g/cm3",
        "state": "gas",
        "temperature": 177.0,
        "temperature_unit": "kelvin",
        "composition": {"Xe": 1},
        "color": [0.539, 0.318, 0.378, 0.1],
    },
    "SS316Ti": {
        "type": "element_based",
        "density": 8.0,
        "density_unit": "g/cm3",
        "state": "solid",
        "temperature": 293.0,
        "temperature_unit": "kelvin",
        "composition": {"Fe": 65, "Cr": 17, "Ni": 12, "Mo": 3, "Mn": 2, "Ti": 1},
        "color": [0.6, 0.6, 0.6, 0.4],
    },
    "SS304LSteel": {
        "type": "element_based",
        "density": 7.99,
        "density_unit": "g/cm3",
        "state": "solid",
        "temperature": 293.0,
        "temperature_unit": "kelvin",
        "composition": {"Fe": 68, "Cr": 19, "Ni": 10, "Mn": 2, "Si": 1},
        "color": [0.65, 0.65, 0.65, 0.3],
    },
    "PTFE": {
        "type": "element_based",
        "density": 2.2,
        "density_unit": "g/cm3",
        "state": "solid",
        "temperature": 293.0,
        "temperature_unit": "kelvin",
        "composition": {"C": 2, "F": 4},
        "color": [0.95, 0.95, 0.95, 0.8],
    },
    "Kovar": {
        "type": "element_based",
        "density": 8.36,
        "density_unit": "g/cm3",
        "state": "solid",
        "temperature": 293.0,
        "temperature_unit": "kelvin",
        "composition": {"Fe": 54, "Ni": 29, "Co": 17},
        "color": [1.0, 0.486, 0.027, 0.7],
    },
    "Quartz": {
        "type": "element_based",
        "density": 2.2,
        "density_unit": "g/cm3",
        "state": "solid",
        "temperature": 293.0,
        "temperature_unit": "kelvin",
        "composition": {"Si": 1, "O": 2},
        "color": [1.0, 0.757, 0.024, 0.4],
    },
    "Vacuum": {
        "type": "element_based",
        "density": 1e-20,
        "density_unit": "g/cm3",
        "state": "gas",
        "temperature": 293.0,
        "temperature_unit": "kelvin",
        "composition": {"N": 755, "O": 245},
        "color": [0.1, 0.1, 0.1, 0.02],
    },
    "PhotoCathodeAluminium": {
        "type": "element_based",
        "density": 8.0,
        "density_unit": "g/cm3",
        "state": "solid",
        "temperature": 293.0,
        "temperature_unit": "kelvin",
        "composition": {"Al": 1},
        "color": [1.0, 0.082, 0.011, 0.8],
    },
    "Ceramic": {
        "type": "element_based",
        "density": 4.0,
        "density_unit": "g/cm3",
        "state": "solid",
        "temperature": 293.0,
        "temperature_unit": "kelvin",
        "composition": {"Al": 2, "O": 3},
        "color": [0.85, 0.75, 0.55, 0.6],
    },
}


# ============================================================
# 6. Assemble final JSON
# ============================================================

# Compute world size to encompass everything
world_half = 6000.0  # 6m half-side, enough for water tank
world_size = 2 * world_half

geometry = {
    "world": {
        "name": "World",
        "g4name": "World",
        "type": "box",
        "material": "G4_AIR",
        "visible": False,
        "wireframe": True,
        "dimensions": {"x": world_size, "y": world_size, "z": world_size},
        "placements": [{"x": 0, "y": 0, "z": 0, "rotation": rot()}],
    },
    "volumes": volumes,
    "materials": materials,
}

# Write output
output_file = "xenonnt_geometry.json"
if len(sys.argv) > 1:
    output_file = sys.argv[1]

with open(output_file, "w") as f:
    json.dump(geometry, f, indent=2)

print(f"Written {len(volumes)} volumes to {output_file}")
print(f"  Materials: {len(materials)}")
print(f"  Volume breakdown:")
print(f"    - Water tank + water: 2")
print(f"    - Outer cryostat + vacuum: 2")
print(f"    - Inner cryostat: 1")
print(f"    - LXe + GXe: 2")
print(f"    - Bell (plate + wall): 2")
print(f"    - Copper ring: 1")
print(f"    - Electrode rings: 5 (gate, anode, top mesh, cathode, bottom mesh)")
print(f"    - Electrode meshes: 5")
print(f"    - TPC wall: 1")
print(f"    - Reflectors + Cu plates: 3")
print(f"    - Field shapers: {int(tp['NumberOfFieldShaperWires'])}")
print(f"    - PMT arrays: TopPMTArray ({len(top_pmt_placements)} placements), BotPMTArray ({len(bot_pmt_placements)} placements)")
