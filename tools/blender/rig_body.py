"""Prepares the skinned mesh of a rigged GLB body for the app, and writes it as JSON with its skin
texture (design 4.4, 4.7).

    blender -b --factory-startup --python tools/blender/rig_body.py -- <config.json> <out.json>

`pnpm rig-body <species>` runs this script and packs its output. The script writes the skin
texture `skin.webp` into the folder of `<out.json>`. The steps:

1. Read the skinned mesh and the skeleton of the source GLB file of the config, and weld the
   corners at one point.
2. Measure each eye from dense samples of the texture in the box of the eyes: the dark core, and
   the light parts around it. The two eyes become mirror images. Measure the tip of the nose from
   the faces of the box of the nose that are not fur.
3. Collapse the mesh to the triangle budget of the config. Blender mixes the weights of the
   joined vertices.
4. Add a thin plate in front of each eye, on the eye bone, so that the eye blinks. With `tail`
   in the config, add a ball on the bone `tail1` for a tail that the source mesh does not have.
5. Unwrap the mesh into a new UV layout. The islands of the face get more texels. A pinned island
   keeps the corner at (0, 1) white for the parts of a player that have no skin.
6. Bake the color of the texture of the source mesh onto the new layout with Cycles. Under each
   plate, the skin gets the fur color, so that a closed eye shows fur. With `targets` in the
   config, each color of the palette moves to its target color, and the colors near it move with
   it.
7. Move the weights of the source joints onto the bones of the player (`joints` of the config).
   Each extra bone of the config (a bone that the source skeleton does not have) takes a part of
   the weight of another bone: the part grows from 0 at the head of the extra bone to 1 at the
   ramp distance along the bone. Each vertex keeps its two largest weights.
8. Write the vertices, the faces with the UV of each corner, the weights, the head of each bone,
   the eyes, and the tip of the nose. The JSON keeps the axes and the units of Blender: +x is the
   left side of the animal, -y is the front, and +z is up.
"""

import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

#: The number of bones that each vertex keeps (design 4.7: a main bone and a second bone).
BONES_PER_VERTEX = 2

#: The barycentric weights of the texture samples of a face: the middle and a point toward each
#: corner. The color of the face is the median of the samples.
SAMPLE_POINTS = [
    (1 / 3, 1 / 3, 1 / 3),
    (0.6, 0.2, 0.2),
    (0.2, 0.6, 0.2),
    (0.2, 0.2, 0.6),
]

#: The number of steps along each edge of a face for the dense texture samples of an eye.
EYE_SAMPLE_STEPS = 16

#: The smallest distance of an sRGB color from the fur color of the palette for a sample of an
#: eye: the white, the iris, the pupil, and the lights.
EYE_DISTANCE = 0.15

#: The reach of an eye from the middle of its dark core, in RMS radii of the core. The light parts
#: of the eye are in it, and the nose is not.
EYE_REACH = 3

#: The plate of an eye over the measured eye: the plate shows a ring of fur around the eye.
PLATE_MARGIN = 1.35

#: The part of the measured eye that gets the fur color in the skin, under the plate.
PAINT_MARGIN = 1.3

#: The ring of fur around an eye that gives the fur color under its plate, in measured radii.
FUR_RING = (1.4, 2.2)

#: The number of corners of the outline of a plate.
PLATE_CORNERS = 12

#: The inner ring of a plate, in parts of its outer ring.
PLATE_INNER = 0.55

#: The depth of the back ring of a plate under its outer ring, in half heights of the eye.
PLATE_BACK = 0.4

#: The gap between a plate and the surface of the head under it, in meters.
PLATE_GAP = 0.0015

#: The start of the rays that put a plate on the head, in front of the highest point of the eye,
#: in meters.
PLATE_RAY_START = 0.003

#: The size of the skin texture, in texels.
SKIN_SIZE = 1024

#: The scale of the UV islands of the face against the other islands, in texels along an edge.
FACE_SCALE = 2.0

#: The size of the white corner of the skin, in texels.
WHITE_TEXELS = 8

#: The margin around each UV island, in texels. The bake extends each island into it.
ISLAND_MARGIN = 6

#: The distance in front of the new surface where each bake ray starts, in meters.
CAGE_EXTRUSION = 0.01

#: The longest bake ray from its start, in meters.
MAX_RAY = 0.04

#: The samples of each texel in the bake.
BAKE_SAMPLES = 4

#: The reach of a color move of the palette in Oklab units: a color at this distance from its
#: nearest color of the palette moves with a strength of 1 / e.
SHIFT_REACH = 0.15

#: The width of the soft change between the moves of two colors of the palette, in Oklab units.
#: It is much smaller than the distance between two colors of the palette, so that each color of
#: the palette takes only its own move.
SHIFT_MIX = 0.02

#: The matrix from linear sRGB to the LMS cone values of Oklab (Ottosson 2020).
OKLAB_LMS = np.array(
    [
        [0.4122214708, 0.5363325363, 0.0514459929],
        [0.2119034982, 0.6806995451, 0.1073969566],
        [0.0883024619, 0.2817188376, 0.6299787005],
    ]
)

#: The matrix from the cube roots of the LMS values to Oklab (Ottosson 2020).
OKLAB_LAB = np.array(
    [
        [0.2104542553, 0.7936177850, -0.0040720468],
        [1.9779984951, -2.4285922050, 0.4505937099],
        [0.0259040371, 0.7827717662, -0.8086757660],
    ]
)


def args():
    """Reads the config path and the output path after `--`."""
    rest = sys.argv[sys.argv.index('--') + 1 :]
    if len(rest) != 2:
        raise SystemExit('Usage: blender -b --python rig_body.py -- <config.json> <out.json>')
    return rest[0], rest[1]


def load(path):
    """Imports a GLB file, and gives its skinned mesh with the world transform applied, and the
    world place of the head of each joint in the rest pose."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    rigs = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    if len(rigs) != 1:
        raise SystemExit(f'{path} has {len(rigs)} skeletons, not 1.')
    rig = rigs[0]
    if rig.animation_data:
        rig.animation_data_clear()
    heads = {b.name: (rig.matrix_world @ b.head_local)[:] for b in rig.data.bones}

    skinned = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent == rig]
    if len(skinned) != 1:
        raise SystemExit(f'{path} has {len(skinned)} skinned meshes, not 1.')
    ob = skinned[0]
    for other in bpy.context.view_layer.objects:
        other.select_set(other == ob)
    bpy.context.view_layer.objects.active = ob
    for modifier in list(ob.modifiers):
        ob.modifiers.remove(modifier)
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data)
    bm.free()
    return ob, heads


def base_color_image(ob):
    """Gives the pixels of the base color texture as an array of rows of sRGB values."""
    material = ob.material_slots[0].material
    bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    image = bsdf.inputs['Base Color'].links[0].from_node.image
    width, height = image.size
    pixels = np.empty(width * height * 4, np.float32)
    image.pixels.foreach_get(pixels)
    # The pixels of a byte image keep the values of the file, with no color management.
    return pixels.reshape(height, width, 4)[:, :, :3]


def texel(image, u, v):
    """Gives the indices of the texel of each UV point: the row and the column."""
    height, width, _ = image.shape
    x = np.clip(((np.asarray(u) % 1.0) * width).astype(int), 0, width - 1)
    y = np.clip(((np.asarray(v) % 1.0) * height).astype(int), 0, height - 1)
    return y, x


def face_colors(ob, image):
    """Gives the median sRGB color of the texture samples of each face."""
    uv = ob.data.uv_layers.active.data
    colors = []
    for poly in ob.data.polygons:
        loops = list(poly.loop_indices)
        us = [sum(w * uv[i].uv[0] for w, i in zip(weights, loops)) for weights in SAMPLE_POINTS]
        vs = [sum(w * uv[i].uv[1] for w, i in zip(weights, loops)) for weights in SAMPLE_POINTS]
        y, x = texel(image, us, vs)
        colors.append(np.median(image[y, x], axis=0))
    return np.array(colors)


def srgb(hex_color):
    """Gives the sRGB values of a CSS hex color, from 0 to 1."""
    return np.array([int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5)])


def inside(point, box):
    """Tells if a point is in a box of two corners."""
    lo, hi = box
    return all(lo[k] <= point[k] <= hi[k] for k in range(3))


def nearest(color, palette):
    """Gives the name of the color of the palette that is nearest to a color."""
    return min(palette, key=lambda name: float(((palette[name] - color) ** 2).sum()))


def nose_tip(ob, colors, rules, palette):
    """Gives the front point of the faces of the box of the nose that are not fur."""
    points = [
        ob.data.vertices[i].co.copy()
        for poly, color in zip(ob.data.polygons, colors)
        if inside(poly.center, rules['noseBox']) and nearest(color, palette) != 'fur'
        for i in poly.vertices
    ]
    if not points:
        raise SystemExit('No face of the nose is in the box of the nose. Check the box.')
    return min(points, key=lambda p: p.y)


def dense_samples(ob, image, faces):
    """Gives the place, the area, the face normal, and the sRGB color of dense texture samples on
    some faces."""
    steps = EYE_SAMPLE_STEPS
    weights = np.array(
        [(i / steps, j / steps, (steps - i - j) / steps) for i in range(steps + 1) for j in range(steps + 1 - i)]
    )
    uv = ob.data.uv_layers.active.data
    points, areas, normals, colors = [], [], [], []
    for poly in faces:
        corners = np.array([ob.data.vertices[i].co[:] for i in poly.vertices])
        uvs = np.array([uv[i].uv[:] for i in poly.loop_indices])
        at = weights @ uvs
        y, x = texel(image, at[:, 0], at[:, 1])
        points.append(weights @ corners)
        areas.append(np.full(len(weights), poly.area / len(weights)))
        normals.append(np.tile(poly.normal[:], (len(weights), 1)))
        colors.append(image[y, x])
    return (
        np.concatenate(points),
        np.concatenate(areas),
        np.concatenate(normals),
        np.concatenate(colors),
    )


def eye_frame(normal):
    """Gives the axes of the plane of an eye: across (toward +x for a normal toward -y) and up."""
    up = np.array([0.0, 0.0, 1.0])
    up = up - normal * (up @ normal)
    up /= np.linalg.norm(up)
    return np.cross(up, normal), up


def measure_eye(ob, image, rules, palette, side):
    """Measures one eye from dense samples of the texture: the middle on the surface, the outward
    normal, the axes, the half width and the half height of the parts that are not fur, the fur
    color around the eye, and the height of the eye above its plane."""
    faces = [
        p for p in ob.data.polygons if inside(p.center, rules['eyeBox']) and p.center.x * side > 0
    ]
    points, areas, normals, colors = dense_samples(ob, image, faces)
    luma = colors @ np.array([0.2126, 0.7152, 0.0722])
    dark = luma < rules['eyeLuma']
    if not dark.any():
        raise SystemExit(f'The texture has no dark eye on the side {side}. Check the box.')

    core = np.average(points[dark], axis=0, weights=areas[dark])
    spread = math.sqrt(np.average(((points[dark] - core) ** 2).sum(axis=1), weights=areas[dark]))
    near = np.linalg.norm(points - core, axis=1) < EYE_REACH * spread
    far = np.linalg.norm(colors - palette['fur'], axis=1) > EYE_DISTANCE
    eye = near & far
    w = areas[eye]
    middle = np.average(points[eye], axis=0, weights=w)
    normal = np.average(normals[eye], axis=0, weights=w)
    normal /= np.linalg.norm(normal)
    across, up = eye_frame(normal)
    offsets = points[eye] - middle
    half_width = 2 * math.sqrt(np.average((offsets @ across) ** 2, weights=w))
    half_height = 2 * math.sqrt(np.average((offsets @ up) ** 2, weights=w))

    radius = np.hypot(((points - middle) @ across) / half_width, ((points - middle) @ up) / half_height)
    ring = (radius > FUR_RING[0]) & (radius < FUR_RING[1]) & ~far
    fur = np.median(colors[ring], axis=0) if ring.any() else palette['fur']
    return {
        'middle': middle,
        'normal': normal,
        'halfWidth': half_width,
        'halfHeight': half_height,
        'fur': fur,
        'height': float(max(0.0, (offsets @ normal).max())),
    }


def mirrored_eyes(left, right):
    """Gives the two eyes as mirror images of their mean, so that the face is symmetric."""
    flip = np.array([-1.0, 1.0, 1.0])
    mean = {
        key: (left[key] + right[key] * (flip if key in ('middle', 'normal') else 1)) / 2
        for key in left
    }
    mean['normal'] = mean['normal'] / np.linalg.norm(mean['normal'])
    other = dict(mean, middle=mean['middle'] * flip, normal=mean['normal'] * flip)
    return {'eyeL': mean, 'eyeR': other}


def collapse(ob, budget):
    """Collapses the mesh to at most `budget` triangles."""
    count = len(ob.data.polygons)
    if count <= budget:
        return
    modifier = ob.modifiers.new('budget', 'DECIMATE')
    modifier.decimate_type = 'COLLAPSE'
    modifier.use_collapse_triangulate = True
    # The collapse can end a few faces above the ratio, so aim a little lower.
    modifier.ratio = (budget - 4) / count
    bpy.ops.object.modifier_apply(modifier='budget')
    if len(ob.data.polygons) > budget:
        raise SystemExit(f'The collapse left {len(ob.data.polygons)} faces, above {budget}.')


def add_plates(ob, eyes):
    """Adds a plate in front of each eye: a fan through an inner and an outer ring on the surface
    of the head, and a band from the outer ring back into the head. The plate follows the curve of
    the head, so that its facets take the light as the head does. The vertices of a plate are in
    the vertex group of its eye bone. Gives the indices of the faces of the plates."""
    tree = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    deform = bm.verts.layers.deform.verify()
    plate_faces = []
    for bone, eye in eyes.items():
        group = ob.vertex_groups.new(name=bone).index
        normal = eye['normal']
        across, up = eye_frame(normal)
        start = eye['height'] + PLATE_RAY_START

        def on_surface(a, b):
            point = eye['middle'] + across * a * eye['halfWidth'] + up * b * eye['halfHeight']
            hit, _, _, _ = tree.ray_cast(Vector(point + normal * start), Vector(-normal), 2 * start)
            surface = np.array(hit[:]) if hit else point
            return surface + normal * PLATE_GAP

        def ring(scale):
            angles = [2 * math.pi * i / PLATE_CORNERS for i in range(PLATE_CORNERS)]
            return [on_surface(math.cos(a) * scale, math.sin(a) * scale) for a in angles]

        middle = bm.verts.new(on_surface(0, 0))
        inner = [bm.verts.new(p) for p in ring(PLATE_INNER * PLATE_MARGIN)]
        outer_points = ring(PLATE_MARGIN)
        outer = [bm.verts.new(p) for p in outer_points]
        depth = normal * (PLATE_BACK * eye['halfHeight'] + PLATE_GAP)
        base = [bm.verts.new(p - depth) for p in outer_points]
        for vert in [middle, *inner, *outer, *base]:
            vert[deform][group] = 1.0
        front = []
        band = []
        for i in range(PLATE_CORNERS):
            j = (i + 1) % PLATE_CORNERS
            front.append(bm.faces.new((middle, inner[i], inner[j])))
            front.append(bm.faces.new((inner[i], outer[i], outer[j])))
            front.append(bm.faces.new((inner[i], outer[j], inner[j])))
            band.append(bm.faces.new((outer[i], base[i], base[j])))
            band.append(bm.faces.new((outer[i], base[j], outer[j])))
        axis = Vector(normal)
        center = Vector(eye['middle'])
        for face in front + band:
            face.normal_update()
            if face in front:
                wanted = axis
            else:
                outward = face.calc_center_median() - center
                wanted = outward - axis * outward.dot(axis)
            if face.normal.dot(wanted) < 0:
                face.normal_flip()
        plate_faces += front + band

    bm.faces.index_update()
    indices = [f.index for f in plate_faces]
    bm.to_mesh(ob.data)
    bm.free()
    return indices


def add_tail(ob, tail):
    """Adds a low-poly ball for a tail that the source mesh does not have, in the vertex group of
    the bone `tail1`. The bake gives it the colors of the fur behind it."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    deform = bm.verts.layers.deform.verify()
    group = ob.vertex_groups.new(name='tail1').index
    ball = bmesh.ops.create_icosphere(
        bm,
        subdivisions=1,
        radius=tail['radius'],
        matrix=Matrix.Translation(Vector(tail['center'])),
    )
    for vert in ball['verts']:
        vert[deform][group] = 1.0
    bm.to_mesh(ob.data)
    bm.free()


def edit_mode(ob, faces):
    """Enters the edit mode of an object with some faces selected."""
    bpy.ops.object.mode_set(mode='OBJECT')
    for poly in ob.data.polygons:
        poly.select = poly.index in faces
    bpy.ops.object.mode_set(mode='EDIT')


def unwrap(ob, face_faces):
    """Unwraps the mesh into a new UV layout `skin`, with more texels on the islands of the face,
    and adds a pinned face at the corner (0, 1) of the layout for the white texels. Gives the index
    of the pinned face."""
    layer = ob.data.uv_layers.new(name='skin')
    ob.data.uv_layers.active = layer
    for other in bpy.context.view_layer.objects:
        other.select_set(other == ob)
    bpy.context.view_layer.objects.active = ob
    every = set(range(len(ob.data.polygons)))
    edit_mode(ob, every)
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0, area_weight=0)
    bpy.ops.object.mode_set(mode='OBJECT')

    bm = bmesh.new()
    bm.from_mesh(ob.data)
    uv = bm.loops.layers.uv['skin']
    bm.faces.ensure_lookup_table()
    for island in uv_islands(bm, uv):
        if sum(f.index in face_faces for f in island) * 2 > len(island):
            loops = [loop for f in island for loop in f.loops]
            center = sum((loop[uv].uv for loop in loops), Vector((0, 0))) / len(loops)
            for loop in loops:
                loop[uv].uv = center + (loop[uv].uv - center) * FACE_SCALE

    # The white corner: a small square far from the body, pinned at the corner (0, 1).
    side = WHITE_TEXELS / SKIN_SIZE
    corners = [(0, 1 - side), (side, 1 - side), (side, 1), (0, 1)]
    verts = [bm.verts.new((10 + u, 0, 10 + v)) for u, v in corners]
    white = bm.faces.new(verts)
    for loop, at in zip(white.loops, corners):
        loop[uv].uv = at
        loop[uv].pin_uv = True
    bm.faces.index_update()
    white_index = white.index
    bm.to_mesh(ob.data)
    bm.free()

    # With the sync of the UV selection, the selected faces are the selected UV islands.
    bpy.context.scene.tool_settings.use_uv_select_sync = True
    edit_mode(ob, every | {white_index})
    bpy.ops.uv.pack_islands(
        rotate=True,
        scale=True,
        margin_method='FRACTION',
        margin=ISLAND_MARGIN / SKIN_SIZE,
        pin=True,
        pin_method='LOCKED',
    )
    bpy.ops.object.mode_set(mode='OBJECT')
    return white_index


def uv_islands(bm, uv):
    """Gives the UV islands of a mesh: the groups of faces that share an edge with the same UVs at
    its two ends."""
    parent = list(range(len(bm.faces)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for edge in bm.edges:
        if len(edge.link_loops) != 2:
            continue
        a, b = edge.link_loops
        # The loops of the two faces run the edge in opposite directions.
        same = (a[uv].uv - b.link_loop_next[uv].uv).length < 1e-6 and (
            a.link_loop_next[uv].uv - b[uv].uv
        ).length < 1e-6
        if same:
            parent[find(a.face.index)] = find(b.face.index)
    groups = {}
    for face in bm.faces:
        groups.setdefault(find(face.index), []).append(face)
    return list(groups.values())


def new_material(name):
    """Creates a material with an empty node tree."""
    material = bpy.data.materials.new(name)
    if material.node_tree is None:
        material.use_nodes = True
    material.node_tree.nodes.clear()
    return material


def source_texture(source):
    """Gives the base color texture of the source mesh."""
    material = source.material_slots[0].material
    bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    return bsdf.inputs['Base Color'].links[0].from_node.image


def emit_texture(source, texture):
    """Gives the source mesh a material that emits the color of a texture, so that the bake copies
    the texture with no light. A glTF material with no metal value is a metal, and a metal has no
    diffuse color."""
    material = new_material('emit')
    nodes = material.node_tree.nodes
    image = nodes.new('ShaderNodeTexImage')
    image.image = texture
    coords = nodes.new('ShaderNodeUVMap')
    coords.uv_map = source.data.uv_layers.active.name
    emission = nodes.new('ShaderNodeEmission')
    output = nodes.new('ShaderNodeOutputMaterial')
    links = material.node_tree.links
    links.new(coords.outputs['UV'], image.inputs['Vector'])
    links.new(image.outputs['Color'], emission.inputs['Color'])
    links.new(emission.outputs['Emission'], output.inputs['Surface'])
    source.data.materials.clear()
    source.data.materials.append(material)


def image_of(name, rows):
    """Creates a Blender image from an array of rows of sRGB values, from the bottom row."""
    height, width, _ = rows.shape
    image = bpy.data.images.new(name, width, height, alpha=False)
    rgba = np.ones((height, width, 4), np.float32)
    rgba[:, :, :3] = rows
    image.pixels.foreach_set(rgba.ravel())
    return image


def triangle_texels(uvs, size):
    """Gives the texels of a UV triangle in an image of a size, and the barycentric weights of
    their middles. A texel on the edge counts, so that the filter of the image reads no other
    color there."""
    at = np.array(uvs) * size
    lo = np.floor(at.min(axis=0)).astype(int) - 1
    hi = np.ceil(at.max(axis=0)).astype(int) + 1
    xs, ys = np.meshgrid(np.arange(lo[0], hi[0] + 1), np.arange(lo[1], hi[1] + 1))
    middles = np.stack([xs.ravel() + 0.5, ys.ravel() + 0.5], axis=1)
    edges = np.array([at[1] - at[0], at[2] - at[0]]).T
    if abs(np.linalg.det(edges)) < 1e-12:
        return np.zeros((0, 2), int), np.zeros((0, 3))
    st = np.linalg.solve(edges, (middles - at[0]).T).T
    bary = np.column_stack([1 - st.sum(axis=1), st])
    # A tolerance of one texel along the shortest height of the triangle.
    tolerance = 1.5 / max(1.0, min(np.linalg.norm(edges, axis=0)))
    hit = (bary > -tolerance).all(axis=1)
    cells = np.column_stack([xs.ravel(), ys.ravel()])[hit]
    inside_image = ((cells >= 0) & (cells < size)).all(axis=1)
    return cells[inside_image], bary[hit][inside_image]


def without_eyes(source, rows, eyes):
    """Gives a copy of the texture of the source mesh with the fur color around each eye on the
    texels of the eye, so that the skin under a plate shows fur when the eye closes."""
    out = rows.copy()
    height, width, _ = rows.shape
    uv = source.data.uv_layers.active.data
    for eye in eyes.values():
        across, up = eye_frame(eye['normal'])
        reach = PAINT_MARGIN * 2 * max(eye['halfWidth'], eye['halfHeight'])
        for poly in source.data.polygons:
            if np.linalg.norm(np.array(poly.center[:]) - eye['middle']) > reach:
                continue
            corners = np.array([source.data.vertices[i].co[:] for i in poly.vertices])
            cells, bary = triangle_texels([uv[i].uv[:] for i in poly.loop_indices], width)
            points = bary @ corners - eye['middle']
            radius = np.hypot((points @ across) / eye['halfWidth'], (points @ up) / eye['halfHeight'])
            under = cells[radius < PAINT_MARGIN]
            out[np.clip(under[:, 1], 0, height - 1), under[:, 0]] = eye['fur']
    return out


def bake_pass(target, source, texture, fill):
    """Bakes a texture of the source mesh onto the UV layout `skin` of the target, and gives the
    texels as an array of rows of sRGB values, from the bottom row. The texels outside the islands
    keep the fill color, so that the smaller mipmap levels of the app show no dark seams."""
    emit_texture(source, texture)
    image = image_of('skin', np.broadcast_to(fill, (SKIN_SIZE, SKIN_SIZE, 3)))
    material = new_material('skin')
    node = material.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = image
    material.node_tree.nodes.active = node
    target.data.materials.clear()
    target.data.materials.append(material)

    for other in bpy.context.view_layer.objects:
        other.select_set(other in (target, source))
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.bake(
        type='EMIT',
        use_selected_to_active=True,
        cage_extrusion=CAGE_EXTRUSION,
        max_ray_distance=MAX_RAY,
        margin=ISLAND_MARGIN,
        margin_type='EXTEND',
        uv_layer='skin',
        use_clear=False,
    )
    pixels = np.empty(SKIN_SIZE * SKIN_SIZE * 4, np.float32)
    image.pixels.foreach_get(pixels)
    return image, pixels.reshape(SKIN_SIZE, SKIN_SIZE, 4)[:, :, :3].copy()


def bake(target, source, eyes, fill):
    """Bakes the skin: the body from the texture with no eyes, and the plates from the texture.
    Gives the image and its texels."""
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = BAKE_SAMPLES
    texture = source_texture(source)
    rows = np.empty(texture.size[0] * texture.size[1] * 4, np.float32)
    texture.pixels.foreach_get(rows)
    rows = rows.reshape(texture.size[1], texture.size[0], 4)[:, :, :3]
    painted = image_of('no-eyes', without_eyes(source, rows, eyes))

    image, texels = bake_pass(target, source, painted, fill)
    _, with_eyes = bake_pass(target, source, texture, fill)
    uv = target.data.uv_layers['skin'].data
    eye_groups = {target.vertex_groups[bone].index for bone in eyes}
    for poly in target.data.polygons:
        groups = {g.group for i in poly.vertices for g in target.data.vertices[i].groups}
        if groups and groups <= eye_groups:
            cells, _ = triangle_texels([uv[i].uv[:] for i in poly.loop_indices], SKIN_SIZE)
            texels[cells[:, 1], cells[:, 0]] = with_eyes[cells[:, 1], cells[:, 0]]
    return image, texels


def oklab(rgb):
    """Converts sRGB values from 0 to 1 to Oklab: the lightness, then a and b."""
    linear = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    return np.cbrt(linear @ OKLAB_LMS.T) @ OKLAB_LAB.T


def srgb_of(lab):
    """Converts Oklab values back to sRGB values from 0 to 1."""
    linear = np.clip((lab @ np.linalg.inv(OKLAB_LAB).T) ** 3 @ np.linalg.inv(OKLAB_LMS).T, 0, 1)
    return np.where(linear <= 0.0031308, linear * 12.92, 1.055 * linear ** (1 / 2.4) - 0.055)


def palette_move(color, target):
    """Gives the move in Oklab from a color of the palette to its target: the change of the
    lightness, the log of the ratio of the chroma, and the turn of the hue."""
    source = oklab(color)
    goal = oklab(target)
    ratio = np.clip(np.hypot(*goal[1:]) / max(np.hypot(*source[1:]), 1e-4), 0.25, 4)
    turn = math.remainder(math.atan2(goal[2], goal[1]) - math.atan2(source[2], source[1]), 2 * math.pi)
    return np.array([goal[0] - source[0], math.log(ratio), turn])


def moved_colors(rgb, palette, targets):
    """Moves sRGB colors with the palette in Oklab. Each color takes the move of its nearest color
    of the palette, with a soft change between two of them. A color of the palette with no target
    has no move. The move is full near the palette and goes to 0 far from it, so that the white
    lights and the dark parts of the eyes keep their colors. Thus the shades stay, also on the
    light chest of a bear."""
    names = list(palette)
    sources = np.array([oklab(palette[name]) for name in names])
    moves = np.array(
        [palette_move(palette[n], srgb(targets[n])) if n in targets else np.zeros(3) for n in names]
    )
    lab = oklab(rgb)
    distance = ((lab[:, None, :] - sources[None, :, :]) ** 2).sum(axis=2)
    nearest = distance.min(axis=1, keepdims=True)
    share = np.exp(-(distance - nearest) / SHIFT_MIX**2)
    share /= share.sum(axis=1, keepdims=True)
    strength = np.exp(-((nearest[:, 0] / SHIFT_REACH**2) ** 2))
    move = strength[:, None] * (share @ moves)

    chroma = np.hypot(lab[:, 1], lab[:, 2]) * np.exp(move[:, 1])
    hue = np.arctan2(lab[:, 2], lab[:, 1]) + move[:, 2]
    shifted = np.stack([lab[:, 0] + move[:, 0], chroma * np.cos(hue), chroma * np.sin(hue)], axis=1)
    return np.clip(srgb_of(shifted), 0, 1)


def shift_colors(texels, palette, targets):
    """Moves the colors of the skin with the palette (`moved_colors()`).

    Raises SystemExit if a color of the palette does not land within 2 / 255 of its target."""
    for name, target in targets.items():
        landed = moved_colors(palette[name][None, :], palette, targets)[0]
        if np.abs(landed - srgb(target)).max() > 2 / 255:
            raise SystemExit(f'The {name} color moves to {landed * 255}, not to {target}.')
    flat = texels.reshape(-1, 3)
    flat[:] = moved_colors(flat, palette, targets)


def save_skin(image, texels, path):
    """Writes the texels into the image, with the white corner, and saves it as WebP."""
    side = WHITE_TEXELS
    texels[SKIN_SIZE - side :, :side] = 1.0
    rgba = np.ones((SKIN_SIZE, SKIN_SIZE, 4), np.float32)
    rgba[:, :, :3] = texels
    image.pixels.foreach_set(rgba.ravel())
    scene = bpy.context.scene
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.quality = 90
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    image.save_render(path, scene=scene)


def player_weights(ob, joints, extras):
    """Gives the weights of each vertex on the bones of the player, the two largest first."""
    names = {g.index: g.name for g in ob.vertex_groups}
    missing = sorted(set(names.values()) - set(joints))
    if missing:
        raise SystemExit(f'The config maps no bone of the player to the joints {missing}.')

    out = []
    for v in ob.data.vertices:
        weights = {}
        for g in v.groups:
            bone = joints[names[g.group]]
            weights[bone] = weights.get(bone, 0.0) + g.weight
        for extra in extras:
            head = Vector(extra['head'])
            axis = (Vector(extra['tail']) - head).normalized()
            along = (v.co - head).dot(axis)
            side = extra.get('side')
            if along <= 0 or (side and v.co.x * side <= 0) or (v.co - head).length > extra['reach']:
                continue
            taken = weights.get(extra['takes'], 0.0) * min(1.0, along / extra['ramp'])
            if taken > 0:
                weights[extra['takes']] -= taken
                weights[extra['bone']] = weights.get(extra['bone'], 0.0) + taken
        pairs = sorted(((w, b) for b, w in weights.items() if w > 1e-4), reverse=True)
        pairs = pairs[:BONES_PER_VERTEX]
        if not pairs:
            raise SystemExit(f'The vertex {v.index} has no weight.')
        total = sum(w for w, _ in pairs)
        out.append([[b, round(w / total, 6)] for w, b in pairs])
    return out


def bone_heads(heads, joints, extras):
    """Gives the head of each bone of the player: the head of the first source joint that maps
    onto it, or the head of the extra bone."""
    out = {}
    for joint, bone in joints.items():
        if bone not in out:
            if joint not in heads:
                raise SystemExit(f'The source skeleton has no joint "{joint}".')
            out[bone] = [round(c, 6) for c in heads[joint]]
    for extra in extras:
        out[extra['bone']] = extra['head']
    return out


def remove_face(ob, index):
    """Removes one face and its vertices from a mesh."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    face = bm.faces[index]
    verts = list(face.verts)
    bm.faces.remove(face)
    for vert in verts:
        if not vert.link_faces:
            bm.verts.remove(vert)
    bm.to_mesh(ob.data)
    bm.free()


def main():
    config_path, out_path = args()
    with open(config_path) as f:
        config = json.load(f)
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    rules = config['colors']
    palette = {name: srgb(color) for name, color in rules['palette'].items()}

    ob, heads = load(os.path.join(root, config['source']))
    image = base_color_image(ob)
    colors = face_colors(ob, image)
    nose = nose_tip(ob, colors, rules, palette)
    eyes = mirrored_eyes(
        measure_eye(ob, image, rules, palette, 1), measure_eye(ob, image, rules, palette, -1)
    )
    source_faces = len(ob.data.polygons)

    source = ob.copy()
    source.data = ob.data.copy()
    bpy.context.scene.collection.objects.link(source)
    collapse(ob, config['triangles'])
    body_faces = len(ob.data.polygons)

    face_middle = (eyes['eyeL']['middle'] + eyes['eyeR']['middle'] + np.array(nose[:])) / 3
    face_reach = 1.6 * max(
        np.linalg.norm(eyes['eyeL']['middle'] - face_middle),
        np.linalg.norm(np.array(nose[:]) - face_middle),
    )
    plates = set(add_plates(ob, eyes))
    if 'tail' in config:
        add_tail(ob, config['tail'])
    face_faces = {
        p.index
        for p in ob.data.polygons
        if p.index in plates or np.linalg.norm(np.array(p.center[:]) - face_middle) < face_reach
    }
    white = unwrap(ob, face_faces)
    skin_image, texels = bake(ob, source, eyes, palette['fur'])
    shift_colors(texels, palette, config.get('targets', {}))
    skin_path = os.path.join(os.path.dirname(os.path.abspath(out_path)), 'skin.webp')
    save_skin(skin_image, texels, skin_path)
    remove_face(ob, white)

    joints = dict(config['joints'], eyeL='eyeL', eyeR='eyeR', tail1='tail1')
    weights = player_weights(ob, joints, config['extraBones'])
    uv = ob.data.uv_layers['skin'].data
    out = {
        'source': config['source'],
        'sourceFaces': source_faces,
        'floor': min(v.co.z for v in source.data.vertices),
        'top': max(v.co.z for v in source.data.vertices),
        'vertices': [[round(c, 6) for c in v.co] for v in ob.data.vertices],
        'faces': [list(p.vertices) for p in ob.data.polygons],
        'uvs': [[[round(c, 6) for c in uv[i].uv] for i in p.loop_indices] for p in ob.data.polygons],
        'weights': weights,
        'heads': bone_heads(heads, config['joints'], config['extraBones']),
        'eyes': {
            bone: {
                'middle': eye['middle'].tolist(),
                'normal': eye['normal'].tolist(),
                'radius': max(eye['halfWidth'], eye['halfHeight']),
            }
            for bone, eye in eyes.items()
        },
        'nose': nose[:],
    }
    with open(out_path, 'w') as f:
        json.dump(out, f)
    used = sorted({pair[0] for pairs in weights for pair in pairs})
    print(
        f'rig_body: {source_faces} -> {body_faces} faces and {len(plates)} plate faces, '
        f'eye {eyes["eyeL"]["halfWidth"]:.4f} x {eyes["eyeL"]["halfHeight"]:.4f} m, '
        f'skin {skin_path}, bones {used}'
    )


if __name__ == '__main__':
    main()
