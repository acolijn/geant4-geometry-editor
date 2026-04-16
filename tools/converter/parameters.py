"""
Geometry parameters extracted from mc-master DefineGeometryParameters().

All values in mm (Geant4 internal unit, also editor convention).
"""

import math

# ============================================================
# Global geometry parameters
# ============================================================

p = {}  # parameter dictionary

# --- Laboratory ---
p["LabAxisLength"] = 100_000.0
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
p["z_nVetoOffset"] = 0.0

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
p["NbOfTopPMTs"] = 253
p["NbOfBottomPMTs"] = 241

# ============================================================
# TPC parameters (from XenonNtTPC)
# ============================================================

tp = {}

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

# PMT bases (Cirlex discs, one per PMT)
tp["PmtBasesDiameter"] = 35.0
tp["PmtBasesHeight"] = 1.55
tp["TopBasesToBottomBellPlate"] = 37.3
tp["TopPmtStemToBases"] = 8.0

# Field guard rings (64 copper torus+tube union rings around field shapers)
tp["NumerOfFieldGuards"] = 64
tp["FieldShaperWireTopToTpcTop"] = 21.3
tp["FieldGuardsHeight"] = 15.0
tp["FieldGuardsTubeHeight"] = 10.0
tp["FieldGuardsWidth"] = 5.0
tp["FieldGuardsDistance"] = 22.0
tp["TopGuardToTopFieldShaperWire"] = 48.625
tp["GuardToFRSradialDistance"] = 9.16

# PTFE cathode frames (24 polycone sectors on top of cathode ring)
tp["PTFEAboveCathodeHeight"] = 15.0
tp["PTFEAboveCathodeTopInnerR"] = 685.5
tp["PTFEAboveCathodeTopWidth"] = 2.0
tp["PTFEAboveCathodeBotInnerR"] = 697.5
tp["PTFEAboveCathodeBotWidth"] = 2.0
tp["PTFEAboveCathodeMiddleHeight"] = 3.0
tp["PTFEAboveCathodeBotHeight"] = 5.0
tp["PTFECathodeAngularSeparation"] = 0.02793  # rad (gap between adjacent sectors)
tp["NumberOfPillars"] = 24
tp["PillarsDeltaTheta"] = 2 * math.pi / 24   # rad, angular step between pillars/frames
tp["CathodeFrameAngularOffset"] = math.radians(7.5397)  # rad, global rotation offset

# PTFE ring below gate frame
tp["RingBelowGateHeight"] = 5.0
tp["RingBelowGateInnerDiameter"] = tp["CopperRingInnerDiameter"]  # 1358.0 mm
tp["RingBelowGateWidth"] = 25.5

# Bottom TPC ring (PTFE ring below TPC wall)
# BottomTpcTopToTpcBot and BottomTpcHeight and BottomTpcWidth already defined above

# PTFE ring below BM ring
tp["TeflonBMringWidth"] = 2.0
tp["TeflonBMringInnerD"] = 1380.5
tp["BMringBotToPTFEReflectorTop"] = 2.005

# Copper ring below pillars
tp["CuBelowPillarsInnerDiameter"] = 1400.0
tp["CuBelowPillarsWidth"] = 12.5
tp["CuBelowPillarsHeight"] = 10.0

# Pillar geometry parameters (needed for CuBelowPillars position)
tp["TopBoxToTpcTop"] = 19.2
tp["TopBox_height"] = 15.0
tp["MiddleBox_height"] = 1466.0
tp["MiddleBox_height_UpToTrapezoid"] = 1436.625
tp["Trapezoid_height"] = 13.0
tp["BottomBox_height"] = 128.375

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
# Support structure parameters (from ConstructNewSupportStructure)
# ============================================================

sp = {}

sp["x_outer"] = 75.0
sp["y_outer"] = 75.0
sp["z_outer"] = 1582.5
sp["x_inner"] = 69.0
sp["y_inner"] = 69.0
sp["z_inner"] = 1582.5
sp["z_horizontal_outer"] = 2175.0
sp["z_horizontal_inner"] = 2175.0
sp["z_medium_outer"] = 1532.5
sp["z_medium_inner"] = 1532.5
sp["x_pos_floor_leg1"] = 2250.0
sp["y_pos_floor_leg1"] = 2250.0
sp["z_pos_floor_leg1"] = -(p["WaterTankCylinderInnerHeight"] / 2.0 - sp["z_outer"])
sp["x_pos_floor_leg2"] = 2250.0
sp["y_pos_floor_leg2"] = -2250.0
sp["z_pos_floor_leg2"] = sp["z_pos_floor_leg1"]
sp["x_pos_floor_leg3"] = -2250.0
sp["y_pos_floor_leg3"] = 2250.0
sp["z_pos_floor_leg3"] = sp["z_pos_floor_leg1"]
sp["x_pos_floor_leg4"] = -2250.0
sp["y_pos_floor_leg4"] = -2250.0
sp["z_pos_floor_leg4"] = sp["z_pos_floor_leg1"]
sp["z_tilt_leg"] = 2069.5
sp["z_tilt_leg"] = 2069.5
sp["z_platform"] = 925.0
sp["x_platform"] = 1100.0 + 75.0 + 75.0
sp["x_platform1"] = 1100.0 + 75.0 + 150.0 + 1850.0 + 75.0
sp["R_brace_rods"] = 7.0
sp["R_tie_rods"] = 10.0
sp["y_spreader"] = 60.0
sp["x_spreader"] = 40.0
sp["z_spreader"] = 450.0
sp["z_pos_spreader"] = 8310.0 - p["WaterTankCylinderInnerHeight"] / 2.0 - p["Cryo1T_TankOffsetZ"]
sp["y_inner_spreader"] = 54.0
sp["x_inner_spreader"] = 34.0

# Derived support structure
sp["tilt_angle_deg"] = 28.0
sp["rotation_angle_deg"] = 45.0

# ============================================================
# Neutron veto parameters (from ConstructFoilOctagon)
# ============================================================

nv = {}

nv["FoilThickness"] = 1.5
nv["NVetoLateralReflectorHeight"] = 3160.0
nv["NVetoLateralReflectorBigPanelWidth"] = 2018.0
nv["NVetoLateralReflectorSmallPanelWidth"] = 1224.0
nv["NVetoBigPanelOffsetXY"] = 1875.25
nv["NVetoSmallPanelOffsetXY"] = 1442.28

# --- nVeto PMT placement parameters (from Pietro 20201106) ---
nv["NVetoPmtRadialInwardOffset"] = 15.0      # PMT offset inward from reflector panel
nv["NVetoPmtRowBottomZ"] = -1145.5           # bottom row Z relative to reflector center
nv["NVetoPmtRowSpacingZ"] = 486.0            # Z spacing between rows
nv["ColumnDistanceFromCenterBigPanel"] = 625.0
nv["ColumnDistanceFromCenterSmallPanel"] = 367.0
nv["NbNVSidePMTColumns"] = 20
nv["NbNVSidePMTRows"] = 6

# Derived: Z centre of lateral reflector in WaterTank frame
nv["NVetoLateralReflectorZ"] = (
    sp["z_pos_floor_leg1"] + sp["z_outer"] + sp["x_outer"]
    + nv["FoilThickness"] + nv["NVetoLateralReflectorHeight"] / 2.0
)

# ============================================================
# Pipe parameters (from ConstructPipe)
# ============================================================

pp_params = {}

pp_params["Rmax_cylinder_external_central_pipe"] = 0.5 * 406.6
pp_params["Wall_thickness_central_external_pipe"] = 3.2
pp_params["Rmin_cylinder_external_central_pipe"] = (
    pp_params["Rmax_cylinder_external_central_pipe"]
    - pp_params["Wall_thickness_central_external_pipe"]
)
pp_params["cylinder_height_central_pipe"] = 2413.0
pp_params["flange_radius"] = 0.5 * 608.0
pp_params["flange_height"] = 0.5 * 105.0

# ============================================================
# Computed positions
# ============================================================

# PTFE correction
dPTFECorrZ = 1.0 - tp["PTFE_ShrinkageZ"]

# Bell plate Z in inner cryostat frame
BellPlateOffsetZ = (0.5 * p["InnerCryostatCylinderHeight"]
                    - tp["BellPlateTopToIVcylinderTop"]
                    - 0.5 * tp["BellPlateHeight"])

# Bell wall Z
BellWallOffsetZ = BellPlateOffsetZ + 0.5 * tp["BellPlateHeight"] - 0.5 * tp["BellWallHeight"]

# Copper ring Z
CuRingOffsetZ = BellWallOffsetZ - 0.5 * tp["BellWallHeight"] - 0.5 * tp["CopperRingHeight"]

# Gate ring Z
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

# TPC top Z
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

# Cryostat positions
OuterCryoZPos = (p["OuterCryostatOffsetZ"] + p["CorrectionCryoPlacementZ"]
                 - p["z_nVetoOffset"])
InnerCryoZPos = p["InnerCryostatOffsetZ"]

# Water tank position
WaterTankOffsetZ = -1090.3

# GXe region
gxe_top = BellPlateOffsetZ + 0.5 * tp["BellPlateHeight"]
gxe_bot = GateRingOffsetZ + 0.5 * tp["GateRingTotalHeight"] + tp["GateRingTopToGXeInterface"]
gxe_height = gxe_top - gxe_bot
gxe_center_z = 0.5 * (gxe_top + gxe_bot)
gxe_radius = 0.5 * tp["BellWallOuterDiameter"] - tp["BellWallThickness"]

# Top PMT Z
top_refl_offsetZ = (BellPlateOffsetZ - 0.5 * tp["BellPlateHeight"]
                    - 37.3 - 8.0 - tp["PMTheight"]
                    - 60.0 - tp["TopCopperPlateHeight"]
                    - 0.5 * tp["TopReflectorHeight"])
top_pmt_base_z_lxe = (BellPlateOffsetZ - 0.5 * tp["BellPlateHeight"]
                      - 37.3 - 8.0 * 0.5 - 0.5 * tp["PMTheight"])
top_pmt_base_z = top_pmt_base_z_lxe - gxe_center_z

# Bottom PMT Z
bot_pmt_base_z = (BMRingOffsetZ - 0.5 * tp["BMringTotalHeight"]
                  - tp["BMringBotToPTFEReflectorTop"] - 3.15 - 0.5 * tp["PMTheight"])

# Bottom reflector/copper
bot_refl_z = (BMRingOffsetZ - 0.5 * tp["BMringTotalHeight"]
              - tp["BMringBotToPTFEReflectorTop"] - 0.5 * tp["TopReflectorHeight"])
bot_cu_z = bot_refl_z - 0.5 * tp["TopReflectorHeight"] - 55.0 - 0.5 * tp["BotCopperPlateHeight"]

# Top copper plate
top_cu_offsetZ = top_refl_offsetZ + 0.5 * tp["TopReflectorHeight"] + 60.0 + 0.5 * tp["TopCopperPlateHeight"]

# ============================================================
# Phase 2: computed geometry
# ============================================================

# PMT base: Z offset of base centre relative to PMT body centre in assembly frame
# (stem end is at +0.5*PMTheight; base sits TopPmtStemToBases above the stem)
pmt_base_rel_z = tp["TopPmtStemToBases"] + 0.5 * (tp["PmtBasesHeight"] + tp["PMTheight"])

# Field guard rings
# FSR = field shaper ring (copper torus wire around TPC wall outer surface)
_FSRradius = 0.5 * tp["FieldShaperWireDiameter"]          # 1.0 mm minor radius
_TpcOutRadius = 0.5 * tp["TpcWallDiameter"] + tp["TpcWallThickness"]   # 667.0 mm
_FSRcurvature = _TpcOutRadius + _FSRradius                 # 668.0 mm major radius
# Guard ring major radius: FSR outer surface + air gap + half guard width
GuardCurvature = (_FSRcurvature + _FSRradius
                  + tp["GuardToFRSradialDistance"]
                  + 0.5 * tp["FieldGuardsWidth"])          # 680.66 mm
# Guard torus edge minor radius: half the height not covered by the central tube
GuardEdgeMinorR = 0.5 * (tp["FieldGuardsHeight"] - tp["FieldGuardsTubeHeight"])  # 2.5 mm

# Z of the topmost guard ring centre (in LXe/inner-cryostat frame)
_FSRtopOffsetZ = (TpcTopZ
                  - dPTFECorrZ * tp["FieldShaperWireTopToTpcTop"]
                  - _FSRradius)
GuardTopOffsetZ = (_FSRtopOffsetZ + _FSRradius
                   - dPTFECorrZ * tp["TopGuardToTopFieldShaperWire"]
                   - 0.5 * tp["FieldGuardsHeight"])

# PTFE cathode frames: Z centre in LXe frame
# Placed above the cathode ring tube section (not the full ring height)
CathodeFrameOffsetZ = (CathodeRingOffsetZ
                       + 0.5 * tp["CathodeRingTubeHeight"]
                       - tp["PTFEAboveCathodeBotHeight"]
                       + 0.5 * tp["PTFEAboveCathodeHeight"])

# ============================================================
# Phase 1: new volume positions
# ============================================================

# PTFE ring below gate — sits in the gap between copper ring (top) and gate ring (bottom)
PTFEringBelowGateHeight = dPTFECorrZ * tp["RingBelowGateHeight"]
PTFERingBelowGateOffsetZ = (CuRingOffsetZ
                            + 0.5 * tp["CopperRingHeight"]
                            + 0.5 * PTFEringBelowGateHeight)

# Bottom TPC ring — PTFE ring below the TPC wall
BottomTPCRingHeight = dPTFECorrZ * tp["BottomTpcHeight"]
BottomTPCRingOffsetZ = (TpcWallCenterZ
                        - 0.5 * dPTFECorrZ * tp["TpcWallHeight"]
                        - dPTFECorrZ * tp["BottomTpcTopToTpcBot"]
                        - 0.5 * BottomTPCRingHeight)

# PTFE ring below BM ring — thin PTFE ring beneath the bottom mesh ring
TeflonBMringHeight = dPTFECorrZ * tp["BMringBotToPTFEReflectorTop"]
TeflonBMRingOffsetZ = (BMRingOffsetZ
                       - 0.5 * tp["BMringTubeHeight"]
                       - 0.5 * TeflonBMringHeight)

# Copper ring below pillars — bottom structural copper ring at the foot of the 24 PTFE pillars
PTFEpillarOffsetZ = (TpcTopZ
                     - dPTFECorrZ * tp["TopBoxToTpcTop"]
                     - dPTFECorrZ * tp["TopBox_height"]
                     - dPTFECorrZ * tp["MiddleBox_height"] * 0.5)
CuBelowPillarsOffsetZ = (PTFEpillarOffsetZ
                         + dPTFECorrZ * (0.5 * tp["MiddleBox_height"]
                                         - tp["MiddleBox_height_UpToTrapezoid"]
                                         - tp["Trapezoid_height"]
                                         - tp["BottomBox_height"])
                         - 0.5 * tp["CuBelowPillarsHeight"])
