"""Renders the textured head of the source mesh from the front and from the left side, with a grid
of the studio units (y up, +z forward, +x the left side), so that the eyes, the nose, and the
stripes can be located.

    blender -b --factory-startup --python head_views.py -- <mesh.glb> <out_prefix>
"""
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
height = hi.z - lo.z
# The studio point (x, y, z) is the Blender point (x, -z, y) times the height, over the floor.
def blender(x, y, z):
    return Vector((x * height, -z * height, lo.z + y * height))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'FLAT'
scene.display.shading.color_type = 'TEXTURE'
scene.render.resolution_x = 800
scene.render.resolution_y = 800
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 0.4 * height
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
target = blender(0, 0.88, 0.1)
for name, d in {'front': (0, -1, 0), 'left': (1, 0, 0)}.items():
    d = Vector(d)
    cam.location = target + d * height * 2
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{argv[1]}-{name}.png'
    bpy.ops.render.render(write_still=True)
print('the image spans 0.4 units around (0, 0.88, 0.1): x or z from -0.2 to 0.2 of the middle, y 0.68 to 1.08')
