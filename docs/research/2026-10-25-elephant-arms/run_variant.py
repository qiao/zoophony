"""Runs elephant_arms.py with overrides of ELEPHANT into an out dir.

blender -b --factory-startup -P docs/research/2026-10-25-elephant-arms/run_variant.py -- <out dir> [key=value ...]
A key `a.b` changes the entry b of the dict a.
"""
import ast
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'blender'))
import elephant_arms as ea  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:]
out = os.path.abspath(argv[0])
os.makedirs(out, exist_ok=True)
helper = None
for kv in argv[1:]:
    k, v = kv.split('=', 1)
    if k == 'helper':
        helper = float(v)
    elif '.' in k:
        a, b = k.split('.', 1)
        ea.ELEPHANT[a] = dict(ea.ELEPHANT[a])
        ea.ELEPHANT[a][b] = ast.literal_eval(v)
    else:
        ea.ELEPHANT[k] = ast.literal_eval(v)
print('SPEC', ea.ELEPHANT)
ea.wa.ANIMALS['elephant'] = ea.ELEPHANT
ea.va.clear_scene()
s = ea.wa.Session('elephant', out)
if helper is not None:
    s.config['armSegments']['helper'] = helper
ea.run_steps(s)
