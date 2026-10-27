"""Runs the deer steps to the bridge and lists the bridge faces that face into the arm."""
import os, sys
sys.path.insert(0, os.path.abspath('tools/blender'))
import deer_arms as da
import bmesh
from mathutils import Vector
stop = os.environ.get('STOP', 'step_bridge')
da.va.clear_scene()
s = da.va.Session('deer', os.path.abspath('scratch/dbg'))
s.config.setdefault('armSegments', {'helper': 0.032})
for st in da.STEPS:
    r = st(s)
    if st.__name__ == stop:
        break
bm = bmesh.new(); bm.from_mesh(s.mesh.data)
part = bm.verts.layers.int['arm_part']
fr = s.fr
def stu(co):
    return tuple(round(v, 4) for v in (co.x / fr.height, (co.z - fr.floor) / fr.height, -co.y / fr.height))
a, e, _, _ = da.va.arm_line(s, 1)
u = (e - a).normalized()
bad = 0; total = 0
for f in bm.faces:
    codes = {p[part] for p in f.verts}
    if not (3 in codes and (codes & {1, 5})):
        continue
    total += 1
    c = f.calc_center_median()
    rel = c - a
    radial = (rel - u * rel.dot(u)).normalized()
    d = f.normal.dot(radial)
    if d < 0.2:
        bad += 1
        print('face', f.index, 'dot %.2f' % d, 'center', stu(c), 'codes', sorted(codes), 'minangle %.1f' % min(l.calc_angle() * 57.3 for l in f.loops))
print('bridge faces', total, 'facing in', bad)
# The socket loop in order.
edges = [x for x in bm.edges if x.is_boundary and all(p[part] in (1, 5) for p in x.verts)]
print('socket boundary edges', len(edges))
