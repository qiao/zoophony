"""Writes a variant of a rig config: variant.py <config> <out> <path>=<json> | <path>+=<json>...

A path is dotted. The value null removes the key. The form += appends to a list.
"""
import json
import sys

config = json.load(open(sys.argv[1]))
for item in sys.argv[3:]:
    path, value = item.split('+=', 1) if '+=' in item else item.split('=', 1)
    keys = path.split('.')
    node = config
    for k in keys[:-1]:
        node = node.setdefault(k, {})
    v = json.loads(value)
    if '+=' in item:
        node[keys[-1]].append(v)
    elif v is None:
        node.pop(keys[-1], None)
    else:
        node[keys[-1]] = v
json.dump(config, open(sys.argv[2], 'w'), indent=1)
