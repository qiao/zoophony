"""Rigs the cat variants of B, N, and the combinations: a hanging-tail rig for the seat top
(sit.top), then the final rig. Prints one JSON line for each variant."""
import json, os, subprocess, sys
sys.argv = [sys.argv[0]]
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'var.py')).read().replace('\nmain()\n', '\n'))
T = 0.85768
P25 = None
VARIANTS = {
    'b-t09': {'trunkFactor': round(T * 0.9, 6)},
    'b-t08': {'trunkFactor': round(T * 0.8, 6)},
    'b-w115': {'girthFactor': 1.15},
    'b-w13': {'girthFactor': 1.3},
    'n-08': {'neckFactor': 0.8},
    'n-065': {'neckFactor': 0.65},
    'moderate': {'trunkFactor': round(T * 0.9, 6), 'girthFactor': 1.15, 'neckFactor': 0.8, 'slope': 25},
    'strong': {'trunkFactor': round(T * 0.8, 6), 'girthFactor': 1.3, 'neckFactor': 0.65, 'slope': 25},
}
name = os.environ['VARIANT']
spec = dict(VARIANTS[name])
c = base('cat')
if 'slope' in spec:
    c['studio']['legTurns'] = leg_turns('cat', spec.pop('slope'))
for k, v in spec.items():
    c[k] = v
if 'girthFactor' in spec:
    c['chair']['halfWidth'] = round(0.17 * spec['girthFactor'], 4)
h = json.loads(json.dumps(c))
h['studio'].pop('tailCurl', None)
h['studio']['tailBind'] = TAIL_BIND
h['sit'].pop('top', None)
hr = rig(f'{name}-hang', h)
c['sit']['top'] = hr['rise_top']
r = rig(name, c)
print(name, json.dumps({'hang': hr, 'final': r, 'sit.top': hr['rise_top']}), flush=True)
