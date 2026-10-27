"""Lists the weights of the vertices near the left shoulder joint of a rig GLB, in its bind pose.
Usage: python glbweights.py <glb> [radius m]"""
import json, struct, sys
import numpy as np
path = sys.argv[1]; radius = float(sys.argv[2]) if len(sys.argv) > 2 else 0.07
b = open(path, 'rb').read()
n = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + n])
binoff = 20 + n + 8
blob = b[binoff:]
def acc(i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
    comp = {5126: ('f', 4), 5123: ('H', 2), 5121: ('B', 1), 5125: ('I', 4)}[a['componentType']]
    k = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    arr = np.frombuffer(blob, dtype=np.dtype(comp[0]).newbyteorder('<'), count=a['count'] * k, offset=off)
    arr = arr.reshape(a['count'], k).astype(float)
    if a.get('normalized'):
        arr = arr / {5123: 65535, 5121: 255}[a['componentType']]
    return arr
skin = j['skins'][0]
names = [j['nodes'][i]['name'] for i in skin['joints']]
ibm = acc(skin['inverseBindMatrices']).reshape(-1, 4, 4)
prim = next(p for m in j['meshes'] for p in m['primitives'] if 'JOINTS_0' in p['attributes'])
P = acc(prim['attributes']['POSITION']); J = acc(prim['attributes']['JOINTS_0']).astype(int); W = acc(prim['attributes']['WEIGHTS_0'])
def head(name):
    m = ibm[names.index(name)].T  # column-major
    return np.linalg.inv(m)[:3, 3]
sh = head('upper_arm_L'); print('upper_arm_L head', sh.round(3), 'clavicle', head('clavicle_L').round(3))
d = np.linalg.norm(P - sh, axis=1)
idx = np.where(d < radius)[0]
groups = {'arm': lambda n: n.endswith('_L') and (n.startswith('upper_arm') or n.startswith('elbow') or n.startswith('forearm') or n.startswith('wrist') or n.startswith('hand') or n.startswith('fingers')),
          'clav': lambda n: n == 'clavicle_L', 'trunk': lambda n: n in ('chest', 'spine1', 'spine', 'hips', 'neck', 'head')}
rows = []
for i in idx:
    w = {g: 0.0 for g in groups}
    for jj, ww in zip(J[i], W[i]):
        for g, f in groups.items():
            if f(names[jj]): w[g] += ww
    rows.append((P[i] - sh, w))
# Bin by direction around the joint: up/down (y) and front/back (z) and out (x).
for rel, w in sorted(rows, key=lambda r: (round(r[0][1], 2), r[0][2])):
    print('rel %+.3f %+.3f %+.3f  arm %.2f clav %.2f trunk %.2f' % (rel[0], rel[1], rel[2], w['arm'], w['clav'], w['trunk']))
