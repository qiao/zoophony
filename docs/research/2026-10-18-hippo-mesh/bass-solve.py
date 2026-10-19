"""Gives playShift (in H) and playTurn (x, y, z, w) of the contrabass of the hippo that put its
end pin on the floor, its contact point at a place in plan view, its strings toward a nut target,
and its top plate toward a side. With the end pin on the floor, the lean sets the height of the
contact point, so the script finds that height. The bind points come from bass-frame.ts (no play
shift and no play turn).

    python3 -I bass-solve.py <contact x,z> <nut x,y,z> <front x,z>
"""
import math
import sys

import numpy as np

H = 0.505298
pin_b = np.array([-0.071, 0.0, -0.503])
contact_b = np.array([-0.148, 0.644, -0.527])
nut_b = np.array([-0.365, 1.460, -0.344])
cx, cz = (float(v) for v in sys.argv[1].split(','))
nut = np.array([float(v) for v in sys.argv[2].split(',')])
fx, fz = (float(v) for v in sys.argv[3].split(','))
axis_b = (nut_b - contact_b) / np.linalg.norm(nut_b - contact_b)
front_b = np.array([0.55, 0.0, -1.0])
front_b -= axis_b * (front_b @ axis_b)
front_b /= np.linalg.norm(front_b)


def turn(contact):
    axis_t = (nut - contact) / np.linalg.norm(nut - contact)
    front_t = np.array([fx, 0.0, fz])
    front_t -= axis_t * (front_t @ axis_t)
    front_t /= np.linalg.norm(front_t)
    b = np.stack([axis_b, front_b, np.cross(axis_b, front_b)], axis=1)
    t = np.stack([axis_t, front_t, np.cross(axis_t, front_t)], axis=1)
    return t @ b.T, axis_t


cy = 0.6
for _ in range(50):
    r, axis_t = turn(np.array([cx, cy, cz]))
    cy = (r @ (contact_b - pin_b))[1]
contact = np.array([cx, cy, cz])
r, axis_t = turn(contact)
pin_t = contact - r @ (contact_b - pin_b)
nut_t = contact + r @ (nut_b - contact_b)
w = math.sqrt(max(0.0, 1 + r[0, 0] + r[1, 1] + r[2, 2])) / 2
q = ((r[2, 1] - r[1, 2]) / (4 * w), (r[0, 2] - r[2, 0]) / (4 * w), (r[1, 0] - r[0, 1]) / (4 * w), w)
shift = (pin_t - pin_b) / H
print(f'lean {math.degrees(math.acos(axis_t[1])):.1f} deg, contact {contact.round(3)}, nut {nut_t.round(3)}, pin {pin_t.round(3)}')
print(f'contrabass@hippo.playShift={shift[0]:.3f},0,{shift[2]:.3f};contrabass@hippo.playTurn={q[0]:.4f},{q[1]:.4f},{q[2]:.4f},{q[3]:.4f}')
