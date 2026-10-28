import json, struct, sys
import numpy as np
def read(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n]); start = 20 + n + 8
    def acc(i):
        a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
        off = start + v.get('byteOffset', 0) + a.get('byteOffset', 0)
        c = {5126: ('f', 4), 5125: ('I', 4), 5123: ('H', 2)}[a['componentType']]
        k = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
        return np.frombuffer(b[off:off + a['count'] * k * c[1]], dtype='<' + c[0]).reshape(-1, k)
    p = j['meshes'][0]['primitives'][0]
    return acc(p['attributes']['POSITION']).astype(float), acc(p['indices']).reshape(-1, 3)
pos, tris = read(sys.argv[1])
lo, hi = pos[:, 1].min(), pos[:, 1].max(); H = hi - lo
keys = {}; remap = np.zeros(len(pos), int)
for i, p in enumerate(np.round(pos / (1e-5 * H)).astype(np.int64)):
    remap[i] = keys.setdefault(tuple(p), len(keys))
t = remap[tris]
from collections import Counter
c = Counter()
for a, b, d in t:
    for x, y in ((a, b), (b, d), (d, a)):
        c[(min(x, y), max(x, y))] += 1
inv = {v: k for k, v in keys.items()}
for e, k in c.items():
    if k > 2:
        m = (np.array(inv[e[0]]) + np.array(inv[e[1]])) / 2 * 1e-5
        print('edge uses', k, 'at x %.3f h %.3f z %.3f' % (m[0], m[1] - lo / H, m[2]))
print('degenerate tris', int(((t[:, 0] == t[:, 1]) | (t[:, 1] == t[:, 2]) | (t[:, 0] == t[:, 2])).sum()))
