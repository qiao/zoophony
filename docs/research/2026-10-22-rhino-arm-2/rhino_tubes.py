"""Gives each arm of a copy of the rhino mesh a new round tube, in Blender (batch).

Each thick arm of the source joins the side of the trunk from the paw up to the shoulder, and the
outer side of the arm bends at the elbow on a few long faces. At full size from the stage, the
elbows read as flat slabs with sharp corners (`docs/research/2026-10-22-rhino-arm-2.md`). For each
side, this script:

1. keeps the paw of the source: each face of the free arm (`free_arm()` of
   `tools/blender/rig_mesh.py`) beyond the plane across the forearm at the wrist joint;
2. removes each other face with a corner in the free arm, so that the arm leaves the trunk;
3. fills each hole of the trunk with a fair surface: a grid of new vertices in a chart around the
   trunk, a constrained Delaunay triangulation, and the distances from the middle of the trunk
   that make the bilaplacian zero, with the rim and one ring of the trunk around it fixed
   (`fill_hole()`);
4. builds a tube of rings from the wrist up to a dome inside the shoulder: each ring is an
   ellipse that spans the front and the back of the source arm at its place along the arm and
   touches its outer side (`arm_fits()`), the rings are closer at the elbow, and a strip joins the
   last ring to the loop of the paw. Each ring of the dome shrinks until it lies inside the source
   surface, and the rings below it narrow slowly toward it, so that the silhouette of the shoulder
   does not grow;
5. gives each new face the UVs of the nearest lighter face of the source arm or of the trunk,
   because the texture is darker in the armpit.

    blender -b --factory-startup --python <this file> -- tools/mesh-rigs/rhino.json \
        assets/models/rhino/rhino.glb <out.glb> ['<JSON options>']

The rig config gives the joints and the rules of the free arm. A run gives the same bytes. The
points are in the units of the rig config: 1 unit from the soles to the top, soles at y = 0, y up,
+z forward, +x the left side.
"""
import json
import math
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import delaunay_2d_cdt

#: The options:
#:
#: - `sides`: the vertices of each ring of the tube.
#: - `step`, `elbowStep`, `elbow`: the gap of the rings along the arm (upper arm lengths), and the
#:   smaller gap between the places of `elbow`.
#: - `wrist`: the place of the plane of the paw along the forearm from the wrist joint (units,
#:   toward the paw is positive).
#: - `gap`: the gap of the last ring from the middle of the loop of the paw (units).
#: - `scale`: the factor of the half axes of each ring.
#: - `smooth`: the rounds of the moving mean of the sections along the arm, and `fitFrom`: the
#:   first place of a section (upper arm lengths). Each place above it takes its section.
#: - `domeRings`, `dome`: the rings of the dome above the shoulder joint, and its height as a part
#:   of the mean half axis at the shoulder joint.
#: - `roundness`: the half axis out over the half axis forward, where the arm joins the trunk.
#: - `inside`: the least depth of a clamped vertex inside the source surface (units),
#:   `clampTo`: the place along the arm up to which the vertices move inside the source, and
#:   `clamp`: `ring` (each ring shrinks around its middle) or `vertex` (each vertex moves in),
#:   and `taper`: the largest change of the factor of a ring for each upper arm length.
#: - `fillStep`: the gap of the new vertices of the fill of the trunk (units), and `fill`: the
#:   smoothing of the fill (`radial` or `points`, `fill_hole()`).
#: - `light`: the share of the darkest source faces whose UVs no new face takes, and
#:   `trunkReach`: the largest distance of a source face of the fill from the free arm (units).
OPTIONS = {
    'sides': 14,
    'step': 0.15,
    'elbowStep': 0.07,
    'elbow': [0.75, 1.25],
    'wrist': 0.0,
    'gap': 0.012,
    'scale': 1.0,
    'smooth': 2,
    'fitFrom': 0.3,
    'domeRings': 3,
    'dome': 0.8,
    'roundness': 0.85,
    'inside': 0.003,
    'clampTo': 0.0,
    'clamp': 'ring',
    'taper': 0.6,
    'fillStep': 0.028,
    'light': 0.3,
    'fill': 'radial',
    'trunkReach': 0.06,
}

#: The map from rig units to Blender coordinates of the current mesh, set by `run()`.
FRAME = {}

#: The base color texture of the mesh, set by `run()`.
TEXTURE = {}


def rig_functions():
    """Gives the functions of the rig script, with no run of its main function."""
    text = open('tools/blender/rig_mesh.py').read().rsplit('\nmain()', 1)[0]
    space = {'__name__': 'rig_mesh'}
    exec(compile(text, 'rig_mesh.py', 'exec'), space)
    return space


def to_rig(co):
    """Gives a Blender point in rig units."""
    s, floor = FRAME['scale'], FRAME['floor']
    return np.array([co.x * s, (co.z - floor) * s, -co.y * s])


def to_blender(p):
    """Gives a point in rig units in Blender coordinates."""
    s, floor = FRAME['scale'], FRAME['floor']
    return Vector((p[0] / s, -p[2] / s, p[1] / s + floor))


def unit(v):
    """Gives a vector of length 1."""
    return v / np.linalg.norm(v)


def ordered_loop(edges):
    """Orders directed edges (a, b) into one loop. Gives the vertices, or raises an error when the
    edges form more than one loop or a vertex has two edges out."""
    after = {}
    for a, b in edges:
        if a in after:
            raise RuntimeError(f'a vertex has two loop edges: {a}')
        after[a] = b
    loops = []
    left = dict(after)
    while left:
        start = next(iter(left))
        loop = [start]
        while after[loop[-1]] != start:
            loop.append(after[loop[-1]])
        for v in loop:
            left.pop(v, None)
        loops.append(loop)
    return loops


def boundary_edges(faces):
    """Gives the directed edges of a set of BMFaces that no other face of the set shares, in the
    winding of their face."""
    count = {}
    for f in faces:
        vs = [loop.vert for loop in f.loops]
        for i in range(3):
            a, b = vs[i], vs[(i + 1) % 3]
            count.setdefault(frozenset((a, b)), []).append((a, b))
    return [pairs[0] for pairs in count.values() if len(pairs) == 1]


def arm_axis(u, path):
    """Gives the point and the unit direction of the arm axis at the place u (upper arm lengths
    from the shoulder joint, past 1 on the forearm). The direction turns from the upper arm to the
    forearm between the places 0.85 and 1.15, so that the rings at the elbow do not cross."""
    s, e, w, length = path
    ua = unit(e - s)
    fa = unit(w - e)
    point = s + u * length * ua if u <= 1.0 else e + (u - 1.0) * length * fa
    share = min(max((u - 0.85) / 0.3, 0.0), 1.0)
    share = share * share * (3 - 2 * share)
    return point, unit((1 - share) * ua + share * fa)


def axis_frame(ax, sign):
    """Gives the two unit directions across the axis: out from the body, and forward."""
    out = np.array([sign, 0.0, 0.0])
    e1 = unit(out - ax * (out @ ax))
    e2 = np.cross(ax, e1)
    if e2[2] < 0:
        e2 = -e2
    return e1, e2


def arm_fits(pts, tris, free, path, sign, smooth, fit_from, roundness):
    """Measures the section of the source arm at each place along the arm: the points where the
    edges of the free arm cross the plane across the axis. The section is an ellipse with its
    axes out and forward: the forward axis spans the front and the back of the section, and the
    outer end touches the outermost point. Where the arm joins the trunk and the section has no
    inner side, the axis out is `roundness` times the forward axis. Gives the places, and for
    each place the middle (out, forward, from the axis point) and the two half axes."""
    edges = {tuple(sorted((int(t[i]), int(t[(i + 1) % 3])))) for t in tris if free[t].all()
             for i in range(3)}
    edges = np.array(sorted(edges))
    places = np.arange(0.0, 2.101, 0.05)
    rows = []
    for u in places:
        c, ax = arm_axis(u, path)
        e1, e2 = axis_frame(ax, sign)
        d = (pts - c) @ ax
        da, db = d[edges[:, 0]], d[edges[:, 1]]
        cross = edges[da * db < 0]
        t = (d[cross[:, 0]] / (d[cross[:, 0]] - d[cross[:, 1]]))[:, None]
        q = pts[cross[:, 0]] + t * (pts[cross[:, 1]] - pts[cross[:, 0]]) - c
        q = q[np.linalg.norm(q, axis=1) < 0.1]
        x, y = q @ e1, q @ e2
        if len(q) < 5:
            rows.append([np.nan] * 4)
            continue
        angle = np.degrees(np.arctan2(y, x)) % 360.0
        b = (y.max() - y.min()) / 2
        cy = (y.max() + y.min()) / 2
        if ((angle > 135) & (angle < 225)).any():
            a = (x.max() - x.min()) / 2
        else:
            a = roundness * b
        rows.append([x.max() - a, cy, a, b])
    rows = np.array(rows)
    good = ~np.isnan(rows[:, 0]) & (places >= fit_from)
    rows = np.array([np.interp(places, places[good], rows[good, i]) for i in range(4)]).T
    for _ in range(smooth):
        rows[1:-1] = (rows[:-2] + 2 * rows[1:-1] + rows[2:]) / 4
    return places, rows


def fill_hole(bm, loop, pts_of, sign, step, uv_source, mode):
    """Fills one hole of the trunk with a surface of least bending. `loop` holds the BMVerts of
    the rim in the order of the open edges. With `mode` `radial`, the bilaplacian smooths the
    distance from the middle of the trunk along the direction of each new vertex in the chart,
    so that the fill keeps the round bulge of the trunk. With `points`, it smooths the points,
    and the fill of a long hole sinks into the trunk. Gives the new faces."""
    rim = [pts_of(v) for v in loop]
    middle = np.array([0.0, float(np.mean([p[1] for p in rim])), -0.085])
    radius = float(np.mean([np.linalg.norm(p - middle) for p in rim]))

    def chart(p):
        r = p - middle
        return np.array([math.atan2(r[2], r[0] * sign) * radius,
                         math.atan2(r[1], math.hypot(r[0], r[2])) * radius])

    flat = [chart(p) for p in rim]
    n = len(flat)
    area = sum(flat[k][0] * flat[(k + 1) % n][1] - flat[(k + 1) % n][0] * flat[k][1]
               for k in range(n))
    lo, hi = np.min(flat, axis=0), np.max(flat, axis=0)
    inner = []
    for a in np.arange(lo[0] + step / 2, hi[0], step):
        for b in np.arange(lo[1] + step / 2, hi[1], step):
            q = np.array([a, b])
            if inside(q, flat) and gap_to(q, flat) > 0.6 * step:
                inner.append(q)
    coords = [Vector(p.tolist()) for p in flat] + [Vector(q.tolist()) for q in inner]
    out_verts, _, out_faces, orig_verts, _, _ = delaunay_2d_cdt(coords, [], [list(range(n))], 1,
                                                                1e-9)
    index = []
    for k, orig in enumerate(orig_verts):
        if not orig:
            raise RuntimeError(f'the fill adds a vertex at {out_verts[k]}')
        index.append(orig[0])
    faces = [[index[i] for i in f] for f in out_faces]
    # The rim runs against its kept faces, so a fill face runs each rim edge in the order of the
    # rim.
    first = next(f for f in faces if 0 in f and 1 in f)
    flip = first[(first.index(0) + 1) % 3] != 1
    new = {j: bm.verts.new(Vector((0.0, 0.0, 0.0))) for j in range(n, n + len(inner))}
    vert = {k: loop[k] for k in range(n)}
    vert.update(new)
    # The ring of the trunk around the rim stays fixed with the rim.
    outer = set()
    for v in loop:
        for e in v.link_edges:
            o = e.other_vert(v)
            if o not in loop:
                outer.add(o)
    made = []
    for f in faces:
        vs = [vert[i] for i in (f if not flip else reversed(f))]
        made.append(bm.faces.new(vs))
    unknown = [new[j] for j in sorted(new)]
    fixed = list(loop) + sorted(outer, key=lambda v: v.index)
    allv = unknown + fixed
    at = {v: i for i, v in enumerate(allv)}
    size = len(allv)
    lap = np.zeros((size, size))
    for v in unknown + list(loop):
        ns = [e.other_vert(v) for e in v.link_edges if e.other_vert(v) in at]
        i = at[v]
        lap[i, i] = 1.0
        for o in ns:
            lap[i, at[o]] -= 1.0 / len(ns)
    k = len(unknown)
    if mode == 'radial':
        known = np.array([[np.linalg.norm(pts_of(v) - middle)] for v in fixed])
    else:
        known = np.array([pts_of(v) for v in fixed])
    if k:
        big = lap[:k] @ lap
        x = np.linalg.solve(big[:, :k], -big[:, k:] @ known)
        for j, (v, p) in enumerate(zip(unknown, x)):
            if mode == 'radial':
                az, el = inner[j] / radius
                way = np.array([sign * math.cos(el) * math.cos(az), math.sin(el),
                                math.cos(el) * math.sin(az)])
                p = middle + p[0] * way
            v.co = to_blender(p)
    uv_source(made)
    return made, len(unknown)


def inside(q, poly):
    """Tells if a 2D point lies inside a polygon, by the crossing count."""
    hit = False
    n = len(poly)
    for k in range(n):
        a, b = poly[k], poly[(k + 1) % n]
        if (a[1] > q[1]) != (b[1] > q[1]):
            x = a[0] + (q[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
            if x > q[0]:
                hit = not hit
    return hit


def gap_to(q, poly):
    """Gives the distance of a 2D point from the edges of a polygon."""
    best = math.inf
    n = len(poly)
    for k in range(n):
        a, b = np.asarray(poly[k]), np.asarray(poly[(k + 1) % n])
        t = np.clip((q - a) @ (b - a) / max((b - a) @ (b - a), 1e-12), 0.0, 1.0)
        best = min(best, float(np.linalg.norm(q - (a + t * (b - a)))))
    return best



def light_part(faces, uv, share):
    """Gives the faces whose texture at the middle of their UVs is lighter than the share
    `share` of the faces."""
    image = TEXTURE['pixels']
    h, w = image.shape[:2]

    def light(f):
        mid = sum((loop[uv].uv for loop in f.loops), Vector((0.0, 0.0))) / 3
        x = min(max(int(mid.x * w), 0), w - 1)
        y = min(max(int(mid.y * h), 0), h - 1)
        return float(image[y, x].mean())

    values = np.array([light(f) for f in faces])
    limit = np.quantile(values, share)
    return [f for f, value in zip(faces, values) if value >= limit]


def remodel_side(bm, rig, config, side, sign, opts, source_tree):
    """Replaces the arm of one side with a round tube, and fills the trunk. Gives report lines."""
    uv = bm.loops.layers.uv.active
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    pts = np.array([to_rig(v.co) for v in bm.verts])
    tris = np.array([[v.index for v in f.verts] for f in bm.faces], np.int64)
    heads, ends, _, _ = rig['joints_of'](config)
    free = rig['free_arm'](pts, tris, config['weights'], heads, ends, sign)
    m = np.array([sign, 1.0, 1.0])
    s = np.asarray(heads['upper_arm_L']) * m
    e = np.asarray(heads['forearm_L']) * m
    w = np.asarray(heads['hand_L']) * m
    length = float(np.linalg.norm(e - s))
    fa = unit(w - e)
    plane = w + opts['wrist'] * fa
    lines = []

    # The paw: the faces of the free arm beyond the plane of the wrist.
    paw = [f for f in bm.faces if all(free[v.index] for v in f.verts)
           and all((pts[v.index] - plane) @ fa >= 0 for v in f.verts)]
    paw_set = set(paw)
    gone = [f for f in bm.faces if f not in paw_set and any(free[v.index] for v in f.verts)]
    arm_faces = [f for f in bm.faces if all(free[v.index] for v in f.verts) and f not in paw_set]
    # The texture is darker in the armpit, so the new faces take the UVs of the lighter faces.
    arm_faces = light_part(arm_faces, uv, opts['light'])
    arm_uvs = [[loop[uv].uv.copy() for loop in f.loops] for f in arm_faces]
    arm_mids = np.array([np.mean([pts[v.index] for v in f.verts], axis=0) for f in arm_faces])
    rim = pts[free]
    trunk_near = [f for f in bm.faces if f not in paw_set and not any(free[v.index] for v in f.verts)
                  and all(pts[v.index, 0] * sign > 0.05 for v in f.verts)
                  and np.min(np.linalg.norm(rim - np.mean([pts[v.index] for v in f.verts], axis=0),
                                            axis=1)) < opts['trunkReach']]
    trunk_near = light_part(trunk_near, uv, opts['light'])
    path = (s, e, w, length)
    fits = arm_fits(pts, tris, free, path, sign, opts['smooth'], opts['fitFrom'],
                    opts['roundness'])
    old_open = {frozenset(e2.verts) for e2 in bm.edges if e2.is_boundary}

    paw_loops = ordered_loop([(a, b) for a, b in boundary_edges(paw)])
    lines.append(f'side {side}: the paw keeps {len(paw)} faces with {len(paw_loops)} open loops of '
                 f'{[len(lp) for lp in paw_loops]} vertices; {len(gone)} faces go')
    bmesh.ops.delete(bm, geom=gone, context='FACES')
    bm.verts.ensure_lookup_table()

    # The holes of the trunk: the new open edges that are not edges of the paw.
    paw_verts = {v for f in paw for v in f.verts}
    hole_edges = []
    for e2 in bm.edges:
        if not e2.is_boundary or frozenset(e2.verts) in old_open:
            continue
        if all(v in paw_verts for v in e2.verts):
            continue
        f = e2.link_faces[0]
        vs = [loop.vert for loop in f.loops]
        i = vs.index(e2.verts[0])
        a, b = (e2.verts[0], e2.verts[1]) if vs[(i + 1) % 3] is e2.verts[1] else (
            e2.verts[1], e2.verts[0])
        hole_edges.append((b, a))
    holes = ordered_loop(hole_edges)
    trunk_near = [f for f in trunk_near if f.is_valid]
    trunk_uvs = [[loop[uv].uv.copy() for loop in f.loops] for f in trunk_near]
    trunk_mids = np.array([np.mean([to_rig(v.co) for v in f.verts], axis=0) for f in trunk_near])

    def trunk_uv(faces):
        for f in faces:
            mid = np.mean([to_rig(v.co) for v in f.verts], axis=0)
            k = int(np.argmin(np.linalg.norm(trunk_mids - mid, axis=1)))
            for loop, value in zip(f.loops, trunk_uvs[k]):
                loop[uv].uv = value

    for hole in holes:
        made, count = fill_hole(bm, hole, lambda v: to_rig(v.co), sign, opts['fillStep'], trunk_uv,
                                opts['fill'])
        lines.append(f'side {side}: a hole of the trunk of {len(hole)} rim vertices, from y '
                     f'{min(to_rig(v.co)[1] for v in hole):.3f} to '
                     f'{max(to_rig(v.co)[1] for v in hole):.3f}, takes {count} new vertices and '
                     f'{len(made)} faces')

    # The tube. The wrist ring is the loop of the paw toward the elbow.
    loops = [lp for lp in paw_loops]
    wrist_loop = min(loops, key=lambda lp: np.mean([(to_rig(v.co) - plane) @ fa for v in lp]))
    for other in loops:
        if other is not wrist_loop:
            raise RuntimeError(f'side {side}: the paw has a second open loop')
    places, rows = fits
    wrist_mid = np.mean([to_rig(v.co) for v in wrist_loop], axis=0)
    u_wrist = 1.0 + float((wrist_mid - e) @ fa) / length - opts['gap'] / length
    stations = []
    u = 0.0
    lo_e, hi_e = opts['elbow']
    while u < u_wrist - 1e-6:
        stations.append(u)
        u += opts['elbowStep'] if lo_e <= u < hi_e else opts['step']
    stations.append(u_wrist)

    def section(u):
        """Gives the middle, the two directions across the axis, and the two half axes at u."""
        c, ax = arm_axis(u, path)
        e1, e2 = axis_frame(ax, sign)
        cx, cy, a, b = (float(np.interp(u, places, rows[:, i])) for i in range(4))
        return ax, c + cx * e1 + cy * e2, e1, e2, a * opts['scale'], b * opts['scale']

    def center_at(u):
        return section(u)[1]

    sides = opts['sides']
    angles = [2 * math.pi * j / sides for j in range(sides)]
    rings = []
    for u in stations:
        _, c, e1, e2, a, b = section(u)
        rings.append([c + a * math.cos(q) * e1 + b * math.sin(q) * e2 for q in angles])
    # The dome above the shoulder joint.
    ax, c, e1, e2, a, b = section(0.0)
    height = opts['dome'] * (a + b) / 2
    dome = []
    for k in range(1, opts['domeRings'] + 1):
        phi = math.pi / 2 * k / (opts['domeRings'] + 1)
        dome.append([c - ax * height * math.sin(phi) + math.cos(phi)
                     * (a * math.cos(q) * e1 + b * math.sin(q) * e2) for q in angles])
    pole = c - ax * height
    rings = list(reversed(dome)) + rings
    ring_places = [-(k + 1) * 0.1 for k in reversed(range(len(dome)))] + stations

    # The upper arm and the dome stay inside the source surface, so that the silhouette of the
    # shoulder does not grow. With `clamp` `ring`, each ring shrinks around its middle by the
    # largest factor that puts each of its vertices inside, so that it stays an ellipse. With
    # `vertex`, each vertex outside moves in along the normal of the nearest source face.
    def depth_of(p):
        hit, normal, _, _ = source_tree.find_nearest(to_blender(p))
        return float((p - to_rig(hit)) @ np.array([normal.x, normal.z, -normal.y])), normal

    moved = 0
    factors = [1.0] * len(rings)
    for k, (ring, u) in enumerate(zip(rings, ring_places)):
        if u > opts['clampTo']:
            continue
        if opts['clamp'] == 'ring':
            mid = np.mean(ring, axis=0)
            if all(depth_of(p)[0] <= -opts['inside'] for p in ring):
                continue
            lo, hi = 0.3, 1.0
            for _ in range(14):
                f = (lo + hi) / 2
                if all(depth_of(mid + f * (p - mid))[0] <= -opts['inside'] for p in ring):
                    lo = f
                else:
                    hi = f
            factors[k] = lo
            moved += 1
            continue
        for j, p in enumerate(ring):
            depth, normal = depth_of(p)
            if depth > -opts['inside']:
                ring[j] = p - (depth + opts['inside']) * np.array([normal.x, normal.z, -normal.y])
                moved += 1
    # The factors change by at most `taper` for each upper arm length along the arm, so that
    # the tube narrows slowly toward the dome, with no step.
    factors = [min(fj + opts['taper'] * abs(uk - uj) for fj, uj in zip(factors, ring_places))
               for uk in ring_places]
    for k, ring in enumerate(rings):
        if factors[k] < 1.0:
            mid = np.mean(ring, axis=0)
            rings[k] = [mid + factors[k] * (p - mid) for p in ring]
    base = np.mean(rings[0], axis=0)
    lo, hi = 0.0, 1.0
    for _ in range(14):
        f = (lo + hi) / 2
        if depth_of(base + f * (pole - base))[0] <= -opts['inside']:
            lo = f
        else:
            hi = f
    pole = base + lo * (pole - base)
    verts = [[bm.verts.new(to_blender(p)) for p in ring] for ring in rings]
    top = bm.verts.new(to_blender(pole))
    faces = []
    for k in range(len(verts) - 1):
        a, b = verts[k], verts[k + 1]
        for j in range(sides):
            j2 = (j + 1) % sides
            faces.append([a[j], b[j], b[j2]])
            faces.append([a[j], b[j2], a[j2]])
    for j in range(sides):
        faces.append([top, verts[0][j], verts[0][(j + 1) % sides]])

    # The strip from the last ring to the loop of the paw, by the angle around the forearm.
    last = verts[-1]
    _, c, a1, a2, _, _ = section(stations[-1])

    def angle(p):
        r = p - c
        return math.atan2(r @ a2, r @ a1) % (2 * math.pi)

    paw_ring = list(wrist_loop)
    # The paw loop runs against the paw faces; the strip must run with them, so the loop order
    # sets the direction of the angle.
    ang = [angle(to_rig(v.co)) for v in paw_ring]
    start = int(np.argmin(ang))
    paw_ring = paw_ring[start:] + paw_ring[:start]
    ang = [angle(to_rig(v.co)) for v in paw_ring]
    rising = sum(((ang[(k + 1) % len(ang)] - ang[k] + math.pi) % (2 * math.pi) - math.pi)
                 for k in range(len(ang))) > 0
    if not rising:
        paw_ring = [paw_ring[0]] + paw_ring[1:][::-1]
        ang = [angle(to_rig(v.co)) for v in paw_ring]
    ring_ang = [angle(to_rig(v.co)) for v in last]
    j0 = int(np.argmin([(q - ang[0]) % (2 * math.pi) for q in ring_ang]))
    tube = [last[(j0 + k) % sides] for k in range(sides)]
    tube_ang = [(angle(to_rig(v.co)) - ang[0]) % (2 * math.pi) for v in tube]
    paw_ang = [(q - ang[0]) % (2 * math.pi) for q in ang]
    i = j = 0
    na, nb = len(tube), len(paw_ring)
    while i < na or j < nb:
        ta = tube_ang[i + 1] if i + 1 < na else 2 * math.pi + tube_ang[0]
        pb = paw_ang[j + 1] if j + 1 < nb else 2 * math.pi + paw_ang[0]
        if j >= nb or (i < na and ta <= pb):
            faces.append([tube[i % na], paw_ring[j % nb], tube[(i + 1) % na]])
            i += 1
        else:
            faces.append([tube[i % na], paw_ring[j % nb], paw_ring[(j + 1) % nb]])
            j += 1
    made = []
    for f in faces:
        made.append(bm.faces.new(f))
    bm.normal_update()
    # The winding: a tube face looks out from the spine.
    probe = made[len(made) // 2]
    mid = np.mean([to_rig(v.co) for v in probe.verts], axis=0)
    nrm = np.array([probe.normal.x, probe.normal.z, -probe.normal.y])
    if (mid - center_at(stations[len(stations) // 2])) @ nrm < 0:
        for f in made:
            f.normal_flip()
    # The strip runs with the paw: check a strip face against its paw edge.
    strip = made[-(na + nb):]
    for f in strip:
        vs = [loop.vert for loop in f.loops]
        for k in range(3):
            a, b = vs[k], vs[(k + 1) % 3]
            edge = bm.edges.get((a, b))
            if edge and len(edge.link_faces) == 2:
                other = next(g for g in edge.link_faces if g is not f)
                if other in paw_set:
                    ws = [loop.vert for loop in other.loops]
                    same = ws[(ws.index(a) + 1) % 3] is b
                    if same:
                        raise RuntimeError(f'side {side}: the strip runs against the paw')
    copy_uvs_from(made, arm_mids, arm_uvs, uv)
    lines.append(f'side {side}: the tube has {len(rings)} rings of {sides} vertices from the dome '
                 f'to u {u_wrist:.3f}, {len(made)} faces, {moved} rings or vertices moved inside the source, '
                 f'the half axes {section(0.0)[4]:.4f}, {section(0.0)[5]:.4f} / {section(1.0)[4]:.4f}, '
                 f'{section(1.0)[5]:.4f} / {section(u_wrist)[4]:.4f}, {section(u_wrist)[5]:.4f} u at '
                 f'the shoulder / elbow / wrist')
    return lines


def copy_uvs_from(faces, mids, uvs, uv):
    """Gives each new face the UVs of the nearest face of the source arm."""
    for f in faces:
        mid = np.mean([to_rig(loop.vert.co) for loop in f.loops], axis=0)
        k = int(np.argmin(np.linalg.norm(mids - mid, axis=1)))
        for loop, value in zip(f.loops, uvs[k]):
            loop[uv].uv = value


def run(config_path, source, out, opts=None):
    """Imports the source, gives both arms a tube, and exports the copy. Gives the report lines."""
    opts = {**OPTIONS, **(opts or {})}
    config = json.load(open(config_path))
    rig = rig_functions()
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=source)
    ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    mw = ob.matrix_world.copy()
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.transform(mw)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=config['weld'])
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    lines = [f'source: {len(bm.verts)} vertices, {len(bm.faces)} triangles']
    zs = [v.co.z for v in bm.verts]
    FRAME['floor'] = min(zs)
    FRAME['scale'] = 1.0 / (max(zs) - min(zs))
    tree = BVHTree.FromBMesh(bm)
    material = ob.material_slots[0].material
    bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    image = bsdf.inputs['Base Color'].links[0].from_node.image
    pixels = np.empty(image.size[0] * image.size[1] * 4, np.float32)
    image.pixels.foreach_get(pixels)
    TEXTURE['pixels'] = pixels.reshape(image.size[1], image.size[0], 4)[:, :, :3]
    for side, sign in (('L', 1.0), ('R', -1.0)):
        start = len(lines)
        lines += remodel_side(bm, rig, config, side, sign, opts, tree)
        print('\n'.join(lines[start:]), flush=True)
        bm.verts.index_update()
        bm.faces.index_update()
    lines.append(f'copy: {len(bm.verts)} vertices, {len(bm.faces)} triangles, '
                 f'{sum(1 for e in bm.edges if e.is_boundary)} open edges, '
                 f'{sum(1 for e in bm.edges if len(e.link_faces) > 2)} edges of three faces')
    bm.transform(mw.inverted())
    bm.to_mesh(ob.data)
    bm.free()
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True)
    return lines


if __name__ == '__main__' and '--' in sys.argv:
    argv = sys.argv[sys.argv.index('--') + 1:]
    print('\n'.join(run(argv[0], argv[1], argv[2],
                        opts=json.loads(argv[3]) if len(argv) > 3 else None)))
