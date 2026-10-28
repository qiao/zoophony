"""Runs the steps of `cat_arms.py` and prints the mean weights of the left arm tube vertices by
station along the arm after `step_bind` (the automatic weights) and after `step_paint`.

    Blender -b --factory-startup -P scratch/stage-weights.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'blender'))
sys.argv = [sys.argv[0], '--', '/tmp/unused']
import cat_arms as ca  # noqa: E402
import violin_arms as va  # noqa: E402
from mathutils import Vector  # noqa: E402


def dump(s, label):
    mesh = s.mesh
    names = {g.index: g.name for g in mesh.vertex_groups}
    part = [a.value for a in mesh.data.attributes['arm_part'].data]
    j = s.config['joints']
    S = s.fr.point(j['upper_arm_L']['head'])
    E = s.fr.point(j['forearm_L']['head'])
    W = s.fr.point(j['hand_L']['head'])
    u, f = E - S, W - E
    rows = {}
    for p in mesh.data.vertices:
        if part[p.index] != ca.PART['tube']:
            continue
        tu = (p.co - S).dot(u) / u.length_squared
        tf = (p.co - E).dot(f) / f.length_squared
        k = ('u', round(tu * 10) / 10) if tu < 1 else ('f', round(tf * 10) / 10)
        r = rows.setdefault(k, {'n': 0})
        r['n'] += 1
        for g in p.groups:
            n = names[g.group].replace('_L', '').replace('upper_arm_', 'u').replace('forearm_', 'f')
            if names[g.group].endswith('_R'):
                continue
            r[n] = r.get(n, 0.0) + g.weight
    print(label)
    for k in sorted(rows, key=lambda k: (k[0] == 'f', k[1])):
        r = rows[k]
        n = r.pop('n')
        print(f'  {k[0]}{k[1]:.1f} n={n:3d}', {b: round(w / n, 2) for b, w in sorted(r.items()) if w / n > 0.005})


va.clear_scene()
s = va.Session('cat', '/tmp/unused-cat')
for step in ca.STEPS:
    if step.__name__ in ('step_export', 'step_weights'):
        if step.__name__ == 'step_export':
            continue
        break
    step(s)
    if step.__name__ == 'step_bind':
        dump(s, 'after step_bind (automatic weights, Limit Total 4)')
dump(s, 'after step_paint')
