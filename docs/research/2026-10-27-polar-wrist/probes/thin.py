"""Counts the thin faces (smallest corner below 12 degrees) of a copy within the wrist band of the
left arm: from 0.03 units before the wrist joint to 0.03 units past it along the paw.
Usage: Blender -b --factory-startup -P scratch/thin.py -- <glb>"""
import json, math, sys
import bmesh, bpy
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
mesh = [o for o in bpy.context.selected_objects if o.type == 'MESH'][0]
bm = bmesh.new(); bm.from_mesh(mesh.data); bm.transform(mesh.matrix_world)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
zs = [p.co.z for p in bm.verts]; floor, H = min(zs), max(zs) - min(zs)
J = json.load(open('tools/mesh-rigs/polar-bear.json'))['joints']
for side, name in ((1, 'L'), (-1, 'R')):
    pt = lambda p: Vector((p[0] * side * H, -p[2] * H, p[1] * H + floor))
    e, w, t = pt(J['forearm_L']['head']), pt(J['hand_L']['head']), pt(J['fingers_L']['tail'])
    f, h = (w - e).normalized(), (t - w).normalized()
    rows = []
    for face in bm.faces:
        c = face.calc_center_median() - w
        along = c.dot(f) if c.dot(f) < 0 else c.dot(h)
        if -0.03 * H < along < 0.03 * H and c.length < 0.09 * H:
            ang = min(math.degrees(l.calc_angle()) for l in face.loops)
            if ang < 12:
                rows.append((round(along / H * 1438.9), round(ang, 1)))
    print('THIN', name, len(rows), sorted(rows))
