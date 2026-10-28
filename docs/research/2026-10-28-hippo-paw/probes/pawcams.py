"""Writes cameras around the right paw of the hippo bassist for `close-views play --camera-file`.

Usage: python3 pawcams.py <x> <z> <facing> <tx> <ty> <tz> <distance> <elevation> <az,...>
The target is in the model axes of the player (+x the right side, -z the front).
"""
import json
import math
import sys

px, pz, f, tx, ty, tz, d, el = (float(v) for v in sys.argv[1:9])
azs = [float(a) for a in sys.argv[9].split(',')]
c, s = math.cos(f), math.sin(f)


def world(m):
    return [px + m[0] * c + m[2] * s, m[1], pz - m[0] * s + m[2] * c]


cams = {}
e = math.radians(el)
for az in azs:
    a = math.radians(az)
    off = (math.sin(a) * d * math.cos(e), d * math.sin(e), -math.cos(a) * d * math.cos(e))
    pos = (tx + off[0], ty + off[1], tz + off[2])
    cams[f'az{int(az)}-e{int(el)}'] = {'position': world(pos), 'target': world((tx, ty, tz)), 'fov': 30}
print(json.dumps(cams, indent=1))
