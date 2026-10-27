"""Prints the source and bind places of named vertices of the rig input of refine() (Blender).

    Blender -b --factory-startup --python scratch/a/edge_at.py -- <config> <out.glb> <v>...
"""
import sys

import numpy as np

src = open('tools/blender/rig_mesh.py').read()
src = src[:src.rstrip().rfind('main()')]
ns = {'__name__': 'rig_probe'}
exec(compile(src, 'rig_mesh.py', 'exec'), ns)
argv = sys.argv[sys.argv.index('--') + 1:]
named = [int(v) for v in argv[2:]]
sys.argv = sys.argv[:sys.argv.index('--') + 1] + argv[:2]
original_refine = ns['refine']


def refine(*args, **kwargs):
    verts, tris, uvs, weights, heads, ends, matrices, config, source = args
    bind = ns['bind_skin'](config, weights, matrices, verts)
    for v in named:
        print(f'VERT {v}: source {np.round(source[v], 5).tolist()} long {np.round(verts[v], 5).tolist()} bind {np.round(bind[v], 5).tolist()}')
    a, b = named[:2]
    print(f'EDGE {a}-{b}: source middle {np.round((source[a] + source[b]) / 2, 5).tolist()}')
    faces = [f for f in range(len(tris)) if a in tris[f] and b in tris[f]]
    for f in faces:
        print(f'FACE {f}: {tris[f].tolist()} source middle {np.round(source[tris[f]].mean(axis=0), 4).tolist()}')
    raise SystemExit(0)


ns['refine'] = refine
ns['main']()
