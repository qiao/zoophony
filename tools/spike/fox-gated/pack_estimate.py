"""Estimates the size of the fox in a small packed format, like the sculpts of `src/models/`.

    uv run --no-project --with numpy python tools/spike/fox-gated/pack_estimate.py <fox.glb>

The input is a GLB file with no compression. The script reads each mesh primitive and packs:

- the positions as 16-bit integers in the box of the mesh,
- the triangle indices as 16-bit integers, each as the difference to the index before it,
- the joints as 8-bit integers, and the weights as 8-bit integers (the 4th is implied),
- one byte for the palette color of each primitive.

It prints the bytes of the pack and of the pack after gzip -9. The runtime would rebuild flat
normals from the triangles, so the pack has no normals.
"""

import gzip
import json
import struct
import sys

import numpy as np

#: The numpy types of the glTF component types.
TYPES = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32,
         5126: np.float32}

#: The number of components of the glTF accessor types.
SIZES = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def read_glb(path):
    """Reads the JSON and the binary chunk of a GLB file."""
    data = open(path, 'rb').read()
    json_len = struct.unpack('<I', data[12:16])[0]
    doc = json.loads(data[20:20 + json_len])
    bin_start = 20 + json_len + 8
    return doc, data[bin_start:]


def accessor(doc, blob, index):
    """Gives the data of one accessor as a numpy array."""
    acc = doc['accessors'][index]
    view = doc['bufferViews'][acc['bufferView']]
    dtype = TYPES[acc['componentType']]
    count = acc['count'] * SIZES[acc['type']]
    start = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    arr = np.frombuffer(blob, dtype=dtype, count=count, offset=start)
    return arr.reshape(acc['count'], SIZES[acc['type']])


def main():
    doc, blob = read_glb(sys.argv[1])
    parts = []
    vertices = 0
    triangles = 0
    for mesh in doc['meshes']:
        for prim in mesh['primitives']:
            pos = accessor(doc, blob, prim['attributes']['POSITION']).astype(np.float64)
            lo = pos.min(0)
            span = np.maximum(pos.max(0) - lo, 1e-9)
            q = np.round((pos - lo) / span * 65535).astype('<u2')
            idx = accessor(doc, blob, prim['indices']).astype(np.int64).ravel()
            delta = np.diff(np.concatenate([[0], idx])).astype('<i2')
            joints = accessor(doc, blob, prim['attributes']['JOINTS_0']).astype(np.uint8)
            weights = accessor(doc, blob, prim['attributes']['WEIGHTS_0']).astype(np.float64)
            w8 = np.round(weights[:, :3] * 255).astype(np.uint8)
            parts += [lo.astype('<f4').tobytes(), span.astype('<f4').tobytes(), q.tobytes(),
                      delta.tobytes(), joints.tobytes(), w8.tobytes(), bytes([len(parts) % 256])]
            vertices += len(pos)
            triangles += len(idx) // 3
    pack = b''.join(parts)
    print('vertices', vertices, 'triangles', triangles)
    print('pack bytes', len(pack), 'gzip', len(gzip.compress(pack, 9)))


if __name__ == '__main__':
    main()
