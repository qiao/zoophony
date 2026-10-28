"""Renders the seated bind of rig files side by side with Workbench, at one scale, from one side.

    blender -b --factory-startup --python seated_side.py -- <out.png> <rig.glb>... \
        [--az <deg>] [--el <deg>] [--size <meters>] [--center <meters>] [--res <px>] \
        [--scale <meters for each unit>]

Each file is a rig of `pnpm rig-mesh` (`rig-mesh --check --keep`): the bind mesh of the body in
its seated pose and the chair of the rig, in the units of the studio. The script scales each rig
by `--scale` (the meters for each unit of the app), puts its lowest point on the floor, and
renders the seated bind (the rest pose of its armature) with the color of its materials, on a dark box
from the soles to the seat top of the chair of the rig. The azimuth 0 looks at the front, and 90 at the left
side. Each rig is one column of the image.
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
opts = {'--az': '90', '--el': '0', '--size': '1.7', '--center': '0.75', '--res': '520',
        '--scale': '1.438901'}
files = []
i = 1
while i < len(argv):
    if argv[i] in opts:
        opts[argv[i]] = argv[i + 1]
        i += 2
    else:
        files.append(argv[i])
        i += 1

res = int(opts['--res'])
scale = float(opts['--scale'])
tmp = tempfile.mkdtemp()
tiles = []
for k, path in enumerate(files):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.render.resolution_x = res
    scene.render.resolution_y = res
    scene.world = bpy.data.worlds.new('w')
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(path))
    # The armature shows its rest pose: the seated bind. Its action `reference` holds the
    # standing body of the source. The icosphere of the importer is no part of the rig.
    for o in scene.objects:
        if o.type == 'ARMATURE':
            o.data.pose_position = 'REST'
        if o.type == 'MESH' and o.name.startswith('Icosphere'):
            bpy.data.objects.remove(o)
    # The chair of the rig stands on the floor of the rig, below the soles of the bind. A box from
    # the soles to its seat top, with its depth and width, takes its place.
    bench = scene.objects.get('bench')
    seat = None
    if bench is not None:
        corners = [bench.matrix_world @ v.co for v in bench.data.vertices]
        seat = [min(c.x for c in corners), max(c.x for c in corners),
                min(c.y for c in corners), max(c.y for c in corners),
                max(c.z for c in corners)]
        bpy.data.objects.remove(bench)
    meshes = [o for o in scene.objects if o.type == 'MESH']
    root = bpy.data.objects.new('root', None)
    scene.collection.objects.link(root)
    for o in scene.objects:
        if o.parent is None and o is not root:
            o.parent = root
    root.scale = (scale, scale, scale)
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()

    def lowest():
        least = math.inf
        for o in meshes:
            ev = o.evaluated_get(deps)
            me = ev.to_mesh()
            for v in me.vertices:
                least = min(least, (ev.matrix_world @ v.co).z)
            ev.to_mesh_clear()
        return least

    floor = lowest()
    if seat is not None:
        x0, x1, y0, y1, top = seat
        box = bpy.data.meshes.new('seat')
        box.from_pydata([(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (floor, top * scale)],
                        [], [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4),
                             (1, 5, 7, 3)])
        mat = bpy.data.materials.new('seat')
        mat.diffuse_color = (0.08, 0.08, 0.09, 1)
        box.materials.append(mat)
        seat_object = bpy.data.objects.new('seat', box)
        scene.collection.objects.link(seat_object)
        seat_object.location.z -= floor
    root.location.z -= floor
    bpy.context.view_layer.update()
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = float(opts['--size'])
    a, e = math.radians(float(opts['--az'])), math.radians(float(opts['--el']))
    d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    cam.location = Vector((0, 0, float(opts['--center']))) + d * 6
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    f = os.path.join(tmp, f'{k}.png')
    scene.render.filepath = f
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(f)
    tiles.append(np.array(im.pixels[:]).reshape(res, res, 4))
full = np.concatenate(tiles, axis=1)
img = bpy.data.images.new('out', full.shape[1], full.shape[0])
img.pixels = full.ravel().tolist()
img.filepath_raw = out
img.file_format = 'PNG'
img.save()
print('wrote', out, files)
