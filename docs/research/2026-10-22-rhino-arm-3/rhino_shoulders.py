"""Gives each arm of a copy of the rhino mesh a round shoulder and a round tube, in Blender (batch).

The copy `rhino-tubes.glb` of `docs/research/2026-10-22-rhino-arm-2/rhino_tubes.py` gave each arm
a round tube up to a dome inside the shoulder. At full size from the stage, each tube left the
side of the chest at mid height with no shoulder, the rim of the trunk fill showed dark gashes,
and the fill showed patches of dark and light color (`docs/research/2026-10-22-rhino-arm-3.md`).
For each side, this script:

1. keeps the paw of the source: each face of the free arm (`free_arm()` of
   `tools/blender/rig_mesh.py`) beyond the plane across the forearm at the wrist joint;
2. removes each other face with a corner in the free arm, and each face of the trunk on its side
   within `region` of the shoulder joint, so that the arm leaves the trunk and the shoulder has
   room for a fine fill;
3. fills the hole of the trunk with a grid in a chart around the trunk (`fill_hole()`), then
   fairs the fill, its rim, and `fairRings` rings of the trunk around the rim together
   (`fair_trunk()`), so that the lips of the notches of the source arm do not stay as grooves;
4. moves the fill out onto the smooth union of the faired trunk and a round cone from the ball
   of the shoulder, `inset` units smaller, down to the side of the trunk (`ball_union()`), so
   that the shoulder blends into the trunk and the back, and the trunk slopes from the shoulder
   to its side where the arm swings away;
5. builds the arm from a ball at the shoulder joint down to the paw: the cap of the ball, then
   rings that take the smooth max (`ballBlend`) of the ball and of the section of the source
   arm, then the rings of the tube. A turn of the upper arm turns the ball around its middle,
   so the ball stays in its place in each pose, and the trunk around it does not open;
6. gives the new faces smooth colors: the fill and the faired faces take the harmonic mean of
   the colors of the trunk around them (`harmonic_colors()`), and the arm takes the colors of
   the nearest source faces, smoothed along the arm (`arm_colors()`). Each face takes its color
   with one fur texel of that color for its three UVs (`paint()`), because the rig gives each
   face the mean of its texture samples.

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
#: - `sides`: the vertices of each ring of the arm.
#: - `step`, `elbowStep`, `elbow`, `ballStep`: the gap of the rings along the arm (upper arm
#:   lengths), the smaller gap between the places of `elbow`, and the gap in the ball.
#: - `wrist`: the place of the plane of the paw along the forearm from the wrist joint (units,
#:   toward the paw is positive).
#: - `gap`: the gap of the last ring from the middle of the loop of the paw (units).
#: - `smooth`: the rounds of the moving mean of the sections along the arm, and `fitFrom`: the
#:   first place of a section (upper arm lengths). Each place above it takes its section.
#: - `roundness`: the half axis out over the half axis forward, where the arm joins the trunk.
#: - `ball`: the radius of the ball at the shoulder joint (units), `capRings`: the rings of its
#:   cap above the joint, and `ballBlend`: the width of the smooth max of the ball and the tube.
#: - `fillStep`: the gap of the new vertices of the fill of the trunk (units), and `fairRings`:
#:   the rings of the trunk around the rim of the fill that the fair moves, and `fairInner`: the
#:   least distance of a vertex of these rings from the middle plane (units), so that the fair
#:   does not move the back of the neck between the clavicles.
#: - `region`: the distance from the shoulder joint within which the faces of the trunk go and
#:   the fill replaces them (units), and `regionTop`: the height above which no face goes and no
#:   vertex moves, below the head line of the rig.
#: - `axisHeights`: the lowest and the highest height of the point on the axis of the trunk from
#:   which the fair and the union measure the distance of a vertex: the point at the height of
#:   the vertex, inside these heights.
#: - `fillet`: the width of the smooth union of the trunk and the shoulder shape (units),
#:   `inset`: the depth of the trunk inside the ball, and `slope`: the place of the low end of
#:   the shoulder shape from the shoulder joint (units, left side) and its radius.
#: - `armSmooth`: the rounds of the smoothing of the colors along the arm.
OPTIONS = {
    'sides': 16,
    'step': 0.15,
    'elbowStep': 0.07,
    'elbow': [0.75, 1.25],
    'ballStep': 0.07,
    'wrist': 0.0,
    'gap': 0.012,
    'smooth': 2,
    'fitFrom': 0.3,
    'roundness': 0.85,
    'ball': 0.08,
    'capRings': 5,
    'ballBlend': 0.02,
    'fillStep': 0.022,
    'fairRings': 2,
    'region': 0.16,
    'regionTop': 0.665,
    'axisHeights': [0.3, 0.55],
    'fairInner': 0.06,
    'fillet': 0.05,
    'inset': 0.006,
    'slope': [-0.02, -0.14, -0.02, 0.05],
    'armSmooth': 20,
}

#: The map from rig units to Blender coordinates of the current mesh, set by `run()`.
FRAME = {}

#: The base color texture of the mesh, the color rules, and the texels of the fur, set by `run()`.
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


def rig_normal(n):
    """Gives a Blender direction in the axes of the rig."""
    return np.array([n.x, n.z, -n.y])


def unit(v):
    """Gives a vector of length 1."""
    return v / np.linalg.norm(v)


def smoothstep(x, low, high):
    """Gives 0 below `low`, 1 above `high`, and a smooth step between them."""
    t = min(max((x - low) / (high - low), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def smooth_max(a, b, k):
    """Gives the larger of two values, with a round step of width `k` where they are near."""
    h = max(k - abs(a - b), 0.0) / k
    return max(a, b) + h * h * k / 4


def smooth_min(a, b, k):
    """Gives the smaller of two values, with a round step of width `k` where they are near."""
    h = max(k - abs(a - b), 0.0) / k
    return min(a, b) - h * h * k / 4


def ordered_loop(edges):
    """Orders directed edges (a, b) into loops. Gives the loops of vertices, or raises an error
    when a vertex has two edges out."""
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


def trunk_middle(rim):
    """Gives the point on the axis of the trunk from which the fill measures its distances."""
    return np.array([0.0, float(np.mean([to_rig(v.co)[1] for v in rim])), -0.085])


def fill_hole(bm, loop, sign, step):
    """Fills one hole of the trunk with a surface of least bending. `loop` holds the BMVerts of
    the rim in the order of the open edges. The bilaplacian smooths the distance from the middle
    of the trunk along the direction of each new vertex in a chart around the trunk, so that the
    fill keeps the round bulge of the trunk. Gives the new faces and the new vertices."""
    rim = [to_rig(v.co) for v in loop]
    middle = trunk_middle(loop)
    radius = float(np.mean([np.linalg.norm(p - middle) for p in rim]))

    def chart(p):
        r = p - middle
        return np.array([math.atan2(r[2], r[0] * sign) * radius,
                         math.atan2(r[1], math.hypot(r[0], r[2])) * radius])

    flat = [chart(p) for p in rim]
    n = len(flat)
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
    new = {}
    for j in range(n, n + len(inner)):
        az, el = inner[j - n] / radius
        way = np.array([sign * math.cos(el) * math.cos(az), math.sin(el),
                        math.cos(el) * math.sin(az)])
        new[j] = bm.verts.new(to_blender(middle + radius * way))
    vert = {k: loop[k] for k in range(n)}
    vert.update(new)
    made = []
    for f in faces:
        vs = [vert[i] for i in (f if not flip else reversed(f))]
        made.append(bm.faces.new(vs))
    bm.verts.index_update()
    return made, [new[j] for j in sorted(new)]


def neighbors_of(v):
    """Gives the neighbors of a BMVert, in the order of their indices."""
    return sorted((e.other_vert(v) for e in v.link_edges), key=lambda o: o.index)


def fair_trunk(moving, middle):
    """Moves the vertices `moving` (BMVerts of the trunk) so that the bilaplacian of their
    distance from `middle` is zero, with two rings of neighbors fixed. Each vertex moves along its
    direction from `middle`."""
    moving = sorted(moving, key=lambda v: v.index)
    inside_set = set(moving)
    ring1 = sorted({o for v in moving for o in neighbors_of(v) if o not in inside_set},
                   key=lambda v: v.index)
    ring1_set = set(ring1)
    ring2 = sorted({o for v in ring1 for o in neighbors_of(v)
                    if o not in inside_set and o not in ring1_set}, key=lambda v: v.index)
    allv = moving + ring1 + ring2
    at = {v: i for i, v in enumerate(allv)}
    size = len(allv)
    lap = np.zeros((size, size))
    for v in moving + ring1:
        ns = [o for o in neighbors_of(v) if o in at]
        i = at[v]
        lap[i, i] = 1.0
        for o in ns:
            lap[i, at[o]] -= 1.0 / len(ns)
    k = len(moving)
    pts = np.array([to_rig(v.co) for v in allv])
    rel = pts - np.array([middle(p) for p in pts])
    dist = np.linalg.norm(rel, axis=1)
    ways = rel / dist[:, None]
    big = lap[:k] @ lap
    x = np.linalg.solve(big[:, :k], -big[:, k:] @ dist[k:])
    for j, v in enumerate(moving):
        v.co = to_blender(middle(pts[j]) + x[j] * ways[j])
    return float(np.abs(x - dist[:k]).max())


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


def round_cone(q, a, b, ra, rb):
    """Gives the signed distance of a point from a round cone: the hull of the ball of radius `ra`
    around `a` and the ball of radius `rb` around `b` (Inigo Quilez, the distance functions)."""
    ba = b - a
    l2 = float(ba @ ba)
    rr = ra - rb
    a2 = l2 - rr * rr
    pa = q - a
    y = float(pa @ ba)
    z = y - l2
    w = pa * l2 - ba * y
    x2 = float(w @ w)
    y2 = y * y * l2
    z2 = z * z * l2
    k = math.copysign(1.0, rr) * rr * rr * x2
    if math.copysign(1.0, z) * a2 * z2 > k:
        return math.sqrt(x2 + z2) / l2 - rb
    if math.copysign(1.0, y) * a2 * y2 < k:
        return math.sqrt(x2 + y2) / l2 - ra
    return (math.sqrt(x2 * a2 / l2) + y * rr) / l2 - ra


def ball_union(verts, middle, center, sign, opts):
    """Moves each new vertex of the fill out along its direction from `middle` onto the smooth
    union (`fillet`) of the faired trunk and the shoulder shape: a round cone from the ball,
    made `inset` units smaller, down to the ball `slope` below the shoulder joint, so that the
    trunk falls in a smooth slope from the ball to the side of the trunk when the arm swings
    away. The distance from the trunk along the direction is the distance of the faired trunk.
    Gives the count of the moved vertices and the largest move (units)."""
    radius = opts['ball'] - opts['inset']
    low = center + np.array([sign, 1.0, 1.0]) * np.asarray(opts['slope'][:3])
    k = opts['fillet']
    count, most = 0, 0.0
    for v in verts:
        p = to_rig(v.co)
        m = middle(p)
        r = float(np.linalg.norm(p - m))
        way = (p - m) / r

        def union(t):
            return smooth_min(t - r, round_cone(m + t * way, center, low, radius,
                                                opts['slope'][3]), k)

        t, step, top = r, 0.001, r + 2 * opts['ball'] + k
        while union(t) < 0 and t < top:
            t += step
        if t >= top or t == r:
            continue
        lo, hi = t - step, t
        for _ in range(30):
            mid = (lo + hi) / 2
            if union(mid) < 0:
                lo = mid
            else:
                hi = mid
        v.co = to_blender(m + hi * way)
        count += 1
        most = max(most, hi - r)
    return count, most


def face_color(f, uv):
    """Gives the sRGB color that the rig gives a face: the mean of its texture samples that are
    not dark (`face_colors()` of `tools/blender/rig_mesh.py`)."""
    rig, rules, texture = TEXTURE['rig'], TEXTURE['rules'], TEXTURE['pixels']
    corners = np.array([loop[uv].uv[:] for loop in f.loops])
    samples = rig['face_samples'](corners, rig['sample_grid'](rules['samples']), texture)
    low = rig['luminance'](samples) < rules['dark']
    return samples[~low].mean(axis=0) if (~low).any() else samples.mean(axis=0)


def fur_texels(bm, uv):
    """Gives the texels of the fur: the texture samples of each source face that are not dark and
    whose 3 x 3 texels have one color, with their Oklab colors."""
    rig, rules, texture = TEXTURE['rig'], TEXTURE['rules'], TEXTURE['pixels']
    height, width, _ = texture.shape
    grid = rig['sample_grid'](rules['samples'])
    spots = set()
    for f in bm.faces:
        corners = np.array([loop[uv].uv[:] for loop in f.loops])
        at = grid @ corners
        xs = np.clip(((at[:, 0] % 1.0) * width).astype(int), 1, width - 2)
        ys = np.clip(((at[:, 1] % 1.0) * height).astype(int), 1, height - 2)
        spots.update(zip(xs.tolist(), ys.tolist()))
    spots = np.array(sorted(spots))
    xs, ys = spots[:, 0], spots[:, 1]
    block = np.stack([texture[ys + dy, xs + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
    even = block.std(axis=0).max(axis=1) < 0.01
    colors = texture[ys, xs]
    light = rig['luminance'](colors) >= rules['dark']
    keep = even & light
    TEXTURE['spots'] = spots[keep]
    TEXTURE['lab'] = rig['oklab'](colors[keep])
    return int(keep.sum())


def paint(faces, colors, uv):
    """Gives each face the UVs of the one fur texel nearest to its color in Oklab."""
    lab = TEXTURE['rig']['oklab'](np.asarray(colors))
    height, width, _ = TEXTURE['pixels'].shape
    worst = 0.0
    for f, target in zip(faces, lab):
        gaps = np.linalg.norm(TEXTURE['lab'] - target, axis=1)
        k = int(np.argmin(gaps))
        worst = max(worst, float(gaps[k]))
        x, y = TEXTURE['spots'][k]
        for loop in f.loops:
            loop[uv].uv = ((x + 0.5) / width, (y + 0.5) / height)
    return worst


def harmonic_colors(faces, uv):
    """Gives the faces of a region smooth colors: each vertex of the region that touches a face
    outside it takes the mean color of those faces, and the colors of the other vertices make
    the Laplacian zero. Each face takes the mean of its corners. Gives the colors of the faces."""
    region = set(faces)
    verts = sorted({v for f in faces for v in f.verts}, key=lambda v: v.index)
    fixed, free = {}, []
    for v in verts:
        out = [g for g in v.link_faces if g not in region]
        if out:
            fixed[v] = np.mean([face_color(g, uv) for g in sorted(out, key=lambda g: g.index)],
                               axis=0)
        else:
            free.append(v)
    at = {v: i for i, v in enumerate(free)}
    a = np.zeros((len(free), len(free)))
    rhs = np.zeros((len(free), 3))
    for v in free:
        i = at[v]
        ns = neighbors_of(v)
        a[i, i] = len(ns)
        for o in ns:
            if o in at:
                a[i, at[o]] -= 1.0
            elif o in fixed:
                rhs[i] += fixed[o]
            else:
                raise RuntimeError('a vertex of the region has a neighbor outside it')
    solved = np.linalg.solve(a, rhs) if free else np.zeros((0, 3))
    color = dict(fixed)
    color.update({v: solved[at[v]] for v in free})
    return [np.mean([color[v] for v in f.verts], axis=0) for f in faces]


def arm_colors(faces, fixed_faces, source_tree, source_colors, rounds, uv):
    """Gives the faces of the new arm the colors of the nearest source faces, smoothed `rounds`
    times along the arm. The vertices of the paw loop keep the mean color of their paw faces.
    Gives the colors of the faces."""
    fixed_set = set(fixed_faces)
    verts = sorted({v for f in faces for v in f.verts}, key=lambda v: v.index)
    color, pinned = {}, set()
    for v in verts:
        paw = [g for g in v.link_faces if g in fixed_set]
        if paw:
            color[v] = np.mean([face_color(g, uv) for g in sorted(paw, key=lambda g: g.index)],
                               axis=0)
            pinned.add(v)
        else:
            _, _, index, _ = source_tree.find_nearest(v.co)
            color[v] = source_colors[index]
    for _ in range(rounds):
        nxt = {}
        for v in verts:
            if v in pinned:
                nxt[v] = color[v]
                continue
            ns = [o for o in neighbors_of(v) if o in color]
            nxt[v] = 0.5 * color[v] + 0.5 * np.mean([color[o] for o in ns], axis=0)
        color = nxt
    return [np.mean([color[v] for v in f.verts], axis=0) for f in faces]


def remodel_side(bm, rig, config, side, sign, opts, source_tree, source_colors):
    """Replaces the arm of one side with a ball and a round tube, and fills the trunk. Gives
    report lines."""
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
    # The shoulder: each face of the trunk on this side with its middle within `region` of the
    # shoulder joint and below `regionTop` goes too, so that the fill can give the trunk a fine
    # fillet around the ball. A vertex of the rim with more than two open edges takes its faces
    # into the region, so that the hole is one loop.
    region = {f for f in bm.faces if f not in paw_set and f not in set(gone)
              and all(pts[v.index, 0] * sign > 0.02 for v in f.verts)
              and max(pts[v.index, 1] for v in f.verts) < opts['regionTop']
              and np.linalg.norm(np.mean([pts[v.index] for v in f.verts], axis=0) - s)
              < opts['region']}
    old_open = {frozenset(e2.verts) for e2 in bm.edges if e2.is_boundary}
    while True:
        cut = set(gone) | region
        count = {}
        for f in cut:
            for e2 in f.edges:
                if frozenset(e2.verts) in old_open:
                    continue
                inner = sum(1 for g in e2.link_faces if g in cut)
                if inner == 1 and not all(v in {w for g in paw for w in g.verts}
                                          for v in e2.verts):
                    for v in e2.verts:
                        count[v] = count.get(v, 0) + 1
        pinched = sorted((v for v, n in count.items() if n > 2), key=lambda v: v.index)
        if not pinched:
            break
        for v in pinched:
            region |= {g for g in v.link_faces if g not in paw_set and g not in cut}
    region = sorted(region, key=lambda f: f.index)
    gone = gone + region
    path = (s, e, w, length)
    fits = arm_fits(pts, tris, free, path, sign, opts['smooth'], opts['fitFrom'],
                    opts['roundness'])

    paw_loops = ordered_loop([(a, b) for a, b in boundary_edges(paw)])
    lines.append(f'side {side}: the paw keeps {len(paw)} faces with {len(paw_loops)} open loops of '
                 f'{[len(lp) for lp in paw_loops]} vertices; {len(gone)} faces go')
    bmesh.ops.delete(bm, geom=gone, context='FACES')
    bm.verts.ensure_lookup_table()

    # The holes of the trunk: the new open edges that are not edges of the paw.
    paw_verts = {v for f in paw for v in f.verts}
    hole_edges = []
    for e2 in sorted(bm.edges, key=lambda x: x.index):
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
    fill_faces = []
    fair_faces = set()
    for hole in holes:
        made, new = fill_hole(bm, hole, sign, opts['fillStep'])
        fill_faces += made
        # The fill, its rim, and the rings of the trunk around the rim move together.
        moving = set(new) | set(hole)
        ring = set(hole)
        for _ in range(opts['fairRings']):
            ring = {o for v in ring for o in neighbors_of(v)
                    if o not in moving and o not in paw_verts
                    and to_rig(o.co)[1] < opts['regionTop']
                    and to_rig(o.co)[0] * sign > opts['fairInner']}
            moving |= ring
        low, high = opts['axisHeights']

        def middle(p):
            return np.array([0.0, min(max(p[1], low), high), -0.085])

        moved = fair_trunk(moving, middle)
        lifted = ball_union(new, middle, s, sign, opts)
        fair_faces |= {g for v in moving for g in v.link_faces}
        lines.append(f'side {side}: a hole of the trunk of {len(hole)} rim vertices, from y '
                     f'{min(to_rig(v.co)[1] for v in hole):.3f} to '
                     f'{max(to_rig(v.co)[1] for v in hole):.3f}, takes {len(new)} new vertices '
                     f'and {len(made)} faces; the fair moves {len(moving)} vertices, at most '
                     f'{moved:.4f} u; the union with the ball moves {lifted[0]} vertices, at '
                     f'most {lifted[1]:.4f} u')

    # The arm. The wrist ring is the loop of the paw toward the elbow.
    if len(paw_loops) != 1:
        raise RuntimeError(f'side {side}: the paw has {len(paw_loops)} open loops')
    wrist_loop = paw_loops[0]
    places, rows = fits
    wrist_mid = np.mean([to_rig(v.co) for v in wrist_loop], axis=0)
    u_wrist = 1.0 + float((wrist_mid - e) @ fa) / length - opts['gap'] / length
    radius = opts['ball']
    ball_end = radius / length + opts['ballBlend'] / length
    stations = []
    u = 0.0
    lo_e, hi_e = opts['elbow']
    while u < u_wrist - 1e-6:
        stations.append(u)
        if u < ball_end:
            u += opts['ballStep']
        elif lo_e <= u < hi_e:
            u += opts['elbowStep']
        else:
            u += opts['step']
    stations.append(u_wrist)

    def section(u):
        """Gives the axis, the middle, the two directions across the axis, and the two half axes
        of the ring at u: the section of the source arm, with the ball blended in."""
        point, ax = arm_axis(u, path)
        e1, e2 = axis_frame(ax, sign)
        cx, cy, a, b = (float(np.interp(u, places, rows[:, i])) for i in range(4))
        d = float((point - s) @ unit(e - s))
        ball = math.sqrt(max(radius * radius - d * d, 0.0))
        share = smoothstep(ball - max(a, b), -opts['ballBlend'], opts['ballBlend'])
        middle = point + (1.0 - share) * (cx * e1 + cy * e2)
        return (ax, middle, e1, e2, smooth_max(a, ball, opts['ballBlend']),
                smooth_max(b, ball, opts['ballBlend']))

    sides = opts['sides']
    angles = [2 * math.pi * j / sides for j in range(sides)]
    rings = []
    for u in stations:
        _, c, e1, e2, a, b = section(u)
        rings.append([c + a * math.cos(q) * e1 + b * math.sin(q) * e2 for q in angles])
    # The cap of the ball above the shoulder joint.
    ax0, _, e1, e2, a0, b0 = section(0.0)
    cap = []
    for k in range(1, opts['capRings'] + 1):
        phi = math.pi / 2 * k / (opts['capRings'] + 1)
        cap.append([s - ax0 * radius * math.sin(phi) + math.cos(phi)
                    * (a0 * math.cos(q) * e1 + b0 * math.sin(q) * e2) for q in angles])
    pole = s - ax0 * radius
    rings = list(reversed(cap)) + rings
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
    # The winding: a tube face looks out from the axis.
    probe = made[len(made) // 2]
    mid = np.mean([to_rig(v.co) for v in probe.verts], axis=0)
    if (mid - section(stations[len(stations) // 2])[1]) @ rig_normal(probe.normal) < 0:
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
                    if ws[(ws.index(a) + 1) % 3] is b:
                        raise RuntimeError(f'side {side}: the strip runs against the paw')
    bm.verts.index_update()
    bm.faces.index_update()

    # The colors.
    trunk_faces = sorted(set(fill_faces) | {f for f in fair_faces if f.is_valid},
                         key=lambda f: f.index)
    worst_trunk = paint(trunk_faces, harmonic_colors(trunk_faces, uv), uv)
    worst_arm = paint(made, arm_colors(made, paw, source_tree, source_colors, opts['armSmooth'],
                                       uv), uv)
    depth, _ = depth_of(pole, source_tree)
    lines.append(f'side {side}: the arm has {len(rings)} rings of {sides} vertices from the ball '
                 f'to u {u_wrist:.3f}, {len(made)} faces, the ball of radius {radius:.4f} u with '
                 f'its top {depth * 100:+.2f} cm (units / 100) from the source surface, the half '
                 f'axes {section(1.0)[4]:.4f}, {section(1.0)[5]:.4f} / '
                 f'{section(u_wrist)[4]:.4f}, {section(u_wrist)[5]:.4f} u at the elbow / wrist')
    lines.append(f'side {side}: {len(trunk_faces)} faces of the trunk and {len(made)} faces of '
                 f'the arm take smooth colors, with the largest Oklab gap {worst_trunk:.4f} and '
                 f'{worst_arm:.4f} from their texel')
    return lines


def depth_of(p, source_tree):
    """Gives the signed distance of a point (rig units) from the source surface, out positive,
    and the normal of the nearest source face."""
    hit, normal, _, _ = source_tree.find_nearest(to_blender(p))
    return float((p - to_rig(hit)) @ rig_normal(normal)), normal


def run(config_path, source, out, opts=None):
    """Imports the source, gives both arms a ball and a tube, and exports the copy. Gives the
    report lines."""
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
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    bm.verts.index_update()
    bm.faces.index_update()
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
    TEXTURE['rig'] = rig
    TEXTURE['rules'] = config['colors']
    uv = bm.loops.layers.uv.active
    source_colors = np.array([face_color(f, uv) for f in bm.faces])
    lines.append(f'texture: {image.size[0]} x {image.size[1]}, {fur_texels(bm, uv)} even fur '
                 f'texels')
    for side, sign in (('L', 1.0), ('R', -1.0)):
        start = len(lines)
        lines += remodel_side(bm, rig, config, side, sign, opts, tree, source_colors)
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
