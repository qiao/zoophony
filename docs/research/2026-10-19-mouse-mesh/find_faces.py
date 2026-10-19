"""Lists the thin faces of a mesh rig near a point of the source, with the weights of their corners
after the weight rules.

    blender -b --factory-startup --python find_faces.py -- <root> <config.json> <x,y,z> <radius>
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
config = json.load(open(argv[1]))
rules = config['weights']
if rig['TAIL_TIP'] in config['joints']:
    rig['BONES'] = rig['BONES'] + (rig['TAIL_TIP'],)
BONES = rig['BONES']
verts, tris, uvs, texture = rig['load_mesh'](config)
heads, ends, rolls, children = rig['joints_of'](config)
w = rig['apply_rules'](verts, tris, rig['bone_heat'](verts, tris, heads, ends, rolls), rules, heads, ends)
w = rig['straight_slivers'](verts, tris, rig['rigid_slivers'](verts, tris, w, rules), rules)
w = rig['limit'](rig['rigid_faces'](verts, tris, w, rules))
point = np.array([float(x) for x in argv[2].split(',')])
radius = float(argv[3])
mids = verts[tris].mean(axis=1)
for f in np.nonzero(np.linalg.norm(mids - point, axis=1) < radius)[0]:
    t = tris[f]
    ang = [rig['corner_angle'](verts[t[k]], verts[t[(k + 1) % 3]], verts[t[(k + 2) % 3]]) for k in range(3)]
    if max(ang) < 150:
        continue
    print(f'face {f}: middle {mids[f].round(4)}, angles {np.round(ang, 1)}')
    for v in t:
        top = np.argsort(-w[v])[:4]
        print(f'   v {v} {verts[v].round(4)}: ' + ', '.join(f'{BONES[k]} {w[v, k]:.2f}' for k in top if w[v, k] > 0.005))
