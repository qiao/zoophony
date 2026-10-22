"""Prints the open loops of a mesh copy with their y range and x sign.
    blender -b --factory-startup --python holes.py -- <root> <config.json> <glb>"""
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
adj = {}
for e, fs in faces.items():
    if len(fs) == 1:
        a, b = e
        adj.setdefault(a, set()).add(b); adj.setdefault(b, set()).add(a)
seen = set()
for v in adj:
    if v in seen: continue
    comp = [v]; seen.add(v); i = 0
    while i < len(comp):
        for w in adj[comp[i]]:
            if w not in seen: seen.add(w); comp.append(w)
        i += 1
    p = verts[comp]
    print(len(comp), 'y', p[:, 1].min().round(3), p[:, 1].max().round(3), 'x', p[:, 0].min().round(3), p[:, 0].max().round(3))
