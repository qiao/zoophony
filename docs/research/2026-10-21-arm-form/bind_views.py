"""Renders the seated bind of a rig GLB file near the shoulders, with flat shading.

    blender -b --factory-startup --python scratch/bind_views.py -- <in.glb> <out-prefix> [--source]

With --source, the file is a source mesh: it renders the mesh as it is.
"""
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
path, prefix = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
# The largest mesh is the body.
body = max(meshes, key=lambda o: len(o.data.polygons))
for o in meshes:
    if o is not body:
        o.hide_render = True
for o in bpy.context.scene.objects:
    if o.type == 'ARMATURE':
        o.data.pose_position = 'REST'
bpy.context.view_layer.update()
deps = bpy.context.evaluated_depsgraph_get()
ev = body.evaluated_get(deps)
pts = [ev.matrix_world @ v.co for v in ev.data.vertices]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
height = hi.z - lo.z
# The shoulders: near the upper part of the body.
target = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z + 0.6 * height))

# Paint the weight of the left upper arm (red) and the left clavicle (blue) into a color.
mode = argv[2] if len(argv) > 2 else 'flat'
if mode == 'weights':
    groups = {g.name: g.index for g in body.vertex_groups}
    print('groups', sorted(groups)[:40])
    ua = groups.get('upper_arm_L')
    cl = groups.get('clavicle_L')
    attr = body.data.color_attributes.new('w', 'FLOAT_COLOR', 'POINT')
    for v in body.data.vertices:
        wu = sum(g.weight for g in v.groups if g.group == ua)
        wc = sum(g.weight for g in v.groups if g.group == cl)
        attr.data[v.index].color = (0.25 + 0.75 * wu, 0.25, 0.25 + 0.75 * wc, 1)
    body.data.color_attributes.active_color = attr
    body.data.color_attributes.render_color_index = list(body.data.color_attributes).index(attr)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'SINGLE'
scene.display.shading.single_color = (0.8, 0.75, 0.7)
if mode == 'weights':
    scene.display.shading.color_type = 'VERTEX'
scene.display.shading.show_cavity = False
scene.render.resolution_x = 800
scene.render.resolution_y = 800
scene.render.film_transparent = False
world = bpy.data.worlds.new('w')
scene.world = world

cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 0.75 * height
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

# glTF +z forward of the studio maps to Blender -y. The front camera looks from -y.
for name, az in (('front', 0), ('q34', 45), ('side', 90), ('q34r', -45)):
    a = math.radians(az)
    d = Vector((math.sin(a), -math.cos(a), 0.15)).normalized()
    cam.location = target + d * 5 * height
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{prefix}-{name}.png'
    bpy.ops.render.render(write_still=True)
