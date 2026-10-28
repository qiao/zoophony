"""Renders a part of a GLB file from several directions (Workbench), in the axes of the file (y up).

Usage: Blender -b --factory-startup -P docs/research/2026-10-28-hippo-arm/probes/look_glb.py -- <glb> <out.png> <center x,y,z>
       <dir x,y,z>[;<dir>...] [distance] [wire]
"""
import sys

import bpy
import mathutils

argv = sys.argv[sys.argv.index('--') + 1:]
glb, out_path, center_text, dirs_text = argv[:4]
distance = float(argv[4]) if len(argv) > 4 else 0.35
wire = len(argv) > 5 and argv[5] == 'wire'
center = mathutils.Vector([float(v) for v in center_text.split(',')])
dirs = [mathutils.Vector([float(v) for v in d.split(',')]) for d in dirs_text.split(';')]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
# glTF y up becomes Blender z up: (x, y, z) -> (x, -z, y). Turn the points back.
conv = mathutils.Matrix(((1, 0, 0), (0, -1, 0), (0, 0, 1)))
to_blender = lambda v: mathutils.Vector((v.x, -v.z, v.y))
center = to_blender(center)
dirs = [to_blender(d) for d in dirs]
for ob in bpy.data.objects:
    if ob.type == 'ARMATURE':
        ob.data.pose_position = 'REST'
    if ob.type == 'MESH' and wire:
        mod = ob.modifiers.new('wire', 'WIREFRAME')
        mod.thickness = 0.0015
        mod.use_replace = False

scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'TEXTURE'
scene.render.resolution_x = 640
scene.render.resolution_y = 640
cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 50
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
paths = []
for k, d in enumerate(dirs):
    d = d.normalized()
    cam.location = center + d * distance
    look = (center - cam.location).normalized()
    up = mathutils.Vector((0, 0, 1))
    right = look.cross(up).normalized()
    up = right.cross(look).normalized()
    rot = mathutils.Matrix((right, up, -look)).transposed()
    cam.rotation_euler = rot.to_euler()
    path = out_path.replace('.png', f'-{k}.png')
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    paths.append(path)
print('WROTE', paths)
