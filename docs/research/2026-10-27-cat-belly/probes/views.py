"""Renders the trunk of a cat GLB file from the front, the side, and at 35 degrees, with flat
faces, the base color, and one key light, so that the steps of the pipeline compare.

    blender -b --factory-startup --python scratch/views.py -- <glb> <out prefix> [rig]

With `rig`, the file is the rig of `pnpm rig-mesh` in the seated bind, with vertex colors.
"""

import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
path, out = argv[0], argv[1]
rig = len(argv) > 2 and argv[2] == 'rig'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
body = max(meshes, key=lambda o: len(o.data.vertices))
for o in meshes:
    if o is not body and o.name.startswith('Icosphere'):
        o.hide_render = True
meshes = [body]
lo = Vector((1e9, 1e9, 1e9))
hi = Vector((-1e9, -1e9, -1e9))
for o in meshes:
    for v in o.data.vertices:
        p = o.matrix_world @ v.co
        lo = Vector(map(min, lo, p))
        hi = Vector(map(max, hi, p))
height = hi.z - lo.z
# The trunk middle: about 0.42 of the height above the soles in the source, and the seated
# bind of the rig is lower.
mid = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z + (0.36 if rig else 0.42) * height))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'TEXTURE' if not rig else 'VERTEX'
for o in meshes:
    for p in o.data.polygons:
        p.use_smooth = False
scene.render.resolution_x = 700
scene.render.resolution_y = 800
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 0.62 * height
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
# Blender axes of a glTF file: -y is the +z of glTF (forward of the source).
for name, az in (('front', 0), ('front35', 35), ('left', 90), ('right', -90)):
    a = math.radians(az)
    # d is the direction from the middle to the camera: in front of the animal.
    d = Vector((-math.sin(a), -math.cos(a), 0))
    cam.location = mid + d * 5
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{out}-{name}.png'
    bpy.ops.render.render(write_still=True)
