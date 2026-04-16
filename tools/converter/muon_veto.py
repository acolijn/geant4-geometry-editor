"""
Muon veto: water Cherenkov detector with 84 R5912 PMTs.

The water tank itself is the muon veto (Cherenkov light in water).
This module adds 84 Hamamatsu R5912 8" PMTs (24 top, 24 bottom, 36 lateral)
placed directly in the Water volume.

Based on GetPMTPositionWaterArray() in Xenon1tDetectorConstruction.cc.
"""

import math

from .parameters import p
from .helpers import rot
from .neutron_veto import _r5912_pmt_assembly_components
from .helpers import g4_compound_to_json

# All volumes are placed directly in Water
PARENT = "Water"


def build_muon_veto():
    """Return volumes specific to the muon veto (84 R5912 PMTs in water)."""
    return build_mveto_pmts()


def build_mveto_pmts():
    """Return the muon veto PMT assembly (84 R5912 8\" PMTs in water).

    Layout:
      - 24 top PMTs on a circle R≈4500 at z=+4297.5, facing down
      - 24 bottom PMTs same circle at z=-4297.5, facing up
      - 36 lateral PMTs (12 columns × 3 rows) at R=4500, facing inward
    """
    # PMT position parameters (from mc-master C++)
    dMVTopPMTWindowZ = 4297.5       # mm  (429.75 cm)
    dMVSidePMTWindowR = 4500.0      # mm  (450.0 cm)
    dMVSidePMTRowDistance = 2148.75  # mm  (214.875 cm)
    nMVSidePMTColumns = 12
    nMVSidePMTRows = 3

    # Top/bottom PMT explicit XY positions (from C++ hMVTopPMTsX/Y arrays)
    top_pmt_xy = [
        (4462, 587), (4157, 1722), (3570, 2739), (2739, 3570),
        (1722, 4157), (587, 4462), (-588, 4462), (-1723, 4157),
        (-2740, 3570), (-3571, 2739), (-4158, 1722), (-4462, 587),
        (-4462, -588), (-4158, -1723), (-3571, -2740), (-2740, -3571),
        (-1723, -4158), (-588, -4462), (587, -4462), (1722, -4158),
        (2739, -3571), (3570, -2740), (4157, -1723), (4462, -588),
    ]

    placements_list = []

    # -- Top PMTs (24): face down (no rotation, window at -z faces downward) --
    for i, (px, py) in enumerate(top_pmt_xy):
        placements_list.append({
            "name": f"mVetoTopPMT_{i}",
            "g4name": f"mVetoTopPMT_{i}",
            "x": float(px), "y": float(py),
            "z": round(dMVTopPMTWindowZ, 3),
            "rotation": rot(),
            "parent": PARENT,
        })

    # -- Bottom PMTs (24): face up (rotateX(180°)) --
    for i, (px, py) in enumerate(top_pmt_xy):
        placements_list.append({
            "name": f"mVetoBotPMT_{i}",
            "g4name": f"mVetoBotPMT_{i}",
            "x": float(px), "y": float(py),
            "z": round(-dMVTopPMTWindowZ, 3),
            "rotation": {"x": round(math.pi, 6), "y": 0, "z": 0},
            "parent": PARENT,
        })

    # -- Lateral PMTs (36 = 12 columns × 3 rows) --
    for iPMT in range(nMVSidePMTColumns * nMVSidePMTRows):
        colId = iPMT % nMVSidePMTColumns
        rowId = iPMT // nMVSidePMTColumns
        z_pmt = (0.5 * (nMVSidePMTRows - 1) - rowId) * dMVSidePMTRowDistance

        # Azimuthal angle: 30° per column + 15° offset
        phi_deg = colId * 30.0 + 15.0
        phi = math.radians(phi_deg)
        x_pmt = dMVSidePMTWindowR * math.cos(phi)
        y_pmt = dMVSidePMTWindowR * math.sin(phi)

        # Rotation: rotateY(-90°) then rotateX(phi) in CLHEP convention
        pmt_rot = g4_compound_to_json(
            ("Y", -math.pi / 2.0),
            ("X", phi),
        )

        placements_list.append({
            "name": f"mVetoSidePMT_{iPMT}",
            "g4name": f"mVetoSidePMT_{iPMT}",
            "x": round(x_pmt, 3), "y": round(y_pmt, 3),
            "z": round(z_pmt, 3),
            "rotation": pmt_rot,
            "parent": PARENT,
        })

    return [{
        "name": "mVetoPMTArray",
        "g4name": "mVetoPMTArray",
        "type": "assembly",
        "material": "G4_WATER",
        "placements": placements_list,
        "components": _r5912_pmt_assembly_components(prefix="mVeto"),
        "visible": True,
    }]
