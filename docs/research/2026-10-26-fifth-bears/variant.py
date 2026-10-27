"""Writes a variant of a rig config: variant.py <config> <out> <path>=<json>...

A path is dotted, such as weights.knee.height=[0.13,0.18]. The value null removes the key.
"""
import json
import sys

config = json.load(open(sys.argv[1]))
for item in sys.argv[3:]:
    path, value = item.split('=', 1)
    keys = path.split('.')
    node = config
    for k in keys[:-1]:
        node = node.setdefault(k, {})
    v = json.loads(value)
    if v is None:
        node.pop(keys[-1], None)
    else:
        node[keys[-1]] = v
json.dump(config, open(sys.argv[2], 'w'), indent=1)
