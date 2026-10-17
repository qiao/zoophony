"""Writes a variant of a rig config: patch.py <base.json> <out.json> <path>=<json value>|<path>=DELETE..."""
import json, sys
base, out, *sets = sys.argv[1:]
config = json.load(open(base))
for item in sets:
    path, value = item.split('=', 1)
    keys = path.split('.')
    node = config
    for k in keys[:-1]:
        node = node[int(k)] if isinstance(node, list) else node.setdefault(k, {})
    last = keys[-1]
    if value == 'DELETE':
        del node[last]
        continue
    v = json.loads(value)
    if isinstance(node, list):
        node[int(last)] = v
    else:
        node[last] = v
json.dump(config, open(out, 'w'), indent=2)
