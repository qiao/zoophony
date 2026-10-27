"""Dumps the welded source mesh of a config in studio units: points, tris, uvs (npz)."""
import json, os, sys
import numpy as np
src = open('tools/blender/rig_mesh.py').read()
src = src[:src.rstrip().rfind('main()')]
ns = {'__name__': 'rig_probe'}
exec(compile(src, 'rig_mesh.py', 'exec'), ns)
argv = sys.argv[sys.argv.index('--') + 1:]
config = json.load(open(argv[0]))
if len(argv) > 2:
    config['source'] = argv[2]
verts, tris, uvs, tex = ns['load_mesh'](config)
np.savez(argv[1], points=verts, tris=tris, uvs=uvs)
print('dumped', len(verts), len(tris))
