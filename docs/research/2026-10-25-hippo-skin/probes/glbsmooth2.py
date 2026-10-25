"""Experiment: smooths the share of a set of bones among themselves in a box of a rig GLB copy. Each
vertex in the box keeps its total weight on the set and its weights on the other bones; only the
split inside the set moves toward the mean of its neighbors. Optionally zeroes a morph target.
Usage: glbsmooth2.py <in> <out> <rounds> <bones,...> <x0,y0,z0,x1,y1,z1> [<target to zero>]"""
import json
import struct
import sys

import numpy as np

src, out, rounds, bones, box = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4].split(','), \
    [float(x) for x in sys.argv[5].split(',')]
zero = int(sys.argv[6]) if len(sys.argv) > 6 else None
data = bytearray(open(src, 'rb').read())
n = struct.unpack_from('<I', data, 12)[0]
doc = json.loads(data[20:20 + n])
bin_start = 20 + n + 8


def view(i):
    a = doc['accessors'][i]
    v = doc['bufferViews'][a['bufferView']]
    width = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
    comp = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a['componentType']]
    start = bin_start + v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(data, comp, a['count'] * width, start).reshape(a['count'], width)


names = [doc['nodes'][j]['name'] for j in doc['skins'][0]['joints']]
ids = [names.index(b) for b in bones]
mesh = [m for m in doc['meshes'] if m['name'] != 'chair'][0]
prim = mesh['primitives'][0]
P = view(prim['attributes']['POSITION'])
J = view(prim['attributes']['JOINTS_0'])
W = view(prim['attributes']['WEIGHTS_0'])
T = view(prim['indices']).reshape(-1, 3)
key = np.round(P / 1e-6).astype(np.int64)
_, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
inv = inv.reshape(-1)
nv = len(first)
dense = np.zeros((nv, len(names)))
for v in range(nv):
    i = first[v]
    for k in range(4):
        dense[v, J[i, k]] += W[i, k]
nb = [set() for _ in range(nv)]
for a, b, c in inv[T]:
    nb[a].update((b, c)); nb[b].update((a, c)); nb[c].update((a, b))
PW = P[first].astype(float)
lo, hi = np.array(box[:3]), np.array(box[3:])
inside = np.all((PW >= lo) & (PW <= hi), axis=1) & (dense[:, ids].sum(axis=1) > 0.01)
move = np.nonzero(inside)[0]
total = dense[:, ids].sum(axis=1)
print(f'{len(move)} vertices', file=sys.stderr)
for _ in range(rounds):
    # The split of each vertex inside the set, from the shares of its neighbors.
    share = dense[:, ids] / np.maximum(total[:, None], 1e-9)
    mids = np.array([share[list(nb[v])][total[list(nb[v])] > 0.01].mean(axis=0) for v in move])
    new = 0.5 * share[move] + 0.5 * mids
    dense[np.ix_(move, ids)] = new * total[move, None]
for v in move:
    order = np.argsort(-dense[v])[:4]
    w = dense[v, order] / dense[v, order].sum()
    for i in np.nonzero(inv == v)[0]:
        J[i] = order
        W[i] = w
if zero is not None:
    for p in mesh['primitives']:
        D = view(p['targets'][zero]['POSITION'])
        D[:] = 0
open(out, 'wb').write(data)
