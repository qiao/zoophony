"""Lists the dark faces of a rig source outside the eye and nose boxes (Blender, background).

A face is dark as `face_colors()` of `tools/blender/rig_mesh.py` makes it dark. Run it from the
root of the tree:

    Blender -b --python docs/research/2026-10-26-fifth-bears/dark_faces.py -- <config.json>

The config is a rig config, such as `tools/mesh-rigs/bear.json`. A copy of it with another
`source` probes another file.
"""
import json
import sys

import numpy as np

src = open('tools/blender/rig_mesh.py').read()
src = src[:src.rstrip().rfind('main()')]
ns = {'__name__': 'rig_probe'}
exec(compile(src, 'rig_mesh.py', 'exec'), ns)

argv = sys.argv[sys.argv.index('--') + 1:]
config = json.load(open(argv[0]))
verts, tris, uvs, texture = ns['load_mesh'](config)
rules = config['colors']
colors, dark, share = ns['face_colors'](tris, uvs, texture, rules)
centers = verts[tris].mean(axis=1)
outside = ~ns['feature_boxes'](centers, rules)
idx = np.nonzero(dark & outside)[0]
print(f'DARK {len(idx)} faces outside the boxes')
for f in idx:
    c = centers[f]
    print(f'DARK face {f} center ({c[0]:.4f}, {c[1]:.4f}, {c[2]:.4f}) share {share[f]:.2f} '
          f'color {np.round(colors[f], 3).tolist()} uv {np.round(uvs[f].mean(axis=0), 4).tolist()}')
