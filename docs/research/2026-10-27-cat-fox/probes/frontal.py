"""Cuts frontal sections (constant studio z) of GLB meshes, writes segments (x, y in studio units).
Blender -b --factory-startup -P scratch/frontal.py -- <out.json> <z1,z2,...> <glb>...
"""
import json
import sys

import bmesh
import bpy

argv = sys.argv[sys.argv.index('--') + 1:]
out, zs_, glbs = argv[0], [float(h) for h in argv[1].split(',')], argv[2:]
result = {}
for glb in glbs:
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and 'chair' not in o.name.lower()]
    mesh = max(meshes, key=lambda o: len(o.data.vertices))
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    bm.transform(mesh.matrix_world)
    heights = [v.co.z for v in bm.verts]
    floor, height = min(heights), max(heights) - min(heights)
    secs = {}
    for zz in zs_:
        cut = -zz * height
        segs = []
        for f in bm.faces:
            pts = []
            loop = list(f.verts)
            for i in range(len(loop)):
                a, b = loop[i].co, loop[(i + 1) % len(loop)].co
                if (a.y - cut) * (b.y - cut) < 0:
                    t = (cut - a.y) / (b.y - a.y)
                    p = a.lerp(b, t)
                    pts.append((p.x / height, (p.z - floor) / height))
            if len(pts) == 2:
                segs.append(pts)
        secs[str(zz)] = segs
    result[glb] = {'sections': secs}
    bm.free()
with open(out, 'w') as fh:
    json.dump(result, fh)
