"""Runs the steps of `cat_arms.py` up to the atlas, and measures the side wall under each arm and
the trunk around it in the copy.

    Blender -b --factory-startup -P scratch/wall_probe.py -- <out dir> [--until <step>] [--obj]

The region of a side: the faces of the side wall (`arm_zone` 3) and the trunk faces that share a
vertex with the wall or with its first ring of trunk faces. It prints, for each side:

- the faces of the wall, and the rim: the angles between each wall face and the trunk face
  beside it across an edge (not the armpit line);
- the thin faces of the region: a corner angle below 10 degrees;
- the largest angles between neighbor faces of the region;
- horizontal cuts of the trunk (the source faces and the wall, no arm faces) at heights of the
  wall: the turn at each point of the outline on the side of the arm, the largest turn, and the
  bulge of the outline out of the plane of the seam.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'blender'))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out_dir = os.path.abspath(argv[0])
until = argv[argv.index('--until') + 1] if '--until' in argv else 'step_inner_color'
sys.argv = [sys.argv[0], '--', out_dir]
import bmesh  # noqa: E402
import cat_arms as ca  # noqa: E402
import violin_arms as va  # noqa: E402
from mathutils import Vector  # noqa: E402

if '--patch' in argv:
    exec(open(argv[argv.index('--patch') + 1]).read())
if '--views' in argv:
    ca.VIEWS = os.path.abspath(argv[argv.index('--views') + 1])
    os.makedirs(ca.VIEWS, exist_ok=True)

va.clear_scene()
s = va.Session('cat', out_dir)
for step in ca.STEPS:
    out = step(s)
    print('%s: %s' % (step.__name__, str(out)[:200]))
    if step.__name__ == until:
        break

mesh = s.mesh
bm = bmesh.new()
bm.from_mesh(mesh.data)
bm.faces.ensure_lookup_table()
bm.verts.ensure_lookup_table()
zone = bm.faces.layers.int['arm_zone']
part = bm.verts.layers.int['arm_part']
H = s.fr.height
CM = 163.916 / H
seam = ca.CAT['seam']
TUBE = (ca.PART['tube'], ca.PART['tube'] + 10)


def angle(f, g):
    return math.degrees(f.normal.angle(g.normal, 0.0))


def corner_min(f):
    vs = [p.co for p in f.verts]
    out = 180.0
    for i in range(len(vs)):
        a, b, c = vs[i - 1], vs[i], vs[(i + 1) % len(vs)]
        u, w = a - b, c - b
        if u.length < 1e-12 or w.length < 1e-12:
            return 0.0
        out = min(out, math.degrees(u.angle(w)))
    return out


def trunk_face(f):
    """A face of the trunk surface: a source face or the wall, with no tube vertex."""
    return f[zone] in (0, 3) and not any(p[part] in TUBE for p in f.verts)


report = {}
for side in (1, -1):
    name = 'L' if side > 0 else 'R'
    wall = [f for f in bm.faces if f[zone] == 3 and f.calc_center_median().x * side > 0
            and not any(p[part] in TUBE for p in f.verts)]
    wverts = {p for f in wall for p in f.verts}
    region = {f for p in wverts for f in p.link_faces if trunk_face(f)}
    for _ in range(int(os.environ.get('REG', 3)) - 1):
        rv = {p for f in region for p in f.verts}
        region = {f for p in rv for f in p.link_faces if trunk_face(f)}
    rim = []
    for f in wall:
        for e in f.edges:
            for g in e.link_faces:
                if g is not f and g[zone] == 0 and trunk_face(g):
                    rim.append(angle(f, g))
    rim.sort(reverse=True)
    thin = sorted(corner_min(f) for f in region)
    edges = []
    where = []
    for e in {e for f in region for e in f.edges}:
        fs = [g for g in e.link_faces if g in region]
        if len(fs) == 2:
            edges.append(angle(fs[0], fs[1]))
            c = (e.verts[0].co + e.verts[1].co) / 2
            pc, pn = ca.seam_plane(s, side)
            where.append((edges[-1], (c.z - s.fr.floor) / H, -c.y * CM, (c - pc).dot(pn) * CM,
                          int(e.verts[0][part]), int(e.verts[1][part])))
    edges.sort(reverse=True)
    where.sort(reverse=True)
    for w in where[:10]:
        print('   edge %.0f deg at h %.3f fwd %.1f cm plane %.2f cm parts %d %d' % w)
    # The flat inner side of the tube below the armpit line: a ray from each vertex out along
    # the normal of the plane of the seam meets the trunk (inside) or not (a gap).
    from mathutils.bvhtree import BVHTree
    zs = [p.co.z for p in wverts]
    lo, hi = min(zs), max(zs)
    plane_co, plane_no = ca.seam_plane(s, side)
    trunk_faces = [f for f in bm.faces if trunk_face(f)]
    verts = [p.co.copy() for p in bm.verts]
    index = {p: i for i, p in enumerate(bm.verts)}
    tree = BVHTree.FromPolygons(verts, [[index[p] for p in f.verts] for f in trunk_faces])
    flat = bm.verts.layers.int['arm_flat']
    pit = s.fr.floor + s.units(seam['armpit'])
    depths, gaps = [], 0
    for p in bm.verts:
        if p[part] in TUBE and p[flat] == 1 and p.co.x * side > 0 and p.co.z < pit - 0.005 * H:
            hit = tree.ray_cast(p.co, plane_no, 0.05 * H)
            if hit[0] is None:
                gaps += 1
            else:
                depths.append(hit[3] * CM)
    depths.sort()
    report[name] = {
        'wall faces': len(wall),
        'wall height cm': round((hi - lo) * CM, 1),
        'rim edges': len(rim), 'rim p50': round(rim[len(rim) // 2], 1) if rim else None,
        'rim max': round(rim[0], 1) if rim else None,
        'rim over 30': sum(a > 30 for a in rim),
        'region faces': len(region),
        'thin faces (<10 deg)': sum(a < 10 for a in thin),
        'smallest corners': [round(a, 1) for a in thin[:6]],
        'edges over 35 (crease)': sum(a > 35 for a in edges),
        'edges over 30': sum(a > 30 for a in edges),
        'edges over 20': sum(a > 20 for a in edges),
        'largest edges': [round(a, 1) for a in edges[:8]],
        'flat side below the armpit': len(depths) + gaps,
        'flat side gaps': gaps,
        'flat side depth cm min, p10, p50': [round(depths[0], 2), round(depths[len(depths) // 10], 2), round(depths[len(depths) // 2], 2)] if depths else None,
    }
for name, r in report.items():
    print('side', name)
    for k, v in r.items():
        print('  %s: %s' % (k, v))
with open(os.path.join(out_dir, 'wall-probe.json'), 'w') as f:
    json.dump(report, f, indent=1)
bm.free()
