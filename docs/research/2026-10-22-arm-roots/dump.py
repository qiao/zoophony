"""Writes the welded vertices (studio units and axes) and the triangles of the mesh to an npz file.

    blender -b --factory-startup --python dump.py -- <bear.glb> <out.npz>
"""
import sys

import bmesh
import bpy
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1 :]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bm = bmesh.new()
bm.from_mesh(ob.data)
bm.transform(ob.matrix_world)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bmesh.ops.triangulate(bm, faces=bm.faces)
bm.verts.ensure_lookup_table()
v = np.array([list(x.co) for x in bm.verts])
v = np.stack([v[:, 0], v[:, 2], -v[:, 1]], axis=1)
tris = np.array([[x.index for x in f.verts] for f in bm.faces])
lo, hi = v[:, 1].min(), v[:, 1].max()
v = (v - [0, lo, 0]) / (hi - lo)
np.savez(argv[1], v=v, tris=tris)
print('wrote', len(v), len(tris))
