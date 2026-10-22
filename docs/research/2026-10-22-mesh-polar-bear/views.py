"""Renders the textured source mesh from the front, the left side, the back, the right side, and the top.

    blender -b --factory-startup --python views.py -- <mesh.glb> <out_prefix>
"""
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1 :]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
lo = Vector([min(c[i] for c in corners) for i in range(3)])
hi = Vector([max(c[i] for c in corners) for i in range(3)])
mid = (lo + hi) / 2
size = max(hi - lo)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'TEXTURE'
scene.render.resolution_x = 700
scene.render.resolution_y = 700
scene.render.film_transparent = False
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = size * 1.1
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
# Blender axes after the glTF import: -y is the front of glTF +z, z is up.
views = {'front': (0, -1, 0), 'left': (1, 0, 0), 'back': (0, 1, 0), 'right': (-1, 0, 0), 'top': (0, -0.01, 1)}
for name, d in views.items():
    d = Vector(d).normalized()
    cam.location = mid + d * size * 3
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{argv[1]}-{name}.png'
    bpy.ops.render.render(write_still=True)
