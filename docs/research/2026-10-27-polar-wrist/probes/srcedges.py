"""Lists the sharp edges of a source GLB of the polar bear near the left wrist, and renders the
wrist.

Usage: Blender -b --factory-startup -P scratch/srcedges.py -- <glb> <out prefix> [angle]

The place of an edge middle: t in mm (1 unit = 1438.9 mm) from the wrist joint, along the
forearm before it and along the paw after it; the clock around the arm, 0 on the top of the paw
(+z in the T-pose), 90 toward the front of the bear (-y). Each row also gives the arm part code of
both vertices when the file has the attribute `arm_part` (1 shoulder cut, 2 wrist cut, 3 tube).
"""
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
glb, prefix = argv[0], argv[1]
limit = float(argv[2]) if len(argv) > 2 else 25.0
ROOT = os.getcwd()
cfg = json.load(open(os.path.join(ROOT, 'tools/mesh-rigs/polar-bear.json')))
J = cfg['joints']

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
mesh = [o for o in bpy.context.selected_objects if o.type == 'MESH'][0]
bm = bmesh.new()
bm.from_mesh(mesh.data)
bm.transform(mesh.matrix_world)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bm.verts.ensure_lookup_table()
zs = [p.co.z for p in bm.verts]
floor, height = min(zs), max(zs) - min(zs)


def point(p):
    return Vector((p[0] * height, -p[2] * height, p[1] * height + floor))


e = point(J['forearm_L']['head'])
w = point(J['hand_L']['head'])
t = point(J['fingers_L']['tail'])
f = (w - e).normalized()
h = (t - w).normalized()
axis = (f + h).normalized()
MM = 1438.9 / height
part = bm.verts.layers.int.get('arm_part')
print('height', height, 'floor', floor, 'turn', math.degrees(f.angle(h)))


def place(p):
    q = p - w
    tt = q.dot(f) if q.dot(f) < 0 else q.dot(h)
    r = q - axis * q.dot(axis)
    up = Vector((0, 0, 1))
    up = (up - axis * up.dot(axis)).normalized()
    side = axis.cross(up)
    return tt * MM, math.degrees(math.atan2(r.dot(side), r.dot(up))), r.length * MM


def inside(p):
    q = p.co - w
    return q.dot(f) > -0.035 * height and q.dot(h) < 0.03 * height and q.length < 0.09 * height


rows = []
for edge in bm.edges:
    if len(edge.link_faces) != 2 or not all(inside(p) for p in edge.verts):
        continue
    f1, f2 = edge.link_faces
    angle = math.degrees(f1.normal.angle(f2.normal))
    if angle < limit:
        continue
    other = [p for p in f2.verts if p not in edge.verts][0]
    concave = (other.co - edge.verts[0].co).dot(f1.normal) > 0
    tt, clock, r = place((edge.verts[0].co + edge.verts[1].co) / 2)
    codes = '' if part is None else '%d/%d' % (edge.verts[0][part], edge.verts[1][part])
    rows.append((tt, clock, angle, concave, r, edge.calc_length() * MM, codes))
rows.sort()
print('| t mm | clock | angle | kind | r mm | length mm | parts |')
for tt, clock, angle, concave, r, ln, codes in rows:
    print('| %.0f | %.0f | %.0f | %s | %.0f | %.0f | %s |' % (tt, clock, angle, 'concave' if concave else 'convex', r, ln, codes))
print('EDGES', len(rows))

WIRE = not (len(argv) > 5 and argv[5] == 'nowire')
# Renders the left wrist from several directions with the wireframe.
for ob in bpy.data.objects:
    if ob.type == 'MESH' and WIRE:
        mod = ob.modifiers.new('wire', 'WIREFRAME')
        mod.thickness = 0.0006 * height
        mod.use_replace = False
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'TEXTURE'
scene.render.resolution_x = 560
scene.render.resolution_y = 560
cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 50
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
center = w + h * 0.005 * height
DIRS = {'top': Vector((0, 0, 1)), 'front': Vector((0, -1, 0)), 'back': Vector((0, 1, 0)),
        'bottom': Vector((0, 0, -1)), 'out': Vector((1, 0, 0.2)), 'backlow': Vector((0, 1, -1)),
        'backhigh': Vector((0.3, 1, 0.5))}
dirs = {k: DIRS[k] for k in (argv[3].split(',') if len(argv) > 3 else DIRS)}
DIST = float(argv[4]) if len(argv) > 4 else 0.25
for name, d in dirs.items():
    d = d.normalized()
    cam.location = center + d * DIST * height
    look = (center - cam.location).normalized()
    up = Vector((0, 0, 1)) if abs(look.z) < 0.9 else Vector((1, 0, 0))
    right = look.cross(up).normalized()
    up = right.cross(look).normalized()
    from mathutils import Matrix
    cam.rotation_euler = Matrix((right, up, -look)).transposed().to_euler()
    scene.render.filepath = f'{prefix}-{name}.png'
    bpy.ops.render.render(write_still=True)
print('DONE')
