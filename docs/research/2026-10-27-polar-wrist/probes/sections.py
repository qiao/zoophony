"""Gives sections of the left arm of a GLB at planes along the forearm, the wrist joint, and the
paw: for each plane, the distance of the section from the arm line at each clock (30 degree
steps), in mm. Usage: Blender -b --factory-startup -P scratch/sections.py -- <glb> [side]"""
import json, math, sys
import bmesh, bpy
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
side = float(argv[1]) if len(argv) > 1 else 1.0
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
mesh = [o for o in bpy.context.selected_objects if o.type == 'MESH'][0]
src = bmesh.new(); src.from_mesh(mesh.data); src.transform(mesh.matrix_world)
bmesh.ops.remove_doubles(src, verts=src.verts, dist=1e-5)
zs = [p.co.z for p in src.verts]; floor, H = min(zs), max(zs) - min(zs)
J = json.load(open('tools/mesh-rigs/polar-bear.json'))['joints']
pt = lambda p: Vector((p[0] * side * H, -p[2] * H, p[1] * H + floor))
e, w, t = pt(J['forearm_L']['head']), pt(J['hand_L']['head']), pt(J['fingers_L']['tail'])
f, h = (w - e).normalized(), (t - w).normalized()
mid = (f + h).normalized()
MM = 1438.9 / H
up0 = Vector((0, 0, 1))
planes = []
for d in (-0.03, -0.02, -0.015, -0.01, -0.005):
    planes.append(('fore %+.0f' % (d * H * MM), w + f * d * H, f))
planes.append(('joint', w, mid))
for d in (0.0057, 0.01, 0.0125, 0.015, 0.0175, 0.02, 0.025, 0.03):
    planes.append(('paw %+.0f' % (d * H * MM), w + h * d * H, h))
print('| plane | ' + ' | '.join('%d' % a for a in range(-180, 180, 30)) + ' |')
for name, c, n in planes:
    bm = src.copy()
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=c, plane_no=n)
    segs = [g for g in res['geom_cut'] if isinstance(g, bmesh.types.BMEdge)]
    up = (up0 - n * up0.dot(n)).normalized()
    s = n.cross(up)
    pts = []
    for g in segs:
        a, b = g.verts
        if (a.co - c).length < 0.09 * H and (b.co - c).length < 0.09 * H:
            pts.append((a.co - c, b.co - c))
    row = []
    for ang in range(-180, 180, 30):
        r = math.radians(ang)
        d = up * math.cos(r) + s * math.sin(r)
        best = None
        for a, b in pts:
            # Ray from the center in direction d against the segment a-b, in the plane.
            ax, ay = a.dot(up), a.dot(s); bx, by = b.dot(up), b.dot(s)
            dx, dy = d.dot(up), d.dot(s)
            ex, ey = bx - ax, by - ay
            den = dx * ey - dy * ex
            if abs(den) < 1e-12:
                continue
            tt = (ax * ey - ay * ex) / den
            u = (ax * dy - ay * dx) / den
            if tt > 0 and -1e-9 <= u <= 1 + 1e-9:
                best = tt if best is None else max(best, tt)
        row.append('-' if best is None else '%.1f' % (best * MM))
    print('| %s | %s |' % (name, ' | '.join(row)))
