"""Gives the width of the wrist band of a copy: for each vertex of the last ring of the left arm
tube (at the wrist joint), its clock around the arm (0 on the top of the T-pose paw, 180 on the
palm, 90 toward the front) and its distance to the plane of the wrist cut, in mm.
Usage: Blender -b --factory-startup -P scratch/band.py -- <glb> perp|par <share>"""
import json, math, sys
import bmesh, bpy
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
mode, share = argv[1], float(argv[2])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
mesh = [o for o in bpy.context.selected_objects if o.type == 'MESH'][0]
bm = bmesh.new(); bm.from_mesh(mesh.data); bm.transform(mesh.matrix_world)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
zs = [p.co.z for p in bm.verts]; floor, H = min(zs), max(zs) - min(zs)
J = json.load(open('tools/mesh-rigs/polar-bear.json'))['joints']
pt = lambda p: Vector((p[0] * H, -p[2] * H, p[1] * H + floor))
e, w, t = pt(J['forearm_L']['head']), pt(J['hand_L']['head']), pt(J['fingers_L']['tail'])
f, h = (w - e).normalized(), (t - w).normalized()
mid = (f + h).normalized()
MM = 1438.9 / H
n = h if mode == 'perp' else mid
c = w + (t - w) * share if mode == 'perp' else w + mid * (t - w).length * share
ring = [p for p in bm.verts if abs((p.co - w).dot(mid)) < float(argv[3] if len(argv) > 3 else 1e-3) * H and (p.co - w).length < 0.08 * H]
up0 = Vector((0, 0, 1))
up = (up0 - mid * up0.dot(mid)).normalized(); s = mid.cross(up)
rows = []
for p in ring:
    r = p.co - w
    rows.append((math.degrees(math.atan2(r.dot(s), r.dot(up))), (c - p.co).dot(n) * MM))
rows.sort()
print('BAND', len(rows), ' '.join('%.0f:%.1f' % x for x in rows))
print('BAND min %.1f mm at clock %.0f, max %.1f mm' % (min(r[1] for r in rows), min(rows, key=lambda r: r[1])[0], max(r[1] for r in rows)))
