"""Writes a variant of a rig config: variant.py <base.json> <out.json> <path>=<json>|<path>+=<json>..."""
import json
import sys

base, out = sys.argv[1:3]
c = json.load(open(base))
for change in sys.argv[3:]:
    path, value = change.split('+=', 1) if '+=' in change else change.split('=', 1)
    keys = path.split('.')
    node = c
    for k in keys[:-1]:
        node = node[int(k)] if isinstance(node, list) else node[k]
    last = int(keys[-1]) if isinstance(node, list) else keys[-1]
    v = json.loads(value)
    if '+=' in change:
        node[last].append(v)
    elif v is None:
        node.pop(last, None)
    else:
        node[last] = v
json.dump(c, open(out, 'w'), indent=1)
