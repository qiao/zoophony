"""Renders the left arm of a source mesh with its edges, from the front, the side, and below.

    blender -b --factory-startup --python scratch/source_arm.py -- <in.glb> <out-prefix> \
        <x> <y> <z> <size> [<split>]

The point (x, y, z) is in the units of the rig config (y up, +z forward, +x left, soles at 0,
height 1). The vertices beyond |x| = split on the left side show in red.
"""
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
path, prefix = argv[0], argv[1]
px, py, pz, size = (float(v) for v in argv[2:6])
split = float(argv[6]) if len(argv) > 6 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
body = max(meshes, key=lambda o: len(o.data.polygons))
for o in meshes:
    if o is not body:
        o.hide_render = True
for o in bpy.context.scene.objects:
    if o.type == 'ARMATURE':
        o.data.pose_position = 'REST'
bpy.context.view_layer.update()
mw = body.matrix_world
pts = [mw @ v.co for v in body.data.vertices]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
height = hi.z - lo.z
mid = (lo + hi) / 2


def world(x, y, z):
    """Config units (studio axes) to Blender world: x left, y up, z forward."""
    # Blender: +z up, -y forward (glTF +z forward becomes Blender -y), glTF +x stays +x.
    return Vector((mid.x + x * height, mid.y - z * height, lo.z + y * height))


attr = body.data.color_attributes.new('mark', 'FLOAT_COLOR', 'POINT')
for v in body.data.vertices:
    p = mw @ v.co
    x = (p.x - mid.x) / height
    red = split is not None and x > split
    attr.data[v.index].color = (0.9, 0.3, 0.3, 1) if red else (0.8, 0.78, 0.74, 1)
body.data.color_attributes.active_color = attr
body.data.color_attributes.render_color_index = list(body.data.color_attributes).index(attr)

wire = body.copy()
wire.data = body.data.copy()
bpy.context.scene.collection.objects.link(wire)
for c in wire.data.color_attributes['mark'].data:
    c.color = (0.05, 0.05, 0.05, 1)
mod = wire.modifiers.new('wire', 'WIREFRAME')
mod.thickness = 0.0015 * height
mod.use_replace = True
mat = bpy.data.materials.new('black')
mat.diffuse_color = (0.05, 0.05, 0.05, 1)
wire.data.materials.clear()
wire.data.materials.append(mat)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'VERTEX'
scene.render.resolution_x = 700
scene.render.resolution_y = 700
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = size * height
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
target = world(px, py, pz)
for name, d in (('front', Vector((0, -1, 0.05))), ('side', Vector((1, 0, 0.05))),
                ('q34', Vector((0.7, -0.7, 0.1))), ('below', Vector((0.3, -0.5, -0.8)))):
    d = d.normalized()
    cam.location = target + d * 3 * height
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    # The wire object shows in the vertex color mode with its material color only in the
    # material mode, so render each pass: the body in vertex colors, then overlay is skipped.
    scene.render.filepath = f'{prefix}-{name}.png'
    bpy.ops.render.render(write_still=True)
