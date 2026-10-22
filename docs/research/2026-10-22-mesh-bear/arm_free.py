"""Prints the free left and right arm of the bear mesh for variants of the rule armFree of
`tools/blender/rig_mesh.py` (`arm_side()`, `free_arm()`), and the cut of the seam of each variant
(`cut_seam()`). A variant is the turn of the plane in degrees, armSplit, the radius, the floor,
and the top of the cut. With an output file, it also writes the vertices, the triangles, and the
free arms of the last variant for `mask_plot.py`.

    blender -b --factory-startup --python arm_free.py -- <root> <turn,split,radius,floor,top>... [<out.npz>]
"""
import json
import os
import sys

import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
ROOT = argv[0]
RIG = os.path.join(ROOT, 'tools', 'blender', 'rig_mesh.py')
with open(RIG) as f:
    code = f.read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)
os.chdir(ROOT)
with open('tools/mesh-rigs/bear.json') as f:
    config = json.load(f)
verts, tris, uvs, texture = rig['load_mesh'](config)
heads, ends, rolls, children = rig['joints_of'](config)
out = argv[-1] if argv[-1].endswith('.npz') else None
for variant in [a for a in argv[1:] if not a.endswith('.npz')]:
    turn, split, radius, floor, top = map(float, variant.split(','))
    rules = {'armSplit': split, 'armFree': {'turn': turn, 'radius': radius, 'floor': floor}}
    free = {sign: rig['free_arm'](verts, tris, rules, heads, ends, sign) for sign in (1.0, -1.0)}
    print(f'variant turn {turn}, split {split}, radius {radius}, floor {floor}, top {top}:')
    for sign, arm in free.items():
        p = verts[arm]
        print(f'  side {sign:+.0f}: {int(arm.sum())} vertices, y {p[:, 1].min():.3f} to '
              f'{p[:, 1].max():.3f}, x {p[:, 0].min():+.3f} to {p[:, 0].max():+.3f}, z '
              f'{p[:, 2].min():+.3f} to {p[:, 2].max():+.3f}')
    try:
        cut = rig['cut_seam'](verts, tris, uvs, rules, heads, ends, {'top': top})
        for side, mixed, faces, arm_run, body_run in cut[2]:
            print(f'  cut {side}: {len(mixed)} faces go, {len(faces)} new faces, the arm run '
                  f'{len(arm_run)} and the body run {len(body_run)} vertices')
    except SystemExit as error:
        print(f'  cut failed: {error}')
if out:
    np.savez(out, v=verts, tris=tris, L=free[1.0], R=free[-1.0])
