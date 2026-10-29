# Output: `assets/models/penguin/penguin-edge.glb`, from `penguin-beak.glb`.
"""Cuts the faces of the penguin mesh along the sharp edges of its texture, so that each face of the
rig lies on one side of an edge, and the black and the white meet on a line through the faces as on
the mesh of the user (user, 2026-10-28: "the penguine's head has unnatural gradient between black
and white. Make it look more like the original mesh", then option 1: cut the faces along the edge
of the texture).

    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
        --python tools/blender/penguin_edge.py -- <in.glb> <out.glb> [lightness] [limit]

The steps:

1. Import the file, and weld the vertices at 1e-5 units of the file, as `pnpm rig-mesh` does.
   The UV of each face corner stays.
2. Give each vertex a side: light when the Oklab lightness of the base color texture at the UV of
   its first face corner is at least `lightness` (0.5 by default: the black of the mesh is about
   0.18, the white about 0.88). A vertex on the orange beak or feet (an Oklab chroma above
   `CHROMA` and a lightness under `ORANGE`) has no side, and its edges stay.
3. On each edge whose two vertices have different sides, find the place of the change: the
   texture is sampled at 64 steps along the edge in the UV of one face of the edge, and the place
   is the step where the side changes nearest to the middle. The place stays from `limit` to
   1 - `limit` of the edge (0.15 by default), so that no new face is a thin sliver.
4. Split each such edge at its place (`bmesh.utils.edge_split()`), which gives each face corner
   of the new vertex the UV of its own face at that place.
5. Split each face that holds two new vertices along the line between them, and triangulate the
   faces with more than three corners.
6. Export the GLB file with the textures.

A face with three corners of one side keeps its form, also when an island of the other side lies
inside it. `pnpm rig-mesh` then gives it the larger side of its samples (`colors.split`).
"""
import sys

import bmesh
import bpy
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
SOURCE, OUT = argv[0], argv[1]
LIGHTNESS = float(argv[2]) if len(argv) > 2 else 0.5
LIMIT = float(argv[3]) if len(argv) > 3 else 0.15

#: The samples along an edge.
STEPS = 64

#: The Oklab chroma above which a vertex is on a colored part: the orange of the beak and of the
#: feet has about 0.12, the white about 0.03. An edge with such a vertex is not cut: the cut at the
#: black and orange edge of the root of the beak gave thin faces that folded when the beak opened.
CHROMA = 0.06

#: The Oklab lightness under which a vertex with a hue is orange: the beak and the feet have at most
#: 0.75, and the pale yellow throat and cheeks (chroma 0.09) 0.85 to 0.9.
ORANGE = 0.8


def linear(srgb):
    """Converts sRGB values from 0 to 1 to linear values."""
    return np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)


def oklab(srgb):
    """Gives the Oklab colors of sRGB colors (Björn Ottosson, 2020)."""
    rgb = linear(np.asarray(srgb, float))
    lms = rgb @ np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                          [0.2119034982, 0.6806995451, 0.1073969566],
                          [0.0883024619, 0.2817188376, 0.6299787005]]).T
    return np.cbrt(lms) @ np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                                    [1.9779984951, -2.4285922050, 0.4505937099],
                                    [0.0259040371, 0.7827717662, -0.8086757660]]).T


for old in list(bpy.data.objects):
    bpy.data.objects.remove(old)
bpy.ops.import_scene.gltf(filepath=SOURCE)
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
mesh = ob.data
node = next(n for n in mesh.materials[0].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
image = node.inputs['Base Color'].links[0].from_node.image
width, height = image.size
pixels = np.empty(width * height * 4, np.float32)
image.pixels.foreach_get(pixels)
texture = pixels.reshape(height, width, 4)[:, :, :3]


def lab_at(uv):
    """Gives the Oklab color of the texture at each UV."""
    uv = np.atleast_2d(uv)
    x = np.clip(((uv[:, 0] % 1.0) * width).astype(int), 0, width - 1)
    y = np.clip(((uv[:, 1] % 1.0) * height).astype(int), 0, height - 1)
    return oklab(texture[y, x])


def side_at(uv):
    """Gives True where the texture at each UV is light."""
    return lab_at(uv)[:, 0] >= LIGHTNESS


def colored(uv):
    """Tells if the texture at a UV has a hue: the orange of the beak and of the feet."""
    lab = lab_at(uv)[0]
    return bool(np.hypot(lab[1], lab[2]) > CHROMA and lab[0] < ORANGE)


bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
uv_layer = bm.loops.layers.uv.active
faces_before = len(bm.faces)

light = {v: bool(side_at(v.link_loops[0][uv_layer].uv)[0]) for v in bm.verts if v.link_loops
         and not colored(v.link_loops[0][uv_layer].uv)}
cuts = []
for edge in bm.edges:
    a, b = edge.verts
    if a not in light or b not in light or light[a] == light[b] or not edge.link_loops:
        continue
    loop = edge.link_loops[0]
    start, end = loop.vert, loop.link_loop_next.vert
    uv0, uv1 = np.array(loop[uv_layer].uv), np.array(loop.link_loop_next[uv_layer].uv)
    t = np.linspace(0.0, 1.0, STEPS + 1)
    sides = side_at(uv0[None] + t[:, None] * (uv1 - uv0)[None])
    changes = np.nonzero(sides[1:] != sides[:-1])[0]
    place = 0.5 if len(changes) == 0 else float(
        (t[changes] + 0.5 / STEPS)[np.argmin(np.abs(t[changes] + 0.5 / STEPS - 0.5))])
    place = min(max(place, LIMIT), 1.0 - LIMIT)
    # The place counts from the start of the loop. edge_split() counts from its vertex.
    cuts.append((edge, start, place))

new_verts = set()
for edge, start, place in cuts:
    _, vert = bmesh.utils.edge_split(edge, start, place)
    new_verts.add(vert)

split = 0
for face in list(bm.faces):
    ends = [loop.vert for loop in face.loops if loop.vert in new_verts]
    if len(ends) == 2:
        bmesh.utils.face_split(face, ends[0], ends[1])
        split += 1
long = [f for f in bm.faces if len(f.verts) > 3]
bmesh.ops.triangulate(bm, faces=long, quad_method='BEAUTY', ngon_method='BEAUTY')
print(f'edge_cut: lightness {LIGHTNESS}, limit {LIMIT}: {len(cuts)} edges cut, {split} faces '
      f'split, {faces_before} faces before and {len(bm.faces)} after')
bm.to_mesh(mesh)
bm.free()
mesh.update()
check = bmesh.new()
check.from_mesh(mesh)
print('edge_cut:', {'open edges': sum(1 for e in check.edges if e.is_boundary),
                    'edges with more than two faces': sum(1 for e in check.edges
                                                          if len(e.link_faces) > 2),
                    'triangles': len(check.faces)})
check.free()
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False,
                          export_apply=False)
print('edge_cut: wrote', OUT)
