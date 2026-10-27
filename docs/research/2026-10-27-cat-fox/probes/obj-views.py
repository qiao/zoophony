"""Renders OBJ files of posed skins (meters, the model faces -z, its left side at -x) with the
edges, from the azimuths and elevations of close-views (az 0 front, az -90 the left side).

Blender -b --factory-startup -P scratch/obj-views.py -- <out prefix> <cx,cy,cz> <scale> <az:el,...> <obj>...
"""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
prefix, center, scale, views = argv[:4]
objs = argv[4:]
cx, cy, cz = (float(v) for v in center.split(','))
target = Vector((cx, -cz, cy))
scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'VERTEX' if os.environ.get('TINT') else 'MATERIAL'
scene.display.shading.show_backface_culling = False
scene.render.resolution_x = scene.render.resolution_y = 600
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = 'ORTHO'
cam.data.ortho_scale = float(scale)
cam.data.clip_end = 100
skin = bpy.data.materials.new('skin')
skin.diffuse_color = (0.72, 0.72, 0.76, 1)
ink = bpy.data.materials.new('ink')
ink.diffuse_color = (0.1, 0.1, 0.12, 1)
for path in objs:
    for o in list(scene.objects):
        if o.type == 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.wm.obj_import(filepath=path)
    mesh = [o for o in scene.objects if o.type == 'MESH'][0]
    mesh.data.materials.clear()
    mesh.data.materials.append(skin)
    for p in mesh.data.polygons:
        p.use_smooth = False
    marks = path[:-4] + '-folded.txt'
    if os.path.exists(marks):
        red = bpy.data.materials.get('red') or bpy.data.materials.new('red')
        red.diffuse_color = (0.9, 0.1, 0.1, 1)
        mesh.data.materials.append(red)
        ids = {int(t) for t in open(marks).read().split()}
        for p in mesh.data.polygons:
            if p.index in ids:
                p.material_index = 1
    w = mesh.copy()
    w.data = mesh.data.copy()
    w.data.materials.clear()
    w.data.materials.append(ink)
    mod = w.modifiers.new('wire', 'WIREFRAME')
    mod.thickness = 0.0012 * float(scale)
    mod.use_replace = True
    scene.collection.objects.link(w)
    name = os.path.splitext(os.path.basename(path))[0]
    for view in views.split(','):
        az, el = (float(v) for v in view.split(':'))
        a, e = math.radians(az), math.radians(el)
        d = Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))
        cam.location = target + d * 5
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = f'{prefix}-{name}-az{int(az)}-el{int(el)}.png'
        bpy.ops.render.render(write_still=True)
