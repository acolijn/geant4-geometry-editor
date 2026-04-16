"""
Neutron veto: ePTFE reflector panels in octagonal arrangement.

Based on ConstructFoilOctagon() in Xenon1tDetectorConstruction.cc.
The actual XENONnT neutron veto uses GdWater (gadolinium-loaded water)
with ePTFE reflector panels arranged in an octagon inside the water tank.
The LScint vessel (ConstructLScintVessel) is NOT built because pnVeto=false.

The octagon consists of:
 - 4 big panels (2018 mm wide)  at distance 1875.25 mm from centre
 - 4 small panels (1224 mm wide) at distance 1442.28 mm from centre
 - bottom reflector end cap  (octagonal, simplified as a thin box)
 - top reflector end cap     (same shape, with holes we omit here)

All panels are 1.5 mm thick ePTFE and 3160 mm tall, placed in Water.
"""

import math

from .parameters import p, sp, nv
from .helpers import rot, g4_compound_to_json

# All volumes are placed directly in Water (no container needed —
# Geant4 assemblies place components directly in the mother volume).
PARENT = "Water"


def build_neutron_veto(segmented=False):
    """Return volumes for the neutron veto ePTFE reflector octagon.

    Parameters
    ----------
    segmented : bool
        Unused (kept for CLI compatibility).  The octagon panels are
        always generated individually.
    """
    volumes = []

    foil_t = nv["FoilThickness"]      # 1.5 mm
    height = nv["NVetoLateralReflectorHeight"]  # 3160 mm
    big_w  = nv["NVetoLateralReflectorBigPanelWidth"]    # 2018 mm
    small_w = nv["NVetoLateralReflectorSmallPanelWidth"]  # 1224 mm
    big_off = nv["NVetoBigPanelOffsetXY"]       # 1875.25 mm
    small_off = nv["NVetoSmallPanelOffsetXY"]   # 1442.28 mm

    # Z position: from mc-master C++
    #   NVetoLateralReflectorZ = z_pos_floor_leg1 + z_outer + x_outer
    #                            + FoilThickness + Height / 2
    z_floor = sp["z_pos_floor_leg1"]
    z_outer = sp["z_outer"]
    x_outer = sp["x_outer"]
    z_center = z_floor + z_outer + x_outer + foil_t + height / 2.0

    # ----- 8 lateral reflector panels -----
    # Panels alternate big / small, each rotated -45° from the previous.
    # The rotation accumulates: panel 0 has no rotation, panel 1 has
    # rotateZ(-45°), panel 2 has rotateZ(-90°), etc.
    # Panel positions from mc-master C++:
    panel_data = [
        # (width, x, y, cumulative_z_deg, label)
        (big_w,   0,            big_off,   0,    "nVetoLateralReflector_1"),
        (small_w, small_off,    small_off, -45,  "nVetoLateralReflector_2"),
        (big_w,   big_off,      0,         -90,  "nVetoLateralReflector_3"),
        (small_w, small_off,   -small_off, -135, "nVetoLateralReflector_4"),
        (big_w,   0,           -big_off,   -180, "nVetoLateralReflector_5"),
        (small_w, -small_off,  -small_off, -225, "nVetoLateralReflector_6"),
        (big_w,   -big_off,     0,         -270, "nVetoLateralReflector_7"),
        (small_w, -small_off,   small_off, -315, "nVetoLateralReflector_8"),
    ]
    for w, xp, yp, angle_deg, label in panel_data:
        if angle_deg == 0:
            r = rot()
        else:
            # G4Transform3D uses ACTIVE rotation (no inversion by Geant4),
            # so the JSON angle matches the physical rotation directly.
            r = rot(z=round(math.radians(angle_deg), 6))
        volumes.append({
            "name": label,
            "g4name": label,
            "type": "box",
            "material": "ePTFE",
            "dimensions": {
                "x": round(w, 3),         # full width (G4Box expects half, but
                "y": round(foil_t, 3),     # our JSON uses full dimensions)
                "z": round(height, 3),
            },
            "placements": [{
                "name": label,
                "g4name": label,
                "x": round(xp, 3),
                "y": round(yp, 3),
                "z": round(z_center, 3),
                "rotation": r,
                "parent": PARENT,
            }],
            "visible": True,
        })

    # ----- Bottom reflector end cap -----
    # Simplified as a thin square box (the octagonal cut is omitted).
    z_bot_cap = z_center - height / 2.0 - foil_t / 2.0
    volumes.append({
        "name": "nVetoBottomReflector",
        "g4name": "nVetoBottomReflector",
        "type": "box",
        "material": "ePTFE",
        "dimensions": {
            "x": round(2 * big_off, 3),
            "y": round(2 * big_off, 3),
            "z": round(foil_t, 3),
        },
        "placements": [{
            "name": "nVetoBottomReflector",
            "g4name": "nVetoBottomReflector",
            "x": 0, "y": 0,
            "z": round(z_bot_cap, 3),
            "rotation": rot(),
            "parent": PARENT,
        }],
        "visible": True,
    })

    # ----- Top reflector end cap -----
    z_top_cap = z_center + height / 2.0 + foil_t / 2.0
    volumes.append({
        "name": "nVetoTopReflector",
        "g4name": "nVetoTopReflector",
        "type": "box",
        "material": "ePTFE",
        "dimensions": {
            "x": round(2 * big_off, 3),
            "y": round(2 * big_off, 3),
            "z": round(foil_t, 3),
        },
        "placements": [{
            "name": "nVetoTopReflector",
            "g4name": "nVetoTopReflector",
            "x": 0, "y": 0,
            "z": round(z_top_cap, 3),
            "rotation": rot(),
            "parent": PARENT,
        }],
        "visible": True,
    })

    return volumes


def _r5912_pmt_assembly_components(prefix="nVeto"):
    """Return assembly components for the Hamamatsu R5912-100-10-Y001 (8" PMT).

    Parameters
    ----------
    prefix : str
        Name prefix for components (e.g. "nVeto" or "mVeto") so that
        two assemblies using R5912 PMTs get unique component names.

    The R5912 has an ellipsoidal glass window, a cylindrical SS body, and
    a cylindrical SS base.  The photocathode is an inner ellipsoid.

    Parameters from mc-master DefineGeometryParameters():
        PMTWindowOuterRadius   = 101.0 mm
        PMTWindowOuterHalfZ    = 75.1  mm
        PMTWindowNeckZ         = 64.3  mm   (zcut2 of ellipsoid)
        PMTWindowTopZ          = 82.9  mm   (includes waist section)
        PMTWindowThickness     = 2.4   mm
        PMTPhotocathodeOuterR  = 95.0  mm
        PMTBodyOuterRadius     = 47.5  mm
        PMTBodyHeight          = 62.0  mm
        PMTBaseOuterRadius     = 58.0  mm
        PMTBaseHeight          = 61.6  mm

    Assembly coordinate system:
        The window ellipsoid is centred at z=0, with the curved face at -z.
        Body and base extend in +z (behind the window).
    """
    # Window geometry
    win_r = 101.0       # semi-axis x = y
    win_hz = 75.1       # semi-axis z
    win_neck_z = 64.3   # z where ellipsoid meets waist
    win_top_z = 82.9    # top of window (waist included)
    win_t = 2.4         # glass thickness

    # Photocathode
    pc_r = 95.0         # active-area radius
    pc_inner_r = win_r - win_t
    pc_inner_hz = win_hz - win_t
    # zcut2 for photocathode: z where inner ellipsoid reaches pc_r
    pc_zcut2 = -pc_inner_hz * math.sqrt(max(0, 1 - (pc_r / pc_inner_r) ** 2))

    # Body
    body_r = 47.5
    body_h = 62.0
    body_z = win_top_z + body_h / 2.0      # 113.9

    # Base
    base_r = 58.0
    base_h = 61.6
    base_z = win_top_z + body_h + base_h / 2.0  # 175.7

    # Waist cylinder connecting ellipsoid to body
    waist_h = win_top_z - win_neck_z    # 82.9 - 64.3 = 18.6 mm
    waist_z = (win_neck_z + win_top_z) / 2.0  # centre of waist

    # Vacuum interior: inner ellipsoid (same shape as photocathode but vacuum)
    # plus cylinder through waist and body
    vac_ell_r = pc_inner_r - 0.1   # slightly smaller than photocathode
    vac_ell_hz = pc_inner_hz - 0.1
    vac_cyl_r = body_r - 1.0       # 1 mm wall thickness
    vac_cyl_start = win_neck_z     # from neck to end of body
    vac_cyl_end = win_top_z + body_h
    vac_cyl_h = vac_cyl_end - vac_cyl_start
    vac_cyl_z = (vac_cyl_start + vac_cyl_end) / 2.0

    return [
        # 1. PMT Window – ellipsoidal glass shell
        {
            "name": f"{prefix}PMTWindow_0",
            "g4name": f"{prefix}PMTWindow",
            "type": "ellipsoid",
            "material": "Glass",
            "dimensions": {
                "ax": win_r, "by": win_r, "cz": win_hz,
                "x_radius": win_r, "y_radius": win_r, "z_radius": win_hz,
                "zcut1": -win_hz,
                "zcut2": round(win_neck_z, 3),
            },
            "placements": [{"name": f"{prefix}PMTWindow_0", "x": 0, "y": 0, "z": 0,
                            "rotation": rot(), "parent": ""}],
            "visible": True,
        },
        # 2. Vacuum interior – inner ellipsoid (window cavity)
        {
            "name": f"{prefix}PMTVacuum_0",
            "g4name": f"{prefix}PMTVacuum",
            "type": "ellipsoid",
            "material": "Vacuum",
            "dimensions": {
                "ax": round(vac_ell_r, 3), "by": round(vac_ell_r, 3),
                "cz": round(vac_ell_hz, 3),
                "x_radius": round(vac_ell_r, 3), "y_radius": round(vac_ell_r, 3),
                "z_radius": round(vac_ell_hz, 3),
                "zcut1": round(-vac_ell_hz, 3),
                "zcut2": round(pc_zcut2, 3),
            },
            "placements": [{"name": f"{prefix}PMTVacuum_0", "x": 0, "y": 0, "z": 0,
                            "rotation": rot(), "parent": ""}],
            "visible": False,
        },
        # 3. Photocathode – thin shell on inner ellipsoid surface
        {
            "name": f"{prefix}PMTPhotocathode_0",
            "g4name": f"{prefix}PMTPhotocathode",
            "type": "ellipsoid",
            "material": "PhotoCathodeAluminium",
            "dimensions": {
                "ax": round(pc_inner_r, 3), "by": round(pc_inner_r, 3),
                "cz": round(pc_inner_hz, 3),
                "x_radius": round(pc_inner_r, 3), "y_radius": round(pc_inner_r, 3),
                "z_radius": round(pc_inner_hz, 3),
                "zcut1": round(-pc_inner_hz, 3),
                "zcut2": round(pc_zcut2, 3),
            },
            "placements": [{"name": f"{prefix}PMTPhotocathode_0", "x": 0, "y": 0, "z": 0,
                            "rotation": rot(), "parent": ""}],
            "visible": True,
            "hitsCollectionName": f"{prefix}HitsCollection",
        },
        # 4. Waist – glass cylinder connecting window to body
        {
            "name": f"{prefix}PMTWaist_0",
            "g4name": f"{prefix}PMTWaist",
            "type": "cylinder",
            "material": "Glass",
            "dimensions": {"radius": body_r, "height": round(waist_h, 3)},
            "placements": [{"name": f"{prefix}PMTWaist_0", "x": 0, "y": 0,
                            "z": round(waist_z, 3),
                            "rotation": rot(), "parent": ""}],
            "visible": True,
        },
        # 5. Vacuum – cylinder through waist and body interior
        {
            "name": f"{prefix}PMTBodyVacuum_0",
            "g4name": f"{prefix}PMTBodyVacuum",
            "type": "cylinder",
            "material": "Vacuum",
            "dimensions": {"radius": round(vac_cyl_r, 3),
                           "height": round(vac_cyl_h, 3)},
            "placements": [{"name": f"{prefix}PMTBodyVacuum_0", "x": 0, "y": 0,
                            "z": round(vac_cyl_z, 3),
                            "rotation": rot(), "parent": ""}],
            "visible": False,
        },
        # 6. PMT Body – stainless-steel cylinder
        {
            "name": f"{prefix}PMTBody_0",
            "g4name": f"{prefix}PMTBody",
            "type": "cylinder",
            "material": "SS304LSteel",
            "dimensions": {"radius": body_r, "height": body_h},
            "placements": [{"name": f"{prefix}PMTBody_0", "x": 0, "y": 0,
                            "z": round(body_z, 3),
                            "rotation": rot(), "parent": ""}],
            "visible": True,
        },
        # 7. PMT Base – stainless-steel cylinder
        {
            "name": f"{prefix}PMTBase_0",
            "g4name": f"{prefix}PMTBase",
            "type": "cylinder",
            "material": "SS304LSteel",
            "dimensions": {"radius": base_r, "height": base_h},
            "placements": [{"name": f"{prefix}PMTBase_0", "x": 0, "y": 0,
                            "z": round(base_z, 3),
                            "rotation": rot(), "parent": ""}],
            "visible": True,
        },
    ]


def build_nveto_pmts():
    """Return the nVeto PMT assembly volume (120 side-mounted R5912 8\" PMTs).

    PMTs are placed directly in Water (Geant4 assemblies place their
    components in the mother volume automatically).
    """
    nColumns = nv["NbNVSidePMTColumns"]     # 20
    nRows = nv["NbNVSidePMTRows"]           # 6

    big_off_xy = nv["NVetoBigPanelOffsetXY"]           # 1875.25
    small_off_xy = nv["NVetoSmallPanelOffsetXY"]       # 1442.28
    inward_offset = nv["NVetoPmtRadialInwardOffset"]   # 15
    col_dist_big = nv["ColumnDistanceFromCenterBigPanel"]    # 625
    col_dist_small = nv["ColumnDistanceFromCenterSmallPanel"]  # 367

    z_reflector = nv["NVetoLateralReflectorZ"]
    dZmin = z_reflector + nv["NVetoPmtRowBottomZ"]
    dZspacing = nv["NVetoPmtRowSpacingZ"]

    radial_dist_small = small_off_xy * math.sqrt(2.0)

    # Per-quarter column offsets (5 columns each)
    lateral_offset = [col_dist_big, 0, -col_dist_big,
                      col_dist_small, -col_dist_small]
    radial_offset = [big_off_xy, big_off_xy, big_off_xy,
                     radial_dist_small, radial_dist_small]
    azimuth_angle = [0, 0, 0, 45, 45]  # degrees

    placements = []
    for iPMT in range(nColumns * nRows):
        colId = iPMT // nRows
        rowId = iPMT % nRows
        iQuarter = colId % 5
        quarterId = colId // 5

        # Local position before azimuthal rotation
        x = radial_offset[iQuarter] - inward_offset
        y = lateral_offset[iQuarter]
        z = dZmin + rowId * dZspacing

        # Azimuthal rotation around Z
        rot_z_deg = 90.0 - azimuth_angle[iQuarter] - quarterId * 90.0
        rot_z_rad = math.radians(rot_z_deg)

        # Rotate position around Z
        x_rot = x * math.cos(rot_z_rad) - y * math.sin(rot_z_rad)
        y_rot = x * math.sin(rot_z_rad) + y * math.cos(rot_z_rad)

        # PMT rotation: mc-master C++ does rotateY(-90°) then rotateX(phi)
        # where phi = rot_z_deg.  In CLHEP left-multiply this gives
        # M = Rx(phi) * Ry(-π/2).  Use g4_compound_to_json to decompose
        # into sign-inverted ZYX Euler angles (same convention as regular
        # volumes, so editor and Geant4 parser both agree).
        pmt_rot = g4_compound_to_json(
            ("Y", -math.pi / 2.0),
            ("X", rot_z_rad),
        )

        placements.append({
            "name": f"nVSidePMT_{iPMT}",
            "g4name": f"nVSidePMT_{iPMT}",
            "x": round(x_rot, 3),
            "y": round(y_rot, 3),
            "z": round(z, 3),
            "rotation": pmt_rot,
            "parent": PARENT,
        })

    return [{
        "name": "nVetoPMTArray",
        "g4name": "nVetoPMTArray",
        "type": "assembly",
        "material": "G4_WATER",
        "placements": placements,
        "components": _r5912_pmt_assembly_components(prefix="nVeto"),
        "visible": True,
    }]
