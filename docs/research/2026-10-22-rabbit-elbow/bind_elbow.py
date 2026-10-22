"""Renders the right elbow of the seated bind of a rig GLB file from six directions, in Blender.

    blender -b --python bind_elbow.py -- <rig.glb> <out.png> [<side R|L>] [<size>]

The views: back, azimuth 150, right, front, left, azimuth 35 (azimuth 0 looks at the front of the
animal), and one view from below. Each face shows its own flat normal, so that each facet reads.
"""
import math
import sys

import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
path, out = argv[0], argv[1]
side = argv[2] if len(argv) > 2 else 'R'
size = float(argv[3]) if len(argv) > 3 else 0.35
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and len(o.data.polygons) > 1000)
for o in list(bpy.context.scene.objects):
    if o not in (arm, mesh) and o.type == 'MESH':
        bpy.data.objects.remove(o)
for p in mesh.data.polygons:
    p.use_smooth = False
bone = arm.pose.bones[f'forearm_{side}']
center = arm.matrix_world @ bone.head
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'SINGLE'
scene.display.shading.single_color = (0.85, 0.8, 0.72)
scene.display.shading.show_cavity = False
scene.render.resolution_x = 400
scene.render.resolution_y = 400
scene.render.film_transparent = False
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = size
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
views = [('back', 180, 0), ('az150', 150, 0), ('right', 90, 0), ('front', 0, 0),
         ('left', -90, 0), ('az35', 35, 0), ('below', 120, -60)]
if side == 'L':
    views = [(n, -a if n not in ('back', 'front') else a, e) for n, a, e in views]
paths = []
for name, az, el in views:
    a, e = math.radians(az), math.radians(el)
    # The animal faces -y in Blender. Azimuth 90 looks at its right side (-x).
    d = Vector((-math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    cam.location = center + d * 3
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    p = f'{out}.{name}.png'
    scene.render.filepath = p
    bpy.ops.render.render(write_still=True)
    paths.append(p)
imgs = [bpy.data.images.load(p) for p in paths]
pix = [np.array(i.pixels[:], np.float32).reshape(400, 400, 4) for i in imgs]
sheet = bpy.data.images.new('sheet', 400 * len(pix), 400)
sheet.pixels = np.concatenate(pix, axis=1).ravel()
sheet.filepath_raw = out
sheet.file_format = 'PNG'
sheet.save()
import os
for p in paths:
    os.remove(p)
