"""Runs a variant of tools/blender/cat_arms.py: the spec changes of a JSON text, and optionally the
clean steps of fox_arms.py.

Blender -b --factory-startup -P scratch/cat_arms_v.py -- <out dir> '<JSON changes>' [clean] [--views <dir>]
A change key with dots sets a nested key, such as "seam.rings": [].
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'blender'))
import cat_arms as ca  # noqa: E402
import fox_arms as fa  # noqa: E402

va = ca.va
argv = sys.argv[sys.argv.index('--') + 1:]
if '--views' in argv:
    k = argv.index('--views')
    ca.VIEWS = os.path.abspath(argv[k + 1])
    os.makedirs(ca.VIEWS, exist_ok=True)
    del argv[k:k + 2]
out_dir = os.path.abspath(argv[0])
changes = json.loads(argv[1]) if len(argv) > 1 else {}
clean = 'clean' in argv[2:]
for key, value in changes.items():
    node = ca.CAT
    parts = key.split('.')
    for p in parts[:-1]:
        node = node[p]
    node[parts[-1]] = tuple(value) if isinstance(value, list) and parts[-1] in ('rings', 'slim', 'upper') else value
va.ANIMALS['cat'] = ca.CAT
steps = ca.STEPS
if clean:
    steps = tuple(out for step in ca.STEPS
                  for out in {ca.step_wall: (ca.step_wall, fa.step_clean_cut),
                              ca.step_beautify: (ca.step_beautify, fa.step_clean_bridge)
                              }.get(step, (step,)))
va.clear_scene()
s = va.Session('cat', out_dir)
for step in steps:
    print('%s: %s' % (step.__name__, step(s)))
