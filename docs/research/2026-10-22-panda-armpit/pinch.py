"""Prints the vertices of the open edges of a mesh copy that have more than two open edges.
    blender -b --factory-startup --python pinch.py -- <root> <config.json> <glb>"""
import json, os, sys
import numpy as np
argv = sys.argv[sys.argv.index('--') + 1:]
ROOT = argv[0]
RIG = os.path.join(ROOT, 'tools', 'blender', 'rig_mesh.py')
code = open(RIG).read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)
os.chdir(ROOT)
config = json.load(open(argv[1]))
config['source'] = argv[2]
verts, tris, uvs, tex = rig['load_mesh'](config)
faces = {}
for k, t in enumerate(tris):
    for i in range(3):
        a, b = int(t[i]), int(t[(i + 1) % 3])
        faces.setdefault((min(a, b), max(a, b)), []).append(k)
count = {}
for e, fs in faces.items():
    if len(fs) == 1:
        for v in e:
            count[v] = count.get(v, 0) + 1
    if len(fs) > 2:
        print('edge with', len(fs), 'faces', e, verts[list(e)].round(3).tolist())
for v, c in count.items():
    if c != 2:
        print('pinch', v, c, verts[v].round(4).tolist())
print('open vertices', len(count), 'y range', min(verts[v, 1] for v in count), max(verts[v, 1] for v in count))
