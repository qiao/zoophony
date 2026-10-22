"""Runs the free arm and the cut of rig_mesh.py on the bear source for variants of the rules, and
prints the runs of each cut, the new faces that repeat a kept face, and the mixed faces.

    blender -b --factory-startup --python scratch/cutprobe.py -- <root> '<rules JSON>'...
"""
import json, os, sys
import numpy as np
argv = sys.argv[sys.argv.index('--') + 1:]
ROOT = argv[0]
RIG = os.path.join(ROOT, 'tools', 'blender', 'rig_mesh.py')
code = open(RIG).read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)
os.chdir(ROOT)
config = json.load(open('tools/mesh-rigs/bear.json'))
verts, tris, uvs, texture = rig['load_mesh'](config)
heads, ends, rolls, children = rig['joints_of'](config)
for text in argv[1:]:
    rules = dict(config['weights']); rules.update(json.loads(text))
    cut = dict(config['cut']); cut.update(rules.pop('cut', {}))
    print('variant', text)
    try:
        new_tris, _, report = rig["cut_seam"](verts, tris, uvs, rules, heads, ends, cut)
    except SystemExit as error:
        print("  cut failed:", error)
        continue
    kept = {tuple(sorted(t)) for t in new_tris[:len(new_tris) - sum(len(r[2]) for r in report)]}
    for side, mixed, faces, arm_run, body_run in report:
        rep = [f for f in faces if tuple(sorted(f)) in kept]
        print(f'  {side}: {len(mixed)} go, arm run {arm_run}, body run {body_run}')
        print(f'     new faces that repeat a kept face: {rep}')
        for f in rep:
            print('       corners', [list(np.round(verts[v], 3)) for v in f])
