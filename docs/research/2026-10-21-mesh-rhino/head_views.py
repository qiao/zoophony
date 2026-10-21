"""Renders the textured head of a mesh from the front, the left side, and at 45 degrees, with an
orthographic camera at a point and a span in the units of the studio.

    blender -b --factory-startup --python head_views.py -- <mesh.glb> <out_prefix> <x> <y> <z> <span>
"""
import math, sys
import bpy
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1 :]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
lo = Vector([min(c[i] for c in corners) for i in range(3)]); hi = Vector([max(c[i] for c in corners) for i in range(3)])
H = hi.z - lo.z
# center in studio units (x, y, z) -> blender (x, -z, y)
cx, cy, cz, span = map(float, argv[2:6])
mid = Vector((cx * H, -cz * H, lo.z + cy * H))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'TEXTURE'
scene.render.resolution_x = 800; scene.render.resolution_y = 800
cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'; cd.ortho_scale = span * H
cam = bpy.data.objects.new('cam', cd); scene.collection.objects.link(cam); scene.camera = cam
for name, d in {'front': (0, -1, 0), 'left': (1, 0, 0), 'q45': (0.7071, -0.7071, 0)}.items():
    d = Vector(d).normalized(); cam.location = mid + d * H * 3
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{argv[1]}-{name}.png'; bpy.ops.render.render(write_still=True)
