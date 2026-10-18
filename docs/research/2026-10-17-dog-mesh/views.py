"""Renders the textured dog mesh from the front, the left side, the back, and 35 degrees, with an
orthographic camera and a flat light (Workbench, the texture color).

    blender -b --factory-startup --python views.py -- <dog.glb> <out-dir>
"""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1 :]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
out = argv[1]
os.makedirs(out, exist_ok=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'TEXTURE'
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('w')
scene.world.color = (0.25, 0.25, 0.25)
cam = bpy.data.cameras.new('c')
cam.type = 'ORTHO'
cam.ortho_scale = 2.1
ob = bpy.data.objects.new('c', cam)
scene.collection.objects.link(ob)
scene.camera = ob
# Blender axes: z up, the dog faces -y (glTF +z).
for name, az in (('front', 0), ('left', 90), ('back', 180), ('q35', 35), ('right', -90)):
    a = math.radians(az)
    d = Vector((math.sin(a), -math.cos(a), 0))
    ob.location = d * 5 + Vector((0, 0, 0))
    ob.rotation_euler = (math.pi / 2, 0, a)
    scene.render.filepath = os.path.join(out, f'{name}.png')
    bpy.ops.render.render(write_still=True)
