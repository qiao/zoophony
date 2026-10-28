"""Runs the steps of cat_arms.py (with an optional patch) up to a step, and writes horizontal
cuts near the side walls as JSON: the segments of each face kind (trunk, wall, tube, bridge) in
app cm, x out of the middle plane (left side +), z forward.

    Blender -b --factory-startup -P scratch/wall_cuts2.py -- <out.json> <until> [<patch.py>]
"""
import json, os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'blender'))
argv = sys.argv[sys.argv.index('--') + 1:]
out, until = os.path.abspath(argv[0]), argv[1]
patch = argv[2] if len(argv) > 2 else None
sys.argv = [sys.argv[0], '--', os.path.dirname(out)]
import bmesh
import cat_arms as ca
import violin_arms as va
if patch:
    exec(open(patch).read())
va.clear_scene()
s = va.Session('cat', os.path.dirname(out))
for step in ca.STEPS:
    print('%s: %s' % (step.__name__, str(step(s))[:200]))
    if step.__name__ == until:
        break
H = s.fr.height
CM = 163.916 / H
bm = bmesh.new(); bm.from_mesh(s.mesh.data)
zone = bm.faces.layers.int['arm_zone']; part = bm.verts.layers.int['arm_part']
TUBE = (3, 13)
levels = [0.49 + 0.01 * k for k in range(13)]
res = {'levels': levels, 'cuts': {}}
for side in (1, -1):
    for lv in levels:
        level = s.fr.floor + lv * H
        segs = []
        for f in bm.faces:
            c = f.calc_center_median()
            if c.x * side < 0.02 * H:
                continue
            vs = list(f.verts)
            pts = []
            for i in range(len(vs)):
                a, b = vs[i].co, vs[(i + 1) % len(vs)].co
                if (a.z - level) * (b.z - level) < 0:
                    p = a.lerp(b, (level - a.z) / (b.z - a.z))
                    pts.append([p.x * side * CM, -p.y * CM])
            if len(pts) != 2:
                continue
            tube = any(p[part] in TUBE for p in vs)
            kind = 'wall' if f[zone] == 3 and not tube else 'bridge' if f[zone] == 3 else 'tube' if tube else 'trunk'
            normal = [f.normal.x * side, -f.normal.y]
            segs.append([kind, pts, normal])
        res['cuts']['%s %.2f' % ('L' if side > 0 else 'R', lv)] = segs
plane = ca.seam_plane(s, 1)
res['plane'] = {'x': ca.CAT['seam']['x'] * 163.916, 'lean': ca.CAT['seam']['lean'], 'armpit': ca.CAT['seam']['armpit']}
json.dump(res, open(out, 'w'))
