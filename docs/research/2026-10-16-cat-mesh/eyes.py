"""Measures the dark faces of each eye of the fox mesh, as `features()` of
`tools/blender/rig_mesh.py` finds them: the patches of faces that share edges, the open edges of
each eye, the corners with more than one open edge out of them, and the closed loops that
`boundary_loop()` finds.

    blender -b --factory-startup --python eyes.py -- <fox.json>
"""

import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RIG = os.path.join(HERE, '..', '..', '..', 'tools', 'blender', 'rig_mesh.py')
argv = sys.argv[sys.argv.index('--') + 1 :]
with open(argv[0]) as f:
    config = json.load(f)
with open(RIG) as f:
    code = f.read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)
os.chdir(os.path.join(HERE, '..', '..', '..'))
verts, tris, uvs, texture = rig['load_mesh'](config)
colors, dark = rig['face_colors'](tris, uvs, texture, config['colors'])
eyes, nose = rig['features'](verts, tris, colors, dark, config['colors'])
for side in 'LR':
    faces = tris[eyes[side]]
    count = {}
    for t in faces:
        for k in range(3):
            edge = (int(t[k]), int(t[(k + 1) % 3]))
            count[edge] = count.get(edge, 0) + 1
    open_edges = [(a, b) for (a, b) in count if (b, a) not in count]
    out = {}
    for a, b in open_edges:
        out[a] = out.get(a, 0) + 1
    pinch = [v for v, n in out.items() if n > 1]
    parent = {}

    def root(k):
        while parent.setdefault(k, k) != k:
            k = parent[k]
        return k

    for t in faces:
        for k in range(3):
            a, b = root(int(t[k])), root(int(t[(k + 1) % 3]))
            if a != b:
                parent[a] = b
    patches = len({root(int(v)) for v in faces.ravel()})
    loop = rig['boundary_loop'](faces)
    centers = verts[faces].mean(axis=1)
    print(f'eye {side}: {len(faces)} dark faces in {patches} patches, {len(open_edges)} open edges, '
          f'{len(pinch)} corners with two open edges out of them, the longest closed loop '
          f'{len(loop)} points. The face middles: x {centers[:, 0].min():+.3f}..{centers[:, 0].max():+.3f} '
          f'y {centers[:, 1].min():.3f}..{centers[:, 1].max():.3f} z {centers[:, 2].min():.3f}..'
          f'{centers[:, 2].max():.3f}')
centers = verts[tris[nose]].mean(axis=1)
print(f'nose: {len(nose)} faces, middles y {centers[:, 1].min():.3f}..{centers[:, 1].max():.3f} '
      f'z {centers[:, 2].min():.3f}..{centers[:, 2].max():.3f}')
