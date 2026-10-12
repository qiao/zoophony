"""Makes the remeshed triangles organic: varied sizes, varied shapes, and edges at many angles.

numpy only. The input is a mirrored triangle mesh (three.js axes): the vertices, the triangles,
and the mirror partner of each vertex (itself on the center line). Each operation acts on an
edge of the half x > 0 and on its mirror edge in the same way, so the halves stay mirrors:

- collapse: two vertices of a short edge merge at the middle of the edge (larger facets there),
- flip: the shared edge of two triangles turns to the other diagonal of their quad (other
  angles and shapes),
- relax: each vertex moves a little toward the middle of its neighbors along the surface.

An operation is refused when a new triangle gets an angle under the limit, when a triangle
turns over, or when the mesh would lose its simple surface shape (the link condition).
"""

import numpy as np


def _key(a, b):
    """Makes the key of an edge."""
    return (a, b) if a < b else (b, a)


def _normal(p0, p1, p2):
    """Calculates the unit normal of a triangle."""
    n = np.cross(p1 - p0, p2 - p0)
    length = np.linalg.norm(n)
    return n / length if length > 1e-15 else n


def _min_angle(p0, p1, p2):
    """Calculates the smallest angle of a triangle in degrees."""
    best = 180.0
    for a, b, c in ((p0, p1, p2), (p1, p2, p0), (p2, p0, p1)):
        u, v = b - a, c - a
        nu, nv = np.linalg.norm(u), np.linalg.norm(v)
        if nu < 1e-12 or nv < 1e-12:
            return 0.0
        cos = np.clip(np.dot(u, v) / (nu * nv), -1.0, 1.0)
        best = min(best, float(np.degrees(np.arccos(cos))))
    return best


class Mesh:
    """A mirrored triangle mesh that can collapse and flip edges."""

    def __init__(self, verts, tris, mirror):
        """Stores the mesh and builds the edge map."""
        self.v = np.array(verts, float)
        self.f = [list(t) for t in tris]
        self.alive = [True] * len(self.f)
        self.m = np.array(mirror, int)
        self.rebuild()

    def rebuild(self):
        """Builds the map from each edge to its faces, and the faces of each vertex."""
        self.edges = {}
        self.vfaces = [set() for _ in range(len(self.v))]
        for i, t in enumerate(self.f):
            if not self.alive[i]:
                continue
            for k in range(3):
                self.edges.setdefault(_key(t[k], t[(k + 1) % 3]), []).append(i)
                self.vfaces[t[k]].add(i)

    def neighbors(self, a):
        """Lists the vertices that share an edge with a."""
        out = set()
        for i in self.vfaces[a]:
            out.update(self.f[i])
        out.discard(a)
        return out

    def _side(self, a):
        """Tells if a vertex is on the half x > 0 (and not on the center line)."""
        return self.m[a] != a and self.v[a][0] > 1e-9

    def _quad(self, a, b):
        """Finds the two faces of the edge a-b in the order (a, b, c) and (b, a, d)."""
        faces = self.edges.get(_key(a, b), [])
        if len(faces) != 2:
            return None
        out = {}
        for i in faces:
            t = self.f[i]
            for k in range(3):
                if t[k] == a and t[(k + 1) % 3] == b:
                    out['ab'] = (i, t[(k + 2) % 3])
                if t[k] == b and t[(k + 1) % 3] == a:
                    out['ba'] = (i, t[(k + 2) % 3])
        if 'ab' not in out or 'ba' not in out:
            return None
        return out['ab'], out['ba']

    def flip_ok(self, a, b, min_angle, max_turn):
        """Checks a flip of the edge a-b. Returns the new faces, or None."""
        q = self._quad(a, b)
        if q is None:
            return None
        (f1, c), (f2, d) = q
        if c == d or _key(c, d) in self.edges:
            return None
        v = self.v
        old = _normal(v[a], v[b], v[c]) + _normal(v[b], v[a], v[d])
        old /= max(np.linalg.norm(old), 1e-12)
        t1, t2 = (a, d, c), (d, b, c)
        for t in (t1, t2):
            p = v[list(t)]
            if _min_angle(*p) < min_angle:
                return None
            if np.dot(_normal(*p), old) < max_turn:
                return None
        return f1, f2, t1, t2

    def flip(self, a, b, min_angle=22.0, max_turn=0.92):
        """Flips the edge a-b and its mirror edge. Returns True when both flip."""
        a2, b2 = self.m[a], self.m[b]
        first = self.flip_ok(a, b, min_angle, max_turn)
        second = self.flip_ok(a2, b2, min_angle, max_turn)
        if first is None or second is None:
            return False
        if {first[0], first[1]} & {second[0], second[1]}:
            return False
        for f1, f2, t1, t2 in (first, second):
            self.f[f1] = list(t1)
            self.f[f2] = list(t2)
        self.rebuild()
        return True

    def collapse_ok(self, a, b, min_angle, max_turn, project):
        """Checks a collapse of the edge a-b to its middle. Returns the plan, or None."""
        q = self._quad(a, b)
        if q is None:
            return None
        (f1, c), (f2, d) = q
        if self.neighbors(a) & self.neighbors(b) != {c, d}:
            return None
        if len(self.neighbors(c)) <= 4 or len(self.neighbors(d)) <= 4:
            return None
        mid = project(0.5 * (self.v[a] + self.v[b]))
        changed = []
        for i in (self.vfaces[a] | self.vfaces[b]) - {f1, f2}:
            t = self.f[i]
            before = self.v[t]
            after = before.copy()
            for k in range(3):
                if t[k] in (a, b):
                    after[k] = mid
            if _min_angle(*after) < min_angle:
                return None
            if np.dot(_normal(*after), _normal(*before)) < max_turn:
                return None
            changed.append(i)
        return f1, f2, mid, changed

    def collapse(self, a, b, project, min_angle=20.0, max_turn=0.88):
        """Collapses the edge a-b and its mirror edge. Returns True when both collapse."""
        a2, b2 = self.m[a], self.m[b]
        if {a, b} & {a2, b2}:
            return False
        if b2 in self.neighbors(a) or a2 in self.neighbors(b) or a2 in self.neighbors(a):
            return False
        first = self.collapse_ok(a, b, min_angle, max_turn, project)
        second = self.collapse_ok(a2, b2, min_angle, max_turn, project)
        if first is None or second is None:
            return False
        for (keep, gone), (f1, f2, mid, changed) in (((a, b), first), ((a2, b2), second)):
            self.v[keep] = mid
            self.alive[f1] = False
            self.alive[f2] = False
            for i in changed:
                self.f[i] = [keep if x == gone else x for x in self.f[i]]
        self.m[b] = -1
        self.m[b2] = -1
        self.rebuild()
        return True

    def half_edges(self):
        """Lists the edges with both ends on the half x > 0."""
        return [e for e in self.edges if self._side(e[0]) and self._side(e[1])]

    def compact(self):
        """Removes dead faces and unused vertices. Returns (verts, tris, mirror)."""
        tris = np.array([t for i, t in enumerate(self.f) if self.alive[i]], np.int64)
        used = np.unique(tris)
        remap = -np.ones(len(self.v), np.int64)
        remap[used] = np.arange(len(used))
        mirror = self.m[used]
        mirror = np.where(mirror >= 0, remap[np.maximum(mirror, 0)], -1)
        return self.v[used], remap[tris], mirror


def organize(verts, tris, mirror, project, rng, collapse_share=0.12, flip_share=0.45,
             protect=None):
    """Collapses and flips a share of the half edges at random, then relaxes the vertices.

    project: a function that moves points (n, 3) or one point (3,) onto the surface.
    protect: optional booleans per vertex. An edge with a protected end is never collapsed or
    flipped, so the skin of the joints keeps the even layout of the remesh.
    Returns (verts, tris, mirror, counts).
    """
    mesh = Mesh(verts, tris, mirror)
    guard = np.zeros(len(verts), bool) if protect is None else np.asarray(protect, bool)
    n_half = sum(1 for i in range(len(mesh.v)) if mesh._side(i))
    want = int(collapse_share * n_half)
    collapsed = 0
    edges = mesh.half_edges()
    rng.shuffle(edges)
    lengths = {e: np.linalg.norm(mesh.v[e[0]] - mesh.v[e[1]]) for e in edges}
    median = float(np.median(list(lengths.values())))
    for a, b in edges:
        if collapsed >= want:
            break
        if _key(a, b) not in mesh.edges or mesh.m[a] < 0 or mesh.m[b] < 0:
            continue
        if guard[a] or guard[b]:
            continue
        # Short edges collapse more often, so the sizes vary without big holes.
        if lengths[(a, b)] > 1.2 * median and rng.random() < 0.7:
            continue
        if mesh.collapse(a, b, project):
            collapsed += 1

    flipped = 0
    edges = mesh.half_edges()
    rng.shuffle(edges)
    for a, b in edges:
        if rng.random() > flip_share:
            continue
        if _key(a, b) not in mesh.edges or guard[a] or guard[b]:
            continue
        if mesh.flip(a, b):
            flipped += 1
    v, t, m = mesh.compact()
    return v, t, m, {'collapsed_pairs': collapsed, 'flipped_pairs': flipped}


def relax(verts, tris, mirror, project, amount=0.25, rounds=2):
    """Moves each vertex part of the way to the middle of its neighbors, along the surface."""
    v = np.array(verts, float)
    nb = [set() for _ in range(len(v))]
    for a, b, c in tris:
        nb[a].update((b, c))
        nb[b].update((a, c))
        nb[c].update((a, b))
    nb = [list(s) for s in nb]
    for _ in range(rounds):
        mid = np.array([v[n].mean(axis=0) if n else v[i] for i, n in enumerate(nb)])
        moved = project(v + amount * (mid - v))
        # Keep the mirror exact: each pair takes the mean of its two mirrored positions.
        for i, j in enumerate(mirror):
            if j < 0 or j < i:
                continue
            if j == i:
                moved[i, 0] = 0.0
                continue
            p = 0.5 * (moved[i] + moved[j] * np.array([-1.0, 1.0, 1.0]))
            moved[i] = p
            moved[j] = p * np.array([-1.0, 1.0, 1.0])
        v = moved
    return v


def quality(verts, tris):
    """Measures the triangles: the share under 15 degrees, and the folded share (none here)."""
    t = verts[tris]
    angles = np.array([_min_angle(*p) for p in t])
    return float(np.mean(angles < 15.0)), float(np.median(angles))
