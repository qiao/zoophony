"""Runs the steps of cat_arms.py (with WALL_SET-like overrides of seam by SEAM_SET) through
step_paint, and prints for each ring of each tube the mean share of the lower bones of the
config (the share that the rig gives the rule weights), and of the chest alone.

    Blender -b --factory-startup -P scratch/ring_share.py
"""
import json, os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'blender'))
sys.argv = [sys.argv[0], '--', '/tmp/unused-ring-share']
import cat_arms as ca
import violin_arms as va
for kv in filter(None, os.environ.get('SEAM_SET', '').split(',')):
    k, v = kv.split('=')
    ca.CAT['seam'][k] = json.loads(v)
va.clear_scene()
s = va.Session('cat', '/tmp/unused-ring-share')
for step in ca.STEPS:
    if step.__name__ in ('step_export', 'step_weights'):
        continue
    step(s)
    if step.__name__ == 'step_paint':
        break
mesh = s.mesh
lower = set(s.config['paintedLower'])
names = {g.index: g.name for g in mesh.vertex_groups}
part = [a.value for a in mesh.data.attributes['arm_part'].data]
ring = [a.value for a in mesh.data.attributes['arm_ring'].data]
for side, off in (('L', 0), ('R', 10)):
    rows = {}
    for p in mesh.data.vertices:
        if part[p.index] != ca.PART['tube'] + off:
            continue
        low = sum(g.weight for g in p.groups if names[g.group] in lower)
        chest = sum(g.weight for g in p.groups if names[g.group] == 'chest')
        tot = sum(g.weight for g in p.groups)
        r = rows.setdefault(ring[p.index], [0, 0.0, 0.0, 0.0])
        r[0] += 1; r[1] += low / tot; r[2] += chest / tot
        r[3] = max(r[3], low / tot)
    print(side, ' '.join('r%d %.2f/%.2f/%.2f' % (k, v[1] / v[0], v[2] / v[0], v[3]) for k, v in sorted(rows.items())[:8]))
