"""Renders the head of a rig GLB file of the panda with its face colors (COLOR_0) from the front,
at 35 degrees, and from the side, with an orthographic camera and the studio light of Workbench.

    blender -b --factory-startup --python head_views.py -- <rig.glb> <out.png>
"""
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1 :]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
body = max(meshes, key=lambda o: len(o.data.vertices))
for o in meshes:
    if o is not body:
        o.hide_render = True
zs = [(body.matrix_world @ v.co).z for v in body.data.vertices]
top = max(zs)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'VERTEX'
scene.render.resolution_x = 500
scene.render.resolution_y = 500
cam = bpy.data.objects.new('c', bpy.data.cameras.new('c'))
cam.data.type = 'ORTHO'
scene.collection.objects.link(cam)
scene.camera = cam
xs = [(body.matrix_world @ v.co) for v in body.data.vertices]
height = top - min(zs)
cam.data.ortho_scale = 0.32 * height
center = Vector((0, 0, top - 0.16 * height))
paths = []
for name, az in (('front', 0), ('q35', 35), ('side', 90)):
    a = math.radians(az)
    d = Vector((math.sin(a), -math.cos(a), 0.1)).normalized()
    cam.location = center + d * 5 * height
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    path = argv[1].replace('.png', f'-{name}.png')
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    paths.append(path)
images = [bpy.data.images.load(p) for p in paths]
import numpy as np
pixels = [np.array(img.pixels[:], np.float32).reshape(500, 500, 4) for img in images]
sheet = bpy.data.images.new('sheet', 1500, 500)
sheet.pixels = np.concatenate(pixels, axis=1).ravel()
sheet.filepath_raw = argv[1]
sheet.file_format = 'PNG'
sheet.save()
print('wrote', argv[1])
