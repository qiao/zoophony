"""Prints the free left and right arm of a mesh rig for variants of the weights rules (JSON merged
into `weights` of the config), and the cut of each variant. Writes the vertices, the triangles,
and the free arms of the last variant for `mask_plot.py`.

    blender -b --factory-startup --python arm_free.py -- <root> <animal> <out.npz> [<rules json>]...
"""
import json
import os
import sys

import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
ROOT, animal, out = argv[0], argv[1], argv[2]
RIG = os.path.join(ROOT, 'tools', 'blender', 'rig_mesh.py')
with open(RIG) as f:
    code = f.read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)
os.chdir(ROOT)
with open(f'tools/mesh-rigs/{animal}.json') as f:
    config = json.load(f)
verts, tris, uvs, texture = rig['load_mesh'](config)
heads, ends, rolls, children = rig['joints_of'](config)
variants = argv[3:] or ['{}']
for variant in variants:
    rules = dict(config['weights'])
    rules.update(json.loads(variant))
    cutrule = dict(config.get('cut', {'top': 0.58}))
    cutrule.update(rules.pop('cut', {}))
    free = {sign: rig['free_arm'](verts, tris, rules, heads, ends, sign) for sign in (1.0, -1.0)}
    print(f'variant {variant}:')
    for sign, arm in free.items():
        p = verts[arm]
        print(f'  side {sign:+.0f}: {int(arm.sum())} vertices, y {p[:, 1].min():.3f} to '
              f'{p[:, 1].max():.3f}, x {p[:, 0].min():+.3f} to {p[:, 0].max():+.3f}, z '
              f'{p[:, 2].min():+.3f} to {p[:, 2].max():+.3f}')
    try:
        cut = rig['cut_seam'](verts, tris, uvs, rules, heads, ends, cutrule)
        for side, mixed, faces, arm_run, body_run in cut[2]:
            print(f'  cut {side}: {len(mixed)} faces go, {len(faces)} new faces, the arm run '
                  f'{len(arm_run)} and the body run {len(body_run)} vertices')
    except SystemExit as error:
        print(f'  cut failed: {error}')
np.savez(out, v=verts, tris=tris, L=free[1.0], R=free[-1.0])
