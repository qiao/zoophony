"""Measures the facet quality of the low-poly fox: the triangle sizes and the planes.

    blender -b --factory-startup --python tools/spike/fox-gated/facet_metrics.py -- \
        --blend <lowpoly.blend> [--json <result.json>]

The script reads the mesh `FoxLow` and leaves out the eye faces (face attribute `eye`). It
prints these measures:

- **Area ratio.** The 90th percentile of the triangle area divided by the 10th percentile. An
  even mesh has a low ratio. The target is 3 or less.
- **Planes.** A plane is a connected group of faces whose normals are within `PLANE_ANGLE`
  degrees of the normal of its first face (the largest face of the group). The script counts
  the planes of the face region (muzzle, face, cheeks, cheek tufts) and of the thigh region,
  from the nearest part of `fox_parts.PARTS`. Fewer faces for each plane means more noise.
- **Edge angles.** The share of the inner edges whose two faces meet at less than 4 degrees
  (flat, inside a plane), at 4 to 15 degrees (soft), and at more than 15 degrees (a crease).
  Clear planes give many flat edges and some creases, and few soft edges.
"""

import argparse
import json
import math
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fox_parts  # noqa: E402

#: The largest angle between the normal of a face and the first normal of its plane, in degrees.
PLANE_ANGLE = 8.0

#: The regions of the plane count: (name, part names).
REGIONS = [
    ('face', ('muzzle', 'face', 'cheeks', 'tuft.R', 'tuft.L')),
    ('thigh', ('thigh.R', 'thigh.L')),
]


def args():
    """Reads the arguments after `--`."""
    p = argparse.ArgumentParser()
    p.add_argument('--blend', required=True)
    p.add_argument('--object', default='FoxLow')
    p.add_argument('--json', default='')
    return p.parse_args(sys.argv[sys.argv.index('--') + 1:])


def body_faces(me):
    """Gives the indices of the faces that are not eye faces."""
    eye = me.attributes.get('eye')
    if eye is None:
        return list(range(len(me.polygons)))
    flags = [0] * len(me.polygons)
    eye.data.foreach_get('value', flags)
    return [i for i, f in enumerate(flags) if not f]


def adjacency(me, keep):
    """Gives, for each kept face, the kept faces that share an edge with it."""
    by_edge = {}
    for i in keep:
        for key in me.polygons[i].edge_keys:
            by_edge.setdefault(key, []).append(i)
    out = {i: [] for i in keep}
    for faces in by_edge.values():
        if len(faces) == 2:
            a, b = faces
            out[a].append(b)
            out[b].append(a)
    return out, by_edge


def count_planes(me, faces, neighbors):
    """Groups the faces into planes by region growth and gives the number of planes."""
    inside = set(faces)
    left = sorted(faces, key=lambda i: -me.polygons[i].area)
    seen = set()
    cos_limit = math.cos(math.radians(PLANE_ANGLE))
    planes = 0
    for start in left:
        if start in seen:
            continue
        planes += 1
        n0 = me.polygons[start].normal
        seen.add(start)
        stack = [start]
        while stack:
            f = stack.pop()
            for g in neighbors[f]:
                if g in inside and g not in seen and me.polygons[g].normal.dot(n0) >= cos_limit:
                    seen.add(g)
                    stack.append(g)
    return planes


def measure(me):
    """Calculates the measures of the module docstring."""
    keep = body_faces(me)
    areas = np.array([me.polygons[i].area for i in keep])
    p10, p50, p90 = np.percentile(areas, [10, 50, 90])
    neighbors, by_edge = adjacency(me, keep)
    angles = []
    for faces in by_edge.values():
        if len(faces) == 2:
            d = me.polygons[faces[0]].normal.dot(me.polygons[faces[1]].normal)
            angles.append(math.degrees(math.acos(max(-1.0, min(1.0, d)))))
    angles = np.array(angles)
    lengths = np.array([(me.vertices[a].co - me.vertices[b].co).length
                        for a, b in by_edge if len(by_edge[(a, b)]) == 2])
    centers = np.array([me.polygons[i].center[:] for i in keep], np.float32)
    fields = np.stack([fox_parts.part_sdf(centers, p) for p in fox_parts.PARTS], -1)
    nearest = [fox_parts.PARTS[k][0] for k in fields.argmin(-1)]
    out = {
        'triangles': len(keep),
        'area_cm2_p10_p50_p90': [round(float(v) * 1e4, 2) for v in (p10, p50, p90)],
        'area_ratio_p90_p10': round(float(p90 / p10), 2),
        'edge_mm_p10_p50_p90': [round(float(v) * 1e3, 1)
                                for v in np.percentile(lengths, [10, 50, 90])],
        'edges_flat_soft_crease_pct': [round(100.0 * float(x), 1) for x in (
            (angles < 4).mean(), ((angles >= 4) & (angles <= 15)).mean(), (angles > 15).mean())],
    }
    for name, parts in REGIONS:
        faces = [i for i, part in zip(keep, nearest) if part in parts]
        planes = count_planes(me, faces, neighbors)
        out['planes_' + name] = {'faces': len(faces), 'planes': planes,
                                 'faces_per_plane': round(len(faces) / max(planes, 1), 2)}
    return out


def main():
    opt = args()
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(opt.blend))
    me = bpy.data.objects[opt.object].data
    result = measure(me)
    print('facets', json.dumps(result))
    if opt.json:
        with open(opt.json, 'w') as f:
            json.dump(result, f, indent=2)


main()
