# Output: the places of `tools/mesh-rigs/wolf.json` for the head factor and the body factor.
"""Moves the places of the wolf rig config of round wolf-head (0e7130db) onto the source with a
larger kept head and a smaller body (`proportions` of `tools/mesh-rigs/wolf.json`,
`proportioned()` of `tools/blender/rig_mesh.py`). Each place goes back to the source before the
factors through the map of 0e7130db, and then takes the new map: the body takes the factor `body`
on each axis, and the kept head the factor `head` around the point (0, upper height of the blend
zone, 0). Directions (the palm, the bind arms, the leg turns, the tail bind) do not change,
because the body scale is the same on each axis and the head scale too. The notes change by hand.

    python3 -I tools/rig/wolf_size_config.py <wolf.json of 0e7130db> <out.json> <head> <body>
"""
import json
import sys

W, H = 1.2, 0.9
LOW, HIGH = 0.74, 0.775
HEAD, BODY = float(sys.argv[3]), float(sys.argv[4])


def num(x):
    x = round(x, 6)
    return int(x) if x == int(x) else x


def share(y):
    t = min(max((y - LOW) / (HIGH - LOW), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def old_y(s):
    k = share(s)
    return s * H * (1 - k) + (s + HIGH * (H - 1)) * k


def source_y(y):
    """Inverts the y map of 0e7130db by bisection: the map grows with y."""
    lo, hi = -1.0, 2.0
    for _ in range(200):
        mid = (lo + hi) / 2
        if old_y(mid) < y:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def point(p):
    """Maps a place of the config of 0e7130db to the new units."""
    s = source_y(p[1])
    k = share(s)
    sx = p[0] / (W * (1 - k) + k)
    sz = p[2]
    x = sx * (W * BODY * (1 - k) + HEAD * k)
    y = s * H * BODY * (1 - k) + (HIGH * H * BODY + (s - HIGH) * HEAD) * k
    z = sz * (BODY * (1 - k) + HEAD * k)
    return [num(x), num(y), num(z)]


def height(y):
    return point([0, y, 0])[1]


with open(sys.argv[1]) as f:
    c = json.load(f)
p = c['proportions']
p['width'], p['height'], p['depth'] = num(W * BODY), num(H * BODY), num(BODY)
p['head'] = num(HEAD)
c['proportions'] = {k: p[k] for k in ('width', 'height', 'depth', 'head', 'keep', 'blend')}
c['app']['shoulders'] = num(c['app']['shoulders'] * BODY)
for joint in c['joints'].values():
    joint['head'] = point(joint['head'])
    if isinstance(joint['tail'], list):
        joint['tail'] = point(joint['tail'])
w = c['weights']
w['armSplit'] = num(w['armSplit'] * BODY)
w['headFrom'] = height(w['headFrom'])
for key in ('earBase', 'clavicleFrom', 'armTop'):
    w[key] = [height(y) for y in w[key]]
# The share of the head weight on the shoulders grows across the neck, in the blend zone. Its
# distances take the width factor of the middle of the zone.
w['shoulderHead'] = [num(x / ((W + 1) / 2) * (W * BODY + HEAD) / 2) for x in w['shoulderHead']]
w['haunch']['height'] = [height(y) for y in w['haunch']['height']]
t = w['tail']
t['radius'], t['behind'], t['bend'] = (num(t['radius'] * BODY), num(t['behind'] * BODY),
                                       num(t['bend'] * BODY))
t['root'] = [num(s * BODY) for s in t['root']]
w['rigid'] = [point(q) for q in w['rigid']]
for key in ('eyeBox', 'noseBox'):
    c['colors'][key] = [point(q) for q in c['colors'][key]]
ch = c['chair']
for key in ('halfWidth', 'front', 'back', 'backHeight'):
    ch[key] = num(ch[key] * BODY)
with open(sys.argv[2], 'w') as f:
    json.dump(c, f, indent=2, ensure_ascii=True)
    f.write('\n')
