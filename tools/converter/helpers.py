"""
Helper functions for building g4-editor JSON volumes.
"""

import math


def rot(x=0, y=0, z=0):
    """Rotation dict."""
    return {"x": x, "y": y, "z": z}


def g4_compound_to_json(*steps):
    """Convert G4 CLHEP cumulative rotation steps to a JSON rotation dict.

    Each step is ("X"|"Y"|"Z", angle_rad) matching the mc-master C++ code,
    e.g. rotateZ(90°) → rotateX(90°) → rotateY(90°) becomes
    ("Z", pi/2), ("X", pi/2), ("Y", pi/2).

    CLHEP's rotateX/Y/Z uses LEFT multiplication:
        M.rotateX(a) → M = Rx(a) * M
    So rotateZ(a) → rotateX(b) → rotateY(c) yields M = Ry(c)*Rx(b)*Rz(a).

    The g4-editor's GeometryParser (for non-assembly volumes) inverts
    the JSON angles and applies them as rotateX → rotateY → rotateZ,
    giving M_parser = Rz(-rz_json) * Ry(-ry_json) * Rx(-rx_json).

    We need M_parser == M_mc, so we decompose M_mc into ZYX Euler:
        M_mc = Rz(C) * Ry(B) * Rx(A)
    and return json = {x: -A, y: -B, z: -C}.
    """
    m = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    for axis, angle in steps:
        c, s = math.cos(angle), math.sin(angle)
        if axis == "X":
            r = [[1, 0, 0], [0, c, -s], [0, s, c]]
        elif axis == "Y":
            r = [[c, 0, s], [0, 1, 0], [-s, 0, c]]
        elif axis == "Z":
            r = [[c, -s, 0], [s, c, 0], [0, 0, 1]]
        else:
            raise ValueError(f"Unknown axis: {axis}")
        m = _mat_mul(r, m)  # LEFT multiply (CLHEP convention)

    # ZYX Euler decomposition: M = Rz(C) * Ry(B) * Rx(A)
    sinB = max(-1.0, min(1.0, -m[2][0]))
    B = math.asin(sinB)
    cosB = math.cos(B)

    if abs(cosB) > 1e-6:
        A = math.atan2(m[2][1], m[2][2])
        C = math.atan2(m[1][0], m[0][0])
    else:
        # Gimbal lock
        C = 0.0
        if sinB > 0:
            A = math.atan2(m[0][1], m[0][2])
        else:
            A = math.atan2(-m[0][1], -m[0][2])

    return {"x": round(-A, 6), "y": round(-B, 6), "z": round(-C, 6)}


def _mat_mul(a, b):
    """Multiply two 3x3 matrices."""
    return [
        [sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)]
        for i in range(3)
    ]


def placement(x=0, y=0, z=0, parent="World", g4name=None, name=None):
    """Create a placement dict."""
    pl = {"x": round(x, 3), "y": round(y, 3), "z": round(z, 3),
          "rotation": rot(), "parent": parent}
    if g4name:
        pl["g4name"] = g4name
    if name:
        pl["name"] = name
    return pl


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
    n_dome = 16

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

    # Bottom dome: sample Z from pole upward to cylinder edge
    z_sc_bot = -L / 2 + dZ_bot
    z_pole_bot = z_sc_bot - R0bot
    z_cap_edge_bot = z_sc_bot - R0bot * math.cos(theta_bot)

    for i in range(n_dome + 1):
        frac = i / n_dome
        z = z_pole_bot + frac * (-L / 2 - z_pole_bot)

        dz_t = z - (-L / 2)
        if -R1bot <= dz_t <= 0:
            r_torus = rc0_bot + math.sqrt(max(0, R1bot**2 - dz_t**2))
        else:
            r_torus = 0

        if z_pole_bot <= z <= z_cap_edge_bot + 0.01:
            dz_s = z - z_sc_bot
            r_sphere = math.sqrt(max(0, R0bot**2 - dz_s**2))
        else:
            r_sphere = 0

        r = max(r_torus, r_sphere, 0.001)
        if i == 0:
            r = 0.001

        z_arr.append(round(z, 3))
        rmin_arr.append(0)
        rmax_arr.append(round(r, 3))

    # Cylinder body (rings / flanges)
    if has_rings and dR_ring1 > 0:
        eps = 0.01
        ring_z_data = [
            (z_ring1, h_ring1, dR_ring1),
            (z_ring2, h_ring2, dR_ring2),
            (z_flange, h_flange, dR_flange),
        ]
        for zr, hr, dr in ring_z_data:
            z_arr.extend([
                round(zr - hr / 2 - eps, 3),
                round(zr - hr / 2, 3),
                round(zr + hr / 2, 3),
                round(zr + hr / 2 + eps, 3),
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
                round(z_flange - h_flange / 2 - eps, 3),
                round(z_flange - h_flange / 2, 3),
                round(z_flange + h_flange / 2, 3),
                round(z_flange + h_flange / 2 + eps, 3),
            ])
            rmin_arr.extend([0, 0, 0, 0])
            rmax_arr.extend([
                round(R, 3),
                round(R + dR_flange, 3),
                round(R + dR_flange, 3),
                round(R, 3),
            ])

    # Top dome
    z_sc_top = L / 2 - dZ_top
    z_pole_top = z_sc_top + R0top
    z_cap_edge_top = z_sc_top + R0top * math.cos(theta_top)

    for i in range(n_dome + 1):
        frac = i / n_dome
        z = L / 2 + frac * (z_pole_top - L / 2)

        dz_t = z - L / 2
        if 0 <= dz_t <= R1top:
            r_torus = rc0_top + math.sqrt(max(0, R1top**2 - dz_t**2))
        else:
            r_torus = 0

        if z_cap_edge_top - 0.01 <= z <= z_pole_top:
            dz_s = z - z_sc_top
            r_sphere = math.sqrt(max(0, R0top**2 - dz_s**2))
        else:
            r_sphere = 0

        r = max(r_torus, r_sphere, 0.001)
        if i == n_dome:
            r = 0.001

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
