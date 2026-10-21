"""Renders the textured head of the split beak from the front, the left side, and at 45 degrees,
with the lower part of the beak turned open by an angle around the line between the corners of
the mouth, to check the caps of the mouth before the rig.

    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
        --python open_views.py -- <penguin-beak.glb> <out_prefix> <mouth y> <angle degrees>
"""
import math
import sys

import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:]
SOURCE, PREFIX, MOUTH_Y, ANGLE = argv[0], argv[1], float(argv[2]), float(argv[3])
for old in list(bpy.data.objects):
    bpy.data.objects.remove(old)
bpy.ops.import_scene.gltf(filepath=SOURCE)
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
w = ob.matrix_world
zs = [(w @ v.co).z for v in ob.data.vertices]
lo, hi = min(zs), max(zs)
H = hi - lo
mz = lo + MOUTH_Y * H
# The lower part: the vertices of the beak box below the mouth plane, less half the gap.
low = [v for v in ob.data.vertices
       if abs((w @ v.co).x) / H < 0.07 and -(w @ v.co).y / H > 0.135 and (w @ v.co).z < mz - 1e-4
       and (w @ v.co).z > lo + 0.84 * H]
corners = [w @ v.co for v in ob.data.vertices
           if abs((w @ v.co).z - mz) < 1e-6 and -(w @ v.co).y / H > 0.135
           and -(w @ v.co).y / H < 0.145 and abs((w @ v.co).x) / H < 0.06]
pivot = sum(corners, Vector()) / max(len(corners), 1)
# Open: the tip (toward -y of Blender, the front) turns down, around +x.
turn = Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(ANGLE), 4, 'X') @ Matrix.Translation(-pivot)
inv = w.inverted()
for v in low:
    v.co = inv @ (turn @ (w @ v.co))
print(f'{len(low)} lower vertices turn {ANGLE} degrees around {pivot} ({len(corners)} corners)')
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'TEXTURE'
scene.display.shading.show_backface_culling = True
scene.render.resolution_x = 600
scene.render.resolution_y = 600
cd = bpy.data.cameras.new('cam')
cd.type = 'ORTHO'
cd.ortho_scale = 0.22 * H
cam = bpy.data.objects.new('cam', cd)
scene.collection.objects.link(cam)
scene.camera = cam
mid = Vector((0.0, -0.17 * H, lo + 0.88 * H))
for name, d in {'front': (0, -1, 0), 'left': (1, 0, 0), 'q45': (0.7071, -0.7071, 0),
                'below': (0.5, -0.6, -0.62)}.items():
    d = Vector(d).normalized()
    cam.location = mid + d * H * 3
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{PREFIX}-{name}.png'
    bpy.ops.render.render(write_still=True)
