"""Renders standing bodies side by side with Workbench, at one scale, so that the legs compare.

    blender -b --factory-startup --python standing_side.py -- <out.png> <file>... \
        [--az <deg>] [--el <deg>] [--size <units>] [--center <y>] [--res <px>]

Each file is an OBJ file (`source-long-arms.obj` of `pnpm rig-mesh --check --preview`) or an npz
file with `points` and `tris` (`dump_source.py` of `2026-10-27-polar-legs-rebuild/probes/`), in
the units of the studio: the soles at y = 0, +z forward, +x the left side. The bodies of one leg
factor or another keep the meters for each unit, so one ortho size compares them. The azimuth 0
looks at the front, and 90 at the left side. Each body is one column of the image, with a floor
line at y = 0.
"""
import math
import os
import sys
import tempfile

import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
out = argv[0]
opts = {'--az': '90', '--el': '0', '--size': '1.4', '--center': '0.66', '--res': '520'}
files = []
i = 1
while i < len(argv):
    if argv[i] in opts:
        opts[argv[i]] = argv[i + 1]
        i += 2
    else:
        files.append(argv[i])
        i += 1


def load(path):
    if path.endswith('.npz'):
        d = np.load(path)
        return d['points'], d['tris']
    points, tris = [], []
    for line in open(path):
        if line.startswith('v '):
            points.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('f '):
            tris.append([int(x.split('/')[0]) - 1 for x in line.split()[1:4]])
    return np.array(points), np.array(tris)


def to_b(v):
    return np.stack([v[:, 0], -v[:, 2], v[:, 1]], axis=1)


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'SINGLE'
scene.display.shading.single_color = (0.85, 0.82, 0.78)
res = int(opts['--res'])
scene.render.resolution_x = res
scene.render.resolution_y = res
scene.world = bpy.data.worlds.new('w')
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = 'ORTHO'
cam.data.ortho_scale = float(opts['--size'])
a, e = math.radians(float(opts['--az'])), math.radians(float(opts['--el']))
d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
center = Vector((0, 0, float(opts['--center'])))
cam.location = center + d * 5
cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
# The floor: a thin dark slab under the soles.
floor = bpy.data.meshes.new('floor')
floor.from_pydata([(-2, -2, -0.004), (2, -2, -0.004), (2, 2, -0.004), (-2, 2, -0.004)], [],
                  [(0, 1, 2, 3)])
tmp = tempfile.mkdtemp()
tiles = []
for k, path in enumerate(files):
    p, t = load(path)
    me = bpy.data.meshes.new(f'm{k}')
    me.from_pydata(to_b(p).tolist(), [], t.tolist())
    me.update()
    for poly in me.polygons:
        poly.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(40))
    ob = bpy.data.objects.new(f'm{k}', me)
    scene.collection.objects.link(ob)
    f = os.path.join(tmp, f'{k}.png')
    scene.render.filepath = f
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(ob)
    im = bpy.data.images.load(f)
    tiles.append(np.array(im.pixels[:]).reshape(res, res, 4))
full = np.concatenate(tiles, axis=1)
img = bpy.data.images.new('out', full.shape[1], full.shape[0])
img.pixels = full.ravel().tolist()
img.filepath_raw = out
img.file_format = 'PNG'
img.save()
print('wrote', out, files)
