"""Edits the arm root of a copy of a mesh of the user, so that the form at the seam of the arm and
the trunk is smooth and convex (design 4.4, `docs/research/2026-10-22-arm-roots.md`).

    blender -b --factory-startup --python tools/blender/arm_root.py -- <edit.json> \
        [--out <file.glb>] [--edits <JSON list>]

The edit file `tools/arm-roots/<species>.json` names the source GLB file, the output GLB file,
the weld of the rig config, the meters of one unit in the app, and a list of edits. `--out`
writes another file, and `--edits` replaces the list, so that a variant needs no new file. The
script prints one line for each edit and the SHA-256 of the output.

The points are in the units and the axes of the rig config (`tools/mesh-rigs/<animal>.json`):
1 unit from the soles to the top, the soles at y = 0, y up, +z forward, and +x the left side of
the animal. A vertex is an index of the welded source: the import, a weld at `weld`, and the
triangulation, as `load_mesh()` of `tools/blender/rig_mesh.py` does. `dump.py` of
`docs/research/2026-10-22-arm-roots/` writes these indices. Each edit holds for the side `side`
("L" or "R") of its vertices, and with `mirror` also for the mirror vertices of the other side.
The methods:

- `flip`: each edge of `edges` goes to the other diagonal of its two faces. A long thin face
  across the shoulder joint, with corners of mixed arm weights, folds in a sharp V when the arm
  turns. The flip keeps each vertex in its place.
- `fair`: the vertices of `vertices` move along `axis` out to a quadratic surface fitted to the
  vertices of `fit`, by the share `share` of the gap and at most `cap` units, as `fair.py` of
  `docs/research/2026-10-21-rabbit-notch/`. A vertex outside the surface does not move.
- `smooth`: `rounds` times, each vertex of `vertices` moves by the share `share` toward the mean
  of its neighbors. With `outward`, a vertex moves only out along its normal, so that a notch
  fills and no bump shrinks.
- `split`: each edge of `edges` splits at its middle. The new vertex lies on the curve between
  the two ends whose tangents lie in the planes of their normals, so that it continues the round
  form. The new corners take the mean UV of the two ends in each face. A new vertex takes no
  index of the source, so the indices of later edits stay the indices of the source.
"""
import hashlib
import json
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector


def load(path, weld):
    """Imports a GLB file of one mesh, welds and triangulates it in world space, and gives the
    object, its world matrix, the bmesh, and the frame of the studio units."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if len(meshes) != 1:
        raise SystemExit(f'{path} has {len(meshes)} meshes, not 1.')
    ob = meshes[0]
    mw = ob.matrix_world.copy()
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.transform(mw)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=weld)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.verts.ensure_lookup_table()
    zs = [v.co.z for v in bm.verts]
    frame = {'floor': min(zs), 'scale': 1.0 / (max(zs) - min(zs))}
    return ob, mw, bm, frame


def to_studio(co, frame):
    """Gives a Blender point in the units and the axes of the studio."""
    s = frame['scale']
    return np.array([co.x * s, (co.z - frame['floor']) * s, -co.y * s])


def to_blender(p, frame):
    """Gives a point of the studio in the Blender coordinates of the mesh."""
    s = frame['scale']
    return Vector((p[0] / s, -p[2] / s, p[1] / s + frame['floor']))


def mirror_of(points, index, tolerance=1e-3):
    """Gives the vertex at the mirror place of a vertex across the middle plane x = 0."""
    target = points[index] * [-1.0, 1.0, 1.0]
    gaps = np.linalg.norm(points - target, axis=1)
    best = int(np.argmin(gaps))
    if gaps[best] > tolerance:
        raise SystemExit(f'Vertex {index} has no mirror vertex within {tolerance} u '
                         f'(nearest {best}, {gaps[best]:.4f} u).')
    return best


def sides_of(edit, points, items):
    """Gives the lists of vertex items of the edit for each side: the given side, and with
    `mirror` the mirror side. An item is a vertex index or a list of indices."""
    out = [(edit['side'], items)]
    if edit.get('mirror'):
        other = 'L' if edit['side'] == 'R' else 'R'

        def mirrored(item):
            if isinstance(item, list):
                return [mirrored(i) for i in item]
            return mirror_of(points, item)

        out.append((other, [mirrored(i) for i in items]))
    return out


def edge_of(bm, a, b):
    """Gives the edge between two vertices, or stops when the mesh has none."""
    edge = bm.edges.get((bm.verts[a], bm.verts[b]))
    if edge is None:
        raise SystemExit(f'The mesh has no edge {a}-{b}.')
    return edge


def flip(bm, edit, points, frame, rate):
    """Flips the edges of the edit to the other diagonal of their two faces."""
    lines = []
    for side, edges in sides_of(edit, points, edit['edges']):
        for a, b in edges:
            bm.verts.ensure_lookup_table()
            edge = edge_of(bm, a, b)
            if len(edge.link_faces) != 2:
                raise SystemExit(f'The edge {a}-{b} has {len(edge.link_faces)} faces, not 2.')
            seam = any(
                (loop[UV].uv - other[UV].uv).length > 1e-6
                for v in edge.verts
                for loop in v.link_loops if loop.face in edge.link_faces
                for other in v.link_loops if other.face in edge.link_faces)
            new = bmesh.utils.edge_rotate(edge, True)
            if new is None:
                raise SystemExit(f'The edge {a}-{b} does not flip.')
            c, d = (v.index for v in new.verts)
            lines.append(f'flip {side}: edge {a}-{b} goes to {c}-{d}'
                         + (' (a seam of the texture)' if seam else ''))
    return lines


def neighbors(bm, index):
    """Gives the indices of the neighbors of a vertex."""
    return [e.other_vert(bm.verts[index]).index for e in bm.verts[index].link_edges]


def fair(bm, edit, points, frame, rate):
    """Moves the vertices of the edit out to a quadratic surface fitted to the vertices of `fit`
    along `axis` (the left side; the right side mirrors x)."""
    lines = []
    for side, (moved, fit) in sides_of(edit, points, [edit['vertices'], edit['fit']]):
        sign = 1.0 if side == 'L' else -1.0
        axis = np.asarray(edit['axis'], float) * [sign, 1.0, 1.0]
        axis /= np.linalg.norm(axis)
        e1 = np.cross(axis, [0.0, 1.0, 0.0] if abs(axis[1]) < 0.9 else [1.0, 0.0, 0.0])
        e1 /= np.linalg.norm(e1)
        e2 = np.cross(axis, e1)
        P = points[fit]
        u, v, h = P @ e1, P @ e2, P @ axis
        rows = lambda a, b: np.stack([np.ones_like(a), a, b, a * a, a * b, b * b], axis=1)
        coef, *_ = np.linalg.lstsq(rows(u, v), h, rcond=None)
        rms = float(np.sqrt(((rows(u, v) @ coef - h) ** 2).mean()))
        largest = 0.0
        for k in moved:
            p = points[k]
            gap = float(rows(np.array([p @ e1]), np.array([p @ e2])) @ coef - p @ axis)
            if gap <= 0:
                continue
            step = min(gap * edit.get('share', 1.0), edit.get('cap', np.inf))
            points[k] = p + step * axis
            bm.verts[k].co = to_blender(points[k], frame)
            largest = max(largest, step)
        lines.append(f'fair {side}: {len(moved)} vertices on a surface of {len(fit)} '
                     f'(rms {rms * rate * 100:.2f} cm), largest move {largest * rate * 100:.2f} cm')
    return lines


def normal_of(bm, index, points):
    """Gives the mean unit normal of the faces of a vertex, in the studio axes."""
    total = np.zeros(3)
    for face in bm.verts[index].link_faces:
        a, b, c = (points[v.index] for v in face.verts)
        total += np.cross(b - a, c - a)
    return total / max(np.linalg.norm(total), 1e-12)


def smooth(bm, edit, points, frame, rate):
    """Moves the vertices of the edit toward the means of their neighbors."""
    lines = []
    for side, moved in sides_of(edit, points, edit['vertices']):
        start = points[moved].copy()
        for _ in range(edit.get('rounds', 1)):
            means = {k: points[neighbors(bm, k)].mean(axis=0) for k in moved}
            for k, mean in means.items():
                step = edit.get('share', 0.5) * (mean - points[k])
                if edit.get('outward'):
                    n = normal_of(bm, k, points)
                    step = max(0.0, float(step @ n)) * n
                points[k] = points[k] + step
        for k in moved:
            bm.verts[k].co = to_blender(points[k], frame)
        largest = float(np.linalg.norm(points[moved] - start, axis=1).max())
        lines.append(f'smooth {side}: {len(moved)} vertices, largest move {largest * rate * 100:.2f} cm')
    return lines


def hull_planes(pts):
    """Gives the outward unit normals and the offsets of the faces of the convex hull of the
    points, so that a point p lies inside when each normal @ p + offset is below 0."""
    shape = bmesh.new()
    verts = [shape.verts.new(Vector(p.tolist())) for p in pts]
    bmesh.ops.convex_hull(shape, input=verts)
    middle = pts.mean(axis=0)
    normals, offsets = [], []
    for face in shape.faces:
        a, b, c = (np.array(v.co[:]) for v in face.verts[:3])
        n = np.cross(b - a, c - a)
        if np.linalg.norm(n) < 1e-12:
            continue
        n /= np.linalg.norm(n)
        if n @ (a - middle) < 0:
            n = -n
        normals.append(n)
        offsets.append(-float(n @ a))
    shape.free()
    return np.array(normals), np.array(offsets)


def hull(bm, edit, points, frame, rate):
    """Moves each vertex of the edit out toward the convex hull of the fixed vertices within
    `ring` units of it: the vertices of the source that are not in `vertices` and not in
    `exclude` (the arm beside the notch)."""
    lines = []
    for side, (moved, exclude) in sides_of(edit, points, [edit['vertices'], edit.get('exclude', [])]):
        skip = set(moved) | set(exclude)
        start = points.copy()
        steps = {}
        for k in moved:
            near = [j for j in np.nonzero(np.linalg.norm(start - start[k], axis=1) < edit['ring'])[0]
                    if j not in skip]
            if len(near) < 6:
                continue
            normals, offsets = hull_planes(start[near])
            gaps = normals @ start[k] + offsets
            facet = int(np.argmax(gaps))
            if gaps[facet] >= 0:
                continue
            depth = -float(gaps[facet])
            steps[k] = min(depth * edit.get('share', 1.0), edit.get('cap', np.inf)) * normals[facet]
        for k, step in steps.items():
            points[k] = start[k] + step
            bm.verts[k].co = to_blender(points[k], frame)
        largest = max((float(np.linalg.norm(s)) for s in steps.values()), default=0.0)
        lines.append(f'hull {side}: {len(steps)} of {len(moved)} vertices move, largest '
                     f'{largest * rate * 100:.2f} cm')
    return lines


def push(bm, edit, points, frame, rate):
    """Moves each vertex of `moves` (index: units) out along its normal."""
    start = points.copy()
    steps = {int(k): float(a) * normal_of(bm, int(k), start) for k, a in edit['moves'].items()}
    for k, step in steps.items():
        points[k] = start[k] + step
        bm.verts[k].co = to_blender(points[k], frame)
    largest = max(float(np.linalg.norm(s)) for s in steps.values())
    return [f'push {edit["side"]}: {len(steps)} vertices, largest {largest * rate * 100:.2f} cm']


def split(bm, edit, points, frame, rate):
    """Splits the edges of the edit at their middles, on the round curve between their ends."""
    lines = []
    grown = list(points)
    for side, edges in sides_of(edit, points, edit['edges']):
        for a, b in edges:
            bm.verts.ensure_lookup_table()
            edge = edge_of(bm, a, b)
            pa, pb = points[a], points[b]
            d = pb - pa
            na, nb = normal_of(bm, a, grown), normal_of(bm, b, grown)
            ta = d - (d @ na) * na
            tb = d - (d @ nb) * nb
            ta *= np.linalg.norm(d) / max(np.linalg.norm(ta), 1e-12)
            tb *= np.linalg.norm(d) / max(np.linalg.norm(tb), 1e-12)
            mid = (pa + pb) / 2 + (ta - tb) / 8
            uvs = {}
            for face in edge.link_faces:
                loops = {loop.vert.index: loop[UV].uv.copy() for loop in face.loops}
                uvs[face] = (loops[a] + loops[b]) / 2
            new_edge, vert = bmesh.utils.edge_split(edge, bm.verts[a], 0.5)
            vert.co = to_blender(mid, frame)
            faces = list(vert.link_faces)
            for face in faces:
                for loop in face.loops:
                    if loop.vert is vert:
                        loop[UV].uv = uvs[face]
            bmesh.ops.triangulate(bm, faces=faces)
            bm.verts.index_update()
            grown.append(mid)
            off = float(np.linalg.norm(mid - (pa + pb) / 2))
            lines.append(f'split {side}: edge {a}-{b} ({np.linalg.norm(d) * rate * 100:.1f} cm) '
                         f'at a new vertex {off * rate * 100:.2f} cm off the chord')
    return lines


#: The edit methods by name.
METHODS = {'flip': flip, 'fair': fair, 'smooth': smooth, 'hull': hull, 'push': push, 'split': split}
#: The UV layer of the bmesh, set by `run()`.
UV = None


def run(edit_path, out=None, edits=None):
    """Imports the source of the edit file, applies its edits, and exports the copy. Gives the
    report lines."""
    global UV
    config = json.load(open(edit_path))
    edits = config['edits'] if edits is None else edits
    out = out or config['output']
    rate = config['metersPerUnit']
    ob, mw, bm, frame = load(config['source'], config['weld'])
    UV = bm.loops.layers.uv.active
    lines = [f'source: {len(bm.verts)} vertices, {len(bm.faces)} triangles']
    for edit in edits:
        bm.verts.ensure_lookup_table()
        points = np.array([to_studio(v.co, frame) for v in bm.verts])
        lines += METHODS[edit['method']](bm, edit, points, frame, rate)
    bm.verts.ensure_lookup_table()
    lines.append(f'copy: {len(bm.verts)} vertices, {len(bm.faces)} triangles, '
                 f'{sum(1 for e in bm.edges if e.is_boundary)} open edges')
    bm.transform(mw.inverted())
    bm.to_mesh(ob.data)
    bm.free()
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True)
    digest = hashlib.sha256(open(out, 'rb').read()).hexdigest()
    lines.append(f'wrote {out}, sha256 {digest}')
    return lines


if __name__ == '__main__' and '--' in sys.argv:
    argv = sys.argv[sys.argv.index('--') + 1:]
    opts = dict(zip(argv[1::2], argv[2::2]))
    report = run(argv[0], opts.get('--out'),
                 json.loads(opts['--edits']) if '--edits' in opts else None)
    print('\n'.join(f'arm_root: {line}' for line in report))
