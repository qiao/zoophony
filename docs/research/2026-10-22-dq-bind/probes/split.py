"""split.py <dump A> <corners A> <dump B> <corners B> [ring u] [radius u]: the split of the depth
of the arm root vertices of two rigs of one species (base A and flag B), from decomp2.py of
docs/research/2026-10-22-rabbit-armpit/probes/.

The arm root vertices: the vertices of A whose long-armed source place lies within `radius` u
(0.12 by default) of the head of an upper arm, with an upper arm weight (the upper arm and its
twist bone) from 0.05 to 0.95 and no weight on a lower arm bone. The depth of a vertex: its depth
below the convex hull of the vertices whose source place lies within `ring` u (0.05) of its
source place, one vertex for each place. The source depth uses the long-armed source, the bind
depth the bind mesh, and the pose depths p50 of each sample set of the dump (dump-mat.ts). A
vertex of B is the vertex with the same source place. The bind part of a vertex is bind less
source, and the play part is play p50 less bind. Prints the sums for each side, cm."""
import json
import sys


import numpy as np
from scipy.spatial import ConvexHull, cKDTree

ring = float(sys.argv[5]) if len(sys.argv) > 5 else 0.05
radius = float(sys.argv[6]) if len(sys.argv) > 6 else 0.12
#: The deepest vertices of the base play that the tool lists for each side.
TOP = 40


def load(d, cpath):
    m = json.load(open(d + '.json'))
    L = m['labels']
    B = np.array(m['bind']).reshape(-1, 3)
    X = np.fromfile(d + '.bin', np.float32).reshape(len(L), len(B), 3).astype(float)
    C = np.array(m['corners']).reshape(-1, 3)
    cs = json.load(open(cpath))
    src = {}
    for f, t in enumerate(C):
        if f >= len(cs) or not isinstance(cs[f], dict):
            continue
        for i, v in enumerate(t):
            src.setdefault(int(v), tuple(cs[f]['l'][i]))
    W = np.array(m['weights']).reshape(-1, 4)
    J = np.array(m['joints']).reshape(-1, 4)
    sets = np.array([l.split(' ')[0] for l in L])
    return dict(m=m, B=B, X=X, src=src, W=W, J=J, sets=sets)


A = load(sys.argv[1], sys.argv[2])
Bd = load(sys.argv[3], sys.argv[4])
bones = A['m']['bones']
upper = {s: {bones.index(f'upper_arm_{s}'), A['m']['twist'][s]} for s in 'LR'}
lower = {bones.index(f'{b}_{s}') for b in ('forearm', 'forearm_twist', 'hand', 'fingers')
         for s in 'LR'}

# The meters of one source unit: the head moves rigidly from the source to the bind.
head = bones.index('head')
rigid = [v for v in A['src'] if A['J'][v, 0] == head and A['W'][v, 0] > 0.999][:200]
P = np.array([A['src'][v] for v in rigid])
Q = A['B'][rigid]
i, j = np.triu_indices(len(rigid), 1)
far = np.linalg.norm(P[i] - P[j], axis=1) > 0.02
rate = float(np.median(np.linalg.norm(Q[i] - Q[j], axis=1)[far] /
                       np.linalg.norm(P[i] - P[j], axis=1)[far]))

keys_a = np.array(sorted(A['src']))
S = np.array([A['src'][k] for k in keys_a])
place_b = {}
for v, p in Bd['src'].items():
    place_b.setdefault(np.round(p, 5).tobytes(), v)


def weight_of(D, v, ids):
    return float(sum(D['W'][v, k] for k in range(4) if D['J'][v, k] in ids))


def depth(P, i):
    h = ConvexHull(P)
    return max(0.0, -float((h.equations[:, :3] @ P[i] + h.equations[:, 3]).max()))


print(f'rate {rate:.4f} m/u, ring {ring} u, radius {radius} u')
for side, sign in (('L', 1), ('R', -1)):
    ua = [k for k in keys_a if weight_of(A, k, upper[side]) > 0.5 and weight_of(A, k, lower) == 0]
    center = np.array([A['src'][k] for k in ua])
    # The shoulder: the upper arm vertex of the long-armed source nearest to the middle plane.
    joint = center[np.argmin(np.abs(center[:, 0]))]
    rows = []
    for idx, k in enumerate(keys_a):
        wu = weight_of(A, k, upper[side])
        if not 0.05 <= wu <= 0.95 or weight_of(A, k, lower) > 0:
            continue
        if np.linalg.norm(S[idx] - joint) > radius:
            continue
        near = np.nonzero(np.linalg.norm(S - S[idx], axis=1) < ring)[0]
        _, u = np.unique(np.round(S[near], 6), axis=0, return_index=True)
        near = near[u]
        if idx not in near:
            near = np.append(near, idx)
        if len(near) < 8:
            print(f'  skip {k}: {len(near)} neighbors')
            continue
        ids = keys_a[near]
        at = int(np.nonzero(ids == k)[0][0])
        ids_b = [place_b.get(np.round(A['src'][q], 5).tobytes()) for q in ids]
        if any(q is None for q in ids_b):
            print(f'  skip {k}: {sum(q is None for q in ids_b)} of {len(ids_b)} places not in B')
            continue
        row = [k, wu, depth(S[near], at) * rate * 100]
        for D, vs in ((A, ids), (Bd, ids_b)):
            row.append(depth(D['B'][vs], at) * 100)
            for st in ('rest', 'play'):
                sel = np.nonzero(D['sets'] == st)[0]
                row.append(float(np.percentile([depth(D['X'][s][vs], at) for s in sel], 50)) * 100)
        rows.append(row)
    R = np.array(rows)
    if len(R) == 0:
        print(side, 'no vertex')
        continue
    src, ba, ra, pa, bb, rb, pb = (R[:, c] for c in range(2, 9))
    print(f'side {side}: {len(R)} vertices, joint {np.round(joint, 3)}')
    print(f'  sums (cm): source {src.sum():.2f} | base bind {ba.sum():.2f} rest {ra.sum():.2f} '
          f'play {pa.sum():.2f} | flag bind {bb.sum():.2f} rest {rb.sum():.2f} play {pb.sum():.2f}')
    for name, b, r, p in (('base', ba, ra, pa), ('flag', bb, rb, pb)):
        bind_part, play_part = (b - src).sum(), (p - b).sum()
        total = bind_part + play_part
        share = 100 * bind_part / total if total else 0
        print(f'  {name}: bind part {bind_part:.2f}, play part {play_part:.2f}, '
              f'growth {total:.2f} cm, bind share {share:.0f}%')
    order = np.argsort(-R[:, 5])[:TOP]
    print('  deepest in the base play: vertex | upper w | source | base bind rest play | '
          'flag bind rest play')
    for o in order:
        r = R[o]
        print(f'  {int(r[0]):5d} | {r[1]:.2f} | {r[2]:.2f} | {r[3]:.2f} {r[4]:.2f} {r[5]:.2f} | '
              f'{r[6]:.2f} {r[7]:.2f} {r[8]:.2f}')
