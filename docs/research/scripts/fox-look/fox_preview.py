"""Renders a dog-family sculpt in orthographic views at the scale of fox-views.png (737 px/m).

    blender -b --factory-startup --python fox_preview.py -- <tools/blender> <rig.json> <out-dir>

Writes front.png, side.png (the right side, the animal faces the right edge), back.png at
737 px/m with the floor at row FLOOR, and headfront.png, headside.png at 3 x 737 px/m around the
head center. Prints some measures in H.
"""

import importlib
import json
import math
import os
import sys

args = sys.argv[sys.argv.index('--') + 1:]
blender_dir, rig_path, out_dir = args[0], args[1], args[2]
sys.path.insert(0, blender_dir)

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import kit  # noqa: E402

PX = 737.0
W, HGT = 700, 1050
FLOOR = 1020
CHAIR = {'seat': 0.35, 'width': 0.42, 'depth': 0.4, 'back': 0.85, 'rail': 0.1, 'leg': 0.035}


def chair_boxes():
    c = CHAIR
    x = c['width'] / 2 - c['leg'] / 2
    z = c['depth'] / 2 - c['leg'] / 2
    leg = c['leg']
    boxes = [((0, c['seat'] - 0.02, 0), (c['width'], 0.04, c['depth']))]
    for px in (-x, x):
        boxes.append(((px, (c['seat'] - 0.04) / 2, -z), (leg, c['seat'] - 0.04, leg)))
        boxes.append(((px, c['back'] / 2, z), (leg, c['back'], leg)))
    boxes.append(((0, c['back'] - c['rail'] / 2, z), (c['width'] - 2 * leg, c['rail'], 0.025)))
    return boxes


with open(rig_path) as f:
    data = json.load(f)
species = data['species']
recipe = importlib.import_module(species.replace('-', '_'))
os.makedirs(out_dir, exist_ok=True)
kit.reset_scene()
rig = kit.Rig(data, 'seated')
body = recipe.build_body(rig)
legs = recipe.build_legs(rig)
regions = recipe.regions(rig)
h = rig.h
center = rig.point('headCenter')
total = sum(len(p.bm.faces) for p in body + legs)
standing = recipe.build_legs(kit.Rig(data, 'standing'))
print('TRIANGLES seated', total, 'standing', total - sum(len(p.bm.faces) for p in legs)
      + sum(len(p.bm.faces) for p in standing))
print('PARTS', {p.name: len(p.bm.faces) for p in body + legs})
kit.reset_scene()
kit.show(body + legs, regions)
kit.show_boxes('chair', chair_boxes(), '#c8902f')

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.view_settings.view_transform = 'Standard'
scene.render.film_transparent = False
scene.render.image_settings.file_format = 'PNG'
world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.02, 0.02, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 4.0


def light(name, energy, rotation, angle=10):
    d = bpy.data.lights.new(name, 'SUN')
    d.energy = energy
    d.angle = math.radians(angle)
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    return o


key = light('key', 4.0, None)
fill = light('fill', 1.2, None, 40)


def render(name, azimuth, target, scale, size, floor_row=None):
    """Renders an orthographic view. azimuth 0 looks at the front, 90 at the right side."""
    width, height = size
    scene.render.resolution_x, scene.render.resolution_y = width, height
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = max(width, height) / scale
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    a = math.radians(azimuth)
    direction = Vector((-math.sin(a), -math.cos(a), 0))
    cam.location = target + direction * 5
    cam.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    # The key light from the upper left of the view and the front.
    left = Vector((math.cos(a), -math.sin(a), 0))
    key_dir = (-direction * 1.0 - left * 0.8 + Vector((0, 0, -1.0))).normalized()
    key.rotation_euler = key_dir.to_track_quat('-Z', 'Y').to_euler()
    fill.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(out_dir, name + '.png')
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)


# The figure views: the floor at row FLOOR of an image of W x HGT.
mid_height = (FLOOR - HGT / 2) / PX  # the height above the floor of the image center
for name, az in (('front', 0), ('side', 90), ('back', 180)):
    render(name, az, Vector((0, 0, mid_height)), PX, (W, HGT))
for name, az in (('headfront', 0), ('headside', 90)):
    render(name, az, center + Vector((0, 0, 0.05)), 3 * PX, (900, 900))
