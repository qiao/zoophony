"""Renders the left knee of a GLB file from one direction, in Blender (background).

    Blender -b --factory-startup --python knee_render.py -- <glb> <out.png> <knee x,y,z> <az> <el> <dist> [<crease deg>]

The knee point is in the studio axes of the file (+x the left side, y up, +z forward). The camera
looks at it from the azimuth (0 the front, -90 the left side of the animal) and the elevation, in
degrees, at the distance in units. Each mesh gets one gray material and smooth normals by angle,
so that the image shows the form alone.
"""
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
glb, out = argv[0], argv[1]
kx, ky, kz = (float(v) for v in argv[2].split(','))
az, el, dist = float(argv[3]), float(argv[4]), float(argv[5])
crease = float(argv[6]) if len(argv) > 6 else 40.0
scale = float(argv[7]) if len(argv) > 7 else 1.0
lift = float(argv[8]) if len(argv) > 8 else 0.0

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=glb)
for obj in list(bpy.data.objects):
    if obj.name.startswith('Icosphere'):
        bpy.data.objects.remove(obj, do_unlink=True)

mat = bpy.data.materials.new('gray')
mat.use_nodes = True
bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
bsdf.inputs['Base Color'].default_value = (0.8, 0.78, 0.74, 1)
bsdf.inputs['Roughness'].default_value = 0.8
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(crease))
    except Exception as error:  # noqa: BLE001
        print('smooth by angle failed', error)
    obj.select_set(False)

# Studio axes (x, y, z) to Blender axes (x, -z, y).
knee = Vector((kx * scale, -kz * scale, ky * scale + lift))
dist *= scale
a, e = math.radians(az), math.radians(el)
# The front of the animal is +z of the studio, -y of Blender. Azimuth -90 is the left side (+x).
direction = Vector((-math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
cam_data = bpy.data.cameras.new('cam')
cam_data.lens = float(__import__("os").environ.get("LENS", "70"))
cam = bpy.data.objects.new('cam', cam_data)
bpy.context.scene.collection.objects.link(cam)
cam.location = knee + direction * dist
cam.rotation_euler = (knee - cam.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.scene.camera = cam

light_data = bpy.data.lights.new('key', 'SUN')
light_data.energy = 3.0
light = bpy.data.objects.new('key', light_data)
light.rotation_euler = (math.radians(50), 0, math.radians(-30))
bpy.context.scene.collection.objects.link(light)
fill_data = bpy.data.lights.new('fill', 'SUN')
fill_data.energy = 1.2
fill = bpy.data.objects.new('fill', fill_data)
fill.rotation_euler = (math.radians(70), 0, math.radians(150))
bpy.context.scene.collection.objects.link(fill)
world = bpy.data.worlds.new('w')
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (0.05, 0.05, 0.06, 1)
bg.inputs['Strength'].default_value = 1.0
bpy.context.scene.world = world

scene = bpy.context.scene
engines = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
scene.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in engines else engines[0]
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print('wrote', out)
