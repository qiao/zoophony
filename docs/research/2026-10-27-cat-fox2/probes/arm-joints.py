"""Prints the arm joints of tools/mesh-rigs/cat.json for the length factors (upper arm, forearm)
of tools/blender/cat_arms.py, from the joints of the user mesh (factors 1, 1): the elbow moves
along the upper arm, the twist joint and the wrist along the forearm, and the finger joints with
the wrist.

python3 arm-joints.py <upper> <fore> [json|set]

`set` prints the changes of `pnpm rig-mesh cat --check --set`. The round took 0.92 and 0.78.
"""
import json
import sys

ku, kf = float(sys.argv[1]), float(sys.argv[2])
mode = sys.argv[3] if len(sys.argv) > 3 else 'json'
s = (0.06, 0.636, 0.05)
e = (0.136, 0.526, 0.055)
t = (0.174, 0.471, 0.067)
w = (0.212, 0.416, 0.079)
fh = (0.238, 0.379, 0.081)
ft = (0.244, 0.349, 0.087)


def add(a, b, f=1.0):
    return tuple(x + y * f for x, y in zip(a, b))


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


e2 = add(s, sub(e, s), ku)
t2 = add(e2, sub(t, e), kf)
w2 = add(e2, sub(w, e), kf)
d = sub(w2, w)
joints = {'forearm_L': e2, 'forearm_twist_L': t2, 'hand_L': w2,
          'fingers_L.head': add(fh, d), 'fingers_L.tail': add(ft, d)}
joints = {k: [round(x, 6) for x in v] for k, v in joints.items()}
if mode == 'json':
    print(json.dumps(joints))
else:
    print(';'.join(f'joints.{k if "." in k else k + ".head"}={json.dumps(v).replace(" ", "")}'
                   for k, v in joints.items()))
