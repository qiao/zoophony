# Output: the head places of `tools/mesh-rigs/wolf.json` with the kept head.
"""Moves the head places of the wolf rig config of round wolf-shape onto the source with the head
kept (`proportions.keep` of `tools/mesh-rigs/wolf.json`, `proportioned()` of
`tools/blender/rig_mesh.py`). Each place at or above the blend zone takes the map of the rule
from its place on the source before the factors. The places of round mesh-wolf (980f2bf5) give
the head joints, the ear joints, the eye box, the nose box, and the heights of the weights. The
rigid point of round wolf-shape at the top of the left shoulder goes back to the source with
the factors (1.2, 0.9, 1), and then takes the map. The notes change by hand.

    python3 -I tools/rig/wolf_head_config.py <wolf.json of 980f2bf5> <wolf.json of 98875452> <out.json> [lower height of the blend]
"""
import json
import sys

W, H = 1.2, 0.9
LOW, HIGH = float(sys.argv[4]) if len(sys.argv) > 4 else 0.70, 0.775


def num(x):
    x = round(x, 6)
    return int(x) if x == int(x) else x


def share(y):
    """The share of the kept place: the smoothstep of the rule over the blend zone."""
    t = min(max((y - LOW) / (HIGH - LOW), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def point(p):
    """Maps a point of the source before the factors."""
    s = share(p[1])
    x = p[0] * (W * (1 - s) + s)
    y = p[1] * H * (1 - s) + (p[1] + HIGH * (H - 1)) * s
    return [num(x), num(y), p[2]]


def height(y):
    return point([0, y, 0])[1]


with open(sys.argv[1]) as f:
    base = json.load(f)
with open(sys.argv[2]) as f:
    c = json.load(f)
c['proportions'] = {'width': W, 'height': H, 'keep': 'head', 'blend': [LOW, HIGH]}
for name in ('neck', 'head', 'ear_L'):
    joint, old = c['joints'][name], base['joints'][name]
    joint['head'] = point(old['head'])
    if isinstance(old['tail'], list):
        joint['tail'] = point(old['tail'])
w, old = c['weights'], base['weights']
w['headFrom'] = num(height(old['headFrom']))
for key in ('earBase', 'armTop'):
    w[key] = [num(height(y)) for y in old[key]]
# The share of the head weight on the shoulders below the head line grows across the neck, which
# lies in the blend zone. Its distances take the width factor of the middle of the zone, 1.1.
w['shoulderHead'] = [num(x * (W + 1) / 2) for x in old['shoulderHead']]
# The rigid point of face 2093, the top of the left shoulder, lies in the blend zone.
p = w['rigid'][5]
w['rigid'][5] = point([p[0] / W, p[1] / H, p[2]])
for key in ('eyeBox', 'noseBox'):
    c['colors'][key] = [point(q) for q in base['colors'][key]]
with open(sys.argv[3], 'w') as f:
    json.dump(c, f, indent=2, ensure_ascii=True)
    f.write('\n')
