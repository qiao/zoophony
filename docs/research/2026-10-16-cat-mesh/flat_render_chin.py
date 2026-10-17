"""Renders the seated bind of a rig GLB file from the left side with the workbench engine: once
with a flat light and the face colors (no shading), once with a studio light and the face colors,
and once with a studio light and one gray color. No post effects.

    blender -b --factory-startup --python flat_render.py -- <glb> <out prefix> <hip y> <hip z>
"""
import math
import sys

import bpy
from mathutils import Vector

glb, out, hy, hz, az, size = sys.argv[sys.argv.index('--') + 1:]
hy, hz, az = float(hy), float(hz), math.radians(float(az))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
scene = bpy.context.scene
for obj in scene.objects:
    if obj.type == 'ARMATURE':
        obj.data.pose_position = 'REST'
    if obj.type == 'MESH' and obj.data.shape_keys:
        for key in obj.data.shape_keys.key_blocks:
            key.value = 0.0
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x = 600
scene.render.resolution_y = 600
scene.display.shading.background_type = 'VIEWPORT' if hasattr(scene.display.shading, 'background_type') else None
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = float(size)
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
# The glTF importer turns +y up into +z up, and +z forward into -y. The left side of the animal is
# +x, so the camera stands at +x and looks at -x.
target = Vector((0.0, -hz, hy))
# The azimuth turns the camera from the front (Blender -y) toward the side -x.
d = Vector((-math.sin(az), -math.cos(az), math.tan(math.radians(4))))
cam.location = target + 3.0 * d
cam.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
shading = scene.display.shading
for name, light, color in (('flat', 'FLAT', 'VERTEX'), ('studio', 'STUDIO', 'VERTEX'),
                           ('gray', 'STUDIO', 'SINGLE')):
    shading.light = light
    shading.color_type = color
    if color == 'SINGLE':
        shading.single_color = (0.7, 0.7, 0.7)
    scene.render.filepath = f'{out}-{name}.png'
    bpy.ops.render.render(write_still=True)
