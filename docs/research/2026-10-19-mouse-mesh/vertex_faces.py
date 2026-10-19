"""Lists the faces around a vertex of a mesh rig, with the weights of their corners after the
weight rules, the middles in source units, and the corner angles.

    blender -b --factory-startup --python vertex_faces.py -- <root> <config.json> <vertex>
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
w0 = rig['bone_heat'](verts, tris, heads, ends, rolls)
w1 = rig['apply_rules'](verts, tris, w0, rules, heads, ends)
w2 = rig['rigid_slivers'](verts, tris, w1, rules)
w3 = rig['straight_slivers'](verts, tris, w2, rules)
w4 = rig['limit'](rig['rigid_faces'](verts, tris, w3, rules))
v0 = int(argv[2])


def text(w, v):
    top = np.argsort(-w[v])[:4]
    return ', '.join(f'{BONES[k]} {w[v, k]:.2f}' for k in top if w[v, k] > 0.005)


print(f'vertex {v0} {verts[v0].round(4)}: rules {text(w1, v0)} | slivers {text(w2, v0)} | lines {text(w3, v0)} | final {text(w4, v0)}')
for f, t in enumerate(tris):
    if v0 in t:
        ang = [rig['corner_angle'](verts[t[k]], verts[t[(k+1)%3]], verts[t[(k+2)%3]]) for k in range(3)]
        print(f'face {f}: middle {verts[t].mean(0).round(4)}, angles {np.round(ang, 1)}')
        for v in t:
            print(f'   v {v} {verts[v].round(4)}: rules {text(w1, v)} | final {text(w4, v)}')
