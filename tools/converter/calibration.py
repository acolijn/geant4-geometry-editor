"""
Calibration systems: simplified placeholder volumes.

The full XenonNtCalibrationSource geometry is extremely complex (4000+ lines
of C++ with many small volumes: neutron generator, I-belt collimator, end
caps, cathode fins, getter cylinders, etc.).

This module provides a simplified representation for geometry visualisation:
a cylindrical calibration source tube positioned in the Water volume.
The actual source subcomponents can be added later if needed.
"""

import math

from .parameters import p, OuterCryoZPos
from .helpers import rot, placement


def build_calibration(source_x=0, source_y=1200.0, source_z=None):
    """Return volumes for the calibration system.

    Parameters
    ----------
    source_x, source_y : float
        XY position of the calibration source tube in the Water frame (mm).
        Default places it outside the cryostat.
    source_z : float or None
        Z position. If None, defaults to outer cryostat center Z.
    """
    volumes = []

    if source_z is None:
        source_z = OuterCryoZPos

    # ---- Calibration source guide tube ----
    # From C++: external pipe is a cylinder surrounding the source deployment
    tube_outer_r = 25.0   # ~50mm diameter guide tube
    tube_inner_r = 22.0
    tube_length = 2000.0  # 2m long

    volumes.append({
        "name": "CalibTube",
        "g4name": "SS_CalibTube",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": tube_outer_r,
            "height": tube_length,
            "inner_radius": tube_inner_r,
        },
        "placements": [placement(source_x, source_y, round(source_z, 3),
                                 "Water", "SS_CalibTube", "CalibTube")],
        "visible": True,
    })

    # ---- Calibration source (simplified as small cylinder) ----
    source_r = 15.0
    source_h = 100.0

    volumes.append({
        "name": "CalibSource",
        "g4name": "CalibSource",
        "type": "cylinder",
        "material": "SS316Ti",
        "dimensions": {
            "radius": source_r,
            "height": source_h,
        },
        "placements": [placement(source_x, source_y, round(source_z, 3),
                                 "Water", "CalibSource", "CalibSource")],
        "visible": True,
    })

    return volumes
