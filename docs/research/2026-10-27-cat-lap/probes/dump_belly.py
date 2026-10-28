"""Runs the steps of cat_arms.py up to step_belly, and writes the trunk frame of each vertex and
the triangles before and after step_belly (npz), so that a probe can study the lap.

    Blender -b --factory-startup -P scratch/dump_belly.py -- <out.npz> [<module>]

<module> is a copy of cat_arms.py to import in place of tools/blender/cat_arms.py.
"""
import importlib.util
import os
import sys

import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
out = os.path.abspath(argv[0])
root = os.getcwd()
sys.path.insert(0, os.path.join(root, 'tools/blender'))
path = argv[1] if len(argv) > 1 else os.path.join(root, 'tools/blender/cat_arms.py')
spec = importlib.util.spec_from_file_location('cat_arms_probe', path)
ca = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ca)
va = ca.va
import json
if os.environ.get('BELLY'):
    ca.CAT['belly'].update(json.loads(os.environ['BELLY']))
    print('belly', ca.CAT['belly'])
va.clear_scene()
s = va.Session('cat', os.path.join(root, 'scratch/dump-out'))
k = ca.STEPS.index(ca.step_belly)
for step in ca.STEPS[:k]:
    step(s)


def frame():
    data = s.mesh.data
    fr = s.fr
    co = np.array([v.co[:] for v in data.vertices])
    points = np.stack([co[:, 0], co[:, 2] - fr.floor, -co[:, 1]], 1) / fr.height
    f, d, x, length, forward, left = ca.trunk_frame(s, points)
    return f, d, x, length


data = s.mesh.data
data.calc_loop_triangles()
tris = np.array([t.vertices[:] for t in data.loop_triangles], np.int64)
part = np.array([a.value for a in data.attributes['arm_part'].data])
f0, d0, x0, length = frame()
print('step_belly', ca.step_belly(s))
f1, d1, x1, _ = frame()
np.savez(out, f0=f0, d0=d0, x0=x0, f1=f1, d1=d1, x1=x1, tris=tris, part=part, length=length,
         height=s.fr.height)
print('wrote', out)
if os.environ.get('VIEWS'):
    ca.VIEWS = os.path.abspath(os.environ['VIEWS'])
    os.makedirs(ca.VIEWS, exist_ok=True)
    ca.look(s, 'lap', [s.mesh], center=(0.0, 0.25, 0.1), scale=0.2,
            views=(('front', 0, 0), ('side', 90, 0), ('f35', 35, 10), ('low', 0, -35)))
