"""Compares the accessors and the images of two GLB files, one by one.

Run it from the root of the tree:

    python3 docs/research/2026-10-27-elephant-bake/compare_glb.py <base.glb> <round.glb>

It prints one line for each accessor of each mesh primitive (`same` or `diff`, with the largest
difference of a value), and one line for each image (the byte count and `same` or `diff`). A
primitive with indices also gives, for each attribute, the count of the triangle corners that keep
its value, the box of the corners where it changes, and the size of the change of a corner (the
largest change of a component: the median, the 95th percentile, the largest, and the count over
0.1). The corners compare the surface when the export splits the vertices in another way.
"""
import json
import struct
import sys

COMPONENTS = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
COUNTS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load(path):
    """Reads the JSON chunk and the binary chunk of a GLB file."""
    data = open(path, 'rb').read()
    length = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + length])
    start = 20 + length + 8
    return doc, data[start:]


def view_bytes(doc, blob, index):
    """Gives the bytes of a buffer view."""
    view = doc['bufferViews'][index]
    start = view.get('byteOffset', 0)
    return blob[start:start + view['byteLength']]


def values(doc, blob, index):
    """Gives the values of an accessor as a flat tuple."""
    acc = doc['accessors'][index]
    view = doc['bufferViews'][acc['bufferView']]
    fmt = COMPONENTS[acc['componentType']]
    n = acc['count'] * COUNTS[acc['type']]
    start = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    return struct.unpack_from('<%d%s' % (n, fmt), blob, start)


def corners(m, p, a, b):
    """Prints how many triangle corners keep each attribute (the position, the normal, the UV, the
    color, the joints, and the weights), the box of the corners where each one changes, and the
    size of the change. A primitive with no indices or no positions gives no line."""
    order = ('POSITION', 'NORMAL', 'TEXCOORD_0', 'COLOR_0', 'JOINTS_0', 'WEIGHTS_0')
    names = [n for n in order if n in a[2]['attributes'] and n in b[2]['attributes']]
    if 'POSITION' not in names or 'indices' not in a[2] or 'indices' not in b[2]:
        return
    rows = []
    for doc, blob, prim in (a, b):
        idx = values(doc, blob, prim['indices'])
        attr = {}
        for name in names:
            size = COUNTS[doc['accessors'][prim['attributes'][name]]['type']]
            flat = values(doc, blob, prim['attributes'][name])
            attr[name] = [flat[i * size:(i + 1) * size] for i in idx]
        rows.append(attr)
    total = len(rows[0]['POSITION'])
    if total != len(rows[1]['POSITION']):
        print('mesh %d prim %d corners %d %d' % (m, p, total, len(rows[1]['POSITION'])))
        return
    for name in names:
        same = sum(x == y for x, y in zip(rows[0][name], rows[1][name]))
        print('mesh %d prim %d corners %s same %d of %d' % (m, p, name, same, total))
        moved = [pos for pos, x, y in zip(rows[0]['POSITION'], rows[0][name], rows[1][name])
                 if x != y]
        if moved:
            box = [(min(q[k] for q in moved), max(q[k] for q in moved)) for k in range(3)]
            print('mesh %d prim %d %s changes at x %.3f..%.3f y %.3f..%.3f z %.3f..%.3f' % (
                m, p, name, *[v for pair in box for v in pair]))
            step = sorted(max(abs(x - y) for x, y in zip(u, w))
                          for u, w in zip(rows[0][name], rows[1][name]))
            print('mesh %d prim %d %s change of a corner: median %.4f p95 %.4f max %.4f, '
                  'over 0.1 %d' % (m, p, name, step[len(step) // 2], step[int(0.95 * len(step))],
                                   step[-1], sum(x > 0.1 for x in step)))


def main():
    """Prints the comparison of the two files."""
    (da, ba), (db, bb) = load(sys.argv[1]), load(sys.argv[2])
    for m, (ma, mb) in enumerate(zip(da['meshes'], db['meshes'])):
        for p, (pa, pb) in enumerate(zip(ma['primitives'], mb['primitives'])):
            pairs = dict(pa['attributes'])
            pairs['indices'] = pa.get('indices')
            for name, ia in sorted(pairs.items()):
                ib = pb['attributes'].get(name) if name != 'indices' else pb.get('indices')
                if ia is None or ib is None:
                    print('mesh %d prim %d %s missing' % (m, p, name))
                    continue
                va, vb = values(da, ba, ia), values(db, bb, ib)
                if len(va) != len(vb):
                    print('mesh %d prim %d %s count %d %d' % (m, p, name, len(va), len(vb)))
                    continue
                worst = max((abs(x - y) for x, y in zip(va, vb)), default=0)
                print('mesh %d prim %d %s %d values %s max %.3g' % (
                    m, p, name, len(va), 'same' if va == vb else 'diff', worst))
            corners(m, p, (da, ba, pa), (db, bb, pb))
    for i, (ia, ib) in enumerate(zip(da.get('images', []), db.get('images', []))):
        xa, xb = view_bytes(da, ba, ia['bufferView']), view_bytes(db, bb, ib['bufferView'])
        print('image %d %s %d %d bytes %s' % (i, ia.get('name'), len(xa), len(xb),
                                              'same' if xa == xb else 'diff'))


main()
