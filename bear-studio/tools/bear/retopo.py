"""Makes the low-poly surface with aligned topology: quads that follow the forms, mirrored.

Steps (Blender and numpy):
1. A warp makes the head larger and the trunk smaller, so the uniform quads of QuadriFlow come
   out smaller on the head and larger on the trunk after the warp is undone. The sheet has
   facets of about 15 to 20 px on the head, 30 px on the arms, and 40 px on the belly.
2. QuadriFlow remeshes the dense field mesh into quads with mesh symmetry on. Its quads follow
   the forms: rings around the trunk and along the limbs.
3. The vertices go back through the inverse warp, onto the exact field surface, and into exact
   mirror pairs.
4. Each quad becomes two triangles. The diagonal runs down and in toward the center line on
   both halves, so the facets meet in a V on the chest and the belly.
5. The organic pass (organic.py) collapses some short edges and flips some edges, mirrored,
   so the triangles get varied sizes, shapes, and angles. A light relaxation along the surface
   evens out the worst shapes.
6. A small jitter, the same on both sides, gives the hand-made irregular look.
"""

import bmesh
import bpy
import numpy as np

import body
import mesh
import organic

# The organic pass (organic.py): the share of the half vertices that collapse, the share of the
# half edges that try a flip, and the amount of the relaxation.
COLLAPSE_SHARE = 0.3
FLIP_SHARE = 0.8
RELAX = 0.12

# The warps, applied in order: (center, radius, factor). A factor above 1 gives denser facets.
# Each warp is radial, r -> r * s(r) with s(r) = 1 + (factor - 1) * exp(-(r / radius)^2). It
# stays one to one while 1 + (factor - 1) * min(e^-u^2 (1 - 2 u^2)) > 0, that is, for factors
# from 0 to 3.2.
WARPS = [
    (np.array([0.0, 0.42, 0.02]), 0.24, 0.72),
    (np.array([0.0, 0.86, 0.12]), 0.16, 1.5),
    (np.array([0.0, 0.838, 0.21]), 0.1, 2.2),
    (np.array([0.142, 0.035, 0.07]), 0.07, 1.8),
    (np.array([-0.142, 0.035, 0.07]), 0.07, 1.8),
]


def joint_skin(points):
    """Marks the skin around the joints that bend far: the shoulders, the elbows, the wrists
    (bind pose), and the crotch. The organic pass leaves it alone."""
    p = np.asarray(points, float)
    joints, _ = body.arm_pose('bind')
    out = np.zeros(len(p), bool)
    for side in (1.0, -1.0):
        for name, radius in (('shoulder', 0.1), ('elbow', 0.085), ('wrist', 0.07)):
            c = joints[name] * np.array([side, 1.0, 1.0])
            out |= np.linalg.norm(p - c, axis=1) < radius
    out |= (np.abs(p[:, 0]) < 0.09) & (p[:, 1] < 0.21) & (p[:, 1] > 0.06)
    return out


def _paw_warps():
    """Adds a warp at each paw of the bind pose, so the round end of the paw keeps its form."""
    joints, _ = body.arm_pose('bind')
    center = 0.5 * (joints['wrist'] + joints['knuckle'])
    return [(center * np.array([s, 1.0, 1.0]), 0.07, 1.7) for s in (1.0, -1.0)]


WARPS += _paw_warps()


def _scale(r, radius, factor):
    """Calculates the radial scale of one warp at the distance r from its center."""
    return 1.0 + (factor - 1.0) * np.exp(-(r / radius) ** 2)


def _centers():
    """Moves each warp center through the warps before it, so each center stays on its form."""
    out = []
    for k, (center, _, _) in enumerate(WARPS):
        c = _squeeze(center[None])[0]
        for c0, r0, f0 in WARPS[:k]:
            d = c - c0
            c = c0 + d * _scale(np.linalg.norm(d), r0, f0)
        out.append(c)
    return out


# The trunk warp: near the trunk, x and z shrink by SQUEEZE, so the quads of the belly come out
# wider than tall, as the horizontal bands of the sheet. The weight is a Gaussian around the
# trunk axis (radii in x and z, and in y).
SQUEEZE = 0.78
SQUEEZE_CENTER = np.array([0.0, 0.43, 0.02])
SQUEEZE_RADII = np.array([0.32, 0.26, 0.32])


def _squeeze_weight(p):
    """Calculates the weight (0..1) of the trunk warp at points."""
    q = (p - SQUEEZE_CENTER) / SQUEEZE_RADII
    return np.exp(-np.sum(q * q, axis=-1))[..., None]


def _squeeze(p):
    """Shrinks x and z near the trunk."""
    d = p - SQUEEZE_CENTER
    shrink = np.array([SQUEEZE - 1.0, 0.0, SQUEEZE - 1.0])
    return p + _squeeze_weight(p) * d * shrink


def _unsqueeze(q):
    """Undoes the trunk warp with a fixed-point iteration."""
    shrink = np.array([SQUEEZE - 1.0, 0.0, SQUEEZE - 1.0])
    p = q.copy()
    for _ in range(60):
        p = q - _squeeze_weight(p) * (p - SQUEEZE_CENTER) * shrink
    return p


def warp(p):
    """Applies the warps to points (three.js axes)."""
    p = _squeeze(p)
    for center, (_, radius, factor) in zip(_centers(), WARPS):
        d = p - center
        r = np.linalg.norm(d, axis=-1, keepdims=True)
        p = center + d * _scale(r, radius, factor)
    return p


def unwarp(q):
    """Undoes the warps in reverse order: solves r * s(r) = r' with bisection."""
    for center, (_, radius, factor) in reversed(list(zip(_centers(), WARPS))):
        d = q - center
        rq = np.linalg.norm(d, axis=-1)
        lo = np.zeros_like(rq)
        hi = rq / min(factor, 1.0)
        for _ in range(60):
            mid = 0.5 * (lo + hi)
            f = mid * _scale(mid, radius, factor) - rq
            lo = np.where(f < 0, mid, lo)
            hi = np.where(f >= 0, mid, hi)
        r = 0.5 * (lo + hi)
        scale = np.where(rq > 1e-9, r / np.maximum(rq, 1e-12), 1.0)
        q = center + d * scale[:, None]
    return _unsqueeze(q)


# The vertices sit this far outside the field surface, so that the flat facets cut through
# the surface (half of each facet in, half out) and the silhouette keeps its size.
OFFSET = 0.004


def project(parts, p, steps=6, offset=OFFSET):
    """Moves points onto the surface field = offset with Newton steps along the gradient."""
    p = np.array(p, float)
    eps = 1e-3
    for _ in range(steps):
        f = body.field_at(parts, p) - offset
        g = np.stack([body.field_at(parts, p + eps * e) - body.field_at(parts, p - eps * e)
                      for e in np.eye(3)], axis=1) / (2 * eps)
        gg = np.maximum(np.sum(g * g, axis=1, keepdims=True), 1e-9)
        p = p - f[:, None] * g / gg
    return p


def read(obj):
    """Reads vertices (three.js axes) and polygons of a mesh object."""
    me = obj.data
    v = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get('co', v)
    polys = [list(p.vertices) for p in me.polygons]
    return mesh.from_blender(v.reshape(-1, 3)), polys


def mirror_pairs(v, tol):
    """Finds the mirror partner of each vertex (itself on the center line), or -1."""
    pairs = np.full(len(v), -1)
    order = np.argsort(v[:, 1])
    ys = v[order, 1]
    for i, p in enumerate(v):
        q = np.array([-p[0], p[1], p[2]])
        lo = np.searchsorted(ys, q[1] - tol)
        hi = np.searchsorted(ys, q[1] + tol)
        cand = order[lo:hi]
        if len(cand) == 0:
            continue
        d = np.linalg.norm(v[cand] - q, axis=1)
        k = int(np.argmin(d))
        if d[k] < tol:
            pairs[i] = cand[k]
    return pairs


def symmetrize(v, pairs):
    """Makes mirror pairs exact: each pair takes the mean of the two mirrored positions."""
    v = v.copy()
    for i, j in enumerate(pairs):
        if j < 0 or j < i:
            continue
        if j == i:
            v[i, 0] = 0.0
            continue
        m = 0.5 * (v[i] + np.array([-v[j, 0], v[j, 1], v[j, 2]]))
        v[i] = m
        v[j] = np.array([-m[0], m[1], m[2]])
    return v


def jitter(parts, v, pairs, amount, depth, local, seed=11):
    """Moves each vertex a little along the surface and in or out, the same on both sides.

    The move along the surface breaks the grid. The move in or out (depth) tilts neighbor
    facets in different ways, so each triangle reads on its own, as on the sheet. local scales
    both moves for each vertex: the mean length of its edges over the median edge length, so
    the small facets of the face move less.
    """
    rng = np.random.default_rng(seed)
    off = rng.normal(size=v.shape) * amount * local[:, None]
    dep = rng.uniform(-1.0, 1.0, size=len(v)) * depth * local
    for i, j in enumerate(pairs):
        if j < 0 or j < i:
            continue
        if j == i:
            off[i, 0] = 0.0
        else:
            off[j] = off[i] * np.array([-1.0, 1.0, 1.0])
            dep[j] = dep[i]
    moved = project(parts, v + off)
    eps = 1e-3
    g = np.stack([body.field_at(parts, moved + eps * e) - body.field_at(parts, moved - eps * e)
                  for e in np.eye(3)], axis=1)
    g /= np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-9)
    return symmetrize(moved + g * dep[:, None], pairs)


def chevron_triangles(v, polys):
    """Splits each quad on the diagonal that runs down and in toward x = 0.

    On the half x > 0 the wanted direction is (-1, -1) in (x, y); on the other half it is
    (+1, -1). Mirrored quads therefore get mirrored diagonals, and the halves meet in a V.
    """
    tris = []
    for poly in polys:
        if len(poly) == 3:
            tris.append(poly)
            continue
        if len(poly) != 4:
            for k in range(1, len(poly) - 1):
                tris.append([poly[0], poly[k], poly[k + 1]])
            continue
        a, b, c, d = poly
        cx = v[poly, 0].mean()
        want = np.array([-1.0 if cx > 1e-6 else 1.0, -1.0, 0.0])
        if abs(cx) <= 1e-6:
            want = np.array([0.0, -1.0, 0.0])
        want /= np.linalg.norm(want)

        def score(p, q):
            e = v[q] - v[p]
            n = np.linalg.norm(e)
            return abs(np.dot(e / max(n, 1e-9), want))

        if score(a, c) >= score(b, d):
            tris += [[a, b, c], [a, c, d]]
        else:
            tris += [[a, b, d], [b, c, d]]
    return np.array(tris, np.int64)


def remesh(parts, verts, quads, target_quads, seed=1, jitter_amount=0.005, jitter_depth=0.0):
    """Makes the aligned low-poly body from the dense field mesh. Returns the object."""
    # 1. Warp, so that the head gets more quads.
    obj = mesh.new_mesh_object('Dense', mesh.to_blender(warp(verts)), quads)
    mesh.decimate(obj, 60000)
    obj.data.validate()
    obj.data.use_mirror_x = True
    mesh.select_only(obj)
    result = set()
    for s in (seed, seed + 100, seed + 200):
        result = bpy.ops.object.quadriflow_remesh(
            use_mesh_symmetry=True, use_preserve_sharp=False, use_preserve_boundary=False,
            smooth_normals=False, mode='FACES', target_faces=target_quads, seed=s)
        if 'FINISHED' in result:
            break
    if 'FINISHED' not in result:
        raise RuntimeError('QuadriFlow failed')

    # 2. Join the two halves on the center line, unwarp, put on the surface, and make the
    # halves exact mirrors.
    me = obj.data
    lengths = [(me.vertices[e.vertices[0]].co - me.vertices[e.vertices[1]].co).length
               for e in me.edges]
    seam = 0.2 * float(np.median(lengths))
    bm = bmesh.new()
    bm.from_mesh(me)
    for vert in bm.verts:
        if abs(vert.co.x) < seam:
            vert.co.x = 0.0
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.75 * seam)
    bm.to_mesh(me)
    bm.free()
    me.update()
    v, polys = read(obj)
    v = project(parts, unwarp(v))
    edge = np.median([np.linalg.norm(v[p[0]] - v[p[1]]) for p in polys])
    pairs = mirror_pairs(v, tol=0.25 * edge)
    v = symmetrize(v, pairs)
    unpaired = int(np.sum(pairs < 0))
    n_quads = len(polys)
    bpy.data.objects.remove(obj, do_unlink=True)

    # 3. Triangles with mirrored diagonals, then organic sizes and shapes.
    tris = chevron_triangles(v, polys)

    def onto(p):
        p = np.asarray(p, float)
        return project(parts, p[None])[0] if p.ndim == 1 else project(parts, p)

    rng = np.random.default_rng(seed)
    v, tris, pairs, counts = organic.organize(v, tris, pairs, onto, rng, COLLAPSE_SHARE,
                                              FLIP_SHARE, joint_skin(v))
    v = organic.relax(v, tris, pairs, onto, RELAX, 2)

    # 4. A small mirrored jitter, smaller where the facets are small.
    if jitter_amount > 0 or jitter_depth > 0:
        sums = np.zeros(len(v))
        counts_v = np.zeros(len(v))
        for t in tris:
            for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                length = np.linalg.norm(v[a] - v[b])
                sums[[a, b]] += length
                counts_v[[a, b]] += 1
        edge_t = float(np.median(sums / np.maximum(counts_v, 1)))
        local = np.clip(sums / np.maximum(counts_v, 1) / edge_t, 0.3, 1.5)
        v = jitter(parts, v, pairs, jitter_amount, jitter_depth, local)

    out = mesh.new_mesh_object('Bear', mesh.to_blender(v), tris)
    out.data.validate()
    bm = bmesh.new()
    bm.from_mesh(out.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(out.data)
    bm.free()
    info = {'quads': n_quads, 'unpaired_vertices': unpaired,
            'quad_edge_px': round(float(edge) * 528, 1)}
    info.update(counts)
    return out, info


def triangle_quality(v, tris):
    """Measures the triangles: the share of slivers (smallest angle under 15 degrees)."""
    t = v[tris]
    angles = []
    for k in range(3):
        a = t[:, (k + 1) % 3] - t[:, k]
        b = t[:, (k + 2) % 3] - t[:, k]
        cos = np.sum(a * b, axis=1) / (np.linalg.norm(a, axis=1) * np.linalg.norm(b, axis=1))
        angles.append(np.degrees(np.arccos(np.clip(cos, -1, 1))))
    smallest = np.min(np.stack(angles, axis=1), axis=1)
    return float(np.mean(smallest < 15.0)), float(np.median(smallest))

