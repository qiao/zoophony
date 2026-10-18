"""Writes a variant of a rig config: python -I variant.py <base.json> <out.json> <path>=<json>..."""
import json
import sys

base, out = sys.argv[1:3]
c = json.load(open(base))
for change in sys.argv[3:]:
    path, value = change.split('=', 1)
    keys = path.split('.')
    node = c
    for k in keys[:-1]:
        node = node[int(k)] if isinstance(node, list) else node[k]
    v = json.loads(value)
    if v is None:
        node.pop(keys[-1], None)
    else:
        node[keys[-1]] = v
json.dump(c, open(out, 'w'), indent=1)
