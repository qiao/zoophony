"""Prints the share of the paw vertices of a rig GLB that the fingers bone moves.

Usage: python -I scratch/glb_fingers.py <file.glb>...
"""
import json
import struct
import sys

import numpy as np

COMP = {5121: np.uint8, 5123: np.uint16, 5126: np.float32}
SIZE = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def read(path):
    data = open(path, 'rb').read()
    length = struct.unpack_from('<I', data, 8)[0]
    off = 12
    js = binc = None
    while off < length:
        clen, ctype = struct.unpack_from('<II', data, off)
        chunk = data[off + 8: off + 8 + clen]
        if ctype == 0x4E4F534A:
            js = json.loads(chunk)
        else:
            binc = chunk
        off += 8 + clen
    return js, binc


def accessor(js, binc, i):
    a = js['accessors'][i]
    v = js['bufferViews'][a['bufferView']]
    start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    n = a['count'] * SIZE[a['type']]
    arr = np.frombuffer(binc, COMP[a['componentType']], n, start)
    return arr.reshape(a['count'], SIZE[a['type']]).astype(np.float64)


for path in sys.argv[1:]:
    js, binc = read(path)
    skin = js['skins'][0]
    names = [js['nodes'][j]['name'] for j in skin['joints']]
    for mesh in js['meshes']:
        for prim in mesh['primitives']:
            at = prim['attributes']
            if 'JOINTS_0' not in at:
                continue
            joints = accessor(js, binc, at['JOINTS_0']).astype(int)
            weights = accessor(js, binc, at['WEIGHTS_0'])
            if weights.max() > 1.5:
                weights = weights / 255.0
            out = []
            if len(weights) == 0:
                continue
            for side in 'LR':
                h = names.index(f'hand_{side}')
                f = names.index(f'fingers_{side}')
                wh = (weights * (joints == h)).sum(1)
                wf = (weights * (joints == f)).sum(1)
                paw = wh + wf > 0.5
                if paw.sum() == 0:
                    continue
                out.append(f'{side}: paw {paw.sum()}, fingers main {(wf[paw] > 0.5).sum()}, '
                           f'mean {wf[paw].mean():.2f}, max {wf[paw].max():.2f}')
            print(path, mesh.get('name'), ' | '.join(out))
