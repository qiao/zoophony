"""Compares the fur colors of a rig GLB file (the face colors of the mesh, with no light) with a
render of the app gallery. The faces and the pixels split into the colored fur (Oklab chroma above
0.06) and the white fur (lightness above 0.75 and chroma below 0.05). For each part, the probe
prints the median Oklab lightness, chroma, and hue of the faces, by area, and of the pixels.
Usage:

    uv run --no-project --with pillow --with numpy python -I fur_colors.py <rig.glb> <render.png> [<x0,y0,x1,y1>]
"""
import json
import struct
import sys

import numpy as np
from PIL import Image


def oklab(rgb_linear):
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]])
    lms = np.cbrt(np.clip(rgb_linear, 0, None) @ m1.T)
    m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                   [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]])
    return lms @ m2.T


def linear(srgb):
    c = srgb / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def accessor(glb, j, index):
    a = j['accessors'][index]
    v = j['bufferViews'][a['bufferView']]
    comps = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    dtype = {5126: np.float32, 5121: np.uint8, 5123: np.uint16, 5125: np.uint32}[a['componentType']]
    start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    count = a['count'] * comps
    data = np.frombuffer(glb, dtype=dtype, count=count, offset=start).reshape(a['count'], comps)
    if a.get('normalized'):
        data = data.astype(float) / np.iinfo(dtype).max
    return data.astype(float)


def mesh_faces(path):
    raw = open(path, 'rb').read()
    n = struct.unpack('<I', raw[12:16])[0]
    j = json.loads(raw[20:20 + n])
    binary = raw[20 + n + 8:]
    labs, areas = [], []
    for m in j['meshes']:
        if m.get('name') == 'chair':
            continue
        for p in m['primitives']:
            pos = accessor(binary, j, p['attributes']['POSITION'])
            col = accessor(binary, j, p['attributes']['COLOR_0'])[:, :3]
            idx = accessor(binary, j, p['indices']).astype(int).reshape(-1, 3) if 'indices' in p else np.arange(len(pos)).reshape(-1, 3)
            a, b, c = pos[idx[:, 0]], pos[idx[:, 1]], pos[idx[:, 2]]
            areas.append(np.linalg.norm(np.cross(b - a, c - a), axis=1) / 2)
            labs.append(oklab(col[idx[:, 0]]))
    return np.concatenate(labs), np.concatenate(areas)


def weighted_median(values, weights):
    order = np.argsort(values)
    cum = np.cumsum(weights[order])
    return values[order][np.searchsorted(cum, cum[-1] / 2)]


def describe(name, lab, weights):
    chroma = np.hypot(lab[:, 1], lab[:, 2])
    hue = np.degrees(np.arctan2(lab[:, 2], lab[:, 1])) % 360
    parts = {'colored fur': chroma > 0.06, 'white fur': (lab[:, 0] > 0.75) & (chroma < 0.05)}
    for part, mask in parts.items():
        if not mask.any():
            print(f'{name} {part}: none')
            continue
        w = weights[mask]
        print(f'{name} {part}: share {w.sum() / weights.sum():.3f}, L {weighted_median(lab[mask, 0], w):.3f}, '
              f'chroma {weighted_median(chroma[mask], w):.3f}, hue {weighted_median(hue[mask], w):.0f} deg')


glb, render = sys.argv[1], sys.argv[2]
lab, area = mesh_faces(glb)
describe('mesh faces', lab, area)
im = np.asarray(Image.open(render).convert('RGB'), dtype=float)
if len(sys.argv) > 3:
    x0, y0, x1, y1 = (int(v) for v in sys.argv[3].split(','))
    im = im[y0:y1, x0:x1]
px = im.reshape(-1, 3)
# The animal: the pixels that are not the dark background of the gallery.
px = px[px.max(axis=1) > 60]
describe('render pixels', oklab(linear(px)), np.ones(len(px)))
