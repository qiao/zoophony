"""The regression of an animal: golden stats of a build, and their compare with a new build.

Pure Python (struct, hashlib, array): it parses the GLB itself. The golden stats hold:

    glb        the sha256 and the size of the file
    counts     vertices, triangles, bones, morph targets, clips, materials, nodes
    arrays     for each accessor of the meshes and the skin: the sha256 of its bytes, and for a
               float accessor its count, sum, sum of absolute values, min, max, and 64 block
               checksums (the sum and the absolute sum of each 64th of the values)
    nodes      the rest translation, rotation, and scale of each node (the bone transforms)
    clips      for each animation: the channels, the sha256 of its key data, the sums of its key
               times and key values, and 64 block checksums of the key values
    stats      the stats file of the build (contacts, folds, corrective report, facets)
    iou        the silhouette IoU of each view
    measures   the feature, shading, and GLB facet measures
    checks     the pass or fail of each check of checks.json

The compare says, for each item: identical (the same bytes), float noise (the bytes differ, and
each block checksum agrees within 2e-6 of the absolute sum of its block, about 1 float32 step of
each value), or different. A local change of 0.001 in one value shows in its block. IoU may
differ by up to 0.0005 (browser rendering).
"""

import array
import hashlib
import json
import math
import os
import struct

COMPONENT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4),
             5126: ('f', 4)}
WIDTH = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
FLOAT_TOL = 1e-6
BLOCKS = 64
BLOCK_TOL = 2e-6
IOU_TOL = 0.0005


def read_glb(path):
    """Reads a GLB file: (the JSON document, the binary chunk, the file bytes)."""
    with open(path, 'rb') as f:
        data = f.read()
    magic, _, length = struct.unpack_from('<4sII', data, 0)
    if magic != b'glTF':
        raise ValueError(f'{path} is not a GLB file')
    n, kind = struct.unpack_from('<I4s', data, 12)
    doc = json.loads(data[20:20 + n])
    offset = 20 + n
    binary = b''
    if offset < length:
        m, _ = struct.unpack_from('<I4s', data, offset)
        binary = data[offset + 8:offset + 8 + m]
    return doc, binary, data


def _view_bytes(doc, binary, view, offset, count, elem):
    """Returns count elements of elem bytes from a buffer view (with its stride)."""
    bv = doc['bufferViews'][view]
    start = bv.get('byteOffset', 0) + offset
    stride = bv.get('byteStride', elem)
    if stride == elem:
        return binary[start:start + elem * count]
    return b''.join(binary[start + i * stride:start + i * stride + elem] for i in range(count))


def accessor_bytes(doc, binary, index):
    """Returns (the raw bytes of an accessor, its type code, its width, its count).

    A sparse accessor (the morph targets) is expanded: zeros, or its buffer view, with the
    sparse values written at their indices.
    """
    acc = doc['accessors'][index]
    code, size = COMPONENT[acc['componentType']]
    width = WIDTH[acc['type']]
    elem = size * width
    count = acc['count']
    if 'bufferView' in acc:
        raw = _view_bytes(doc, binary, acc['bufferView'], acc.get('byteOffset', 0), count, elem)
    else:
        raw = bytes(elem * count)
    sparse = acc.get('sparse')
    if sparse:
        values = array.array(code, raw)
        ix = sparse['indices']
        icode, isize = COMPONENT[ix['componentType']]
        idx = array.array(icode, _view_bytes(doc, binary, ix['bufferView'],
                                             ix.get('byteOffset', 0), sparse['count'], isize))
        vs = sparse['values']
        new = array.array(code, _view_bytes(doc, binary, vs['bufferView'],
                                            vs.get('byteOffset', 0), sparse['count'], elem))
        for k, i in enumerate(idx):
            values[i * width:(i + 1) * width] = new[k * width:(k + 1) * width]
        raw = values.tobytes()
    return raw, code, width, count


def blocks(values):
    """Calculates the block checksums of values: [sum, absolute sum] of each of BLOCKS parts."""
    n = len(values)
    out = []
    for b in range(BLOCKS):
        part = values[b * n // BLOCKS:(b + 1) * n // BLOCKS]
        out.append([math.fsum(part), math.fsum(abs(v) for v in part)])
    return out


def array_stats(raw, code, width, count):
    """Summarizes an accessor: sha256, and for floats the sums, the min, the max, and the
    block checksums."""
    out = {'sha256': hashlib.sha256(raw).hexdigest(), 'count': count, 'width': width}
    if code == 'f':
        values = array.array('f', raw)
        out['sum'] = math.fsum(values)
        out['abs_sum'] = math.fsum(abs(v) for v in values)
        cols = [values[k::width] for k in range(width)]
        out['min'] = [min(c) for c in cols]
        out['max'] = [max(c) for c in cols]
        out['blocks'] = blocks(values)
    return out


def glb_stats(path):
    """Collects the golden stats of a GLB file."""
    doc, binary, data = read_glb(path)
    names = [n.get('name', f'node{i}') for i, n in enumerate(doc.get('nodes', []))]
    arrays = {}
    vertices = triangles = targets = 0
    for mesh in doc.get('meshes', []):
        for p, prim in enumerate(mesh['primitives']):
            key = f'{mesh.get("name", "mesh")}/{p}'
            for attr, index in prim['attributes'].items():
                arrays[f'{key}/{attr}'] = array_stats(*accessor_bytes(doc, binary, index))
            vertices += doc['accessors'][prim['attributes']['POSITION']]['count']
            if 'indices' in prim:
                arrays[f'{key}/indices'] = array_stats(*accessor_bytes(doc, binary,
                                                                       prim['indices']))
                triangles += doc['accessors'][prim['indices']]['count'] // 3
            for t, target in enumerate(prim.get('targets', [])):
                for attr, index in target.items():
                    arrays[f'{key}/target{t}/{attr}'] = array_stats(
                        *accessor_bytes(doc, binary, index))
            targets = max(targets, len(prim.get('targets', [])))
    joints = 0
    for s, skin in enumerate(doc.get('skins', [])):
        arrays[f'skin{s}/inverseBindMatrices'] = array_stats(
            *accessor_bytes(doc, binary, skin['inverseBindMatrices']))
        arrays[f'skin{s}/joints'] = {'names': [names[j] for j in skin['joints']]}
        joints = max(joints, len(skin['joints']))
    nodes = {}
    for i, n in enumerate(doc.get('nodes', [])):
        nodes[names[i]] = {k: n[k] for k in ('translation', 'rotation', 'scale') if k in n}
    clips = {}
    for anim in doc.get('animations', []):
        h = hashlib.sha256()
        times = values = abs_values = 0.0
        channels = []
        keys = array.array('f')
        for ch in anim['channels']:
            sampler = anim['samplers'][ch['sampler']]
            channels.append(f'{names[ch["target"]["node"]]}.{ch["target"]["path"]}')
            for which in ('input', 'output'):
                raw, code, width, count = accessor_bytes(doc, binary, sampler[which])
                h.update(raw)
                vals = array.array(code, raw)
                if which == 'input':
                    times += math.fsum(vals)
                else:
                    values += math.fsum(vals)
                    abs_values += math.fsum(abs(v) for v in vals)
                    keys.extend(vals)
        clips[anim.get('name', '')] = {'channels': channels, 'sha256': h.hexdigest(),
                                       'time_sum': times, 'value_sum': values,
                                       'value_abs_sum': abs_values, 'blocks': blocks(keys)}
    counts = {'vertices': vertices, 'triangles': triangles, 'bones': joints,
              'morph_targets': targets, 'clips': len(clips),
              'materials': len(doc.get('materials', [])), 'nodes': len(names)}
    return {'glb': {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)},
            'counts': counts, 'arrays': arrays, 'nodes': nodes, 'clips': clips}


def dumps(value, indent=0):
    """Writes JSON with one key per line and each list of numbers on one line."""
    pad = '  ' * indent
    if isinstance(value, dict):
        if not value:
            return '{}'
        items = [f'{pad}  {json.dumps(k)}: {dumps(v, indent + 1)}' for k, v in value.items()]
        return '{\n' + ',\n'.join(items) + f'\n{pad}}}'
    if isinstance(value, list) and value and all(isinstance(v, dict) for v in value):
        items = [f'{pad}  {dumps(v, indent + 1)}' for v in value]
        return '[\n' + ',\n'.join(items) + f'\n{pad}]'
    return json.dumps(value)


def _load(path):
    """Reads a JSON file, or returns None."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def collect(cfg):
    """Collects the golden stats of the outputs in cfg.paths.out."""
    out = glb_stats(cfg.paths.glb)
    out['stats'] = _load(cfg.paths.stats)
    iou = _load(os.path.join(cfg.paths.compare, 'iou.json')) or {}
    out['iou'] = {v: r['iou'] for v, r in (iou.get('views') or {}).items()}
    out['measures'] = {name: _load(os.path.join(cfg.paths.compare, f'{name}.json'))
                       for name in ('features', 'topology', 'mesh')}
    checks = _load(os.path.join(cfg.paths.out, 'checks.json')) or {}
    out['checks'] = {c['name']: c['pass'] for c in checks.get('checks', [])}
    return out


def _close(a, b, tol=FLOAT_TOL):
    """Tells if two numbers agree within a relative tolerance (and 1e-9 absolute)."""
    return abs(a - b) <= max(tol * max(abs(a), abs(b)), 1e-9)


def _deep_diff(a, b, path, out, tol=FLOAT_TOL):
    """Lists the places where two JSON values differ (numbers within tol agree)."""
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                out.append(f'{path}.{k}: only in {"golden" if k in a else "new"}')
            else:
                _deep_diff(a[k], b[k], f'{path}.{k}', out, tol)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            out.append(f'{path}: length {len(a)} -> {len(b)}')
        else:
            for i, (x, y) in enumerate(zip(a, b)):
                _deep_diff(x, y, f'{path}[{i}]', out, tol)
    elif isinstance(a, bool) or isinstance(b, bool) or isinstance(a, str) or a is None:
        if a != b:
            out.append(f'{path}: {a!r} -> {b!r}')
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if not _close(a, b, tol):
            out.append(f'{path}: {a} -> {b}')
    elif a != b:
        out.append(f'{path}: {a!r} -> {b!r}')


def _block_diff(a, b, name):
    """Lists the blocks whose checksums differ by more than float noise."""
    if a is None and b is None:
        return []
    if a is None or b is None or len(a) != len(b):
        return [f'{name}.blocks: missing or of another length']
    out = []
    for i, ((s0, a0), (s1, a1)) in enumerate(zip(a, b)):
        tol = BLOCK_TOL * max(a0, a1, 1e-3)
        if abs(s0 - s1) > tol or abs(a0 - a1) > tol:
            out.append(f'{name}.blocks[{i}]: sum {s0:.6g} -> {s1:.6g}')
    return out


def compare(golden, new):
    """Compares new stats with the golden stats. Returns (rows, ok): one row per item with
    (item, verdict, detail), and ok when nothing is different."""
    rows = []
    same_glb = golden['glb']['sha256'] == new['glb']['sha256']
    rows.append(('GLB file', 'identical' if same_glb else 'bytes differ',
                 f'{new["glb"]["bytes"]} bytes, sha256 {new["glb"]["sha256"][:12]}'))
    diffs = []
    _deep_diff(golden['counts'], new['counts'], 'counts', diffs, 0.0)
    rows.append(('counts', 'different' if diffs else 'identical',
                 '; '.join(diffs) or ', '.join(f'{k} {v}' for k, v in new['counts'].items())))
    for group in ('arrays', 'clips'):
        identical = noise = 0
        bad = []
        for name in sorted(set(golden[group]) | set(new[group])):
            g, n = golden[group].get(name), new[group].get(name)
            if g is None or n is None:
                bad.append(f'{name} only in {"golden" if n is None else "new"}')
            elif g.get('sha256') is not None and g.get('sha256') == n.get('sha256'):
                identical += 1
            else:
                d = []
                ignore = {'sha256', 'blocks'}
                _deep_diff({k: v for k, v in g.items() if k not in ignore},
                           {k: v for k, v in n.items() if k not in ignore}, name, d)
                d += _block_diff(g.get('blocks'), n.get('blocks'), name)
                if d:
                    bad += d
                elif g.get('sha256') is None:
                    identical += 1
                else:
                    noise += 1
        verdict = 'different' if bad else ('float noise' if noise else 'identical')
        rows.append((group, verdict, '; '.join(bad[:6]) or f'{identical} identical, '
                     f'{noise} within float noise'))
    for group, tol in (('nodes', FLOAT_TOL), ('stats', FLOAT_TOL), ('measures', FLOAT_TOL)):
        d = []
        _deep_diff(golden.get(group), new.get(group), group, d, tol)
        rows.append((group, 'different' if d else 'identical', '; '.join(d[:6])))
    d = []
    for view in sorted(set(golden['iou']) | set(new['iou'])):
        g, n = golden['iou'].get(view), new['iou'].get(view)
        if g is None or n is None or abs(g - n) > IOU_TOL:
            d.append(f'{view} {g} -> {n}')
    rows.append(('iou', 'different' if d else 'identical',
                 '; '.join(d) or ', '.join(f'{k} {v}' for k, v in new['iou'].items())))
    d = []
    extra = []
    for name in sorted(set(golden['checks']) | set(new['checks'])):
        g, n = golden['checks'].get(name), new['checks'].get(name)
        if g is None:
            extra.append(name)
        elif n is None or g != n:
            d.append(f'{name} {g} -> {n}')
    detail = '; '.join(d) or f'{sum(new["checks"].values())} of {len(new["checks"])} pass'
    if extra:
        detail += f' (new checks, not in golden: {", ".join(extra)})'
    rows.append(('checks', 'different' if d else 'identical', detail))
    ok = all(v != 'different' for _, v, _ in rows)
    return rows, ok
