"""Gives the median Oklab hue and chroma of the fur faces of a rigged GLB file in bands of
lightness, from the vertex colors (COLOR_0, linear) of the primitive of the fur material.

    uv run --no-project --with numpy python -I palette_probe.py <name>=<file.glb>...
"""
import json
import struct
import sys

import numpy as np

TYPES = {5126: ('f', 4), 5121: ('B', 1), 5123: ('H', 2)}
SIZES = {'VEC3': 3, 'VEC4': 4}


def colors_of(path):
    data = open(path, 'rb').read()
    n = struct.unpack('<I', data[12:16])[0]
    gltf = json.loads(data[20:20 + n])
    binary = data[20 + n + 8:]
    mats = [m.get('name') for m in gltf['materials']]
    out = []
    for mesh in gltf['meshes']:
        for prim in mesh['primitives']:
            if mats[prim['material']] != 'fur':
                continue
            acc = gltf['accessors'][prim['attributes']['COLOR_0']]
            view = gltf['bufferViews'][acc['bufferView']]
            fmt, size = TYPES[acc['componentType']]
            k = SIZES[acc['type']]
            start = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
            arr = np.frombuffer(binary, dtype=np.dtype(fmt).newbyteorder('<'), count=acc['count'] * k,
                                offset=start).reshape(-1, k).astype(float)
            if acc.get('normalized'):
                arr /= 255 if fmt == 'B' else 65535
            out.append(arr[:, :3])
    return np.concatenate(out)


def oklab_linear(c):
    lms = c @ np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                        [0.2119034982, 0.6806995451, 0.1073969566],
                        [0.0883024619, 0.2817188376, 0.6299787005]]).T
    return np.cbrt(lms) @ np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                                    [1.9779984951, -2.4285922050, 0.4505937099],
                                    [0.0259040371, 0.7827717662, -0.8086757660]]).T


for arg in sys.argv[1:]:
    name, path = arg.split('=', 1)
    lab = oklab_linear(colors_of(path))
    print(f'{name}: {len(lab)} fur vertices')
    for lo, hi in ((0.0, 0.35), (0.35, 0.45), (0.45, 0.55), (0.55, 0.65), (0.65, 0.75), (0.75, 0.85), (0.85, 0.95), (0.95, 1.01)):
        m = (lab[:, 0] >= lo) & (lab[:, 0] < hi)
        if m.any():
            a, b = np.median(lab[m, 1]), np.median(lab[m, 2])
            print(f'  L {lo:.2f}..{hi:.2f}: {int(m.sum()):5d} vertices, hue {np.degrees(np.arctan2(b, a)) % 360:5.1f}, '
                  f'chroma {np.hypot(a, b):.4f}')
