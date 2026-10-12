"""Linear blend skinning in numpy (as three.js and Blender do), face normals, and fold measures.

numpy only, three.js axes. A skeleton here is any object with names, parents, heads, and rest
(see templates/biped/solver.py), and a pose is {bone: (quaternion, location, scale)}.
"""

import numpy as np

from studio.ik import matrix_from_quat

# A face is folded when its normal turns more than 120 degrees from its expected normal.
FOLD_DOT = -0.5


def winding_number(p, verts, tris):
    """Calculates the generalized winding number of a point for a triangle set (1 inside)."""
    a = verts[tris[:, 0]] - p
    b = verts[tris[:, 1]] - p
    c = verts[tris[:, 2]] - p
    la, lb, lc = (np.linalg.norm(v, axis=1) for v in (a, b, c))
    det = np.einsum('ij,ij->i', a, np.cross(b, c))
    den = (la * lb * lc + np.einsum('ij,ij->i', a, b) * lc + np.einsum('ij,ij->i', b, c) * la
           + np.einsum('ij,ij->i', c, a) * lb)
    return float(np.sum(2.0 * np.arctan2(det, den)) / (4.0 * np.pi))


def forward_kinematics(skel, pose):
    """Turns local bases {bone: (quat, loc, scale)} into world rotations (with scale) and heads."""
    D, H, S = {}, {}, {}
    for name in skel.names:
        q, loc, scale = pose[name]
        r0 = skel.rest[name]
        r = r0 @ matrix_from_quat(np.asarray(q, float)) @ r0.T
        parent = skel.parents[name]
        if parent is None:
            D[name] = r
            H[name] = skel.heads[name] + r0 @ np.asarray(loc, float)
            S[name] = scale
            continue
        D[name] = D[parent] @ r
        offset = skel.heads[name] - skel.heads[parent] + r0 @ np.asarray(loc, float)
        H[name] = H[parent] + D[parent] @ offset
        S[name] = S[parent] * scale
    return D, H, S


def blend_matrices(skel, weights, pose):
    """Calculates the blended skin transform of each vertex: posed = A @ rest + t."""
    D, H, S = forward_kinematics(skel, pose)
    n = weights.shape[0]
    A = np.zeros((n, 3, 3))
    t = np.zeros((n, 3))
    for j, name in enumerate(skel.names):
        w = weights[:, j]
        nz = w > 0
        if not nz.any():
            continue
        M = D[name] * S[name]
        A[nz] += w[nz, None, None] * M
        t[nz] += w[nz, None] * (H[name] - M @ skel.heads[name])
    return A, t


def skin(A, t, points):
    """Moves rest points with blended transforms."""
    return np.einsum('nij,nj->ni', A, points) + t


def face_normals(v, tris):
    """Calculates unit face normals."""
    n = np.cross(v[tris[:, 1]] - v[tris[:, 0]], v[tris[:, 2]] - v[tris[:, 0]])
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def turn_dots(rest, tris, A, posed):
    """Calculates, for each face, the cosine between its posed normal and its expected normal.

    The expected normal of a face is its rest normal carried by the mean skin transform of its
    corners (the inverse transpose). Below 0 the face is turned past 90 degrees (edge-on or
    further), and below FOLD_DOT it is folded over.
    """
    n0 = face_normals(rest, tris)
    Af = A[tris].mean(axis=1)
    expected = np.einsum('nji,nj->ni', np.linalg.inv(Af), n0)
    expected /= np.maximum(np.linalg.norm(expected, axis=1, keepdims=True), 1e-12)
    return np.sum(face_normals(posed, tris) * expected, axis=1)


def dominant_dots(rest, tris, posed, weights, rotations):
    """Calculates, for each face, the cosine between its posed normal and its rest normal
    turned by the rotation of its dominant bone (the bone with the most weight on its corners).

    Unlike turn_dots, this does not collapse where two bones turned far apart blend 50/50, so it
    finds the folds of a twist.
    """
    dom = np.argmax(weights[tris].mean(axis=1), axis=1)
    expected = np.einsum('nij,nj->ni', rotations[dom], face_normals(rest, tris))
    return np.sum(face_normals(posed, tris) * expected, axis=1)


def inverted_faces(rest, tris, A, posed):
    """Counts the faces turned past 90 degrees in a pose (see turn_dots)."""
    return int(np.sum(turn_dots(rest, tris, A, posed) < 0.0))
