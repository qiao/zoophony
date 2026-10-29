"""Dumps the seated bind of a rig GLB file: points, tris, the dominant bone of each point, and the
bone heads, in the axes of the studio (y up, +z forward, +x the left side), in the units of the
file (npz).

    blender -b --factory-startup --python dump_rig.py -- <rig.glb> <out.npz>
"""
import sys

import bpy
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
bpy.ops.import_scene.gltf(filepath=argv[0])
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
skin = max(meshes, key=lambda o: len(o.data.vertices))


def studio(v):
    # Blender is z up and -y forward after the glTF import: glTF (x, y, z) -> (x, -z, y).
    return [v[0], v[2], -v[1]]


mw = skin.matrix_world
pts = np.array([studio(mw @ v.co) for v in skin.data.vertices])
skin.data.calc_loop_triangles()
tris = np.array([list(t.vertices) for t in skin.data.loop_triangles])
names = [g.name for g in skin.vertex_groups]
dom = []
for v in skin.data.vertices:
    best = max(v.groups, key=lambda g: g.weight, default=None)
    dom.append(names[best.group] if best else '')
aw = arm.matrix_world
heads = {b.name: studio(aw @ b.head_local) for b in arm.data.bones}
hn = sorted(heads)
np.savez(argv[1], points=pts, tris=tris, dom=np.array(dom), head_names=np.array(hn),
         heads=np.array([heads[n] for n in hn]))
print('dumped', len(pts), len(tris), 'bones', len(hn), 'mesh', skin.name, [m.name for m in meshes])
