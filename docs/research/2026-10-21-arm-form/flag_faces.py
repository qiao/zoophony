"""Paints flagged module faces on the source shape, from a faces dump.

    blender -b --factory-startup --python scratch/flag_faces.py -- <faces.json> <flags.json> \
        <out-prefix> <x> <y> <z> <size> [long]
"""
import json
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
faces = [f for f in json.load(open(argv[0])) if f != 'eye']
flags = set(json.load(open(argv[1])))
prefix = argv[2]
px, py, pz, size = (float(v) for v in argv[3:7])
key = 'l' if len(argv) > 7 and argv[7] == 'long' else 's'
bpy.ops.wm.read_factory_settings(use_empty=True)
verts, tris, red = [], [], []
for i, f in enumerate(faces):
    if not f:
        continue
    base = len(verts)
    for x, y, z in f[key]:
        verts.append((x, -z, y))  # studio axes to Blender: x left, -z forward is -y, y up is z
    tris.append((base, base + 1, base + 2))
    red.append(i in flags)
mesh = bpy.data.meshes.new('m')
mesh.from_pydata(verts, [], tris)
ob = bpy.data.objects.new('m', mesh)
bpy.context.scene.collection.objects.link(ob)
attr = mesh.color_attributes.new('c', 'FLOAT_COLOR', 'CORNER')
for p, r in zip(mesh.polygons, red):
    for li in p.loop_indices:
        attr.data[li].color = (0.95, 0.2, 0.2, 1) if r else (0.8, 0.78, 0.74, 1)
mesh.color_attributes.active_color = attr
mesh.color_attributes.render_color_index = 0
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'VERTEX'
scene.display.shading.show_backface_culling = False
scene.render.resolution_x = 600
scene.render.resolution_y = 600
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = size
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
target = Vector((px, -pz, py))
for name, d in (('front', Vector((0, -1, 0.05))), ('side', Vector((1, 0, 0.05))),
                ('q34', Vector((0.7, -0.7, 0.1))), ('back', Vector((0.5, 1, 0.1)))):
    d = d.normalized()
    cam.location = target + d * 3
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{prefix}-{name}.png'
    bpy.ops.render.render(write_still=True)
