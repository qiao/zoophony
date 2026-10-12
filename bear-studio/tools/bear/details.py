"""Small low-poly meshes that sit on the body: eyes, nose, mouth line, claws, and the baton.

numpy only. Each detail is a dict: name, verts (n, 3) in three.js axes, faces (m, 3), color
(sRGB 0..255), material ('fur', 'gloss', or 'baton'), and bone (the one bone that moves it).
"""

import math

import numpy as np

import body
from sdf import frame_from

ICO_T = (1.0 + math.sqrt(5.0)) / 2.0


def icosphere(subdiv):
    """Makes a unit icosphere: (verts, faces)."""
    t = ICO_T
    v = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t),
         (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    f = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4),
         (11, 10, 2), (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8),
         (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    verts = [np.array(p, float) / np.linalg.norm(p) for p in v]
    faces = f
    for _ in range(subdiv):
        cache = {}
        new_faces = []

        def mid(a, b):
            key = (min(a, b), max(a, b))
            if key not in cache:
                m = verts[a] + verts[b]
                verts.append(m / np.linalg.norm(m))
                cache[key] = len(verts) - 1
            return cache[key]

        for a, b, c in faces:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
            new_faces += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        faces = new_faces
    return np.array(verts), np.array(faces, np.int64)


def unit_vec(v):
    """Normalizes a vector."""
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def tube(points, radii, sides, closed_tip=True):
    """Makes a tube along points with a radius per point; the ends are capped.

    Returns (verts, faces). With closed_tip, the last ring is one point (a cone tip).
    """
    pts = np.asarray(points, float)
    n = len(pts)
    verts = []
    prev_normal = None
    for i in range(n):
        d = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        d /= np.linalg.norm(d)
        if prev_normal is None:
            hint = np.array([0.0, 0.0, 1.0]) if abs(d[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
            nrm = np.cross(d, hint)
        else:
            nrm = prev_normal - d * np.dot(prev_normal, d)
        nrm /= np.linalg.norm(nrm)
        prev_normal = nrm
        bi = np.cross(d, nrm)
        if closed_tip and i == n - 1:
            verts.append(pts[i])
            continue
        for k in range(sides):
            a = 2 * math.pi * k / sides
            verts.append(pts[i] + radii[i] * (math.cos(a) * nrm + math.sin(a) * bi))
    faces = []
    rings = n - 1 if closed_tip else n
    for i in range(rings - 1):
        for k in range(sides):
            a = i * sides + k
            b = i * sides + (k + 1) % sides
            c = (i + 1) * sides + (k + 1) % sides
            d = (i + 1) * sides + k
            faces += [(a, b, c), (a, c, d)]
    if closed_tip:
        tip = len(verts) - 1
        base = (rings - 1) * sides
        for k in range(sides):
            faces.append((base + k, base + (k + 1) % sides, tip))
    # The cap at the start.
    verts.append(pts[0])
    c0 = len(verts) - 1
    for k in range(sides):
        faces.append((c0, (k + 1) % sides, k))
    if not closed_tip:
        verts.append(pts[-1])
        c1 = len(verts) - 1
        base = (n - 1) * sides
        for k in range(sides):
            faces.append((c1, base + k, base + (k + 1) % sides))
    return np.array(verts), np.array(faces, np.int64)


def claw(base, direction, curl_dir, length, radius):
    """Makes one curved claw from its base along direction, bent toward curl_dir."""
    d = np.asarray(direction, float)
    d /= np.linalg.norm(d)
    c = np.asarray(curl_dir, float)
    c = c - d * np.dot(c, d)
    c /= np.linalg.norm(c)
    pts = []
    for i, s in enumerate(np.linspace(0, 1, 4)):
        pts.append(base + d * length * s + c * length * 0.35 * s * s)
    radii = [radius, radius * 0.8, radius * 0.45, 0.0]
    return tube(pts, radii, 5)


def _detail(name, verts, faces, color, material, bone):
    """Bundles one detail mesh."""
    return {'name': name, 'verts': np.asarray(verts, float), 'faces': np.asarray(faces),
            'color': color, 'material': material, 'bone': bone}


BATON_LENGTH = 0.36

COLORS = {
    'ear': (104, 64, 36),
    'ear_inner': (72, 42, 26),
    'eye': (22, 17, 15),
    'sclera': (236, 230, 220),
    'catchlight': (255, 255, 255),
    'nose': (46, 38, 35),
    'mouth': (70, 44, 30),
    'claw': (52, 44, 40),
    'baton': (244, 240, 230),
    'grip': (120, 84, 52),
}


def face_details(parts, ray=None):
    """Makes the eyes, the nose, and the mouth line on the head surface.

    ray: a function (start, direction) -> the first point on the surface. The build passes a
    ray cast on the low-poly mesh, so the details sit on the facets and not on the smooth field.
    """
    if ray is None:
        def ray(start, direction):
            return body.surface_along(parts, start, direction)
    out = []
    ex, ey = body.HEAD['eye']
    r = body.HEAD['eye_radius']
    sv, sf = icosphere(1)
    cv, cf = icosphere(0)
    for side, suffix in ((1, 'L'), (-1, 'R')):
        # A small dark eye with a calm look: no white ring, only a tiny highlight.
        look = np.array([0.18 * side, 0.02, 1.0])
        look /= np.linalg.norm(look)
        surf = ray((ex * side, ey, 0.4), (0, 0, -1))
        center = surf - look * (r * 0.45)
        out.append(_detail(f'eye_{suffix}', center + sv * r, sf, COLORS['eye'], 'gloss', 'head'))
        hl = center + r * 0.85 * unit_vec([-0.3 * side + 0.15, 0.5, 0.82])
        out.append(_detail(f'catchlight_{suffix}', hl + cv * (r * 0.22), cf,
                           COLORS['catchlight'], 'gloss', 'head'))

    # The nose: a rounded triangle, wide at the top.
    nx, ny = body.HEAD['nose']
    surf = ray((nx, ny, 0.45), (0, 0, -1))
    nv, nf = icosphere(1)
    nv = nv * np.array([0.036, 0.025, 0.024])
    taper = np.clip(1.0 + 0.5 * nv[:, 1] / 0.025, 0.55, 1.3)
    nv[:, 0] *= taper
    nv[:, 2] += 0.006 * (nv[:, 1] / 0.025)
    center = surf + np.array([0.0, 0.0, -0.009])
    out.append(_detail('nose', center + nv, nf, COLORS['nose'], 'gloss', 'head'))

    # The mouth: a short philtrum and a smile, pressed onto the muzzle.
    def on_surface(x, y):
        return ray((x, y, 0.45), (0, 0, -1)) + np.array([0, 0, 0.0012])

    # A short philtrum and a soft closed smile, as on the sheet (the mouth is at height 0.80).
    philtrum = [on_surface(0.0, y) for y in np.linspace(ny - 0.024, ny - 0.034, 3)]
    pv, pf = tube(philtrum, [0.0022] * 3, 4, closed_tip=False)
    out.append(_detail('mouth_0', pv, pf, COLORS['mouth'], 'fur', 'head'))
    for side in (1, -1):
        xs = np.linspace(0.0, 0.032, 7)
        dys = -0.0045 * np.sin(np.pi * xs / 0.032 * 0.8) + 0.004 * (xs / 0.032) ** 2
        smile = [on_surface(side * x, ny - 0.034 + dy) for x, dy in zip(xs, dys)]
        radii = np.linspace(0.0021, 0.0012, len(smile))
        mv, mf = tube(smile, radii, 4, closed_tip=False)
        out.append(_detail(f'mouth_{side}', mv, mf, COLORS['mouth'], 'fur', 'head'))
    return out


def ears_and_tail():
    """Makes the ears and the tail as low-poly pieces that sink into the head and the rump.

    Each ear is a flat round shell with a hollow on its front face. The hollow is dark.
    """
    out = []
    v0, f0 = icosphere(1)
    c, r = body.HEAD['ear']
    for side, suffix in ((1, 'L'), (-1, 'R')):
        local = v0 * np.array(r)
        # The hollow: the front (local +z) of the shell sinks toward the back.
        rad = np.hypot(local[:, 0] / r[0], local[:, 1] / r[1])
        front = local[:, 2] > 0
        local[front, 2] -= r[2] * 1.5 * np.clip(1.0 - rad[front] / 0.8, 0.0, 1.0)
        f = body.ear_frame(side)
        center = np.array(c) * np.array([side, 1, 1])
        verts = center + local @ f.T
        cen = local[f0].mean(axis=1)
        nrm = np.cross(local[f0[:, 1]] - local[f0[:, 0]], local[f0[:, 2]] - local[f0[:, 0]])
        inner = (nrm[:, 2] > 0) & (np.hypot(cen[:, 0] / r[0], cen[:, 1] / r[1]) < 0.75)
        colors = np.where(inner[:, None], np.array(COLORS['ear_inner'], float),
                          np.array(COLORS['ear'], float))
        d = _detail(f'ear_{suffix}', verts, f0, COLORS['ear'], 'fur', f'ear_{suffix}')
        d['colors'] = colors
        out.append(d)
    tc, tr = body.TAIL
    tv = tc + (v0 * np.array(tr)) @ body.tail_rotation().T
    out.append(_detail('tail', tv, f0, COLORS['ear'], 'fur', 'tail'))
    return out


def hand_claws(pose):
    """Makes the four claws of each paw in a pose."""
    joints, frames = body.arm_pose(pose)
    out = []
    for side, suffix in ((1, 'L'), (-1, 'R')):
        sx = np.diag([side, 1.0, 1.0])
        W = sx @ joints['wrist']
        K = sx @ joints['knuckle']
        fh = sx @ frames['hand']
        paw_c = 0.5 * (W + K)
        for i, off in enumerate((-0.033, -0.011, 0.011, 0.033)):
            base = paw_c + fh @ np.array([off, 0.042 - abs(off) * 0.25, 0.012])
            direction = fh @ np.array([off * 0.6, 1.0, 0.25])
            cv, cf = claw(base, direction, fh @ np.array([0, 0, 1.0]), 0.05, 0.0115)
            out.append(_detail(f'claw_hand_{suffix}{i}', cv, cf, COLORS['claw'], 'gloss',
                               f'fingers_{suffix}'))
    return out


def foot_claws():
    """Makes the four claws of each foot."""
    out = []
    for side, suffix in ((1, 'L'), (-1, 'R')):
        for i, off in enumerate((-0.045, -0.015, 0.015, 0.045)):
            c = np.array([(0.142 + off * 0.95) * side, 0.03, 0.098 - abs(off) * 0.35])
            base = c + np.array([off * 0.1 * side, -0.006, 0.018])
            # Large claws, as on the sheet. The tips stay 2 mm above the ground.
            direction = np.array([off * 1.2 * side, -0.3, 1.0])
            cv, cf = claw(base, direction, (0, -1.0, 0.2), 0.05, 0.0165)
            cv[:, 1] = np.maximum(cv[:, 1], 0.002)
            out.append(_detail(f'claw_foot_{suffix}{i}', cv, cf, COLORS['claw'], 'gloss',
                               f'toes_{suffix}'))
    return out


def baton(pose):
    """Makes the baton in the right paw: a cork grip and a long tapered shaft.

    Returns (details, grip point, tip point).
    """
    joints, frames = body.arm_pose(pose)
    sx = np.diag([-1.0, 1.0, 1.0])
    W = sx @ joints['wrist']
    K = sx @ joints['knuckle']
    fh = sx @ frames['hand']
    # The paw closes on the grip at the palm side of the finger tips. The shaft points along the
    # fingers, toward the thumb side (-x of the hand frame), and a little to the back of the paw.
    grip = 0.5 * (W + K) + fh @ np.array([-0.008, 0.02, 0.018])
    direction = fh @ np.array([-0.35, 1.0, -0.12])
    direction /= np.linalg.norm(direction)
    back = grip - direction * 0.045
    tip = grip + direction * BATON_LENGTH
    gv, gf = tube([back, back + direction * 0.02, grip + direction * 0.03],
                  [0.0085, 0.010, 0.0075], 6, closed_tip=False)
    shaft = [grip + direction * 0.02, grip + direction * 0.2, tip]
    bv, bf = tube(shaft, [0.0042, 0.0032, 0.0016], 5, closed_tip=False)
    details = [
        _detail('baton_grip', gv, gf, COLORS['grip'], 'baton', 'baton'),
        _detail('baton_shaft', bv, bf, COLORS['baton'], 'baton', 'baton'),
    ]
    return details, grip, tip
