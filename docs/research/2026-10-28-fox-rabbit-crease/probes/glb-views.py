"""Renders a GLB file (studio units, +z forward, +x the left side) with its edges from
close-views angles. Blender -b --factory-startup -P scratch/glb-views.py -- <out prefix> <cx,cy,cz> <scale> <az:el,...> <glb>"""
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
prefix, center, scale, views, path = argv[:5]
cx, cy, cz = (float(v) for v in center.split(','))
scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=path)
mesh = [o for o in scene.objects if o.type == 'MESH'][0]
for o in list(scene.objects):
    if o.type != 'MESH' or o != mesh:
        if o.type == 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)
# glTF (x, y, z) -> Blender (x, -z, y). The studio left side is +x, so the right side is -x.
target = Vector((cx, -cz, cy))
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.render.resolution_x = scene.render.resolution_y = 600
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = 'ORTHO'
cam.data.ortho_scale = float(scale)
skin = bpy.data.materials.new('skin')
skin.diffuse_color = (0.72, 0.72, 0.76, 1)
ink = bpy.data.materials.new('ink')
ink.diffuse_color = (0.1, 0.1, 0.12, 1)
mesh.data.materials.clear()
mesh.data.materials.append(skin)
for p in mesh.data.polygons:
    p.use_smooth = False
w = mesh.copy()
w.data = mesh.data.copy()
w.data.materials.clear()
w.data.materials.append(ink)
mod = w.modifiers.new('wire', 'WIREFRAME')
mod.thickness = 0.0012 * float(scale)
mod.use_replace = True
scene.collection.objects.link(w)
for view in views.split(','):
    az, el = (float(v) for v in view.split(':'))
    # The studio front is +z (Blender -y). The right side of the animal is -x.
    a, e = math.radians(az), math.radians(el)
    d = Vector((-math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    cam.location = target + d * 5
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{prefix}-az{int(az)}-el{int(el)}.png'
    bpy.ops.render.render(write_still=True)
