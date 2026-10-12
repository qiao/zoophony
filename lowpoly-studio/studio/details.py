"""Small low-poly meshes that sit on the body: eyes, brows, nose, mouth, ears, tail, claws.

numpy only. Each detail is a dict: name, verts (n, 3) in three.js axes, faces (m, 3), color (sRGB
0..255), material (a name of look.materials), and bone (the one bone that moves it). The config
section details gives the sizes and the places, and paint.palette the colors.
"""

import math

import numpy as np

from studio.field import surface_along

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


def detail(name, verts, faces, color, material, bone):
    """Bundles one detail mesh."""
    return {'name': name, 'verts': np.asarray(verts, float), 'faces': np.asarray(faces),
            'color': color, 'material': material, 'bone': bone}


def face_details(cfg, parts, ray=None):
    """Makes the eyes, the brows, the nose, and the mouth line on the head surface.

    ray: a function (start, direction) -> the first point on the surface. The build passes a ray
    cast on the low-poly mesh, so the details sit on the facets and not on the smooth field.
    """
    if ray is None:
        def ray(start, direction):
            return surface_along(parts, start, direction)
    pal = cfg.paint.palette
    d = cfg.details
    out = []
    ey_c = d.eyes
    ex, ey = ey_c.center
    r = ey_c.radius
    sv, sf = icosphere(1)
    cv, cf = icosphere(0)
    for side, suffix in ((1, 'L'), (-1, 'R')):
        # The eye: a dark outline, a thin white rim (wider on the outer side, as the iris looks a
        # little inward), a dark iris, and a small highlight. Each layer is a flattened sphere in
        # the frame of the look direction.
        look = unit_vec([ey_c.look[0] * side, ey_c.look[1], ey_c.look[2]])
        right = unit_vec(np.cross([0.0, 1.0, 0.0], look))
        up = np.cross(look, right)
        frame = np.stack([right, up, look], axis=1)
        surf = ray((ex * side, ey, ey_c.ray_z), (0, 0, -1))

        def layer(name, center, radii, color, verts=sv, faces=sf):
            pts = center + (verts * np.array(radii)) @ frame.T
            out.append(detail(f'{name}_{suffix}', pts, faces, color, 'gloss', 'head'))

        # The widest ring of the outline sits on the facet, so the whole disk shows.
        o = ey_c.outline
        base = surf - look * o.sink
        layer('eye_outline', base, (r * o.scale, r * o.scale, r * o.depth), pal['eye_outline'])
        layer('sclera', base + look * ey_c.sclera.lift, (r, r, r * ey_c.sclera.depth),
              pal['sclera'])
        ir = ey_c.iris
        inward = -side * ir.inward * r * right
        iris_c = base + look * ir.lift + inward
        layer('eye', iris_c, (r * ir.scale, r * ir.scale, r * ir.depth), pal['eye'])
        cl = ey_c.catchlight
        hl = iris_c + frame @ np.array([cl.offset[0] * r * side, cl.offset[1] * r,
                                        r * cl.offset[2]])
        layer('catchlight', hl, (r * cl.scale, r * cl.scale, r * cl.depth), pal['catchlight'],
              cv, cf)

    # A soft brow line above each eye: a thin arc, highest above the eye.
    b = d.brows
    for side, suffix in ((1, 'L'), (-1, 'R')):
        us = np.linspace(-1.0, 1.0, 7)
        pts = [ray((side * (ex + b.x_offset + b.half_width * u), ey + b.lift + b.arch * (1 - u * u),
                    ey_c.ray_z), (0, 0, -1)) + np.array([0.0, 0.0, b.out]) for u in us]
        radii = b.radius + b.radius_arch * (1 - us * us)
        bv, bf = tube(pts, radii, 4, closed_tip=False)
        out.append(detail(f'brow_{suffix}', bv, bf, pal['brow'], 'fur', 'head'))

    # The nose: a rounded triangle, wide at the top, on the front of the snout.
    n = d.nose
    nx, ny = n.at
    surf = ray((nx, ny, n.ray_z), (0, 0, -1))
    nv, nf = icosphere(1)
    nv = nv * np.array(n.size)
    taper = np.clip(1.0 + n.taper * nv[:, 1] / n.size[1], n.taper_clip[0], n.taper_clip[1])
    nv[:, 0] *= taper
    nv[:, 2] += n.tilt * (nv[:, 1] / n.size[1])
    center = surf + np.array([0.0, 0.0, -n.sink])
    out.append(detail('nose', center + nv, nf, pal['nose'], 'gloss', 'head'))

    # The mouth: a short philtrum and a soft closed smile, pressed onto the muzzle.
    mo = d.mouth

    def on_surface(x, y):
        return ray((x, y, n.ray_z), (0, 0, -1)) + np.array([0, 0, mo.out])

    philtrum = [on_surface(0.0, y) for y in np.linspace(ny - mo.philtrum[0],
                                                        ny - mo.philtrum[1], 3)]
    pv, pf = tube(philtrum, [mo.philtrum_radius] * 3, 4, closed_tip=False)
    out.append(detail('mouth_0', pv, pf, pal['mouth'], 'fur', 'head'))
    w = mo.smile_half_width
    for side in (1, -1):
        xs = np.linspace(0.0, w, 7)
        dys = -mo.smile_sag * np.sin(np.pi * xs / w * mo.smile_sag_span) + mo.smile_lift * (xs / w) ** 2
        smile = [on_surface(side * x, ny - mo.philtrum[1] + dy) for x, dy in zip(xs, dys)]
        radii = np.linspace(mo.smile_radii[0], mo.smile_radii[1], len(smile))
        mv, mf = tube(smile, radii, 4, closed_tip=False)
        out.append(detail(f'mouth_{side}', mv, mf, pal['mouth'], 'fur', 'head'))
    return out


def ears_and_tail(cfg, body):
    """Makes the ears and the tail as low-poly pieces that sink into the head and the rump.

    Each ear is a flat round shell with a hollow on its front face. The hollow is dark.
    """
    pal = cfg.paint.palette
    e = cfg.field.ears
    de = cfg.details.ears
    out = []
    v0, f0 = icosphere(1)
    c, r = e.center, e.radii
    for side, suffix in ((1, 'L'), (-1, 'R')):
        local = v0 * np.array(r)
        # The hollow: the front (local +z) of the shell sinks toward the back.
        rad = np.hypot(local[:, 0] / r[0], local[:, 1] / r[1])
        front = local[:, 2] > 0
        local[front, 2] -= r[2] * de.hollow_depth * np.clip(1.0 - rad[front] / de.hollow_radius,
                                                             0.0, 1.0)
        f = body.ear_frame(side)
        center = np.array(c) * np.array([side, 1, 1])
        verts = center + local @ f.T
        cen = local[f0].mean(axis=1)
        nrm = np.cross(local[f0[:, 1]] - local[f0[:, 0]], local[f0[:, 2]] - local[f0[:, 0]])
        inner = (nrm[:, 2] > 0) & (np.hypot(cen[:, 0] / r[0], cen[:, 1] / r[1]) < de.hollow_radius)
        colors = np.where(inner[:, None], np.array(pal['ear_inner'], float),
                          np.array(pal['ear'], float))
        d = detail(f'ear_{suffix}', verts, f0, pal['ear'], 'fur', f'ear_{suffix}')
        d['colors'] = colors
        out.append(d)
    t = cfg.field.tail
    tv = t.center + (v0 * np.array(t.radii)) @ body.tail_rotation().T
    out.append(detail('tail', tv, f0, pal['ear'], 'fur', 'tail'))
    return out


def hand_claws(cfg, body, pose):
    """Makes the four claws of each paw in a pose."""
    pal = cfg.paint.palette
    h = cfg.details.hand_claws
    joints, frames = body.arm_pose(pose)
    out = []
    for side, suffix in ((1, 'L'), (-1, 'R')):
        sx = np.diag([side, 1.0, 1.0])
        W = sx @ joints['wrist']
        K = sx @ joints['knuckle']
        fh = sx @ frames['hand']
        paw_c = 0.5 * (W + K)
        for i, off in enumerate(h.offsets):
            base = paw_c + fh @ np.array([off, h.base_y - abs(off) * h.base_drop, h.base_z])
            direction = fh @ np.array([off * h.direction[0], h.direction[1], h.direction[2]])
            cv, cf = claw(base, direction, fh @ np.array([0, 0, 1.0]), h.length, h.radius)
            out.append(detail(f'claw_hand_{suffix}{i}', cv, cf, pal['claw'], 'gloss',
                               body.claw_bone(suffix, i)))
    return out


def foot_claws(cfg, body, pose='bind'):
    """Makes the four claws of each foot."""
    pal = cfg.paint.palette
    f = cfg.details.foot_claws
    offsets = cfg.field.leg.toes.offsets
    out = []
    for side, suffix in ((1, 'L'), (-1, 'R')):
        for i, (off, c) in enumerate(zip(offsets, body.toe_centers(side, pose))):
            base = c + np.array([off * f.base[0] * side, f.base[1], f.base[2]])
            # The tips stay a little above the ground.
            direction = np.array([off * f.direction[0] * side, f.direction[1], f.direction[2]])
            cv, cf = claw(base, direction, f.curl, f.length, f.radius)
            cv[:, 1] = np.maximum(cv[:, 1], f.min_y)
            out.append(detail(f'claw_foot_{suffix}{i}', cv, cf, pal['claw'], 'gloss',
                               f'toes_{suffix}'))
    return out


def body_details(cfg, body, parts, ray, pose='bind'):
    """Lists every body detail in the order of the joined mesh: face, ears and tail, claws.

    The role props come after them (studio/props.py).
    """
    return (face_details(cfg, parts, ray) + ears_and_tail(cfg, body)
            + hand_claws(cfg, body, pose) + foot_claws(cfg, body, pose))
