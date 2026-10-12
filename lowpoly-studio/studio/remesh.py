"""Makes the low-poly surface with aligned topology: quads that follow the forms, mirrored.

Steps (Blender and numpy):
1. Warps make some regions larger and the trunk smaller, so the uniform quads of QuadriFlow come
   out smaller there (the head, the snout, the paws) and larger on the trunk after the warps are
   undone (config facets.squeeze and facets.warps).
2. QuadriFlow remeshes the dense field mesh into quads with mesh symmetry on. Its quads follow
   the forms: rings around the trunk and along the limbs.
3. The vertices go back through the inverse warps, onto the field surface, and into exact mirror
   pairs. Each quad becomes two triangles: the diagonal runs down and in toward the center line
   on both halves, so the facets meet in a V on the chest and the belly.
   (stage "remesh" ends here)
4. The organic pass (organic.py) collapses some short edges and flips some edges, mirrored, so
   the triangles get varied sizes, shapes, and angles. A light relaxation evens out the worst
   shapes, and a small mirrored jitter gives the hand-made look.
5. Slivers flip or collapse, and faces that point into the body untangle.
6. The body object: Blender recalculates the face normals, and the field turns a mesh that
   points inward. (stage "organic" ends here)
"""

import bmesh
import bpy
import numpy as np

from studio import mesh, organic
from studio.field import field_at, field_gradient


def _scale(r, radius, factor):
    """Calculates the radial scale of one warp at the distance r from its center."""
    return 1.0 + (factor - 1.0) * np.exp(-(r / radius) ** 2)


class Warp:
    """The warps before the remesh: the trunk squeeze, then the radial warps in order.

    Each radial warp is r -> r * s(r) with s(r) = 1 + (factor - 1) * exp(-(r / radius)^2). It
    stays one to one for factors from 0 to 3.2.
    """

    def __init__(self, cfg, body):
        """Reads the squeeze and the warps of the config. A warp 'at' a named point takes the
        point from the body (for example the middle of the paw in the bind pose)."""
        sq = cfg.facets.squeeze
        self.squeeze = sq.factor
        self.squeeze_center = np.array(sq.center)
        self.squeeze_radii = np.array(sq.radii)
        self.warps = []
        for w in cfg.facets.warps:
            center = np.array(w.center) if w.center is not None else body.anchor(w.at)
            self.warps.append((center, w.radius, w.factor))
            if w.mirror:
                self.warps.append((center * np.array([-1.0, 1.0, 1.0]), w.radius, w.factor))

    def centers(self):
        """Moves each warp center through the warps before it, so each center stays on its
        form."""
        out = []
        for k, (center, _, _) in enumerate(self.warps):
            c = self._squeeze(center[None])[0]
            for c0, r0, f0 in self.warps[:k]:
                d = c - c0
                c = c0 + d * _scale(np.linalg.norm(d), r0, f0)
            out.append(c)
        return out

    def _squeeze_weight(self, p):
        """Calculates the weight (0..1) of the trunk warp at points."""
        q = (p - self.squeeze_center) / self.squeeze_radii
        return np.exp(-np.sum(q * q, axis=-1))[..., None]

    def _squeeze(self, p):
        """Shrinks x and z near the trunk."""
        d = p - self.squeeze_center
        shrink = np.array([self.squeeze - 1.0, 0.0, self.squeeze - 1.0])
        return p + self._squeeze_weight(p) * d * shrink

    def _unsqueeze(self, q):
        """Undoes the trunk warp with a fixed-point iteration."""
        shrink = np.array([self.squeeze - 1.0, 0.0, self.squeeze - 1.0])
        p = q.copy()
        for _ in range(60):
            p = q - self._squeeze_weight(p) * (p - self.squeeze_center) * shrink
        return p

    def apply(self, p):
        """Applies the warps to points (three.js axes)."""
        p = self._squeeze(p)
        for center, (_, radius, factor) in zip(self.centers(), self.warps):
            d = p - center
            r = np.linalg.norm(d, axis=-1, keepdims=True)
            p = center + d * _scale(r, radius, factor)
        return p

    def undo(self, q):
        """Undoes the warps in reverse order: solves r * s(r) = r' with bisection."""
        for center, (_, radius, factor) in reversed(list(zip(self.centers(), self.warps))):
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
        return self._unsqueeze(q)


def project(parts, p, offset, steps=6):
    """Moves points onto the surface field = offset with Newton steps along the gradient.

    The vertices sit a little outside the field surface (config facets.offset), so that the flat
    facets cut through the surface (half of each facet in, half out) and the silhouette keeps
    its size.
    """
    p = np.array(p, float)
    eps = 1e-3
    for _ in range(steps):
        f = field_at(parts, p) - offset
        g = field_gradient(parts, p, eps) / (2 * eps)
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


def jitter(parts, v, pairs, amount, depth, local, offset, seed):
    """Moves each vertex a little along the surface and in or out, the same on both sides.

    The move along the surface breaks the grid. The move in or out (depth) tilts neighbor facets
    in different ways. local scales both moves for each vertex: the mean length of its edges over
    the median edge length, so the small facets of the face move less.
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
    moved = project(parts, v + off, offset)
    eps = 1e-3
    g = field_gradient(parts, moved, eps)
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


def inward_faces(parts, v, tris, limit=-0.3):
    """Lists the faces whose normal points into the body (the field grows the other way)."""
    a, b, c = v[tris[:, 0]], v[tris[:, 1]], v[tris[:, 2]]
    n = np.cross(b - a, c - a)
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    centers = (a + b + c) / 3.0
    grad = field_gradient(parts, centers, 0.002)
    grad /= np.maximum(np.linalg.norm(grad, axis=1, keepdims=True), 1e-9)
    return np.nonzero(np.sum(n * grad, axis=1) < limit)[0]


def untangle(parts, v, tris, pairs, offset, rounds=5, amount=0.6):
    """Moves the corners of each face that points into the body toward the middle of their
    neighbors, on the surface, with the mirror kept.

    The snap onto the surface, the relaxation, and the jitter can turn a face inside out where
    the surface curves hard (the crown of a dome, the crotch, a groove under the head).
    Returns (verts, the inward faces before, the inward faces after).
    """
    v = np.array(v, float)
    nb = [set() for _ in range(len(v))]
    for a, b, c in tris:
        nb[a].update((b, c))
        nb[b].update((a, c))
        nb[c].update((a, b))
    before = len(inward_faces(parts, v, tris))
    for _ in range(rounds):
        bad = inward_faces(parts, v, tris)
        if len(bad) == 0:
            break
        idx = set(int(i) for i in np.unique(tris[bad]))
        idx |= {int(pairs[i]) for i in list(idx) if pairs[i] >= 0}
        idx = sorted(idx)
        mid = np.array([v[list(nb[i])].mean(axis=0) for i in idx])
        v[idx] = project(parts, v[idx] + amount * (mid - v[idx]), offset)
        v = symmetrize(v, pairs)
    after = len(inward_faces(parts, v, tris))
    return v, before, after


def quadriflow(cfg, warp, parts, verts, quads, seed, height_px):
    """Stage "remesh": the warped dense mesh -> QuadriFlow quads -> mirrored triangles.

    Returns (verts (n, 3), triangles (m, 3), mirror partner of each vertex, info).
    """
    c = cfg.facets
    offset = c.offset
    obj = mesh.new_mesh_object('Dense', mesh.to_blender(warp.apply(verts)), quads)
    mesh.decimate(obj, c.dense_faces)
    obj.data.validate()
    obj.data.use_mirror_x = True
    mesh.select_only(obj)
    result = set()
    for s in (seed, seed + 100, seed + 200):
        result = bpy.ops.object.quadriflow_remesh(
            use_mesh_symmetry=True, use_preserve_sharp=False, use_preserve_boundary=False,
            smooth_normals=False, mode='FACES', target_faces=c.quads, seed=s)
        if 'FINISHED' in result:
            break
    if 'FINISHED' not in result:
        raise RuntimeError('QuadriFlow failed')

    # Join the two halves on the center line, unwarp, put on the surface, and make the halves
    # exact mirrors.
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
    v = project(parts, warp.undo(v), offset)
    edge = np.median([np.linalg.norm(v[p[0]] - v[p[1]]) for p in polys])
    pairs = mirror_pairs(v, tol=0.25 * edge)
    v = symmetrize(v, pairs)
    unpaired = int(np.sum(pairs < 0))
    bpy.data.objects.remove(obj, do_unlink=True)
    tris = chevron_triangles(v, polys)
    info = {'quads': len(polys), 'unpaired_vertices': unpaired,
            'quad_edge_px': round(float(edge) * height_px, 1)}
    return v, tris, pairs, info


def organic_pass(cfg, body, parts, v, tris, pairs, seed):
    """Stage "organic": organic sizes and shapes, relax, jitter, no slivers, no inward faces.

    Returns (verts, triangles, mirror partners, counts).
    """
    c = cfg.facets
    offset = c.offset

    def onto(p):
        p = np.asarray(p, float)
        return project(parts, p[None], offset)[0] if p.ndim == 1 else project(parts, p, offset)

    rng = np.random.default_rng(seed)
    v, tris, pairs, counts = organic.organize(v, tris, pairs, onto, rng, c.collapse_share,
                                              c.flip_share, body.protect(v))
    v = organic.relax(v, tris, pairs, onto, c.relax, c.relax_rounds)

    # A small mirrored jitter, smaller where the facets are small.
    if c.jitter > 0:
        sums = np.zeros(len(v))
        counts_v = np.zeros(len(v))
        for t in tris:
            for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                length = np.linalg.norm(v[a] - v[b])
                sums[[a, b]] += length
                counts_v[[a, b]] += 1
        edge_t = float(np.median(sums / np.maximum(counts_v, 1)))
        local = np.clip(sums / np.maximum(counts_v, 1) / edge_t, 0.3, 1.5)
        v = jitter(parts, v, pairs, c.jitter, 0.0, local, offset, c.jitter_seed)

    # No slivers: they turn over at the first bend of a joint (organic.clean_slivers).
    v, tris, pairs, slivers_before, slivers_after = organic.clean_slivers(v, tris, pairs, onto)
    counts['slivers_cleaned'] = [slivers_before, slivers_after]

    # No face that points into the body (untangle).
    v, inward_before, inward_after = untangle(parts, v, tris, pairs, offset)
    counts['inward_faces'] = [inward_before, inward_after]
    return v, tris, pairs, counts


def body_object(name, parts, v, tris):
    """Creates the body mesh object with outward normals.

    recalc_face_normals can turn a whole mesh inward. The field says where outside is: when most
    faces point into the body, all of them turn over.
    """
    out = mesh.new_mesh_object(name, mesh.to_blender(v), tris)
    out.data.validate()
    bm = bmesh.new()
    bm.from_mesh(out.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.faces.ensure_lookup_table()
    centers = np.array([tuple(f.calc_center_median()) for f in bm.faces])
    normals = np.array([tuple(f.normal) for f in bm.faces])
    centers = mesh.from_blender(centers)
    normals = mesh.from_blender(normals)
    grad = field_gradient(parts, centers, 0.002)
    if np.mean(np.sum(grad * normals, axis=1) < 0) > 0.5:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(out.data)
    bm.free()
    return out


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
