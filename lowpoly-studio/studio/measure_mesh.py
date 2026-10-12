"""Measures the body facets of a GLB: size, slivers, mirror symmetry, valence, and the spread of
the edge directions of the belly.

Run with Blender:

    blender -b --factory-startup --python studio/measure_mesh.py -- <animal> [--out DIR]

The body faces are the faces of the largest connected piece with the material 'fur' (the ears,
the tail, and the mouth line are separate pieces, and the other details use other materials).
The lengths are in px at the scale of the sheet (the height of the front view in px).
"""

import argparse
import json
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from studio import config  # noqa: E402


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


def measure(v, tris, sheet_px, belly_box):
    """Calculates the facet measures. belly_box: [x0, y0, x1, y1] of the belly (front view)."""
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
    px = e.ravel() * sheet_px

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
    x0, y0, x1, y1 = belly_box
    belly = ((mid[:, 0] > x0) & (mid[:, 0] < x1) & (mid[:, 2] > y0) & (mid[:, 2] < y1)
             & (mid[:, 1] < 0))
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
    """Prints the measures of the GLB of an animal and writes <out>/compare/mesh.json."""
    ap = argparse.ArgumentParser(prog='studio/measure_mesh.py')
    ap.add_argument('animal')
    ap.add_argument('--out', default=None)
    args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:])
    cfg = config.load(args.animal, args.out)
    with open(cfg.paths.measure) as f:
        sheet_px = json.load(f)['views']['front']['height_px']
    v, tris = body_triangles(cfg.paths.glb)
    tris = largest_piece(tris)
    result = measure(v, tris, sheet_px, cfg.measure.mesh_belly)
    print('FACETS', json.dumps(result))
    os.makedirs(cfg.paths.compare, exist_ok=True)
    with open(os.path.join(cfg.paths.compare, 'mesh.json'), 'w') as f:
        json.dump(result, f, indent=2)


if __name__ == '__main__':
    main()
