"""Renders the beaver mesh of the user from the front, the left side, the back, and at 45 degrees.

    blender -b --factory-startup --python source_views.py -- <beaver.glb> <out_dir>

Each view is an orthographic render with the base color texture and no light (Workbench). The
views are in the axes of the studio: +z forward, +x the left side of the animal. The axes of the
file differ from these axes by the turn of dump.py.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1 :]
out = argv[1]
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
lo = Vector([min(c[i] for c in corners) for i in range(3)])
hi = Vector([max(c[i] for c in corners) for i in range(3)])
center = (lo + hi) / 2
size = max(hi - lo)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'FLAT'
scene.display.shading.color_type = 'TEXTURE'
scene.render.resolution_x = 600
scene.render.resolution_y = 600
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('w')
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = size * 1.1
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
# The studio axes in the file axes: studio +z (forward) is file -y, studio +x is file +x.
views = {
    'front': Vector((0, -1, 0)),
    'left': Vector((1, 0, 0)),
    'back': Vector((0, 1, 0)),
    'front-left': Vector((math.sqrt(0.5), -math.sqrt(0.5), 0)),
    'top': Vector((0, 0, 1)),
}
for name, d in views.items():
    cam.location = center + d * size * 3
    up = 'Y' if name != 'top' else 'Y'
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y' if name != 'top' else 'Y').to_euler()
    scene.render.filepath = os.path.join(out, f'{name}.png')
    bpy.ops.render.render(write_still=True)
