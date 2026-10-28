"""Renders an OBJ file of `mark-obj.ts` (app axes) around a target point with smooth faces, the
vertex colors, and a thin black wireframe on top.

    Blender -b --factory-startup --python scratch/armwire.py -- <obj> <out prefix> <tx,ty,tz>
        <scale> <az:el,...> [wire]
"""
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
path, out = argv[0], argv[1]
tx, ty, tz = (float(v) for v in argv[2].split(','))
scale = float(argv[3])
views = [tuple(float(x) for x in v.split(':')) for v in argv[4].split(',')]
wire = len(argv) > 5 and argv[5] == 'wire'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=path)
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = ob
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=1e-5)
bpy.ops.object.mode_set(mode='OBJECT')
for p in ob.data.polygons:
    p.use_smooth = True
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'VERTEX'
scene.display.shading.show_cavity = False
scene.render.resolution_x = 700
scene.render.resolution_y = 700
if wire:
    w = ob.copy()
    w.data = ob.data.copy()
    scene.collection.objects.link(w)
    for a in list(w.data.color_attributes):
        w.data.color_attributes.remove(a)
    col = w.data.color_attributes.new('c', 'FLOAT_COLOR', 'POINT')
    for d in col.data:
        d.color = (0.02, 0.02, 0.02, 1)
    mod = w.modifiers.new('wire', 'WIREFRAME')
    mod.thickness = 0.0006
    mod.use_replace = True
target = Vector((tx, -tz, ty))
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = scale
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
for az, el in views:
    a, e = math.radians(az), math.radians(el)
    d = Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))
    cam.location = target + d * 3
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{out}-az{int(az)}-el{int(el)}.png'
    bpy.ops.render.render(write_still=True)
