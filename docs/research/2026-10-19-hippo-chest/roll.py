"""Rolls the contrabass of the hippo around its string line (contact to nut), so that the top
plate turns to the left of the hippo by an angle, and prints the hold changes. The contact point
and the nut stay. It prints how far the end pin leaves the floor.
    uv run --no-project --with numpy python -I roll.py <degrees>..."""
import math
import sys

import numpy as np

H = 0.505298
x, y, z, w = -0.0664, 0.2385, 0.215, 0.9447


def mat(x, y, z, w):
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                     [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                     [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])


def quat(r):
    w = math.sqrt(max(0.0, 1 + r[0, 0] + r[1, 1] + r[2, 2])) / 2
    return ((r[2, 1]-r[1, 2])/(4*w), (r[0, 2]-r[2, 0])/(4*w), (r[1, 0]-r[0, 1])/(4*w), w)


def axis_angle(a, t):
    a = a / np.linalg.norm(a)
    k = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    return np.eye(3) + math.sin(t)*k + (1-math.cos(t))*(k@k)


R = mat(x, y, z, w)
contact_b = np.array([-0.148, 0.644, -0.527]); nut_b = np.array([-0.365, 1.460, -0.344]); pin_b = np.array([-0.071, 0, -0.503])
fb = np.array([0.55, 0, -1.0]); ab = (nut_b-contact_b)/np.linalg.norm(nut_b-contact_b); fb -= ab*(fb@ab); fb /= np.linalg.norm(fb)
pin_t = pin_b + np.array([0.84, 0, 0.004])*H
c = pin_t + R@(contact_b-pin_b); n = pin_t + R@(nut_b-pin_b)
axis = n - c
for text in sys.argv[1:]:
    deg = float(text)
    # Take the sign of the angle that turns the top plate to the left of the hippo (-x).
    for sign in (1, -1):
        Q = axis_angle(axis, sign*math.radians(deg))
        f = Q @ R @ fb
        yaw = math.degrees(math.atan2(f[0], -f[2]))
        if (yaw < -9.2) == (deg > 0):
            break
    R2 = Q @ R
    pin2 = c + Q@(pin_t - c)
    shift = (pin2 - pin_b)/H
    q = quat(R2)
    print(f'roll {deg}: yaw {yaw:.1f} deg, pin {pin2.round(3)} (y {pin2[1]*100:.1f} cm)')
    print(f'  contrabass@hippo.playShift={shift[0]:.3f},{shift[1]:.3f},{shift[2]:.3f};contrabass@hippo.playTurn={q[0]:.4f},{q[1]:.4f},{q[2]:.4f},{q[3]:.4f}')
