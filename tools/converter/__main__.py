"""
Main entry point for the converter.

Usage:
    python -m converter [options]

Examples:
    # Default: core geometry only (same as original convert_to_json.py)
    python -m converter -o xenonnt_geometry.json

    # Include all optional subsystems
    python -m converter --all -o xenonnt_geometry_full.json

    # Include specific subsystems
    python -m converter --support --neutron-veto -o xenonnt_geometry.json

    # Include neutron veto (ePTFE octagonal reflectors)
    python -m converter --neutron-veto -o xenonnt_geometry.json
"""

import argparse
import json
import sys

from .helpers import rot
from .materials import get_materials
from .water_tank import build_water_tank
from .cryostat import build_cryostats
from .tpc import build_tpc
from .pmts import build_pmts
from .muon_veto import build_muon_veto
from .support_structure import build_support_structure
from .neutron_veto import build_neutron_veto, build_nveto_pmts
from .calibration import build_calibration


def _tag_group(volumes, group):
    """Add ``_displayGroup`` metadata to each volume (and assembly components).

    This field is used by the geometry editor to organise the sidebar tree
    into collapsible folders.  It has no effect on the Geant4 simulation.
    """
    for v in volumes:
        v["_displayGroup"] = group
        # Also tag assembly components so they stay grouped after import
        for comp in v.get("components", []):
            comp["_displayGroup"] = group
    return volumes


def build_geometry(include_muon_veto=False,
                   include_support=False,
                   include_neutron_veto=False,
                   include_calibration=False,
                   nveto_segmented=False):
    """Build the full geometry JSON dict.

    Parameters
    ----------
    include_muon_veto : bool
        Include muon veto (air cone + 84 R5912 PMTs).
    include_support : bool
        Include support structure (steel beams).
    include_neutron_veto : bool
        Include neutron veto (ePTFE octagonal reflector panels).
    include_calibration : bool
        Include calibration source tube.
    nveto_segmented : bool
        Unused (kept for CLI compatibility).

    Returns
    -------
    dict
        Complete geometry dict ready for json.dump().
    """
    volumes = []

    # Core geometry (always included)
    volumes.extend(_tag_group(build_water_tank(), "Water Tank"))
    volumes.extend(_tag_group(build_cryostats(), "Cryostats"))
    volumes.extend(_tag_group(build_tpc(), "TPC"))
    volumes.extend(_tag_group(build_pmts(), "PMTs"))

    # Optional subsystems
    if include_muon_veto:
        volumes.extend(_tag_group(build_muon_veto(), "Muon Veto"))

    if include_support:
        volumes.extend(_tag_group(build_support_structure(), "Support Structure"))

    if include_neutron_veto:
        volumes.extend(_tag_group(build_neutron_veto(segmented=nveto_segmented), "Neutron Veto"))
        volumes.extend(_tag_group(build_nveto_pmts(), "Neutron Veto"))

    if include_calibration:
        volumes.extend(_tag_group(build_calibration(), "Calibration"))

    # World
    world_half = 6000.0
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
        "materials": get_materials(),
    }

    return geometry


def main():
    parser = argparse.ArgumentParser(
        description="Convert XENONnT mc-master geometry to g4-editor JSON format."
    )
    parser.add_argument("-o", "--output", default="xenonnt_geometry.json",
                        help="Output JSON file (default: xenonnt_geometry.json)")
    parser.add_argument("--all", action="store_true",
                        help="Include all optional subsystems")
    parser.add_argument("--muon-veto", action="store_true",
                        help="Include muon veto (air cone)")
    parser.add_argument("--support", action="store_true",
                        help="Include support structure")
    parser.add_argument("--neutron-veto", action="store_true",
                        help="Include neutron veto")
    parser.add_argument("--calibration", action="store_true",
                        help="Include calibration source")
    parser.add_argument("--nveto-segmented", action="store_true",
                        help="Segment neutron veto LScint into 12 pieces")

    args = parser.parse_args()

    if args.all:
        args.muon_veto = True
        args.support = True
        args.neutron_veto = True
        args.calibration = True

    geometry = build_geometry(
        include_muon_veto=args.muon_veto,
        include_support=args.support,
        include_neutron_veto=args.neutron_veto,
        include_calibration=args.calibration,
        nveto_segmented=args.nveto_segmented,
    )

    with open(args.output, "w") as f:
        json.dump(geometry, f, indent=2)

    volumes = geometry["volumes"]
    materials = geometry["materials"]

    # Summary
    print(f"Written {len(volumes)} volumes to {args.output}")
    print(f"  Materials: {len(materials)}")

    # Count assemblies
    n_assemblies = sum(1 for v in volumes if v.get("type") == "assembly")
    n_regular = len(volumes) - n_assemblies
    print(f"  Regular volumes: {n_regular}")
    print(f"  Assembly volumes: {n_assemblies}")

    # List enabled subsystems
    enabled = ["core (water tank, cryostats, TPC, PMTs)"]
    if args.muon_veto:
        enabled.append("muon veto")
    if args.support:
        enabled.append("support structure")
    if args.neutron_veto:
        seg = " (segmented)" if args.nveto_segmented else ""
        enabled.append(f"neutron veto{seg}")
    if args.calibration:
        enabled.append("calibration")
    print(f"  Subsystems: {', '.join(enabled)}")


if __name__ == "__main__":
    main()
