"""Renders a sculpt recipe on a rig file in the three views of rabbit-views.png, on a chair.

    DISTANCE=2.5 blender -b --factory-startup --python preview.py -- \
        <tools/blender> <rig.json> <out-dir> [--pose]

The script builds the sculpt with the recipe of the species in <tools/blender>, prints its
triangles and some measures in H, and writes <species>.front.png, .side.png (the left side, as
the sheet), .back.png, and .head.png. With --pose, the arms turn forward from the bind pose, so
that the torso shows between them. DISTANCE sets the camera distance for a figure of 1.38 m.
The key light comes from the upper left of each view, as in the sheet.
"""

import importlib
import json
import math
import os
import sys

args = sys.argv[sys.argv.index('--') + 1:]
blender_dir, rig_path, out_dir = args[0], args[1], args[2]
pose = '--pose' in args
sys.path.insert(0, blender_dir)

import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import kit  # noqa: E402

#: The chair of the previews, as `CHAIR` of `tools/blender/build_sculpt.py`.
CHAIR = {'seat': 0.35, 'width': 0.42, 'depth': 0.4, 'back': 0.85, 'rail': 0.1, 'leg': 0.035}


def chair_boxes():
    """Gives the boxes of the chair, in the model axes."""
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

counts = {}
for part in body + legs:
    counts[part.name] = len(part.bm.faces)
total = sum(counts.values())
print('TRIANGLES', total)
print('PARTS', json.dumps(counts))

# The measures of the head shell, in H from the head center.
trunk = body[0]
top = -1e9
for v in trunk.bm.verts:
    bone = trunk.skin[v.index][0]
    if bone == 'head':
        top = max(top, (v.co.z - center.z) / h)
print('HEAD TOP above the head center (H):', round(top, 4))
xs = [kit.to_model(v.co) for v in trunk.bm.verts]
head = [p for p in xs if p[1] > center.z - 0.4 * h]
print('HEAD half width (H):', round(max(abs(p[0]) for p in head) / h, 3))
print('HEAD front (H):', round(min(p[2] for p in head) / h, 3), 'back:',
      round(max(p[2] for p in head) / h, 3))
chin = min(p[1] for p in head if abs(p[0]) < 0.1 * h and p[2] < -0.25 * h)
print('CHIN (H):', round((chin - center.z) / h, 3))
torso = [p for p in xs if p[1] < center.z - 0.9 * h]
print('TORSO half width (H):', round(max(abs(p[0]) for p in torso) / h, 3),
      'front', round(min(p[2] for p in torso) / h, 3),
      'back', round(max(p[2] for p in torso) / h, 3))
everything = [kit.to_model(v.co) for part in body + legs for v in part.bm.verts]
for axis, name in enumerate('xyz'):
    values = [p[axis] for p in everything]
    print('BOX', name, '(m):', round(min(values), 3), round(max(values), 3))
tail = [kit.to_model(v.co) for part in body if part.name == 'tail' for v in part.bm.verts]
print('TAIL back (m):', round(max(p[2] for p in tail), 3))


def bone_of(part):
    part.bm.verts.ensure_lookup_table()
    return part.skin[0][0]


def posed(parts):
    """Turns the arms forward, with the paws in front of the belly."""
    out = []
    for part in parts:
        bone = bone_of(part)
        side = bone[-1]
        sign = 1 if side == 'R' else -1
        if bone.startswith(('upperArm', 'forearm', 'hand', 'fingers')):
            shoulder = rig.bone('upperArm' + side)
            elbow = rig.bone('forearm' + side)
            upper = Matrix.Rotation(math.radians(-45), 3, 'X') @ Matrix.Rotation(
                math.radians(sign * 22), 3, 'Y')
            fore = Matrix.Rotation(math.radians(sign * 45), 3, 'Z') @ Matrix.Rotation(
                math.radians(-100), 3, 'X')
            moved_elbow = shoulder + upper @ (elbow - shoulder)
            copy = kit.Part(part.name, part.bm.copy())
            copy.regions = dict(part.regions)
            copy.skin = dict(part.skin)
            for v in copy.bm.verts:
                if bone.startswith('upperArm'):
                    v.co = shoulder + upper @ (v.co - shoulder)
                else:
                    v.co = moved_elbow + fore @ (v.co - elbow)
            out.append(copy)
        else:
            out.append(part)
    return out


shown = posed(body) if pose else body
kit.show(shown + legs, regions)
kit.show_boxes('chair', chair_boxes(), '#c8902f')
top = max(p[1] for p in everything)
scene = bpy.context.scene
world = scene.world or bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
background = world.node_tree.nodes['Background']
background.inputs['Color'].default_value = (0.012, 0.012, 0.012, 1)
background.inputs['Strength'].default_value = 1.0
key_data = bpy.data.lights.new('key', 'SUN')
key_data.energy = 4.0
key_data.color = (1.0, 0.86, 0.72)
key_data.angle = math.radians(10)
key = bpy.data.objects.new('key', key_data)
key.rotation_euler = (math.radians(40), 0, math.radians(-35))
scene.collection.objects.link(key)
rim_data = bpy.data.lights.new('rim', 'SUN')
rim_data.energy = 2.0
rim_data.color = (1.0, 0.95, 0.9)
rim = bpy.data.objects.new('rim', rim_data)
rim.rotation_euler = (math.radians(60), 0, math.radians(150))
scene.collection.objects.link(rim)
front_z = min(p[2] for p in everything)
back_z = max(p[2] for p in everything)
figure = kit.to_blender((0, 0.47 * top, 0.5 * (front_z + back_z)))
scene.render.engine = 'BLENDER_EEVEE'
scene.view_settings.view_transform = 'Standard'
scene.render.image_settings.file_format = 'PNG'
fill_data = bpy.data.lights.new('fill', 'SUN')
fill_data.energy = 0.9
fill_data.color = (1.0, 0.9, 0.82)
fill = bpy.data.objects.new('fill', fill_data)
scene.collection.objects.link(fill)


def shoot(path, target, distance, azimuth_deg, elevation_deg, size, lens):
    scene.render.resolution_x, scene.render.resolution_y = size
    azimuth = math.radians(azimuth_deg)
    elevation = math.radians(elevation_deg)
    target = Vector(target)
    away = Vector((
        -distance * math.cos(elevation) * math.sin(azimuth),
        -distance * math.cos(elevation) * math.cos(azimuth),
        distance * math.sin(elevation),
    ))
    data = bpy.data.cameras.new('camera')
    data.lens = lens
    camera = bpy.data.objects.new('camera', data)
    scene.collection.objects.link(camera)
    camera.location = target + away
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    fill.rotation_euler = camera.rotation_euler
    # The key light comes from the upper left of each view, as in the sheet.
    key.rotation_euler = (math.radians(45), 0, math.radians(azimuth_deg - 35))
    rim.rotation_euler = (math.radians(60), 0, math.radians(azimuth_deg + 160))
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


DISTANCE = float(os.environ.get('DISTANCE', '2.55'))
for view, azimuth, elevation in [('front', 0, 6), ('side', -90, 6), ('back', 180, 6)]:
    shoot(os.path.join(out_dir, f'{species}.{view}.png'), figure, DISTANCE * top / 1.38,
          azimuth, elevation, (560, 920), 50)
shoot(os.path.join(out_dir, f'{species}.head.png'), center, 0.9, -30, 10, (560, 560), 50)
