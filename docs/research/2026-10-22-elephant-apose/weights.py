"""Prints the arm vertices of a mesh rig whose weights mix the clavicle or the trunk with the
forearm or the paw, after each step of the weights of `tools/blender/rig_mesh.py`: the bone heat,
the rules, the slivers, and the lines. The places are in the units of the studio.

    blender -b --factory-startup --python weights.py -- <root> <elephant.json> [<source.glb>]
"""

import json
import os
import sys

import numpy as np

argv = sys.argv[sys.argv.index('--') + 1 :]
ROOT = argv[0]
RIG = os.path.join(ROOT, 'tools', 'blender', 'rig_mesh.py')
with open(argv[1]) as f:
    config = json.load(f)
if len(argv) > 2:
    config['source'] = argv[2]
with open(RIG) as f:
    code = f.read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)
os.chdir(ROOT)
verts, tris, uvs, texture = rig['load_mesh'](config)
heads, ends, rolls, children = rig['joints_of'](config)
rules = config['weights']
BONES = rig['BONES']
col = {name: k for k, name in enumerate(BONES)}
steps = {}
w = rig['bone_heat'](verts, tris, heads, ends, rolls)
steps['heat'] = w
w = rig['apply_rules'](verts, tris, w, rules, heads, ends)
steps['rules'] = w
w = rig['rigid_slivers'](verts, tris, w, rules)
steps['slivers'] = w
w = rig['straight_slivers'](verts, tris, w, rules)
steps['lines'] = w
for side in 'LR':
    root = [col[f'clavicle_{side}'], col['chest'], col['spine1'], col['spine']]
    far = [col[f'forearm_twist_{side}'], col[f'hand_{side}'], col[f'fingers_{side}']]
    for name, w in steps.items():
        mixed = (w[:, root].sum(axis=1) > 0.15) & (w[:, far].sum(axis=1) > 0.15)
        print(f'{side} {name}: {int(mixed.sum())} vertices mix the trunk and the forearm or the paw')
        if name in ('heat', 'lines'):
            for v in np.nonzero(mixed)[0][:12]:
                top = sorted(((w[v, k], BONES[k]) for k in range(len(BONES)) if w[v, k] > 0.05),
                             reverse=True)
                print(f'  {v}: {verts[v].round(3)} ' + ' '.join(f'{b} {x:.2f}' for x, b in top))
w = rig['limit'](rig['rigid_faces'](verts, tris, w, rules))
if len(argv) > 3:
    np.savez(argv[3], v=verts, w=w, tris=tris, bones=np.array(BONES))
if len(argv) > 4:
    for v in map(int, argv[4].split(',')):
        print(f'vertex {v} at {verts[v].round(3)}:')
        for name, w in steps.items():
            top = sorted(((w[v, k], BONES[k]) for k in range(len(BONES)) if w[v, k] > 0.03),
                         reverse=True)
            print(f'  {name}: ' + ' '.join(f'{b} {x:.2f}' for x, b in top))
