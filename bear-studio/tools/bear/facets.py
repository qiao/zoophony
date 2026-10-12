"""Measures the body facets of a GLB: size, slivers, and mirror symmetry.

Run with Blender:

    blender -b --factory-startup --python tools/bear/facets.py -- out/bear.glb

The body faces are the faces of the largest connected piece with the material 'fur' (the ears,
the tail, and the mouth line are separate pieces, and the other details use other materials).
The lengths are in px at the scale of the sheet (the bear is 528 px tall in the front view).
"""

import json
import os
import sys

import bpy
import numpy as np

SHEET_PX = 528


def body_triangles(path):
    """Imports a GLB and returns the welded vertices and the fur triangles (rest pose)."""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=path)
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        me = o.data
        fur = [i for i, m in enumerate(me.materials) if m and m.name.startswith('fur')]
        v = np.array([o.matrix_world @ x.co for x in me.vertices])
        tris = [list(p.vertices) for p in me.polygons
                if p.material_index in fur and len(p.vertices) == 3]
        tris = np.array(tris, np.int64)
        # The file splits the vertices of each face (flat normals, colors per corner). Weld
        # them by position, so the pieces and the mirror pairs can be found.
        keys = np.round(v / 1e-5).astype(np.int64)
        _, first, inverse = np.unique(keys, axis=0, return_index=True, return_inverse=True)
        return v[first], inverse.ravel()[tris]
    raise ValueError('no mesh in the file')


def largest_piece(tris):
    """Keeps the triangles of the largest edge-connected piece (the body)."""
    parent = {}

    def find(a):
        while parent.setdefault(a, a) != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for t in tris:
        for a, b in ((t[0], t[1]), (t[1], t[2])):
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[ra] = rb
    roots = np.array([find(t[0]) for t in tris])
    values, counts = np.unique(roots, return_counts=True)
    return tris[roots == values[np.argmax(counts)]]


def measure(v, tris):
    """Calculates the facet measures."""
    t = v[tris]
    e = np.linalg.norm(t - np.roll(t, 1, axis=1), axis=2)
    angles = []
    for k in range(3):
        a = t[:, (k + 1) % 3] - t[:, k]
        b = t[:, (k + 2) % 3] - t[:, k]
        c = np.sum(a * b, axis=1) / (np.linalg.norm(a, axis=1) * np.linalg.norm(b, axis=1))
        angles.append(np.degrees(np.arccos(np.clip(c, -1, 1))))
    smallest = np.min(np.stack(angles, axis=1), axis=1)
    used = np.unique(tris)
    pts = v[used]
    mirrored = pts * np.array([-1.0, 1.0, 1.0])
    edge = float(np.median(e))
    paired = 0
    for p in mirrored:
        if np.min(np.linalg.norm(pts - p, axis=1)) < 0.05 * edge:
            paired += 1
    px = e.ravel() * SHEET_PX

    # The regularity: the valence of each vertex (a split quad grid has 6 almost everywhere),
    # and the spread of the edge directions of the belly seen from the front (the normalized
    # entropy of 12 bins over 180 degrees: 1 when all directions are equal, 0 for one direction).
    valence = np.zeros(len(v), int)
    edges = set()
    for a, b2, c in tris:
        for p0, p1 in ((a, b2), (b2, c), (c, a)):
            edges.add((min(p0, p1), max(p0, p1)))
    for p0, p1 in edges:
        valence[p0] += 1
        valence[p1] += 1
    val = valence[used]
    ev = np.array(list(edges))
    mid = 0.5 * (v[ev[:, 0]] + v[ev[:, 1]])
    # Blender axes after the import: x left, y back (negative is the front), z up.
    belly = (np.abs(mid[:, 0]) < 0.15) & (mid[:, 2] > 0.3) & (mid[:, 2] < 0.55) & (mid[:, 1] < 0)
    d = v[ev[belly, 1]] - v[ev[belly, 0]]
    angle = np.degrees(np.arctan2(d[:, 2], d[:, 0])) % 180.0
    hist = np.histogram(angle, bins=12, range=(0, 180))[0].astype(float)
    prob = hist / hist.sum()
    entropy = float(-np.sum(prob[prob > 0] * np.log(prob[prob > 0])) / np.log(12))
    return {
        'valence_6_share': round(float(np.mean(val == 6)), 3),
        'valence_std': round(float(np.std(val)), 2),
        'belly_edge_direction_entropy': round(entropy, 3),
        'triangles': int(len(tris)),
        'edge_median_px': round(float(np.median(px)), 1),
        'edge_quartiles_px': [round(float(np.percentile(px, 25)), 1),
                              round(float(np.percentile(px, 75)), 1)],
        'edge_spread_iqr_over_median': round(float((np.percentile(px, 75) - np.percentile(px, 25))
                                                   / np.median(px)), 2),
        'slivers_share_min_angle_under_15': round(float(np.mean(smallest < 15)), 3),
        'median_smallest_angle_deg': round(float(np.median(smallest)), 1),
        'mirrored_vertex_share': round(paired / len(pts), 3),
    }


def main():
    """Prints the measures of the GLB given after '--'."""
    args = sys.argv[sys.argv.index('--') + 1:]
    path = os.path.abspath(args[0])
    v, tris = body_triangles(path)
    tris = largest_piece(tris)
    result = measure(v, tris)
    print('FACETS', json.dumps(result))


if __name__ == '__main__':
    main()
