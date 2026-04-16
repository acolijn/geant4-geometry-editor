"""
Support structure: steel I-beam legs, horizontal beams, platforms, spreaders,
tilted legs, and top beams.

Beams are hollow steel shells filled with air, implemented as assemblies
containing a steel box and an air-fill box.  Beams with identical cross-
section dimensions share a single assembly definition with multiple
placements.

The tilted legs were two pieces in the original C++ (cylinder + cone
portion of the water tank), but physically they are single beams, so
we merge them here.

Rotation convention
-------------------
CLHEP rotateX/Y/Z uses LEFT multiplication: calling
  rotateZ(a) → rotateX(b) → rotateY(c)
builds the matrix  M = Ry(c) * Rx(b) * Rz(a).

The g4-editor GeometryParser inverts JSON angles and applies X→Y→Z,
yielding  M_parser = Rz(-rz_json) * Ry(-ry_json) * Rx(-rx_json).

We use ``g4_compound_to_json`` to compute JSON rotations that reproduce
the mc-master G4PVPlacement rotations exactly.
"""

import math

from .parameters import p, sp
from .helpers import rot, placement, g4_compound_to_json


# Pre-compute the rotation dicts used in this module.
#   Rot  : rotateZ(90°) → rotateX(90°) → rotateY(90°)  -- beam along Y
#   Rot1 : rotateX(90°) → rotateY(90°)                  -- beam along X
_pi2 = math.pi / 2
ROT  = g4_compound_to_json(("Z", _pi2), ("X", _pi2), ("Y", _pi2))
ROT1 = g4_compound_to_json(("X", _pi2), ("Y", _pi2))

# Inner dimensions for hollow beams (from mc-master)
X_INNER = sp["x_inner"]   # 69 mm (half-width)
Y_INNER = sp["y_inner"]   # 69 mm

# Parent volume: all beams go in the unified Water polycone.
PARENT_WATER = "Water"


def _hollow_beam_assembly(name, g4name, x_o, y_o, z_half, x_i, y_i,
                          placements_list):
    """Return a single assembly volume for a hollow beam with N placements.

    The assembly contains two components:
      - outer steel box (full beam dimensions)
      - inner air-fill box (cavity)

    *placements_list* is a list of dicts, each with keys
    ``name``, ``x``, ``y``, ``z``, ``rotation``, ``parent``.
    """
    return {
        "name": name,
        "g4name": g4name,
        "type": "assembly",
        "material": "SS304LSteel",
        "components": [
            {
                "name": f"{name}_steel",
                "g4name": f"{g4name}_steel",
                "type": "box",
                "material": "SS304LSteel",
                "dimensions": {
                    "x": round(2 * x_o, 3),
                    "y": round(2 * y_o, 3),
                    "z": round(2 * z_half, 3),
                },
                "placements": [{"name": f"{name}_steel", "x": 0, "y": 0, "z": 0,
                                "rotation": rot(), "parent": ""}],
                "visible": True,
            },
            {
                "name": f"{name}_air",
                "g4name": f"Air_{g4name}",
                "type": "box",
                "material": "G4_AIR",
                "dimensions": {
                    "x": round(2 * x_i, 3),
                    "y": round(2 * y_i, 3),
                    "z": round(2 * z_half, 3),
                },
                "placements": [{"name": f"{name}_air", "x": 0, "y": 0, "z": 0,
                                "rotation": rot(), "parent": ""}],
                "visible": False,
            },
        ],
        "placements": placements_list,
        "visible": True,
    }


def build_support_structure():
    """Return volumes for the support structure placed in the unified Water volume."""
    volumes = []

    x_o = sp["x_outer"]
    y_o = sp["y_outer"]
    z_o = sp["z_outer"]
    x_i = X_INNER
    y_i = Y_INNER
    z_med = sp["z_medium_outer"]
    z_hor = sp["z_horizontal_outer"]

    # Leg corner positions (4 corners)
    legs = [
        (sp["x_pos_floor_leg1"], sp["y_pos_floor_leg1"]),
        (sp["x_pos_floor_leg2"], sp["y_pos_floor_leg2"]),
        (sp["x_pos_floor_leg3"], sp["y_pos_floor_leg3"]),
        (sp["x_pos_floor_leg4"], sp["y_pos_floor_leg4"]),
    ]
    z_floor = sp["z_pos_floor_leg1"]

    # ---- Floor legs (4 vertical beams, same dimensions) ----
    floor_placements = []
    for i, (xp, yp) in enumerate(legs):
        floor_placements.append({
            "name": f"FloorLeg_{i+1}",
            "g4name": f"support_leg{i+1}floor",
            "x": round(xp, 3), "y": round(yp, 3), "z": round(z_floor, 3),
            "rotation": rot(), "parent": PARENT_WATER,
        })
    volumes.append(_hollow_beam_assembly(
        "FloorLeg", "support_floor", x_o, y_o, z_o, x_i, y_i,
        floor_placements))

    # ---- Medium legs (4 vertical beams above floor legs) ----
    z_med_pos = z_floor + z_o + z_med
    med_placements = []
    for i, (xp, yp) in enumerate(legs):
        med_placements.append({
            "name": f"MediumLeg_{i+1}",
            "g4name": f"support_leg{i+1}_medium",
            "x": round(xp, 3), "y": round(yp, 3), "z": round(z_med_pos, 3),
            "rotation": rot(), "parent": PARENT_WATER,
        })
    volumes.append(_hollow_beam_assembly(
        "MediumLeg", "support_medium", x_o, y_o, z_med, x_i, y_i,
        med_placements))

    # ---- Connection blocks (between vertical and tilted beams) ----
    z_conn = x_o / 2.0
    z_conn_pos = z_floor + z_o + z_med * 2.0 + z_conn
    conn_placements = []
    for i, (xp, yp) in enumerate(legs):
        conn_placements.append({
            "name": f"Connection_{i+1}",
            "g4name": f"support_legconnection{i+1}",
            "x": round(xp, 3), "y": round(yp, 3), "z": round(z_conn_pos, 3),
            "rotation": rot(), "parent": PARENT_WATER,
        })
    volumes.append(_hollow_beam_assembly(
        "Connection", "support_connection", x_o, y_o, z_conn, x_i, y_i,
        conn_placements))

    # ---- Tilted legs (merged: single beam per corner from cylinder into cone) ----
    tilt_rad = math.radians(sp["tilt_angle_deg"])    # 28°
    rot_rad  = math.radians(sp["rotation_angle_deg"]) # 45°
    costilt = math.cos(tilt_rad)
    sintilt = math.sin(tilt_rad)
    cosrot  = math.cos(rot_rad)
    sinrot  = math.sin(rot_rad)

    # z_tilt_leg is the half-length of the full tilted beam along its axis
    z_tilt_half = sp["z_tilt_leg"]   # 2069.5 mm

    # Bottom of tilted beam (where it attaches to connection block)
    z_bottom_tilt = z_floor + z_o + z_med * 2.0 + x_o + x_o * sintilt

    # Center of merged tilted beam
    z_tilt_center = z_bottom_tilt + z_tilt_half * costilt
    xy_disp = z_tilt_half * sintilt  # total xy displacement to center

    # mc-master rotations (CLHEP left-multiply convention):
    #   Rot6: rotateZ(-45°) → rotateY(28°)   → M = Ry(28°)*Rz(-45°)
    #   Rot4: rotateZ( 45°) → rotateY(-28°)  → M = Ry(-28°)*Rz(45°)
    #   Rot3: rotateZ( 45°) → rotateY(28°)   → M = Ry(28°)*Rz(45°)
    #   Rot5: rotateZ(-45°) → rotateY(-28°)  → M = Ry(-28°)*Rz(-45°)
    tilt_configs = [
        (legs[0][0] - xy_disp * cosrot, legs[0][1] - xy_disp * sinrot,
         g4_compound_to_json(("Z", -rot_rad), ("Y",  tilt_rad))),  # Rot6, leg1
        (-(legs[0][0] - xy_disp * cosrot), legs[0][1] - xy_disp * sinrot,
         g4_compound_to_json(("Z",  rot_rad), ("Y", -tilt_rad))),  # Rot4, leg2
        (legs[0][0] - xy_disp * cosrot, -(legs[0][1] - xy_disp * sinrot),
         g4_compound_to_json(("Z",  rot_rad), ("Y",  tilt_rad))),  # Rot3, leg3
        (-(legs[0][0] - xy_disp * cosrot), -(legs[0][1] - xy_disp * sinrot),
         g4_compound_to_json(("Z", -rot_rad), ("Y", -tilt_rad))),  # Rot5, leg4
    ]
    tilt_placements = []
    for i, (xt, yt, r) in enumerate(tilt_configs):
        tilt_placements.append({
            "name": f"TiltedLeg_{i+1}",
            "g4name": f"support_leg{i+1}_tilted",
            "x": round(xt, 3), "y": round(yt, 3), "z": round(z_tilt_center, 3),
            "rotation": r, "parent": PARENT_WATER,
        })
    volumes.append(_hollow_beam_assembly(
        "TiltedLeg", "support_tilted", x_o, y_o, z_tilt_half, x_i, y_i,
        tilt_placements))

    # ---- Horizontal beams + Platform long beams (same dimensions) ----
    z_bot = round(z_floor + z_o, 3)
    z_top = round(z_floor + z_o + z_med * 2.0, 3)

    # Platform positions
    x_plat  = sp["x_platform"]     # 1250
    x_plat1 = sp["x_platform1"]   # 3250

    horiz_placements = [
        # 8 horizontal beams connecting legs at two levels
        {"name": "HorizBeam_1", "g4name": "support_leghorizontal1_physical",
         "x": round(legs[0][0], 3), "y": round(legs[0][1] - x_o - z_hor, 3),
         "z": z_bot, "rotation": ROT, "parent": PARENT_WATER},
        {"name": "HorizBeam_2", "g4name": "support_leghorizontal2_physical",
         "x": round(legs[1][0] - x_o - z_hor, 3), "y": round(legs[1][1], 3),
         "z": z_bot, "rotation": ROT1, "parent": PARENT_WATER},
        {"name": "HorizBeam_3", "g4name": "support_leghorizontal3_physical",
         "x": round(legs[2][0], 3), "y": round(legs[2][1] - x_o - z_hor, 3),
         "z": z_bot, "rotation": ROT, "parent": PARENT_WATER},
        {"name": "HorizBeam_4", "g4name": "support_leghorizontal4_physical",
         "x": round(legs[0][0] - x_o - z_hor, 3), "y": round(legs[0][1], 3),
         "z": z_bot, "rotation": ROT1, "parent": PARENT_WATER},
        {"name": "HorizBeam_5", "g4name": "support_leghorizontal5_physical",
         "x": round(legs[0][0], 3), "y": round(legs[0][1] - x_o - z_hor, 3),
         "z": z_top, "rotation": ROT, "parent": PARENT_WATER},
        {"name": "HorizBeam_6", "g4name": "support_leghorizontal6_physical",
         "x": round(legs[1][0] - x_o - z_hor, 3), "y": round(legs[1][1], 3),
         "z": z_top, "rotation": ROT1, "parent": PARENT_WATER},
        {"name": "HorizBeam_7", "g4name": "support_leghorizontal7_physical",
         "x": round(legs[2][0], 3), "y": round(legs[2][1] - x_o - z_hor, 3),
         "z": z_top, "rotation": ROT, "parent": PARENT_WATER},
        {"name": "HorizBeam_8", "g4name": "support_leghorizontal8_physical",
         "x": round(legs[0][0] - x_o - z_hor, 3), "y": round(legs[0][1], 3),
         "z": z_top, "rotation": ROT1, "parent": PARENT_WATER},
        # 2 platform long beams (same dimensions as horizontal beams)
        {"name": "PlatformLong_1", "g4name": "support_platform_horiz1",
         "x": round(legs[0][0] - x_plat, 3),
         "y": round(legs[0][1] - x_o - z_hor, 3),
         "z": z_bot, "rotation": ROT, "parent": PARENT_WATER},
        {"name": "PlatformLong_2", "g4name": "support_platform_horiz2",
         "x": round(legs[0][0] - x_plat1, 3),
         "y": round(legs[0][1] - x_o - z_hor, 3),
         "z": z_bot, "rotation": ROT, "parent": PARENT_WATER},
    ]
    volumes.append(_hollow_beam_assembly(
        "HorizontalBeam", "support_horizontal", x_o, y_o, z_hor, x_i, y_i,
        horiz_placements))

    # ---- Platform short beams (2 beams) ----
    z_p = sp["z_platform"]
    plat_short_placements = [
        {"name": "PlatformShort_1", "g4name": "support_platform_small1",
         "x": 0, "y": round(legs[1][1] + x_plat, 3), "z": z_bot,
         "rotation": ROT1, "parent": PARENT_WATER},
        {"name": "PlatformShort_2", "g4name": "support_platform_small2",
         "x": 0, "y": round(legs[1][1] + x_plat1, 3), "z": z_bot,
         "rotation": ROT1, "parent": PARENT_WATER},
    ]
    volumes.append(_hollow_beam_assembly(
        "PlatformShort", "support_platform_short", x_o, y_o, z_p, x_i, y_i,
        plat_short_placements))

    # ---- Spreader beams (3 beams at 120° intervals near the top) ----
    z_spr = sp["z_pos_spreader"]
    x_sp = sp["x_spreader"]   # 40
    y_sp = sp["y_spreader"]   # 60
    z_sp = sp["z_spreader"]   # 450
    x_sp_i = sp["x_inner_spreader"]  # 34
    y_sp_i = sp["y_inner_spreader"]  # 54

    rot_spr2 = g4_compound_to_json(("Z", math.radians(120)), ("X", _pi2))
    rot_spr3 = g4_compound_to_json(("Z", math.radians(240)), ("X", _pi2))

    cos30 = math.cos(math.radians(30))
    sin30 = math.sin(math.radians(30))

    spreader_placements = [
        {"name": "Spreader_1", "g4name": "spreader_1",
         "x": 0, "y": round(z_sp, 3), "z": round(z_spr, 3),
         "rotation": ROT, "parent": PARENT_WATER},
        {"name": "Spreader_2", "g4name": "spreader_2",
         "x": round(z_sp * cos30 + x_sp * cos30, 3),
         "y": round(-(z_sp * sin30 + x_sp * sin30), 3),
         "z": round(z_spr, 3),
         "rotation": rot_spr2, "parent": PARENT_WATER},
        {"name": "Spreader_3", "g4name": "spreader_3",
         "x": round(-(z_sp * cos30 + x_sp * cos30), 3),
         "y": round(-(z_sp * sin30 + x_sp * sin30), 3),
         "z": round(z_spr, 3),
         "rotation": rot_spr3, "parent": PARENT_WATER},
    ]
    volumes.append(_hollow_beam_assembly(
        "Spreader", "spreader", x_sp, y_sp, z_sp, x_sp_i, y_sp_i,
        spreader_placements))

    # ---- Top beams (7 beams at the top of the support structure) ----
    # Position of tilted-leg top endpoint (from merged beam)
    x_leg_top = legs[0][0] - 2 * xy_disp * cosrot
    y_leg_top = legs[0][1] - 2 * xy_disp * sinrot

    # Length of diagonal top beam
    z_tilt_beam_top = (math.sqrt(4.0 * x_leg_top**2
                                 + 4.0 * y_leg_top**2) * 0.5)
    z_tilt_beam_top_2 = z_tilt_beam_top * 0.5 - x_o * 0.5

    # Z position of all top beams
    z_center_top = (z_bottom_tilt + 2 * z_tilt_half * costilt
                    + x_o * sintilt + x_o)

    # Rotations for diagonal top beams (from mc-master)
    rot7 = g4_compound_to_json(("Z", -rot_rad), ("Y", _pi2))
    rot8 = g4_compound_to_json(("Z",  rot_rad), ("Y", _pi2))

    # Diagonal top beam 1 (full length, unique dimensions)
    volumes.append(_hollow_beam_assembly(
        "TopBeamDiag1", "support_leg1_top", x_o, y_o, z_tilt_beam_top,
        x_i, y_i, [{
            "name": "TopBeamDiag_1", "g4name": "support_leg1_top",
            "x": round(x_leg_top - z_tilt_beam_top * cosrot, 3),
            "y": round(y_leg_top - z_tilt_beam_top * cosrot, 3),
            "z": round(z_center_top, 3),
            "rotation": rot7, "parent": PARENT_WATER,
        }]))

    # Diagonal top beams 2 & 3 (half length, same dimensions)
    diag23_placements = [
        {"name": "TopBeamDiag_2", "g4name": "support_leg2_top",
         "x": round(-x_leg_top + z_tilt_beam_top_2 * cosrot, 3),
         "y": round(y_leg_top - z_tilt_beam_top_2 * cosrot, 3),
         "z": round(z_center_top, 3),
         "rotation": rot8, "parent": PARENT_WATER},
        {"name": "TopBeamDiag_3", "g4name": "support_leg3_top",
         "x": round(x_leg_top - z_tilt_beam_top_2 * cosrot, 3),
         "y": round(-y_leg_top + z_tilt_beam_top_2 * cosrot, 3),
         "z": round(z_center_top, 3),
         "rotation": rot8, "parent": PARENT_WATER},
    ]
    volumes.append(_hollow_beam_assembly(
        "TopBeamDiag23", "support_top_diag", x_o, y_o, z_tilt_beam_top_2,
        x_i, y_i, diag23_placements))

    # Straight top beams along Y-axis (2 beams, same dimensions)
    position_y = 0.5 * 1237.0 + x_o
    z_top_vert_leg = position_y - x_o - x_o * math.sqrt(2)
    topy_placements = [
        {"name": "TopBeamY_1", "g4name": "support_leg4_top",
         "x": 0, "y": round(position_y, 3), "z": round(z_center_top, 3),
         "rotation": ROT1, "parent": PARENT_WATER},
        {"name": "TopBeamY_2", "g4name": "support_leg5_top",
         "x": 0, "y": round(-position_y, 3), "z": round(z_center_top, 3),
         "rotation": ROT1, "parent": PARENT_WATER},
    ]
    volumes.append(_hollow_beam_assembly(
        "TopBeamY", "support_top_y", x_o, y_o, z_top_vert_leg,
        x_i, y_i, topy_placements))

    # Straight top beams along X-axis (2 beams, same dimensions)
    position_x = 0.5 * 1449.0 + x_o
    z_top_vert_leg_1 = position_x - x_o - x_o * math.sqrt(2)
    topx_placements = [
        {"name": "TopBeamX_1", "g4name": "support_leg6_top",
         "x": round(position_x, 3), "y": 0, "z": round(z_center_top, 3),
         "rotation": ROT, "parent": PARENT_WATER},
        {"name": "TopBeamX_2", "g4name": "support_leg7_top",
         "x": round(-position_x, 3), "y": 0, "z": round(z_center_top, 3),
         "rotation": ROT, "parent": PARENT_WATER},
    ]
    volumes.append(_hollow_beam_assembly(
        "TopBeamX", "support_top_x", x_o, y_o, z_top_vert_leg_1,
        x_i, y_i, topx_placements))

    return volumes
