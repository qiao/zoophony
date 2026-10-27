"""Runs deer_arms.py with overrides of DEER from the JSON of the env VARIANT, into an out dir."""
import json, os, sys
sys.path.insert(0, os.path.abspath('tools/blender'))
import deer_arms as da

def merge(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict):
            merge(a[k], v)
        else:
            a[k] = tuple(v) if isinstance(v, list) else v

merge(da.DEER, json.loads(os.environ.get('VARIANT', '{}')))
out = sys.argv[sys.argv.index('--') + 1]
os.makedirs(out, exist_ok=True)
da.va.clear_scene()
s = da.va.Session('deer', os.path.abspath(out))
s.config.setdefault('armSegments', {'helper': 2 * da.DEER['gap']})
for st in da.STEPS:
    print('%s: %s' % (st.__name__, st(s)))
