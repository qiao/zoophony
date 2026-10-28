"""Runs the steps of `cat_arms.py` up to `--until` (default step_inner_color), and lists, for each
side, the faces near each end of the armpit line: the corners with their part codes, rings and
spokes, the corner angles, and the thin faces (a corner under THIN degrees) within REACH units.

    Blender -b --factory-startup -P scratch/pit_probe.py -- <out dir> [--until <step>] [--patch <py>]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'blender'))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out_dir = os.path.abspath(argv[0])
os.makedirs(out_dir, exist_ok=True)
until = argv[argv.index('--until') + 1] if '--until' in argv else 'step_inner_color'
sys.argv = [sys.argv[0], '--', out_dir]
import bmesh  # noqa: E402
import cat_arms as ca  # noqa: E402
import violin_arms as va  # noqa: E402

if '--patch' in argv:
    exec(open(argv[argv.index('--patch') + 1]).read())
THIN = float(os.environ.get('THIN', 12))
REACH = float(os.environ.get('REACH', 0.03))
va.clear_scene()
s = va.Session('cat', out_dir)
for step in ca.STEPS:
    out = step(s)
    print('%s: %s' % (step.__name__, str(out)[:200]))
    if step.__name__ == until:
        break
H = s.fr.height
bm = bmesh.new()
bm.from_mesh(s.mesh.data)
bm.verts.ensure_lookup_table()
part = bm.verts.layers.int['arm_part']
ring = bm.verts.layers.int.get('arm_ring')
spoke = bm.verts.layers.int.get('arm_spoke')
flat = bm.verts.layers.int.get('arm_flat')


def units(co):
    return ((co.x) / H, (co.z - s.fr.floor) / H, -co.y / H)


def corners(f):
    vs = [p.co for p in f.verts]
    out = []
    for i in range(len(vs)):
        a, b, c = vs[i - 1], vs[i], vs[(i + 1) % len(vs)]
        u, w = a - b, c - b
        out.append(0.0 if u.length < 1e-12 or w.length < 1e-12 else math.degrees(u.angle(w)))
    return out


def tag(p):
    t = 'v%d p%d' % (p.index, p[part])
    if ring is not None and p[part] in (3, 13):
        t += ' r%d s%d f%d' % (p[ring], p[spoke], p[flat])
    return t + ' (%.4f,%.4f,%.4f)' % units(p.co)


for side, off in ((1, 0), (-1, 10)):
    pit = [p for p in bm.verts if p[part] == ca.PART['armpit'] + off]
    pit.sort(key=lambda p: -p.co.y)
    print('side', 'L' if side > 0 else 'R', 'armpit line', len(pit), 'vertices, front to back:')
    print('   ' + ' '.join('v%d' % p.index for p in pit))
    for name, end in (('front', pit[0]), ('back', pit[-1])):
        print(' end', name, tag(end))
        near = [p for p in bm.verts if (p.co - end.co).length < REACH * H]
        faces = {f for p in near for f in p.link_faces}
        for f in sorted(faces, key=lambda f: min(corners(f))):
            c = corners(f)
            if min(c) < THIN:
                print('   thin face %d: %s | %s' % (f.index, '/'.join('%.1f' % a for a in c),
                                                    '; '.join(tag(p) for p in f.verts)))

# A dump of the region around the front end of each armpit line for scratch/pit_plot.py.
import json  # noqa: E402
dump = {}
for side, off in ((1, 0), (-1, 10)):
    pit = [p for p in bm.verts if p[part] == ca.PART['armpit'] + off]
    front = max(pit, key=lambda p: -p.co.y)
    back = min(pit, key=lambda p: -p.co.y)
    for name, end in (('front', front), ('back', back)):
        near = [p for p in bm.verts if (p.co - end.co).length < float(os.environ.get('DUMP', 0.035)) * H]
        faces = {f for p in near for f in p.link_faces}
        verts = {p for f in faces for p in f.verts}
        dump['LR'[off // 10] + name] = {
            'verts': {p.index: [*units(p.co), p[part], p[ring] if ring is not None else -1,
                                p[spoke] if spoke is not None else -1,
                                p[flat] if flat is not None else -1] for p in verts},
            'faces': [[p.index for p in f.verts] for f in faces],
            'plane': [list(v) for v in ca.seam_plane(s, side)],
        }
with open(os.path.join(out_dir, 'pit.json'), 'w') as fh:
    json.dump(dump, fh)
if '--after' in argv:
    exec(open(argv[argv.index('--after') + 1]).read())
