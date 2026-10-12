"""Rotation math and two-bone IK (numpy only, three.js axes). The template solvers use it."""

import math

import numpy as np


def rot_axis(axis, angle):
    """Makes a rotation matrix from an axis and an angle in radians."""
    axis = np.asarray(axis, float)
    n = np.linalg.norm(axis)
    if n < 1e-12 or abs(angle) < 1e-12:
        return np.eye(3)
    x, y, z = axis / n
    c, s = math.cos(angle), math.sin(angle)
    C = 1 - c
    return np.array([
        [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
        [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
        [z * x * C - y * s, z * y * C + x * s, c + z * z * C],
    ])


def euler(pitch=0.0, yaw=0.0, roll=0.0):
    """Makes a rotation from degrees: pitch about x (+ bends forward), yaw about y (+ turns to
    the animal's left), roll about z (+ leans to the animal's right)."""
    return (rot_axis((0, 1, 0), math.radians(yaw)) @ rot_axis((1, 0, 0), math.radians(pitch))
            @ rot_axis((0, 0, 1), math.radians(roll)))


def unit(v):
    """Normalizes a vector."""
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def frame(a, b):
    """Makes an orthonormal frame with columns (a, b', a x b'), where b' is b made normal to a."""
    a = unit(a)
    b = np.asarray(b, float) - a * np.dot(b, a)
    b = unit(b)
    return np.stack([a, b, np.cross(a, b)], axis=1)


def align(a_from, b_from, a_to, b_to):
    """Finds the rotation that turns the frame (a_from, b_from) into the frame (a_to, b_to)."""
    return frame(a_to, b_to) @ frame(a_from, b_from).T


def quat_from_matrix(m):
    """Converts a rotation matrix to a quaternion (w, x, y, z)."""
    t = np.trace(m)
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        q = [0.25 * s, (m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s]
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = math.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        q = [(m[2, 1] - m[1, 2]) / s, 0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s]
    elif m[1, 1] > m[2, 2]:
        s = math.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        q = [(m[0, 2] - m[2, 0]) / s, (m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s]
    else:
        s = math.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        q = [(m[1, 0] - m[0, 1]) / s, (m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s]
    q = np.array(q)
    return q / np.linalg.norm(q)


def matrix_from_quat(q):
    """Converts a quaternion (w, x, y, z) to a rotation matrix."""
    w, x, y, z = q / np.linalg.norm(q)
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])


def slerp(q0, q1, t):
    """Interpolates two quaternions on the shortest arc."""
    q0 = np.asarray(q0, float)
    q1 = np.asarray(q1, float)
    d = float(np.dot(q0, q1))
    if d < 0:
        q1, d = -q1, -d
    if d > 0.9995:
        q = q0 + t * (q1 - q0)
        return q / np.linalg.norm(q)
    th = math.acos(d)
    return (math.sin((1 - t) * th) * q0 + math.sin(t * th) * q1) / math.sin(th)


def twist_angle(m, axis):
    """Finds the angle of the twist part of rotation m about axis (swing-twist split)."""
    q = quat_from_matrix(m)
    angle = 2.0 * math.atan2(float(np.dot(q[1:], unit(axis))), q[0])
    # The shorter way round: the result is in (-pi, pi].
    return (angle + math.pi) % (2.0 * math.pi) - math.pi


def two_bone(s, t, l1, l2, pole):
    """Solves a two-bone chain from s toward t with the bend toward pole.

    Returns (middle joint, end joint). The end joint is t, or the nearest reachable point.
    """
    d = t - s
    dist = np.linalg.norm(d)
    dist = min(max(dist, abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4)
    a = unit(d)
    cos_a = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
    ang = math.acos(max(-1.0, min(1.0, cos_a)))
    p = np.asarray(pole, float) - a * np.dot(pole, a)
    p = unit(p)
    mid = s + l1 * (math.cos(ang) * a + math.sin(ang) * p)
    return mid, s + a * dist
