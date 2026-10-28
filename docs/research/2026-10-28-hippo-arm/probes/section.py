"""Writes the section of the right wrist of a source GLB in the plane of the wrist bend.

Usage: Blender -b --factory-startup -P docs/research/2026-10-28-hippo-arm/probes/section.py -- <glb> <factor> <out.json> [turn deg]
The plane holds the forearm line and the paw line. `turn` turns the plane around the forearm
line, so that a second section crosses the first at a right angle. The JSON holds the cut edges in
the frame of the plane: x along the forearm from the wrist joint, y across it, in units.
"""
import json
import math
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:]
glb, factor, out = argv[0], float(argv[1]), argv[2]
turn = math.radians(float(argv[3])) if len(argv) > 3 else 0.0
sys.path.insert(0, 'tools/blender')
import violin_arms as va  # noqa: E402

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
mesh = [o for o in bpy.context.selected_objects if o.type == 'MESH'][0]
fr = va.Frame(mesh)
cfg = json.load(open('tools/mesh-rigs/hippo.json'))
j = va.source_joints(cfg['joints'], factor)
side = -1
e = fr.point(j['forearm_L']['head'], side)
w = fr.point(j['hand_L']['head'], side)
t = fr.point(j['fingers_L']['tail'], side)
f = (w - e).normalized()
h = (t - w).normalized()
n = f.cross(h).normalized()
n = Matrix.Rotation(turn, 3, f) @ n
across = n.cross(f).normalized()
bm = bmesh.new()
bm.from_mesh(mesh.data)
bm.transform(mesh.matrix_world)
geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=w, plane_no=n)
H = fr.height
segs = []
for g in res['geom_cut']:
    if isinstance(g, bmesh.types.BMEdge):
        pts = []
        for p in g.verts:
            d = p.co - w
            pts.append([d.dot(f) / H, d.dot(across) / H])
        if all(-0.25 < x < 0.12 and abs(y) < 0.12 for x, y in pts):
            segs.append(pts)
paw = [(t - w).dot(f) / H, (t - w).dot(across) / H]
json.dump({'segs': segs, 'tip': paw}, open(out, 'w'))
print('SEGS', len(segs))
