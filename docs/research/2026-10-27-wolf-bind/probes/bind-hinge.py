# Computes the bind arms of the wolf for a turn of the bind forearm about the bind upper arm
# (route A of docs/research/2026-10-27-left-paw-bind.md), and the bind hand that keeps the wrist
# bend in the frame of the palm (variant D of docs/research/2026-10-26-fifth-rhino.md). It prints
# the palm angle of the bind paw from the elbow hinge (+ toward supination) for each turn.
# It reads the bind arms of the config, so give it the config before the turn:
#   git show c6602974:tools/mesh-rigs/wolf.json > scratch/wolf-c6602974.json
# Usage, from the root of the tree:
#   uv run --no-project --with numpy python -I docs/research/2026-10-27-wolf-bind/probes/bind-hinge.py \
#     scratch/wolf-c6602974.json -60 -45 -30 0 30 45 60
import json, math, sys
import numpy as np

def unit(v):
    v = np.asarray(v, float); return v / np.linalg.norm(v)

def swing(a, b):
    a, b = unit(a), unit(b)
    axis = np.cross(a, b); s = np.linalg.norm(axis); c = float(np.dot(a, b))
    if s < 1e-9: return np.eye(3)
    k = axis / s
    kx = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + s * kx + (1 - c) * kx @ kx

def rot(axis, deg):
    k = unit(axis); a = math.radians(deg)
    kx = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + math.sin(a) * kx + (1 - math.cos(a)) * kx @ kx

path = sys.argv[1] if len(sys.argv) > 1 else 'tools/mesh-rigs/wolf.json'
turns = [float(t) for t in sys.argv[2:]] or [0, 15, 30, 45, 60, 75]
c = json.load(open(path))
j = c['joints']
h = lambda n: np.asarray(j[n]['head'], float)
u_src = unit(h('forearm_L') - h('upper_arm_L'))
f_src = unit(h('hand_L') - h('forearm_L'))
d_src = unit(h('fingers_L') - h('hand_L'))
palm_src = unit(c['palm'])
ba = c['studio']['bindArms']
u_b, f_b, d_b = unit(ba['upper_arm']), unit(ba['forearm']), unit(ba['hand'])

def angle(u, f, palm):
    hinge = unit(np.cross(u, f))
    sup = unit(-u + f * np.dot(u, f))
    p = unit(palm - f * np.dot(palm, f))
    return math.degrees(math.atan2(np.dot(p, sup), np.dot(p, hinge)))

Su = swing(u_src, u_b)
def bind_palm(f_new):
    Sf = swing(Su @ f_src, f_new) @ Su
    return Sf, Sf @ palm_src

Sf0, palm0 = bind_palm(f_b)
th = math.acos(np.clip(np.dot(f_b, d_b), -1, 1))
b0 = unit(d_b - f_b * np.dot(d_b, f_b))
p0 = unit(palm0 - f_b * np.dot(palm0, f_b))
x0, y0 = np.dot(b0, p0), np.dot(b0, np.cross(f_b, p0))
print('wrist bend of the bind %.1f deg' % math.degrees(th))
for phi in turns:
    f_new = rot(u_b, phi) @ f_b
    Sf, palmn = bind_palm(f_new)
    pn = unit(palmn - f_new * np.dot(palmn, f_new))
    bn = x0 * pn + y0 * np.cross(f_new, pn)
    d_new = math.cos(th) * f_new + math.sin(th) * bn
    Sh = swing(Sf @ d_src, d_new) @ Sf
    print('turn %5.1f: forearm palm %.1f, hand palm %.1f, forearm %s, hand %s' % (
        phi, angle(u_b, f_new, palmn), angle(u_b, f_new, Sh @ palm_src),
        json.dumps([round(float(v), 6) for v in f_new]),
        json.dumps([round(float(v), 6) for v in d_new])))
