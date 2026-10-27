"""Writes a variant of the rig config of the polar bear: variant_cfg.py <out.json> [key=json|DEL]...
Keys use dots for nesting."""
import json, sys
c = json.load(open('tools/mesh-rigs/polar-bear.json'))
for kv in sys.argv[2:]:
    k, v = kv.split('=', 1)
    path = k.split('.')
    node = c
    for p in path[:-1]:
        node = node.setdefault(p, {})
    if v == 'DEL':
        node.pop(path[-1], None)
    else:
        node[path[-1]] = json.loads(v)
json.dump(c, open(sys.argv[1], 'w'), indent=1)
