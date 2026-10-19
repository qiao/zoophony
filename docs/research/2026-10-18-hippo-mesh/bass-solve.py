"""Gives playShift (in H) and playTurn (x, y, z, w) of the contrabass of the hippo that put its
end pin, axis, and top plate at targets. The bind frame comes from bass-frame.ts with no play
shift and no play turn.

    python3 -I bass-solve.py <contact x,y,z> <nut x,y,z> <front x,z> [<scale distance to contact>]
"""
import math
import sys

import numpy as np

H = 0.505298
pin_b = np.array([-0.071, 0.0, -0.795])
contact_b = np.array([-0.236, 0.975, -0.746])
nut_b = np.array([-0.452, 1.791, -0.562])
axis_b = (nut_b - contact_b) / np.linalg.norm(nut_b - contact_b)
front_b = np.array([0.55, 0.0, -1.0])
front_b -= axis_b * (front_b @ axis_b); front_b /= np.linalg.norm(front_b)
contact = np.array([float(v) for v in sys.argv[1].split(',')])
nut = np.array([float(v) for v in sys.argv[2].split(',')])
fx, fz = (float(v) for v in sys.argv[3].split(','))
dc = float(sys.argv[4]) if len(sys.argv) > 4 else 0.99
axis_t = (nut - contact) / np.linalg.norm(nut - contact)
front_t = np.array([fx, 0.0, fz]); front_t -= axis_t * (front_t @ axis_t); front_t /= np.linalg.norm(front_t)
side_b = np.cross(axis_b, front_b); side_t = np.cross(axis_t, front_t)
B = np.stack([axis_b, front_b, side_b], axis=1); T = np.stack([axis_t, front_t, side_t], axis=1)
R = T @ B.T
w = math.sqrt(max(0.0, 1 + R[0, 0] + R[1, 1] + R[2, 2])) / 2
x = (R[2, 1] - R[1, 2]) / (4 * w); y = (R[0, 2] - R[2, 0]) / (4 * w); z = (R[1, 0] - R[0, 1]) / (4 * w)
pin_t = contact - R @ (contact_b - pin_b)
shift = (pin_t - pin_b) / H
lean = math.degrees(math.acos(axis_t[1]))
print(f'axis {axis_t.round(3)} lean {lean:.1f} deg, pin {pin_t.round(3)}, contact to nut {np.linalg.norm(nut - contact):.3f} m')
print(f'contrabass@hippo.playShift={shift[0]:.3f},{shift[1]:.3f},{shift[2]:.3f};contrabass@hippo.playTurn={x:.4f},{y:.4f},{z:.4f},{w:.4f}')
