"""Renders an OBJ of the studio (y up, +z forward, +x left) from the front and the right side,
orthographic, with the soles at the bottom. 1 unit = `ppu` pixels.
Blender -b --factory-startup -P render_obj.py -- <obj> <out prefix> [<ppu>]"""
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
obj, out = argv[0], argv[1]
ppu = float(argv[2]) if len(argv) > 2 else 587.0
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.wm.obj_import(filepath=obj)
mesh = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
zs = [(mesh.matrix_world @ v.co).z for v in mesh.data.vertices]
lo, hi = min(zs), max(zs)
print('height', lo, hi)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'SINGLE'
scene.display.shading.single_color = (0.6, 0.58, 0.6)
scene.world.color = (0.75, 0.75, 0.77)
scene.display.shading.background_type = 'VIEWPORT'
scene.display.shading.background_color = (0.75, 0.75, 0.77)
scene.display.shading.show_cavity = False
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('w') if scene.world is None else scene.world
size = 1.2
scene.render.resolution_x = scene.render.resolution_y = int(size * ppu)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = 'ORTHO'
cam.data.ortho_scale = size
cam.data.clip_end = 100
center = Vector((0, 0, lo + size / 2 - 0.05))
for name, d in (('front', Vector((0, -1, 0))), ('side', Vector((-1, 0, 0)))):
    cam.location = center + d * 10
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{out}-{name}.png'
    bpy.ops.render.render(write_still=True)
print('floor row', int(size * ppu) - int((0.05) * ppu), 'ppu', ppu)
