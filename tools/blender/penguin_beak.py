# Output: `assets/models/penguin/penguin-beak.glb`.
"""Splits the closed beak of the penguin mesh into an upper and a lower part along a
mouth line, and closes each part with a cap of a dark mouth color, so that a jaw bone can open
the beak. The outer form of the closed beak does not change, except a gap of `gap` units of the
file between the two parts, so that the weld of `pnpm rig-mesh` does not join them again.

    /Applications/Blender.app/Contents/MacOS/Blender --background --python tools/blender/penguin_beak.py -- \
        <in.glb> <out.glb> <mouth y> [gap]

The mouth y is the height of the mouth plane in the units of the studio (1 unit from the soles to
the crown, the soles at y = 0, +z forward). The steps:

1. Import the file, and weld the vertices at 1e-5 units of the file, as `pnpm rig-mesh` does.
   The UV of each face corner stays.
2. Select the faces of the beak: each face whose middle lies in BEAK_BOX (studio units).
3. Cut the faces of the beak with the level plane at the mouth y (`bisect_plane`). The cut is a
   path over the surface of the beak, from the left corner of the mouth around the tip to the
   right corner of the mouth, at the root of the beak.
4. Split the faces along the path, so that the upper and the lower part of the beak are apart.
   The two ends of the path (the corners of the mouth) stay one vertex each.
5. Move the path vertices of the upper part up by half the gap, and the path vertices of the
   lower part down by half the gap.
6. Close each part with a cap: one face over its path, which shares the edge from one corner of
   the mouth to the other with the cap of the other part. The normal of each cap points into the
   mouth. The caps take the UV of a patch of MOUTH_COLOR, which the script paints into a free
   place of the base color texture.
7. Export the GLB file with the textures.
"""
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
SOURCE, OUT, MOUTH_Y = argv[0], argv[1], float(argv[2])
GAP = float(argv[3]) if len(argv) > 3 else 0.001

#: The box of the middles of the faces of the beak, in studio units: (min, max) of x, y, z.
BEAK_BOX = ((-0.07, 0.84, 0.135), (0.07, 0.95, 0.30))

#: The color of the inside of the mouth, in sRGB: a little lighter than the darkest samples of the
#: open beaks of `orchestra-side.png`.
MOUTH_COLOR = (0x4d / 255, 0x23 / 255, 0x12 / 255)

#: The size of the painted patch of the mouth color, in pixels of the texture.
PATCH = 24

# The empty scene: the objects of the startup file go.
for old in list(bpy.data.objects):
    bpy.data.objects.remove(old)
bpy.ops.import_scene.gltf(filepath=SOURCE)
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
mesh = ob.data
bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()

# The studio axes of a point of the file: x, the height above the soles over the full height,
# and the depth (+z forward), with the factor and the floor of the whole mesh.
world = ob.matrix_world
zs = [(world @ v.co).z for v in bm.verts]
lo, hi = min(zs), max(zs)
height = hi - lo


def studio(co):
    p = world @ co
    return np.array([p.x / height, (p.z - lo) / height, -p.y / height])


def in_box(p):
    return all(BEAK_BOX[0][k] <= p[k] <= BEAK_BOX[1][k] for k in range(3))


beak = [f for f in bm.faces if in_box(studio(f.calc_center_median()))]
print(f'beak: {len(beak)} faces of {len(bm.faces)}')
inverse = world.inverted()
plane_co = inverse @ Vector((0.0, 0.0, lo + MOUTH_Y * height))
plane_no = (inverse.to_3x3() @ Vector((0.0, 0.0, 1.0))).normalized()
edges = {e for f in beak for e in f.edges}
verts = {v for f in beak for v in f.verts}
cut = bmesh.ops.bisect_plane(bm, geom=list(verts) + list(edges) + beak, dist=1e-7,
                             plane_co=plane_co, plane_no=plane_no)
on_plane = {g for g in cut['geom_cut'] if isinstance(g, bmesh.types.BMVert)}
path = [g for g in cut['geom_cut'] if isinstance(g, bmesh.types.BMEdge)]
# Only the cut edges inside the beak: each one has a face of the beak on each side. The faces of
# the beak are the faces whose middle lies in the box after the cut.
bm.faces.ensure_lookup_table()


def beak_face(f):
    return in_box(studio(f.calc_center_median()))


path = [e for e in path if len(e.link_faces) == 2 and all(beak_face(f) for f in e.link_faces)]
print(f'path: {len(path)} edges, {len(on_plane)} vertices on the plane')
ends = [v for v in {v for e in path for v in e.verts}
        if sum(1 for e in v.link_edges if e in set(path)) == 1]
print('ends:', [tuple(np.round(studio(v.co), 4)) for v in ends])
if len(ends) != 2:
    raise SystemExit(f'The path has {len(ends)} ends, not 2.')
bmesh.ops.split_edges(bm, edges=path)
bm.verts.ensure_lookup_table()
bm.edges.ensure_lookup_table()

# The two sides of the path: each open edge on the plane belongs to the upper or the lower part,
# by the side of its one face.
mouth_z = lo + MOUTH_Y * height
open_edges = [e for e in bm.edges if e.is_boundary and all(
    abs((world @ v.co).z - mouth_z) < 1e-6 for v in e.verts)]
sides = {'upper': [], 'lower': []}
for e in open_edges:
    face_z = (world @ e.link_faces[0].calc_center_median()).z
    sides['upper' if face_z > mouth_z else 'lower'].append(e)
print({k: len(v) for k, v in sides.items()})


def ordered(side_edges, start):
    """Orders the vertices of a path of edges from one end to the other."""
    left = set(side_edges)
    out = [start]
    while left:
        e = next(e for e in left if out[-1] in e.verts)
        left.discard(e)
        out.append(e.other_vert(out[-1]))
    return out


end_set = set(ends)
shift = {'upper': GAP / 2, 'lower': -GAP / 2}
caps = []
for name, side_edges in sides.items():
    start = next(v for v in end_set if any(v in e.verts for e in side_edges))
    chain = ordered(side_edges, start)
    if chain[-1] not in end_set:
        raise SystemExit(f'The {name} path does not end at a corner of the mouth.')
    for v in chain[1:-1]:
        v.co = inverse @ ((world @ v.co) + Vector((0.0, 0.0, shift[name])))
    cap = bm.faces.new(chain)
    cap.material_index = side_edges[0].link_faces[0].material_index
    bm.normal_update()
    # The normal of the cap of the upper part points down into the mouth, and of the lower up.
    down = (world.to_3x3() @ cap.normal).z < 0
    if down != (name == 'upper'):
        cap.normal_flip()
    caps.append((name, cap))
    print(f'cap {name}: {len(chain)} corners')

# The patch of the mouth color: a free square of the base color texture that no UV island covers.
uv = bm.loops.layers.uv.active
image = next(n.image for n in bpy.data.materials[0].node_tree.nodes
             if n.type == 'TEX_IMAGE' and n.image and 'metallic' not in n.image.name.lower())
w, h = image.size
covered = np.zeros((h // PATCH + 1, w // PATCH + 1), bool)
for f in bm.faces:
    us = [l[uv].uv for l in f.loops]
    u0, u1 = min(p.x for p in us), max(p.x for p in us)
    v0, v1 = min(p.y for p in us), max(p.y for p in us)
    covered[int(v0 * h) // PATCH:int(v1 * h) // PATCH + 1,
            int(u0 * w) // PATCH:int(u1 * w) // PATCH + 1] = True
free = np.argwhere(~covered[1:-1, 1:-1]) + 1
if len(free) == 0:
    raise SystemExit('The texture has no free place for the patch.')
row, col = free[0]
pixels = np.array(image.pixels[:], dtype=np.float32).reshape(h, w, 4)
linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in MOUTH_COLOR]
color = linear if image.colorspace_settings.name != 'sRGB' else list(MOUTH_COLOR)
pixels[row * PATCH:(row + 1) * PATCH, col * PATCH:(col + 1) * PATCH, :3] = color
pixels[row * PATCH:(row + 1) * PATCH, col * PATCH:(col + 1) * PATCH, 3] = 1.0
image.pixels[:] = pixels.ravel()
image.pack()
center = ((col + 0.5) * PATCH / w, (row + 0.5) * PATCH / h)
print(f'patch: {PATCH} px at u {center[0]:.4f}, v {center[1]:.4f}, color space '
      f'{image.colorspace_settings.name}')
for name, cap in caps:
    for loop in cap.loops:
        loop[uv].uv = center
for name, cap in caps:
    bmesh.ops.triangulate(bm, faces=[cap])
bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
bm.to_mesh(mesh)
mesh.update()
bm.free()
counts = {}
check = bmesh.new()
check.from_mesh(mesh)
counts['open edges'] = sum(1 for e in check.edges if e.is_boundary)
counts['edges with more than two faces'] = sum(1 for e in check.edges if len(e.link_faces) > 2)
counts['triangles'] = len(check.faces)
check.free()
print(counts)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False,
                          export_apply=False)
print('wrote', OUT)
