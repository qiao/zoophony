"""Writes the cameras of the angle of image 56 for `pnpm close-views play --camera-file`.

The hippo bassist of boulanger-matin stands at the place of `place.ts` (position and facing). Each
camera looks at a point of the bow forearm from the right of the hippo and a little behind it, in
the axes of the model (+x the right side, -z the front). Usage: python3 cams56.py <x> <z> <facing>
"""
import json
import math
import sys

px, pz, f = (float(v) for v in sys.argv[1:4])
c, s = math.cos(f), math.sin(f)


def world(m):
    return [px + m[0] * c + m[2] * s, m[1], pz - m[0] * s + m[2] * c]


cams = {}
for name, tgt, off in (('u56', (0.22, 0.86, -0.5), (0.9, 0.2, 0.45)),
                       ('u56-wide', (0.22, 0.86, -0.5), (1.4, 0.3, 0.7))):
    pos = tuple(tgt[k] + off[k] for k in range(3))
    cams[name] = {'position': world(pos), 'target': world(tgt), 'fov': 30}
print(json.dumps(cams, indent=1))
