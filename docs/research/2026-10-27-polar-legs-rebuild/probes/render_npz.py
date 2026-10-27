"""Renders meshes of step npz files (points, tris in studio units) with Workbench.

Blender -b --factory-startup --python render_npz.py -- <out.png> <npz>[:label]... [--views az,el;az,el] [--center x,y,z] [--size s] [--hard 40]
Each npz is a column, each view a row. Shading: smooth normals split at the crease angle.
"""
import sys, math, os
import numpy as np
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
out = argv[0]
opts = {'--views': '-60,-5;-90,10;-120,10;0,10', '--center': '0.12,0.38,0.12', '--size': '0.55', '--hard': '40', '--res': '360'}
items = []
i = 1
while i < len(argv):
    if argv[i] in opts:
        opts[argv[i]] = argv[i + 1]; i += 2
    else:
        items.append(argv[i]); i += 1
views = [tuple(float(x) for x in v.split(',')) for v in opts['--views'].split(';')]
center = np.array([float(x) for x in opts['--center'].split(',')])
size = float(opts['--size'])
res = int(opts['--res'])

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'SINGLE'
scene.display.shading.single_color = (0.85, 0.82, 0.78)
scene.display.shading.show_cavity = False
scene.render.resolution_x = res
scene.render.resolution_y = res
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('w')

def to_b(v):
    return np.stack([v[:, 0], -v[:, 2], v[:, 1]], axis=1)

objs = []
for it in items:
    path = it.split(':')[0]
    d = np.load(path)
    p, t = d['points'], d['tris']
    me = bpy.data.meshes.new('m')
    me.from_pydata(to_b(p).tolist(), [], t.tolist())
    me.update()
    for poly in me.polygons:
        poly.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(float(opts['--hard'])))
    ob = bpy.data.objects.new('m', me)
    scene.collection.objects.link(ob)
    objs.append(ob)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = 'ORTHO'
cam.data.ortho_scale = size
c = Vector(to_b(center[None])[0].tolist())
import tempfile
tmp = tempfile.mkdtemp()
tiles = []
for vi, (az, el) in enumerate(views):
    row = []
    for oi, ob in enumerate(objs):
        for o in objs:
            o.hide_render = o is not ob
        # azimuth 0 = front (+z studio = -y blender), positive az toward +x (the left side)
        a, e = math.radians(az), math.radians(el)
        dirv = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
        cam.location = c + dirv * 3
        cam.rotation_euler = (-dirv).to_track_quat('-Z', 'Y').to_euler()
        f = os.path.join(tmp, f'{vi}-{oi}.png')
        scene.render.filepath = f
        bpy.ops.render.render(write_still=True)
        row.append(f)
    tiles.append(row)
img = bpy.data.images
import struct
# assemble with numpy
arrs = []
for row in tiles:
    rr = []
    for f in row:
        im = bpy.data.images.load(f)
        px = np.array(im.pixels[:]).reshape(im.size[1], im.size[0], 4)[::-1]
        rr.append(px)
    arrs.append(np.concatenate(rr, axis=1))
full = np.concatenate(arrs, axis=0)
h, w = full.shape[:2]
outim = bpy.data.images.new('out', w, h)
outim.pixels = full[::-1].ravel().tolist()
outim.filepath_raw = out
outim.file_format = 'PNG'
outim.save()
print('wrote', out, [it for it in items], views)
