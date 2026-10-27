# Computes the forearm turn (palm angle from the elbow hinge, + toward supination) of the left paw
# in the seated bind of the rhino rig, for bind forearm directions turned about the bind upper arm
# (`bind_turns()` of tools/blender/rig_mesh.py), from the bind arms of the other meshes. Then it
# gives the bind hand that keeps the wrist bend of 25 degrees in the frame of the palm.
# Usage, from the root of the tree:
# uv run --no-project --with numpy python -I docs/research/2026-10-26-fifth-rhino/probes/bind-hinge.py
import json, math
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

c = json.load(open('tools/mesh-rigs/rhino.json'))
j = c['joints']
h = lambda n: np.asarray(j[n]['head'], float)
u_src = unit(h('forearm_L') - h('upper_arm_L'))
f_src = unit(h('hand_L') - h('forearm_L'))
d_src = unit(h('fingers_L') - h('hand_L'))
palm_src = unit(c['palm'])
ba = {'upper_arm': [0.813873, -0.143043, 0.563161], 'forearm': [0.316246, 0.757051, 0.571719], 'hand': [-0.078782, 0.677317, 0.731461]}
u_b, f_b, d_b = unit(ba['upper_arm']), unit(ba['forearm']), unit(ba['hand'])

def angle(u, f, palm):
    # Studio axes: +x is the left side, so the medial direction of the left arm is -x. The hinge
    # u x f of a left arm that bends forward points to -x (cross((0,-1,0),(0,0,1)) = (-1,0,0)).
    hinge = unit(np.cross(u, f))
    sup = -u + f * np.dot(u, f); sup = unit(sup)
    p = palm - f * np.dot(palm, f); p = unit(p)
    return math.degrees(math.atan2(np.dot(p, sup), np.dot(p, hinge)))

# The anatomical reading of the source: the elbow bends forward (+z).
fwd = np.array([0, 0, 1.0]); fwd = unit(fwd - u_src * np.dot(fwd, u_src))
print('source, forward bend: %.1f' % angle(u_src, unit(u_src * math.cos(math.radians(60)) + fwd * math.sin(math.radians(60))), palm_src))
Su = swing(u_src, u_b)
for phi in range(-90, 91, 15):
    R = rot(u_b, phi)
    f_new, d_new = R @ f_b, R @ d_b
    Sf = swing(Su @ f_src, f_new) @ Su
    palm_b = Sf @ palm_src
    print('phi %4d: forearm %s, bind palm angle %.1f' % (phi, np.round(f_new, 4).tolist(), angle(u_b, f_new, palm_b)))
import sys
for phi in (45, 60, 68, 75):
    R = rot(u_b, phi)
    print('PHI', phi, 'forearm', json.dumps([round(float(x), 6) for x in R @ f_b]), 'hand', json.dumps([round(float(x), 6) for x in R @ d_b]))

print('--- wrist bend kept in the frame of the palm')
d_src_u = d_src
def bind_palm(f_new):
    Sf = swing(Su @ f_src, f_new) @ Su
    return Sf, Sf @ palm_src
Sf0, palm0 = bind_palm(f_b)
th = math.acos(np.clip(np.dot(f_b, d_b), -1, 1))
b0 = unit(d_b - f_b * np.dot(d_b, f_b))
p0 = unit(palm0 - f_b * np.dot(palm0, f_b))
x0, y0 = np.dot(b0, p0), np.dot(b0, np.cross(f_b, p0))
print('old bend %.1f deg, x %.3f y %.3f' % (math.degrees(th), x0, y0))
for phi in (68,):
    f_new = rot(u_b, phi) @ f_b
    Sf, palmn = bind_palm(f_new)
    pn = unit(palmn - f_new * np.dot(palmn, f_new))
    bn = x0 * pn + y0 * np.cross(f_new, pn)
    d_new = math.cos(th) * f_new + math.sin(th) * bn
    print('PHI2', phi, 'forearm', json.dumps([round(float(v), 6) for v in f_new]), 'hand', json.dumps([round(float(v), 6) for v in d_new]))
    # check: the bind paw palm after the hand swing, and its angle
    Sh = swing(Sf @ d_src, d_new) @ Sf
    print('  bind palm angle (hand palm vs forearm hinge) %.1f' % angle(u_b, f_new, Sh @ palm_src))
    d_rot = rot(u_b, phi) @ d_b
    Sh2 = swing(Sf @ d_src, d_rot) @ Sf
    print('  old bind hand palm %.1f' % angle(u_b, f_b, (swing(Sf0 @ d_src, d_b) @ Sf0) @ palm_src))
    print('  with the turned hand: %.1f' % angle(u_b, f_new, Sh2 @ palm_src))
