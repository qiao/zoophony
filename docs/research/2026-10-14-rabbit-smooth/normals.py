import json, struct, sys
import numpy as np
path = sys.argv[1]
data = open(path, 'rb').read()
jlen = struct.unpack('<I', data[12:16])[0]
gj = json.loads(data[20:20 + jlen])
bin0 = data[20 + jlen + 8:]
def acc(i):
    a = gj['accessors'][i]; bv = gj['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a['componentType']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(bin0, dt, a['count'] * n, off).reshape(a['count'], n)
print('images', [(i.get('name'), i.get('mimeType')) for i in gj.get('images', [])])
for m in gj['meshes']:
    for p in m['primitives']:
        print(m.get('name'), list(p['attributes']), 'indexed', 'indices' in p)
        P = acc(p['attributes']['POSITION']); idx = acc(p['indices']).ravel()
        tris = idx.reshape(-1, 3)
        print(' verts', len(P), 'tris', len(tris))
        if 'NORMAL' in p['attributes']:
            N = acc(p['attributes']['NORMAL'])
            a, b, c = P[tris[:, 0]], P[tris[:, 1]], P[tris[:, 2]]
            fn = np.cross(b - a, c - a); fn /= np.linalg.norm(fn, axis=1, keepdims=True) + 1e-12
            ang = []
            for k in range(3):
                d = np.clip((N[tris[:, k]] * fn).sum(1), -1, 1)
                ang.append(np.degrees(np.arccos(d)))
            ang = np.concatenate(ang)
            print(' angle of the corner normal to the face normal p50/p90/p99 (deg):', np.round(np.percentile(ang, [50, 90, 99]), 1))
            # shared positions
            key = np.round(P, 6)
            u, inv = np.unique(key, axis=0, return_inverse=True)
            print(' unique positions', len(u))
            # dihedral angles between neighbor faces (welded)
            from collections import defaultdict
            inv = inv.ravel(); T = inv[tris]
            edges = defaultdict(list)
            for f, t in enumerate(T):
                for i in range(3):
                    e = tuple(sorted((t[i], t[(i + 1) % 3])))
                    edges[e].append(f)
            dih = [np.degrees(np.arccos(np.clip(fn[fs[0]] @ fn[fs[1]], -1, 1))) for fs in edges.values() if len(fs) == 2]
            print(' dihedral angle between neighbor faces p25/p50/p75/p90 (deg):', np.round(np.percentile(dih, [25, 50, 75, 90]), 1), 'edges', len(dih))
# Normal splits: positions with more than one normal, and the angle between their normals.
p = gj['meshes'][0]['primitives'][0]
P = acc(p['attributes']['POSITION']); N = acc(p['attributes']['NORMAL'])
key = np.round(P, 6); u, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel()
split = []
for g in range(len(u)):
    ns = N[inv == g]
    if len(ns) > 1:
        d = np.clip(ns @ ns.T, -1, 1)
        split.append(np.degrees(np.arccos(d.min())))
split = np.array(split)
print('positions with more than one vertex:', len(split), 'of', len(u))
print('  with normals more than 1 deg apart:', (split > 1).sum(), ' more than 30 deg:', (split > 30).sum())
