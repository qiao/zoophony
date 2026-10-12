"""The low-poly parts of the props: boxes, prisms, rim walls, tubes, lofts, and a builder.

numpy only, three.js axes. Each part is a closed surface: (verts (n, 3), faces (m, 3)). The
builder turns each part so that its faces point out (a positive signed volume), so the parts
need no care for the winding.
"""

import math

import numpy as np


def rot_x(deg):
    """Makes a rotation about the x axis, in degrees."""
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return np.array([[1.0, 0.0, 0.0], [0.0, c, -s], [0.0, s, c]])


def rot_y(deg):
    """Makes a rotation about the y axis, in degrees."""
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0.0, s], [0.0, 1.0, 0.0], [-s, 0.0, c]])


def rot_z(deg):
    """Makes a rotation about the z axis, in degrees."""
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0.0], [s, c, 0.0], [0.0, 0.0, 1.0]])


def basis(axis, up):
    """Makes the rotation whose y column is axis and whose z column points as near to up as
    the axis permits (x = y cross z)."""
    y = np.asarray(axis, float)
    y = y / np.linalg.norm(y)
    z = np.asarray(up, float) - y * np.dot(up, y)
    z = z / np.linalg.norm(z)
    return np.stack([np.cross(y, z), y, z], axis=1)


def place(verts, rot=None, at=None):
    """Turns points by rot, then moves them by at."""
    v = np.asarray(verts, float)
    if rot is not None:
        v = v @ np.asarray(rot, float).T
    if at is not None:
        v = v + np.asarray(at, float)
    return v


def box(size, center=(0.0, 0.0, 0.0), rot=None):
    """Makes a box of full sizes (x, y, z) around its center, turned by rot about the center."""
    h = 0.5 * np.asarray(size, float)
    signs = np.array([[x, y, z] for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)], float)
    faces = [[0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5], [0, 4, 5], [0, 5, 1],
             [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]]
    return place(signs * h, rot, center), np.array(faces)


def loft(rings, cap_start=True, cap_end=True):
    """Makes a closed surface through rings of the same point count, with fan caps at both ends.

    rings: a list of (k, 3) arrays. A ring of one point closes that end in a tip.
    """
    rings = [np.atleast_2d(np.asarray(r, float)) for r in rings]
    k = max(len(r) for r in rings)
    verts, starts = [], []
    for r in rings:
        starts.append(len(verts))
        verts += list(r)
    faces = []
    for a, b in zip(range(len(rings) - 1), range(1, len(rings))):
        ra, rb = rings[a], rings[b]
        sa, sb = starts[a], starts[b]
        if len(ra) == 1:
            faces += [[sa, sb + (i + 1) % k, sb + i] for i in range(k)]
        elif len(rb) == 1:
            faces += [[sa + i, sa + (i + 1) % k, sb] for i in range(k)]
        else:
            for i in range(k):
                j = (i + 1) % k
                faces += [[sa + i, sa + j, sb + j], [sa + i, sb + j, sb + i]]
    for end, cap in ((0, cap_start), (len(rings) - 1, cap_end)):
        r = rings[end]
        if not cap or len(r) == 1:
            continue
        c = len(verts)
        verts.append(r.mean(axis=0))
        s = starts[end]
        faces += [[c, s + (i + 1) % k, s + i] for i in range(k)]
    return np.array(verts), np.array(faces)


def prism(outline, y0, y1):
    """Makes a prism from an outline in x-z between two heights. The caps are fans from the mean
    point, so the outline must be star-shaped from it."""
    pts = np.asarray(outline, float)
    lo = np.stack([pts[:, 0], np.full(len(pts), y0), pts[:, 1]], axis=1)
    hi = np.stack([pts[:, 0], np.full(len(pts), y1), pts[:, 1]], axis=1)
    return loft([lo, hi])


def plate(outline, levels, center=None):
    """Makes a lofted plate: the outline (x-z) scaled around center at each level.

    levels: [(scale, y)] from the bottom to the top. Rounded edges and an arched top come from a
    smaller scale at the first and the last levels.
    """
    pts = np.asarray(outline, float)
    c = pts.mean(axis=0) if center is None else np.asarray(center, float)
    rings = []
    for scale, y in levels:
        q = c + (pts - c) * scale
        rings.append(np.stack([q[:, 0], np.full(len(q), y), q[:, 1]], axis=1))
    return loft(rings)


def rim(outline, scale, y0, y1, center=None):
    """Makes the wall of an open case: the outline outside, the outline scaled around center
    inside, between two heights (a closed ring solid)."""
    pts = np.asarray(outline, float)
    c = pts.mean(axis=0) if center is None else np.asarray(center, float)
    inner = c + (pts - c) * scale
    n = len(pts)

    def ring(p, y):
        return np.stack([p[:, 0], np.full(n, y), p[:, 1]], axis=1)

    verts = np.concatenate([ring(pts, y0), ring(pts, y1), ring(inner, y1), ring(inner, y0)])
    faces = []
    for i in range(n):
        j = (i + 1) % n
        for a, b in ((0, 1), (1, 2), (2, 3), (3, 0)):
            faces += [[a * n + i, a * n + j, b * n + j], [a * n + i, b * n + j, b * n + i]]
    return verts, np.array(faces)


def circle(center, axis, radius, sides, phase=0.0):
    """Lists the points of a polygon around an axis."""
    f = basis(axis, [0.0, 0.0, 1.0] if abs(np.dot(axis, [0, 0, 1])) < 0.9 * np.linalg.norm(axis)
              else [1.0, 0.0, 0.0])
    a = phase + 2 * math.pi * np.arange(sides) / sides
    ring = np.stack([np.cos(a), np.zeros(sides), np.sin(a)], axis=1) * radius
    return np.asarray(center, float) + ring @ f.T


def tube(points, radii, sides, phase=0.0):
    """Makes a closed tube along points, with one radius per point (0 makes a tip)."""
    pts = np.asarray(points, float)
    rings = []
    for i, (p, r) in enumerate(zip(pts, radii)):
        d = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]
        rings.append(p[None] if r <= 0 else circle(p, d, r, sides, phase))
    return loft(rings)


def signed_volume(verts, faces):
    """Calculates the signed volume of a closed surface (positive: the faces point out)."""
    v = np.asarray(verts, float)[np.asarray(faces)]
    return float(np.einsum('ij,ij->i', v[:, 0], np.cross(v[:, 1], v[:, 2])).sum() / 6.0)


class Builder:
    """Collects the parts of one mesh node: vertices, triangles, and one color per triangle."""

    def __init__(self):
        """Starts an empty mesh."""
        self.verts = []
        self.faces = []
        self.colors = []
        self.count = 0

    def add(self, part, color, rot=None, at=None):
        """Adds a closed part (verts, faces) in a color, turned by rot and moved by at. Faces
        that point in are flipped, so each part points out."""
        v, f = part
        v = place(v, rot, at)
        f = np.asarray(f, np.int64)
        if signed_volume(v, f) < 0:
            f = f[:, ::-1]
        self.verts.append(v)
        self.faces.append(f + self.count)
        self.colors.append(np.tile(np.asarray(color, float), (len(f), 1)))
        self.count += len(v)
        return self

    def mesh(self):
        """Returns (verts, faces, face colors) of all parts."""
        if not self.verts:
            return np.zeros((0, 3)), np.zeros((0, 3), np.int64), np.zeros((0, 3))
        return (np.concatenate(self.verts), np.concatenate(self.faces),
                np.concatenate(self.colors))
