"""Renders an OBJ file of `arm-rings.ts --obj` (the app axes: y up, the front at -z, the left
side at -x) around a target point, with flat faces and the vertex colors.

    Blender -b --factory-startup --python scratch/armviews.py -- <obj> <out prefix> <tx,ty,tz>
        <scale> <az:el,...> [smooth]

Each view writes <out prefix>-az<az>-el<el>.png. The azimuth turns the camera to the right side of
the animal (0 is the front, -90 the left side), as in `pnpm close-views`.
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
smooth = len(argv) > 5 and argv[5] == 'smooth'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=path)
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
for p in ob.data.polygons:
    p.use_smooth = smooth
if smooth:
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
