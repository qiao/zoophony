"""Renders the posed trunk of the probe (an OBJ file in the bind frame of the hips, with the
model facing -z and its left side at -x) from the front, at 35 degrees, and from the left, with
flat faces and the vertex colors, with lines at the measure levels.

    blender -b --factory-startup --python scratch/objviews.py -- <obj> <out prefix> [hips y] [neck y]
"""

import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
path, out = argv[0], argv[1]
hips = float(argv[2]) if len(argv) > 2 else 0.4305
neck = float(argv[3]) if len(argv) > 3 else 0.937
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=path)
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
for p in ob.data.polygons:
    p.use_smooth = False
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'VERTEX'
scene.render.resolution_x = 600
scene.render.resolution_y = 700
# Level marks: thin rings at f 0.1, 0.2, ..., 0.8 of the hips to neck line, in Blender z.
mat = bpy.data.materials.new('mark')
mat.diffuse_color = (1.0, 0.1, 0.1, 1.0)
for k in range(1, 9):
    f = k / 10
    z = hips + f * (neck - hips)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.30, minor_radius=0.0012,
                                     location=(0, 0, z), major_segments=96, minor_segments=4)
    t = bpy.context.active_object
    attr = t.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for c in attr.data:
        c.color = (1.0, 0.05, 0.05, 1.0)
    t.data.color_attributes.active_color = attr
scene.display.shading.color_type = 'VERTEX'
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 0.75
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
mid = Vector((0, 0.0, hips + 0.35 * (neck - hips)))
for name, az in (('front', 0), ('az35', 35), ('left', 90), ('right', -90)):
    a = math.radians(az)
    # The front of the model is +y in Blender after the import of an OBJ file (-z of the file).
    # Its left side is -x.
    d = Vector((-math.sin(a), math.cos(a), 0))
    cam.location = mid + d * 5
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{out}-{name}.png'
    bpy.ops.render.render(write_still=True)
