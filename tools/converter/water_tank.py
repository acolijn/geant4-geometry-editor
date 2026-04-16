"""
Water tank + water / air volumes.

The water tank is a polycone (cylinder + cone) made of SS304L steel.
Inside the tank:
 - Water     (polycone): unified volume filling cylinder + cone below water line
 - AirCone   (polycone): fills the cone section above the water line
"""

from .parameters import p
from .helpers import placement


def build_water_tank():
    """Return volumes for the water tank shell, water, and air inside."""
    volumes = []

    # Water Tank (cylinder + cone as polycone)
    wt_cyl_hz = 0.5 * p["WaterTankCylinderHeight"]
    wt_cone_hz = 0.5 * p["TankConsHeight"]
    wt_z = [
        round(-wt_cyl_hz, 3),
        round(wt_cyl_hz, 3),
        round(wt_cyl_hz + 2 * wt_cone_hz, 3),
    ]
    wt_rmin = [0, 0, 0]
    wt_rmax = [
        round(p["WaterTankOuterRadius"], 3),
        round(p["TankConsR1"], 3),
        round(p["TankConsR2"], 3),
    ]

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

    # Unified Water (polycone spanning cylinder + cone below the water line).
    # Placed at z = 0.5 * WaterTankThickness in WaterTank so that the
    # cylinder section keeps the same local coordinate frame as before.
    water_offset_z = 0.5 * p["WaterTankThickness"]
    water_cyl_hz = 0.5 * p["WaterTankCylinderInnerHeight"]      # 4504
    water_r = round(p["WaterTankInnerRadius"], 3)                # 4798
    # Cone section top: WaterHeight above the bottom of the cylinder
    water_cone_top_z = round(p["WaterHeight"] - water_cyl_hz, 3)  # 5696
    water_cone_top_r = round(p["AirConsR1"], 3)                  # 1921

    volumes.append({
        "name": "Water",
        "g4name": "Water_Polycone",
        "type": "polycone",
        "material": "G4_WATER",
        "dimensions": {
            "z": [round(-water_cyl_hz, 3), round(water_cyl_hz, 3), water_cone_top_z],
            "rmin": [0, 0, 0],
            "rmax": [water_r, water_r, water_cone_top_r],
        },
        "placements": [placement(0, 0, round(water_offset_z, 3),
                                 "WaterTank", "Water_Polycone", "Water")],
        "visible": True,
        "wireframe": True,
    })

    # Air cone (cone section above the water line)
    ac_z_bot = round(-wt_cyl_hz + p["WaterHeight"], 3)          # 5695
    ac_z_top = round(wt_cyl_hz + p["WaterConsHeight"], 3)       # 5993
    ac_r_bot = round(p["AirConsR1"], 3)                          # 1921
    ac_r_top = round(p["AirConsR2"], 3)                          # 1200.82

    volumes.append({
        "name": "AirCone",
        "g4name": "AirCone",
        "type": "polycone",
        "material": "G4_AIR",
        "dimensions": {
            "z": [ac_z_bot, ac_z_top],
            "rmin": [0, 0],
            "rmax": [ac_r_bot, ac_r_top],
        },
        "placements": [placement(0, 0, 0, "WaterTank",
                                 "AirCone", "AirCone")],
        "visible": True,
        "wireframe": True,
    })

    return volumes
