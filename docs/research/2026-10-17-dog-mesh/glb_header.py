"""Prints the JSON chunk of a GLB file, as data, with no buffers."""
import json
import struct
import sys

with open(sys.argv[1], 'rb') as f:
    data = f.read()
magic, version, length = struct.unpack_from('<III', data, 0)
clen, ctype = struct.unpack_from('<II', data, 12)
doc = json.loads(data[20:20 + clen])
print('magic', hex(magic), 'version', version, 'length', length)
print('asset', doc.get('asset'))
print('nodes', doc.get('nodes'))
for m in doc.get('meshes', []):
    print('mesh', m.get('name'), [(p.get('attributes'), p.get('indices'), p.get('material')) for p in m['primitives']])
for a in doc.get('accessors', []):
    print('accessor', a.get('type'), a.get('count'), a.get('min'), a.get('max'))
print('materials', json.dumps(doc.get('materials'))[:600])
print('images', [(i.get('name'), i.get('mimeType'), i.get('bufferView')) for i in doc.get('images', [])])
print('bufferViews', [(b.get('byteLength')) for b in doc.get('bufferViews', [])])
print('skins', doc.get('skins'), 'animations', doc.get('animations'))
print('extensionsUsed', doc.get('extensionsUsed'))
