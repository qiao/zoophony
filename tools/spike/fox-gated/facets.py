"""Even triangles and sculpted planes for a low-poly animal, in pure bmesh.

The two passes apply to every species. They need only a closed triangle mesh, the fine surface
that it came from, and a size function.

- `isotropic_remesh`: the remesh of Botsch and Kobbelt ("A remeshing approach to multiresolution
  modeling", 2004). Each iteration splits the long edges, collapses the short edges, flips edges
  toward valence 6, moves each vertex to the middle of its neighbors in its tangent plane, and
  puts it back onto the fine surface. The triangles then have almost even sizes. A size
  function gives the target edge length at each point, so that the ears or the joints get
  smaller triangles. QuadriFlow of Blender 5.2 refused the forms mesh, so this pass replaces it.
- `planar_facets`: a variational shape approximation (Cohen-Steiner, Alliez, and Desbrun,
  "Variational shape approximation", 2004). It groups the faces into planes, k-means on the face
  normals with connected regions, then moves each vertex toward the planes of its faces. Flat
  areas become a few clear planes, and the borders of the planes become creases.
"""

import heapq
import math
import random

import bmesh
from mathutils import Matrix, Vector


def edge_length_for(area, triangles):
    """Gives the edge length of `triangles` equilateral triangles that cover `area`."""
    return math.sqrt(4.0 * area / (math.sqrt(3.0) * triangles))


def middle(e):
    """Gives the middle point of an edge."""
    return (e.verts[0].co + e.verts[1].co) * 0.5


def split_long(bm, size):
    """Splits each edge longer than 4/3 of its target length, then triangulates the faces."""
    for _ in range(4):
        long = [e for e in bm.edges if e.calc_length() > 4.0 / 3.0 * size(middle(e))]
        if not long:
            return
        bmesh.ops.subdivide_edges(bm, edges=long, cuts=1)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3],
                              quad_method='BEAUTY', ngon_method='BEAUTY')


def can_collapse(e, target):
    """Checks that the collapse of an edge to its middle keeps a clean closed mesh.

    The two vertices must share exactly two neighbors (the link condition), each shared
    neighbor must keep at least 3 edges, no new edge may be longer than 4/3 of `target`, and no
    face may turn over.
    """
    a, b = e.verts
    na = {x.other_vert(a) for x in a.link_edges}
    nb = {x.other_vert(b) for x in b.link_edges}
    common = na & nb
    if len(common) != 2 or any(len(c.link_edges) <= 3 for c in common):
        return False
    if len(a.link_edges) + len(b.link_edges) - 4 < 3:
        return False
    mid = middle(e)
    if any((v.co - mid).length > 4.0 / 3.0 * target for v in (na | nb) - {a, b}):
        return False
    for f in set(a.link_faces) | set(b.link_faces):
        if a in f.verts and b in f.verts:
            continue
        co = [mid if v is a or v is b else v.co for v in f.verts]
        n = (co[1] - co[0]).cross(co[2] - co[0])
        if n.length < 1e-12 or n.normalized().dot(f.normal) < 0.3:
            return False
    return True


def collapse_short(bm, size):
    """Collapses each edge shorter than 4/5 of its target length to its middle."""
    bm.normal_update()
    for e in sorted(bm.edges, key=lambda x: x.calc_length()):
        if not e.is_valid:
            continue
        target = size(middle(e))
        if e.calc_length() >= 0.8 * target or not can_collapse(e, target):
            continue
        bmesh.ops.collapse(bm, edges=[e], uvs=False)


def flip_valence(bm):
    """Flips each edge whose flip brings the four vertices nearer to valence 6.

    A flip must not turn over a face, and the two faces must meet at less than 25 degrees, so
    that the flips do not cut a real fold of the form.
    """
    bm.normal_update()
    limit = math.cos(math.radians(25.0))
    for e in list(bm.edges):
        if not e.is_valid or len(e.link_faces) != 2:
            continue
        f1, f2 = e.link_faces
        if f1.normal.dot(f2.normal) < limit:
            continue
        a, b = e.verts
        c = next(v for v in f1.verts if v is not a and v is not b)
        d = next(v for v in f2.verts if v is not a and v is not b)
        if c is d or any(x.other_vert(c) is d for x in c.link_edges):
            continue
        va, vb, vc, vd = (len(v.link_edges) for v in (a, b, c, d))
        if va <= 3 or vb <= 3:
            continue
        before = (va - 6) ** 2 + (vb - 6) ** 2 + (vc - 6) ** 2 + (vd - 6) ** 2
        after = (va - 7) ** 2 + (vb - 7) ** 2 + (vc - 5) ** 2 + (vd - 5) ** 2
        if after >= before:
            continue
        n = f1.normal + f2.normal
        n1 = (d.co - c.co).cross(a.co - c.co)
        n2 = (c.co - d.co).cross(b.co - d.co)
        if n1.dot(n) <= 0 or n2.dot(n) <= 0:
            continue
        bmesh.utils.edge_rotate(e, True)


def relax(bm, fine, factor=0.5):
    """Moves each vertex toward the middle of its neighbors in its tangent plane, onto `fine`."""
    bm.normal_update()
    moves = []
    for v in bm.verts:
        ring = [x.other_vert(v).co for x in v.link_edges]
        delta = sum(ring, Vector()) / len(ring) - v.co
        delta -= v.normal * v.normal.dot(delta)
        moves.append(v.co + delta * factor)
    for v, p in zip(bm.verts, moves):
        hit = fine.find_nearest(p)
        v.co = hit[0] if hit[0] is not None else p


def isotropic_remesh(bm, fine, size, iterations=8):
    """Remeshes a closed triangle mesh to the edge lengths of `size(point)`, on the surface `fine`.

    `fine` is a `BVHTree` of the fine surface. The function changes `bm` in place.
    """
    for _ in range(iterations):
        split_long(bm, size)
        collapse_short(bm, size)
        flip_valence(bm)
        relax(bm, fine)
    for _ in range(2):
        flip_valence(bm)
        relax(bm, fine)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])


def face_neighbors(bm):
    """Gives, for each face index, the indices of the faces that share an edge with it."""
    bm.faces.ensure_lookup_table()
    out = []
    for f in bm.faces:
        ring = []
        for e in f.edges:
            ring.extend(g.index for g in e.link_faces if g is not f)
        out.append(ring)
    return out


def partition(normals, areas, neighbors, regions, count, iterations, seed):
    """Groups the faces into `count` connected planes: k-means on the face normals.

    Each plane grows from its seed face over the face neighbors, nearest normal first (the L2,1
    error of the paper), and stays inside one region of `regions`. Then each plane gets the
    area-weighted mean normal of its faces, and its new seed is its face nearest to that normal.
    The seeds of each region are in proportion to its faces.
    """
    rng = random.Random(seed)
    faces = len(normals)
    by_region = {}
    for i, r in enumerate(regions):
        by_region.setdefault(r, []).append(i)
    seeds = []
    for r in sorted(by_region):
        members = by_region[r]
        k = max(1, round(count * len(members) / faces))
        seeds.extend(rng.sample(members, min(k, len(members))))
    proxies = [normals[s].copy() for s in seeds]
    label = [-1] * faces
    for _ in range(iterations):
        label = [-1] * faces
        heap = []
        for k, s in enumerate(seeds):
            label[s] = k
            for g in neighbors[s]:
                heapq.heappush(heap, (areas[g] * (normals[g] - proxies[k]).length_squared, g, k))
        while heap:
            _, f, k = heapq.heappop(heap)
            if label[f] != -1 or regions[f] != regions[seeds[k]]:
                continue
            label[f] = k
            for g in neighbors[f]:
                if label[g] == -1:
                    heapq.heappush(heap, (areas[g] * (normals[g] - proxies[k]).length_squared, g, k))
        for f in range(faces):
            if label[f] == -1:
                label[f] = next((label[g] for g in neighbors[f] if label[g] != -1), 0)
        sums = [Vector() for _ in seeds]
        for f, k in enumerate(label):
            sums[k] += normals[f] * areas[f]
        proxies = [s.normalized() if s.length > 1e-12 else proxies[k] for k, s in enumerate(sums)]
        best = [(math.inf, s) for s in seeds]
        for f, k in enumerate(label):
            err = (normals[f] - proxies[k]).length_squared
            if err < best[k][0]:
                best[k] = (err, f)
        seeds = [b[1] for b in best]
    return label


def planar_facets(bm, faces_per_plane, strength, regions=None, iterations=12, passes=4,
                  seed=1):
    """Groups the faces into planes and moves each vertex toward the planes of its faces.

    `faces_per_plane` sets the number of planes. `strength` (0 to 1) is the part of the move
    to the planes in each pass: with 1 the faces of a plane become flat, and with less a small
    turn stays between them, so that each triangle still catches its own light. `regions`
    gives a region number for each face (for example a body part), and a plane does not cross
    from one region to the next. The function gives the plane number of each face.

    Each pass fits a plane to each group (the area-weighted mean normal through the mean
    center), then moves each vertex to the point that is nearest to the planes of its faces,
    weighted by the number of its faces in each plane, with a small pull to its old place.
    """
    bm.normal_update()
    bm.faces.ensure_lookup_table()
    neighbors = face_neighbors(bm)
    normals = [f.normal.copy() for f in bm.faces]
    areas = [f.calc_area() for f in bm.faces]
    if regions is None:
        regions = [0] * len(normals)
    count = max(1, round(len(normals) / faces_per_plane))
    label = partition(normals, areas, neighbors, regions, count, iterations, seed)
    # A face layer keeps the plane of each face through the edge flips, which make new faces.
    layer = bm.faces.layers.int.get('plane') or bm.faces.layers.int.new('plane')
    for f, k in zip(bm.faces, label):
        f[layer] = k
    for _ in range(passes):
        bm.normal_update()
        sums = {}
        for f in bm.faces:
            k = f[layer]
            n, c, a = sums.get(k, (Vector(), Vector(), 0.0))
            area = f.calc_area()
            sums[k] = (n + f.normal * area, c + f.calc_center_median() * area, a + area)
        planes = {}
        for k, (n, c, a) in sums.items():
            if n.length < 1e-12 or a <= 0:
                continue
            n = n.normalized()
            planes[k] = (n, n.dot(c / a))
        moves = []
        for v in bm.verts:
            counts = {}
            for f in v.link_faces:
                k = f[layer]
                if k in planes:
                    counts[k] = counts.get(k, 0) + 1
            total = sum(counts.values())
            if not total:
                moves.append(v.co.copy())
                continue
            mu = 0.05 * total
            m = Matrix.Identity(3) * mu
            rhs = v.co * mu
            for k, w in counts.items():
                n, d = planes[k]
                m += Matrix(((n.x * n.x, n.x * n.y, n.x * n.z),
                             (n.y * n.x, n.y * n.y, n.y * n.z),
                             (n.z * n.x, n.z * n.y, n.z * n.z))) * w
                rhs += n * (d * w)
            x = m.inverted_safe() @ rhs
            moves.append(v.co + (x - v.co) * strength)
        for v, p in zip(bm.verts, moves):
            v.co = p
        for _ in range(2):
            relax_in_planes(bm, layer, planes)
            flip_in_planes(bm, layer)
    bm.normal_update()
    bm.faces.index_update()
    return [f[layer] for f in bm.faces]


def min_angle(a, b, c):
    """Gives the smallest corner angle of the triangle (a, b, c), in radians."""
    out = math.pi
    for p, q, r in ((a, b, c), (b, c, a), (c, a, b)):
        u, w = q - p, r - p
        if u.length < 1e-12 or w.length < 1e-12:
            return 0.0
        out = min(out, u.angle(w))
    return out


def flip_in_planes(bm, layer):
    """Flips each edge inside one plane when the flip gives a larger smallest angle.

    The two faces of the edge are in the same plane, so the flip changes the triangles but
    almost not the surface. Thus the triangles inside a plane get a more even form and size.
    """
    bm.normal_update()
    for e in list(bm.edges):
        if not e.is_valid or len(e.link_faces) != 2:
            continue
        f1, f2 = e.link_faces
        if f1[layer] != f2[layer] or f1.normal.dot(f2.normal) < 0.995:
            continue
        a, b = e.verts
        c = next(v for v in f1.verts if v is not a and v is not b)
        d = next(v for v in f2.verts if v is not a and v is not b)
        if c is d or any(x.other_vert(c) is d for x in c.link_edges):
            continue
        if len(a.link_edges) <= 4 or len(b.link_edges) <= 4:
            continue
        before = min(min_angle(a.co, b.co, c.co), min_angle(b.co, a.co, d.co))
        after = min(min_angle(c.co, d.co, a.co), min_angle(d.co, c.co, b.co))
        n = f1.normal + f2.normal
        if after <= before + 0.05:
            continue
        if (d.co - c.co).cross(a.co - c.co).dot(n) <= 0 or (c.co - d.co).cross(b.co - d.co).dot(n) <= 0:
            continue
        bmesh.utils.edge_rotate(e, True)


def relax_in_planes(bm, layer, planes, factor=0.5):
    """Moves each vertex toward the middle of its neighbors, but only inside its planes.

    The snap to the planes makes the triangle sizes uneven. A vertex inside one plane moves in
    that plane, a vertex on the crease of two planes moves along the crease, and a vertex at the
    corner of three or more planes stays. Thus the planes keep their place.
    """
    moves = []
    for v in bm.verts:
        normals = []
        for f in v.link_faces:
            k = f[layer]
            if k in planes and all(abs(n.dot(planes[k][0])) < 0.999 for n in normals):
                normals.append(planes[k][0])
        delta = sum((x.other_vert(v).co for x in v.link_edges), Vector()) / len(v.link_edges) - v.co
        if len(normals) == 1:
            n = normals[0]
            delta -= n * n.dot(delta)
        elif len(normals) == 2:
            line = normals[0].cross(normals[1]).normalized()
            delta = line * line.dot(delta)
        else:
            delta = Vector()
        moves.append(v.co + delta * factor)
    for v, p in zip(bm.verts, moves):
        v.co = p
