"""Renders the wrist of a posed OBJ of docs/research/2026-10-28-hippo-arm/probes/wrist-pose.ts with the band faces in red.

Usage: Blender -b --factory-startup -P docs/research/2026-10-28-hippo-arm/probes/look_wrist.py -- <obj> <band.json> <out.png>
       <center x,y,z> <dir x,y,z>[;<dir>...] [distance] [smooth]
"""
import json
import math
import sys

import bpy
import mathutils

argv = sys.argv[sys.argv.index('--') + 1:]
obj_path, band_path, out_path, center_text, dirs_text = argv[:5]
distance = float(argv[5]) if len(argv) > 5 else 0.35
smooth = len(argv) > 6 and argv[6] == 'smooth'
center = mathutils.Vector([float(v) for v in center_text.split(',')])
dirs = [mathutils.Vector([float(v) for v in d.split(',')]) for d in dirs_text.split(';')]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=obj_path, forward_axis='Y', up_axis='Z')
ob = bpy.context.selected_objects[0]
# The OBJ holds y up: the import keeps the axes, so turn it back to the model axes.
ob.rotation_euler = (0, 0, 0)
ob.matrix_world = mathutils.Matrix.Identity(4)
band = set(json.load(open(band_path)))
red = bpy.data.materials.new('band')
red.diffuse_color = (0.9, 0.1, 0.1, 1)
gray = bpy.data.materials.new('skin')
gray.diffuse_color = (0.75, 0.7, 0.68, 1)
ob.data.materials.append(gray)
ob.data.materials.append(red)
for p in ob.data.polygons:
    p.material_index = 1 if p.index in band else 0
    p.use_smooth = smooth

scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_cavity = False
scene.render.resolution_x = 640
scene.render.resolution_y = 640
cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 50
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
paths = []
for k, d in enumerate(dirs):
    d = d.normalized()
    cam.location = center + d * distance
    look = (center - cam.location).normalized()
    up = mathutils.Vector((0, 1, 0))
    right = look.cross(up).normalized()
    up = right.cross(look).normalized()
    rot = mathutils.Matrix((right, up, -look)).transposed()
    cam.rotation_euler = rot.to_euler()
    path = out_path.replace('.png', f'-{k}.png')
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    paths.append(path)
print('WROTE', paths)
