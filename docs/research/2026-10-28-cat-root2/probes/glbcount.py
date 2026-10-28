import json, struct, sys
import numpy as np
b = open(sys.argv[1], 'rb').read()
n = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + n]); start = 20 + n + 8
def acc(i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
    off = start + v.get('byteOffset', 0) + a.get('byteOffset', 0)
    c = {5126: ('f', 4), 5125: ('I', 4), 5123: ('H', 2)}[a['componentType']]
    k = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    return np.frombuffer(b[off:off + a['count'] * k * c[1]], dtype='<' + c[0]).reshape(-1, k)
p = j['meshes'][0]['primitives'][0]
pos = acc(p['attributes']['POSITION']).astype(float); tris = acc(p['indices']).reshape(-1, 3)
keys = {tuple(x) for x in np.round(pos / 1e-5).astype(np.int64)}
print('vertices welded', len(keys), 'triangles', len(tris))
