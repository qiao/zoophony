"""Renders the head of the panda mesh from the front and at 35 degrees: with the eyes of the mesh
(the texture), and with the pea eyes of the app in the patches (a dark oval of 0.13 x 0.18 x 0.06 H
with the wet finish and a white light of 0.04 H, 0.035 H above the middle, design 4.5), and with
the patches as the rig colors them (each face of the old eye takes the color of its ring).

    blender -b --factory-startup --python eye_views.py -- <panda.glb> <out-dir> <H units>

The eye middle is the middle of the dark faces of the eye box (head-colors.txt), 0.01 H out of
the surface, as `eyeMiddle()` of `src/models/eyes.ts` puts an eye on a patch.
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1 :]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
out = argv[1]
h_units = float(argv[2])
os.makedirs(out, exist_ok=True)
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
zs = [(ob.matrix_world @ v.co).z for v in ob.data.vertices]
floor, top = min(zs), max(zs)
size = top - floor


def blender_point(p):
    """Studio units (x left, y up, z forward) to Blender (x, -z, y), in the units of the file."""
    return Vector((p[0] * size, -p[2] * size, floor + p[1] * size))


scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [
    e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items
] else 'BLENDER_EEVEE'
scene.render.resolution_x = 700
scene.render.resolution_y = 600
scene.world = bpy.data.worlds.new('w')
scene.world.use_nodes = True
bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (0.35, 0.35, 0.35, 1)
bg.inputs['Strength'].default_value = 1.0
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(40), 0, math.radians(20))
scene.collection.objects.link(sun)
cam = bpy.data.objects.new('c', bpy.data.cameras.new('c'))
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 0.42 * size
scene.collection.objects.link(cam)
scene.camera = cam


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(name, hex_color, roughness):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    rgb = [srgb_to_linear(int(hex_color[i:i + 2], 16) / 255) for i in (1, 3, 5)]
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return m


eye_mat = material('eye', '#15110e', 0.15)
light_mat = material('eyeLight', '#f6f2ea', 0.3)
# The middle of the dark faces of each eye box and the normal of the face there (head-colors.txt).
EYES = {'L': ((0.068, 0.858, 0.152), (0.55, 0.0, 0.83)), 'R': ((-0.071, 0.857, 0.150), (-0.55, 0.0, 0.83))}
peas = []
for side, (mid, normal) in EYES.items():
    n = Vector((normal[0], -normal[2], normal[1])).normalized()
    center = blender_point(mid) + n * 0.01 * h_units * size
    up = Vector((0, 0, 1))
    up = (up - up.dot(n) * n).normalized()
    across = up.cross(n)
    basis = Matrix((across, up, n)).transposed().to_4x4()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.5)
    pea = bpy.context.active_object
    pea.matrix_world = Matrix.Translation(center) @ basis @ Matrix.Diagonal(
        (0.13 * h_units * size, 0.18 * h_units * size, 0.06 * h_units * size, 1))
    pea.data.materials.append(eye_mat)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.5)
    light = bpy.context.active_object
    lc = center + n * 0.5 * 0.06 * h_units * size + Vector((0, 0, 0.035 * h_units * size))
    light.matrix_world = Matrix.Translation(lc) @ basis @ Matrix.Diagonal(
        (0.04 * h_units * size, 0.04 * h_units * size, 0.02 * h_units * size, 1))
    light.data.materials.append(light_mat)
    peas += [pea, light]

head = blender_point((0, 0.85, 0.0))
for variant in ('mesh-eyes', 'pea-eyes'):
    for o in peas:
        o.hide_render = variant == 'mesh-eyes'
    for name, az in (('front', 0), ('q35', 35)):
        a = math.radians(az)
        d = Vector((math.sin(a), -math.cos(a), 0.15)).normalized()
        cam.location = head + d * 3 * size
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(out, f'{variant}-{name}.png')
        bpy.ops.render.render(write_still=True)
print('wrote', out)
