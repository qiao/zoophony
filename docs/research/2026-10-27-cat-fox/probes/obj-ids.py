"""Renders an OBJ with each face in a flat color that encodes its index (r + 256 g), from close-views angles.
Blender -b --factory-startup -P scratch/obj-ids.py -- <out prefix> <cx,cy,cz> <scale> <az:el,...> <obj>
"""
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
prefix, center, scale, views, path = argv[:5]
cx, cy, cz = (float(v) for v in center.split(','))
target = Vector((cx, -cz, cy))
scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'FLAT'
scene.display.shading.color_type = 'VERTEX'
scene.display.shading.show_backface_culling = False
scene.view_settings.view_transform = 'Standard'
scene.render.resolution_x = scene.render.resolution_y = 600
scene.render.filter_size = 0.0
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = 'ORTHO'
cam.data.ortho_scale = float(scale)
bpy.ops.wm.obj_import(filepath=path)
mesh = [o for o in scene.objects if o.type == 'MESH'][0]
me = mesh.data
for a in list(me.color_attributes):
    me.color_attributes.remove(a)
col = me.color_attributes.new('ids', 'BYTE_COLOR', 'CORNER')
for p in me.polygons:
    i = p.index + 1
    c = ((i % 256) / 255.0, ((i // 256) % 256) / 255.0, 0.0, 1.0)
    for li in p.loop_indices:
        col.data[li].color_srgb = c
me.color_attributes.active_color = col
for view in views.split(','):
    az, el = (float(v) for v in view.split(':'))
    a, e = math.radians(az), math.radians(el)
    d = Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))
    cam.location = target + d * 5
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{prefix}-az{int(az)}-el{int(el)}.png'
    bpy.ops.render.render(write_still=True)
