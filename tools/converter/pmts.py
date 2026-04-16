"""
PMT assemblies: R11410 PMT definition + Top and Bottom PMT arrays.
"""

import math

from .parameters import (
    tp,
    BellPlateOffsetZ, BMRingOffsetZ,
    gxe_center_z, top_pmt_base_z, bot_pmt_base_z,
    pmt_base_rel_z,
)
from .helpers import rot, hexagonal_pmt_positions


def _pmt_assembly_components():
    """Return the 5-component PMT assembly definition."""
    pmt_outer_r = 38.0
    pmt_ring_bot_z = 9.0
    pmt_ring_h = 5.0
    pmt_ring_r = 38.75
    pmt_window_r = 35.0
    pmt_window_t = 3.5
    pmt_thickness = 1.0
    pmt_height = 114.0
    pmt_dinode_cut_z = 11.8
    pmt_funnel_cut_z = 11.8
    pmt_base_r = 26.65
    pmt_photocathode_r = 32.0
    pmt_photocathode_t = 0.1
    pmt_ceramic_r = pmt_base_r - 5.0
    pmt_ceramic_t = 4.0

    # PMT body polycone profile (16 planes)
    pmt_z0 = -0.5 * pmt_height
    pmt_z_planes = [
        pmt_z0,
        pmt_z0 + pmt_ring_bot_z,
        pmt_z0 + pmt_ring_bot_z,
        pmt_z0 + pmt_ring_bot_z + pmt_ring_h,
        pmt_z0 + pmt_ring_bot_z + pmt_ring_h,
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
        pmt_outer_r, pmt_outer_r,
        pmt_ring_r, pmt_ring_r,
        pmt_outer_r, pmt_outer_r,
        pmt_base_r, pmt_base_r,
        pmt_base_r + 0.5, pmt_base_r + 0.5,
        pmt_base_r, pmt_base_r,
        pmt_base_r + 0.5, pmt_base_r + 0.5,
        pmt_base_r, pmt_base_r,
    ]
    pmt_r_inner = [0] * 16

    # Inner vacuum polycone (simplified)
    vac_z0 = 0.0
    vac_z1 = vac_z0 + pmt_dinode_cut_z + pmt_ring_bot_z + pmt_ring_h - pmt_window_t
    vac_z2 = vac_z1 + pmt_funnel_cut_z
    vac_z3 = pmt_height - pmt_window_t - pmt_thickness
    vac_r0 = pmt_outer_r - pmt_thickness
    vac_r2 = pmt_base_r - pmt_thickness
    vac_offset_z = round(-0.5 * pmt_height + pmt_window_t, 3)

    return [
        # 1. PMT Body (Kovar shell)
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
        # 6. PMT Base (Cirlex disc, sits above stem end of PMT body)
        {
            "name": "PMTBase_0",
            "g4name": "Cirlex_PMTBase",
            "type": "cylinder",
            "material": "Cirlex",
            "dimensions": {
                "radius": round(0.5 * tp["PmtBasesDiameter"], 3),
                "height": round(tp["PmtBasesHeight"], 3),
            },
            "placements": [{"name": "PMTBase_0", "x": 0, "y": 0,
                            "z": round(pmt_base_rel_z, 3),
                            "rotation": rot(), "parent": ""}],
            "visible": True,
        },
    ]


def build_pmts():
    """Return a single R11410 assembly with 494 placements (253 top + 241 bottom)."""
    pmt_assembly_components = _pmt_assembly_components()
    placements = []

    # Top PMTs (253 in GXeVolume, window facing down = no rotation)
    top_pmt_positions = hexagonal_pmt_positions(253, 76.2)
    for i, (px, py) in enumerate(top_pmt_positions):
        placements.append({
            "name": f"TopPMT_{i:03d}",
            "g4name": f"TopPMT_{i:03d}",
            "x": px, "y": py,
            "z": round(top_pmt_base_z, 3),
            "rotation": rot(),
            "parent": "GXeVolume",
        })

    # Bottom PMTs (241 in LXeVolume, flipped 180° around X)
    bot_pmt_positions_list = hexagonal_pmt_positions(241, 76.2)
    for i, (px, py) in enumerate(bot_pmt_positions_list):
        placements.append({
            "name": f"BotPMT_{i:03d}",
            "g4name": f"BotPMT_{i:03d}",
            "x": px, "y": py,
            "z": round(bot_pmt_base_z, 3),
            "rotation": {"x": round(math.pi, 6), "y": 0, "z": 0},
            "parent": "LXeVolume",
        })

    return [{
        "name": "R11410",
        "g4name": "R11410",
        "type": "assembly",
        "material": "LXe",
        "placements": placements,
        "components": pmt_assembly_components,
        "visible": True,
    }]
