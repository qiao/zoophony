"""Rigs a textured mesh with no skeleton into the GLB format of a studio body (design 4.4).

    blender -b --factory-startup --python tools/blender/rig_mesh.py -- <config.json> <out.glb> \
        [--preview <dir>] [--obj <file>]

`pnpm rig-mesh <animal>` runs this script with `tools/mesh-rigs/<animal>.json`. The output has
the format of `lowpoly-studio/animals/<animal>/out/<animal>.glb`, so that `pnpm studio-body`
reads it (route 3 of `AGENTS.md`). The steps:

1. Import the source GLB file, weld the corners, and scale the mesh to 1 unit from the soles to
   the top, with the soles at y = 0. The math uses the axes of the studio: y up, +z forward, and
   +x the left side of the animal.
2. Give each face one color from the base color texture. A face of an eye keeps its dark color.
3. Build the skeleton of the 30 body bones of the studio at the joints of the config, with the
   optional bone `tail_tip` for a tail of two bones, and give the weights with bone heat. Then the
   rules of the config: the free arm, the clavicles below the shoulders and the arms up the neck,
   the paw, the head and the shoulders, the ears, the tail (a ball on one tail bone, or a ramp
   along a tail of two bones), the haunch, one set of weights for the corners of each short thin
   face, and the weights of the line for the middle corner of each long thin face. Each vertex
   keeps four bones, in steps of 1/255.
4. Make the upper arm and the forearm longer by the arm factor of the config, and the thigh and
   the shin by the leg factor. Each bone scales along its axis, and the weights blend the stretch
   to 0 at the shoulder and at the hip. The paws and the feet keep their size, and the body rises
   so that the soles stay at y = 0. The head and the ears grow by the head factor around the neck
   joint, and the weights blend the growth over the neck.
5. Change the faces of the arms so that they bend at the joints: a ring of new vertices at each
   joint of the config splits the faces that it crosses, and the long edge of a face that is
   thin in the seated bind pose flips. Each face then takes its color from the texture again.
6. Pose the skeleton in the seated bind pose: the legs turn by the seat of the config, the arms
   go to the bind arms of the studio, and the bones of a tail of two bones go to the bind
   directions of the config, back through the open back of the chair. The skin of the
   long-armed source in this pose is the bind mesh. Where the pose turns faces over, as at the
   haunch, their vertices relax toward their neighbors.
7. Put a gloss shell over each eye: a fan from the middle of the eye to the edge of its dark
   faces, a little out of the surface. The faces under it take the fur color, so that a blink
   shows no hole. The faces of the nose become gloss. Each face takes the nearest color of a
   palette in Oklab, and the faces go in the order of a walk over their shared edges.
8. Find the corrective shapes: the move of each vertex in the bind pose that the skin of the clip
   `reference` takes to the source place. The arm vertices give `arm_down_L` and `arm_down_R`,
   and the other vertices give `legs_straight_L` and `legs_straight_R`.
9. Write the GLB file with the code of this script: the materials `fur`, `gloss`, and `chair`,
   the skinned mesh with its morph targets, the skeleton, the clip `reference` with one key, and
   a chair under the seated body. The bytes depend only on the config and the source file.

With `--preview`, the script also renders the seated bind and the standing body from four sides,
the knees of the seated body from the side, and the main bone of each face, and it writes the
long-armed source as `source-long-arms.obj` for the probes of `docs/research/`. With `--obj`, it
writes only the long-armed source, into the file, for `pnpm rig-mesh --check`.
"""

import colorsys
import json
import math
import os
import struct
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

#: The body bones of a studio body, in parent order (`STUDIO_BONES` of
#: `src/models/studio-format.ts`, with no eye bones).
BONES = (
    'root', 'hips', 'spine', 'spine1', 'chest', 'neck', 'head', 'ear_L', 'ear_R',
    'clavicle_L', 'upper_arm_L', 'forearm_L', 'forearm_twist_L', 'hand_L', 'fingers_L',
    'clavicle_R', 'upper_arm_R', 'forearm_R', 'forearm_twist_R', 'hand_R', 'fingers_R',
    'thigh_L', 'shin_L', 'foot_L', 'toes_L', 'thigh_R', 'shin_R', 'foot_R', 'toes_R', 'tail',
)

#: The optional bone of a tail of two bones (`OPTIONAL_STUDIO_BONES` of
#: `src/models/studio-format.ts`). A config with a joint `tail_tip` adds it after the body bones.
TAIL_TIP = 'tail_tip'

#: The parent of each body bone (`STUDIO_PARENTS` of `src/models/studio-format.ts`).
PARENTS = {
    'root': None, 'hips': 'root', 'spine': 'hips', 'spine1': 'spine', 'chest': 'spine1',
    'neck': 'chest', 'head': 'neck', 'ear_L': 'head', 'ear_R': 'head', 'clavicle_L': 'chest',
    'upper_arm_L': 'clavicle_L', 'forearm_L': 'upper_arm_L', 'forearm_twist_L': 'forearm_L',
    'hand_L': 'forearm_twist_L', 'fingers_L': 'hand_L', 'clavicle_R': 'chest',
    'upper_arm_R': 'clavicle_R', 'forearm_R': 'upper_arm_R', 'forearm_twist_R': 'forearm_R',
    'hand_R': 'forearm_twist_R', 'fingers_R': 'hand_R', 'thigh_L': 'hips', 'shin_L': 'thigh_L',
    'foot_L': 'shin_L', 'toes_L': 'foot_L', 'thigh_R': 'hips', 'shin_R': 'thigh_R',
    'foot_R': 'shin_R', 'toes_R': 'foot_R', 'tail': 'hips', TAIL_TIP: 'tail',
}

#: The arm bones of each side, from the shoulder out. The clavicle does not move.
ARM = ('upper_arm', 'forearm', 'forearm_twist', 'hand', 'fingers')

#: The leg bones of each side, from the hips down.
LEG = ('thigh', 'shin', 'foot', 'toes')

#: The largest number of bones of a vertex, and the steps of a weight (design 4.4).
INFLUENCES = 4
WEIGHT_STEPS = 255

#: The corrective shapes, in their order in the mesh (`tools/studio-body.ts`).
SHAPES = ('arm_down_L', 'arm_down_R', 'legs_straight_L', 'legs_straight_R')

#: The roughness of each material, as the materials of the studio rabbit.
MATERIALS = (('chair', 0.6), ('fur', 0.7), ('gloss', 0.42))

#: The color of the chair, in sRGB.
CHAIR_COLOR = (0.55, 0.42, 0.3)

#: The size of one view of a preview, in pixels.
VIEW = 500


def log(text):
    """Prints a line that `tools/rig-mesh.ts` shows."""
    print(f'rig_mesh: {text}', flush=True)


def args():
    """Reads the config path, the output path, the preview folder, and the OBJ file after `--`."""
    rest = sys.argv[sys.argv.index('--') + 1 :]
    options = {'--preview': None, '--obj': None}
    for flag in options:
        if flag in rest:
            at = rest.index(flag)
            options[flag] = rest[at + 1]
            rest = rest[:at] + rest[at + 2 :]
    if len(rest) != 2:
        raise SystemExit('Usage: blender -b --python rig_mesh.py -- <config> <out.glb> '
                         '[--preview <dir>] [--obj <file>]')
    return rest[0], rest[1], options['--preview'], options['--obj']


def to_blender(v):
    """Converts points from the axes of the studio (y up, z forward) to the axes of Blender."""
    v = np.asarray(v, float)
    return np.stack([v[..., 0], -v[..., 2], v[..., 1]], axis=-1)


def from_blender(v):
    """Converts points from the axes of Blender to the axes of the studio."""
    v = np.asarray(v, float)
    return np.stack([v[..., 0], v[..., 2], -v[..., 1]], axis=-1)


def unit(v):
    """Gives a vector of length 1 in the direction of a vector."""
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def smoothstep(x, low, high):
    """Gives 0 below `low`, 1 above `high`, and a smooth ramp between them, for arrays."""
    t = np.clip((np.asarray(x, float) - low) / (high - low), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def quat_matrix(q):
    """Gives the rotation matrix of a quaternion (x, y, z, w)."""
    x, y, z, w = unit(q)
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])


def matrix_quat(m):
    """Gives the quaternion (x, y, z, w) of a rotation matrix, with w >= 0."""
    t = np.trace(m)
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        q = [(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, 0.25 * s]
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = math.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        q = [0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s]
    elif m[1, 1] > m[2, 2]:
        s = math.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        q = [(m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s]
    else:
        s = math.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        q = [(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s, (m[1, 0] - m[0, 1]) / s]
    q = unit(q)
    return q if q[3] >= 0 else -q


def swing(a, b):
    """Gives the smallest rotation matrix that turns the unit vector `a` onto the unit vector `b`."""
    a, b = unit(a), unit(b)
    axis = np.cross(a, b)
    s = np.linalg.norm(axis)
    c = float(np.dot(a, b))
    if s < 1e-9:
        return np.eye(3)
    k = axis / s
    kx = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + s * kx + (1 - c) * kx @ kx


def mirror_name(name):
    """Gives the name of the bone on the other side, or the name of a bone of the middle."""
    if name.endswith('_L'):
        return name[:-2] + '_R'
    if name.endswith('_R'):
        return name[:-2] + '_L'
    return name


def mirrored(v):
    """Mirrors a point or a direction to the other side of the middle plane."""
    return np.array([-v[0], v[1], v[2]], float)


def load_mesh(config):
    """Imports the source GLB file, welds the corners, and gives the vertices (axes of the studio,
    1 unit high, soles at y = 0), the triangles, the UV of each corner, the base color texture,
    and the scale from the units of the file."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=config['source'])
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if len(meshes) != 1:
        raise SystemExit(f"{config['source']} has {len(meshes)} meshes, not 1.")
    ob = meshes[0]
    material = ob.material_slots[0].material
    bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    image = bsdf.inputs['Base Color'].links[0].from_node.image
    width, height = image.size
    pixels = np.empty(width * height * 4, np.float32)
    image.pixels.foreach_get(pixels)
    texture = pixels.reshape(height, width, 4)[:, :, :3]

    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.transform(ob.matrix_world)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=config['weld'])
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    uv_layer = bm.loops.layers.uv.active
    verts = from_blender(np.array([v.co[:] for v in bm.verts]))
    tris = np.array([[v.index for v in f.verts] for f in bm.faces], np.int64)
    uvs = np.array([[loop[uv_layer].uv[:] for loop in f.loops] for f in bm.faces])
    bm.free()
    # The scene keeps only the objects of the rig and of the previews.
    for o in list(bpy.context.scene.objects):
        bpy.data.objects.remove(o)
    floor, top = verts[:, 1].min(), verts[:, 1].max()
    scale = 1.0 / (top - floor)
    verts = (verts - [0.0, floor, 0.0]) * scale
    log(f'source: {len(verts)} vertices, {len(tris)} triangles, scale {scale:.6f}')
    return verts, tris, uvs, texture


def linear(srgb):
    """Converts sRGB values from 0 to 1 to linear values."""
    srgb = np.asarray(srgb, float)
    return np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)


def face_colors(tris, uvs, texture, rules):
    """Gives the sRGB color of each face, and a flag for each dark face. A face with a share of
    dark samples of at least `eyeShare` is dark, and takes the mean of its dark samples. Each
    other face takes the mean of its samples that are not dark, so that the black gaps between
    the islands of the texture do not darken a face at the edge of an island."""
    n = rules['samples']
    grid = np.array([(i / n, j / n, (n - i - j) / n) for i in range(n + 1) for j in range(n + 1 - i)])
    height, width, _ = texture.shape
    colors = np.zeros((len(tris), 3))
    dark = np.zeros(len(tris), bool)
    for f in range(len(tris)):
        at = grid @ uvs[f]
        x = np.clip(((at[:, 0] % 1.0) * width).astype(int), 0, width - 1)
        y = np.clip(((at[:, 1] % 1.0) * height).astype(int), 0, height - 1)
        samples = texture[y, x]
        lum = linear(samples) @ [0.2126, 0.7152, 0.0722]
        low = lum < rules['dark']
        if low.mean() >= rules['eyeShare']:
            dark[f] = True
            colors[f] = samples[low].mean(axis=0)
        else:
            colors[f] = samples[~low].mean(axis=0)
    return colors, dark


def oklab(srgb):
    """Converts sRGB colors from 0 to 1 to Oklab (Björn Ottosson, 2020)."""
    rgb = linear(srgb)
    lms = rgb @ np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                          [0.2119034982, 0.6806995451, 0.1073969566],
                          [0.0883024619, 0.2817188376, 0.6299787005]]).T
    return np.cbrt(lms) @ np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                                    [1.9779984951, -2.4285922050, 0.4505937099],
                                    [0.0259040371, 0.7827717662, -0.8086757660]]).T


def srgb_of_oklab(lab):
    """Converts Oklab colors back to sRGB colors from 0 to 1."""
    lms = lab @ np.array([[1.0, 0.3963377774, 0.2158037573],
                          [1.0, -0.1055613458, -0.0638541728],
                          [1.0, -0.0894841775, -1.2914855480]]).T
    rgb = (lms ** 3) @ np.array([[4.0767416621, -3.3077115913, 0.2309699292],
                                 [-1.2684380046, 2.6097574011, -0.3413193965],
                                 [-0.0041960863, -0.7034186147, 1.7076147010]]).T
    rgb = np.clip(rgb, 0.0, 1.0)
    return np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * rgb ** (1 / 2.4) - 0.055)


def palette(colors, size, rounds=40):
    """Gives each face a color of a palette of at most `size` colors: k-means in Oklab, a uniform
    color space, so that a step of the palette looks the same in each hue. The first centers are
    the farthest colors from each other, so that the small features (the eyes, the nose, the
    inner ears, the whiskers) get centers of their own. Gives the new sRGB colors and the largest
    and the mean Oklab distance of a face from its palette color."""
    lab = oklab(colors)
    centers = [lab[int(np.argmin(np.linalg.norm(lab - lab.mean(axis=0), axis=1)))]]
    near = np.linalg.norm(lab - centers[0], axis=1)
    while len(centers) < min(size, len(lab)):
        centers.append(lab[int(np.argmax(near))])
        near = np.minimum(near, np.linalg.norm(lab - centers[-1], axis=1))
    centers = np.array(centers)
    for _ in range(rounds):
        label = np.argmin(np.linalg.norm(lab[:, None] - centers[None], axis=2), axis=1)
        for k in range(len(centers)):
            if (label == k).any():
                centers[k] = lab[label == k].mean(axis=0)
    label = np.argmin(np.linalg.norm(lab[:, None] - centers[None], axis=2), axis=1)
    error = np.linalg.norm(lab - centers[label], axis=1)
    return srgb_of_oklab(centers)[label], float(error.max()), float(error.mean())


def locality_order(tris):
    """Gives an order of the faces in which each face follows a neighbor where it can: a walk
    from face to face over the shared edges, which goes back to the oldest face with a free
    neighbor when it stops. The export numbers the vertices in the order of their first face, so
    the packed corners and places of the app become small steps that pack well."""
    faces_of = {}
    for f, t in enumerate(tris):
        for k in range(3):
            faces_of.setdefault(tuple(sorted((int(t[k]), int(t[(k + 1) % 3])))), []).append(f)

    def free(f):
        t = tris[f]
        for k in (1, 2, 0):
            for g in faces_of[tuple(sorted((int(t[k]), int(t[(k + 1) % 3]))))]:
                if not seen[g]:
                    return g
        return None

    seen = np.zeros(len(tris), bool)
    order, oldest = [], 0
    for start in range(len(tris)):
        current = None if seen[start] else start
        while current is not None:
            seen[current] = True
            order.append(current)
            current = free(current)
            while current is None and oldest < len(order):
                current = free(order[oldest])
                if current is None:
                    oldest += 1
    return np.array(order)


def in_box(points, box):
    """Tells for each point if it is in a box of two corners."""
    lo, hi = np.asarray(box[0]), np.asarray(box[1])
    return np.all((points >= lo) & (points <= hi), axis=1)


def moved_boxes(rules, pivot, factor, rise):
    """Gives the color rules with the eye box and the nose box of the source moved with the head:
    each box grows by the head factor around the neck joint, then rises with the body. The
    vertices of the eyes and the nose follow the head only, so the faces in a box stay in it."""
    if factor == 1 and not rise:
        return rules
    out = dict(rules)
    for key in ('eyeBox', 'noseBox'):
        box = np.asarray(rules[key], float)
        out[key] = (pivot + factor * (box - pivot) + [0.0, rise, 0.0]).tolist()
    return out


def features(verts, tris, colors, dark, rules):
    """Finds the faces of the eyes, by side, and the faces of the nose."""
    centers = verts[tris].mean(axis=1)
    box = np.asarray(rules['eyeBox'], float)
    left = dark & in_box(centers, box)
    right_box = [[-box[1][0], box[0][1], box[0][2]], [-box[0][0], box[1][1], box[1][2]]]
    right = dark & in_box(centers, right_box)
    nose_color = np.asarray(rules['nose'], float)
    pink = np.linalg.norm(colors - nose_color, axis=1) < np.linalg.norm(colors - 1.0, axis=1)
    nose = pink & in_box(centers, rules['noseBox'])
    log(f'eyes: {left.sum()} faces left, {right.sum()} faces right, nose: {nose.sum()} faces')
    return {'L': np.nonzero(left)[0], 'R': np.nonzero(right)[0]}, np.nonzero(nose)[0]


def joints_of(config):
    """Gives the head, the tail, the roll hint, and the child at the tail (or `None` for a tail
    at a point of its own) of each body bone, in the pose of the source. The right side mirrors
    the left side of the config."""
    joints = config['joints']
    palm = unit(config['palm'])
    heads, ends, rolls, children = {}, {}, {}, {}
    specs = {}
    for name in BONES:
        own = name in joints
        spec = joints[name] if own else joints[mirror_name(name)]
        side = (lambda v: np.asarray(v, float)) if own else mirrored
        specs[name] = (spec, own, side)
        heads[name] = side(spec['head'])
        roll = spec.get('roll', [0, 0, 1])
        rolls[name] = side(palm if roll == 'palm' else roll)
    for name in BONES:
        spec, own, side = specs[name]
        tail = spec['tail']
        if isinstance(tail, str):
            children[name] = tail if own else mirror_name(tail)
            ends[name] = heads[children[name]]
        else:
            children[name] = None
            ends[name] = side(tail)
    return heads, ends, rolls, children


def frame(head, tail, roll):
    """Gives the rotation of a bone frame: y along the bone, z toward the roll hint, x = y × z."""
    y = unit(np.asarray(tail) - head)
    z = np.asarray(roll, float) - np.dot(roll, y) * y
    z = unit(z)
    return np.stack([np.cross(y, z), y, z], axis=1)


def bone_heat(verts, tris, heads, ends, rolls):
    """Gives the weights of each vertex on the body bones with the bone heat of Blender. The root
    does not deform. A vertex that bone heat leaves with no weight takes the nearest bone."""
    mesh = bpy.data.meshes.new('heat')
    mesh.from_pydata(to_blender(verts).tolist(), [], tris.tolist())
    mesh.update()
    ob = bpy.data.objects.new('heat', mesh)
    bpy.context.scene.collection.objects.link(ob)
    arm_data = bpy.data.armatures.new('heat_rig')
    rig = bpy.data.objects.new('heat_rig', arm_data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for name in BONES:
        bone = arm_data.edit_bones.new(name)
        bone.head = to_blender(heads[name]).tolist()
        bone.tail = to_blender(ends[name]).tolist()
        bone.align_roll(to_blender(rolls[name]).tolist())
        bone.use_deform = name != 'root'
    for name in BONES:
        if PARENTS[name]:
            arm_data.edit_bones[name].parent = arm_data.edit_bones[PARENTS[name]]
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in bpy.context.scene.objects:
        o.select_set(o in (ob, rig))
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    weights = np.zeros((len(verts), len(BONES)))
    index = {g.index: BONES.index(g.name) for g in ob.vertex_groups}
    for v in ob.data.vertices:
        for g in v.groups:
            weights[v.index, index[g.group]] += g.weight
    empty = weights.sum(axis=1) <= 1e-6
    if empty.any():
        for v in np.nonzero(empty)[0]:
            weights[v, nearest_bone(verts[v], heads, ends)] = 1.0
    log(f'bone heat: {int(empty.sum())} vertices with no weight took the nearest bone')
    bpy.data.objects.remove(ob)
    bpy.data.objects.remove(rig)
    return weights


def nearest_bone(p, heads, ends):
    """Gives the index of the deforming bone whose segment is nearest to a point."""
    best, found = math.inf, 1
    for k, name in enumerate(BONES[1:], 1):
        a, b = heads[name], ends[name]
        t = np.clip(np.dot(p - a, b - a) / max(np.dot(b - a, b - a), 1e-12), 0, 1)
        d = np.linalg.norm(p - (a + t * (b - a)))
        if d < best:
            best, found = d, k
    return found


def free_arm(verts, tris, split, tip, sign):
    """Finds the vertices of the free arm of one side: the part of the mesh beyond the plane
    |x| = split that holds the vertex nearest to the finger tip. The haunch beside the body is
    beyond that plane too, and it is not a part of the arm."""
    beyond = verts[:, 0] * sign > split
    neighbors = [[] for _ in range(len(verts))]
    for t in tris:
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            if beyond[a] and beyond[b]:
                neighbors[a].append(b)
                neighbors[b].append(a)
    start = int(np.argmin(np.linalg.norm(verts - tip, axis=1)))
    seen = {start}
    stack = [start]
    while stack:
        for n in neighbors[stack.pop()]:
            if n not in seen:
                seen.add(n)
                stack.append(n)
    out = np.zeros(len(verts), bool)
    out[sorted(seen)] = True
    return out


def polyline_place(points, line):
    """Gives for each point its place along a line of segments, as the length from the start of
    the line to the nearest point of the line, and its distance from that point."""
    best = np.full(len(points), np.inf)
    place = np.zeros(len(points))
    start = 0.0
    for a, b in zip(line, line[1:]):
        d = b - a
        length = float(np.linalg.norm(d))
        t = np.clip((points - a) @ d / (length * length), 0.0, 1.0)
        gap = np.linalg.norm(points - (a + t[:, None] * d), axis=1)
        near = gap < best
        best[near] = gap[near]
        place[near] = start + t[near] * length
        start += length
    return place, best


def tail_weights(verts, tris, w, rule, heads, ends):
    """Gives a tail of two bones smooth weights along its line (design 4.4). The tail is the part
    of the mesh within `radius` of the line from the root over the bend to the tip, and behind the
    plane z = `behind`. Along the line, the share of the tail bones grows from 0 to 1 over the
    place range `root` (units from the root), and the share of the tip within the tail grows from
    0 to 1 over `bend` units on each side of the bend. Then the share of the tail bones takes the
    mean of its neighbors in `smooth` rounds, so that the root has no hard edge. No other vertex
    follows the tail bones."""
    col = {name: k for k, name in enumerate(BONES)}
    root, bend, tip = heads['tail'], heads[TAIL_TIP], ends[TAIL_TIP]
    place, gap = polyline_place(verts, [root, bend, tip])
    inside = (gap <= rule['radius']) & (verts[:, 2] <= rule['behind'])
    share = smoothstep(place, *rule['root']) * inside
    neighbors = [set() for _ in range(len(verts))]
    for a, b, c in tris:
        neighbors[a].update((b, c))
        neighbors[b].update((a, c))
        neighbors[c].update((a, b))
    neighbors = [np.array(sorted(n)) for n in neighbors]
    for _ in range(rule['smooth']):
        share = np.array([share[n].mean() for n in neighbors])
    first = float(np.linalg.norm(bend - root))
    tip_share = smoothstep(place, first - rule['bend'], first + rule['bend'])
    out = w.copy()
    out[:, col['hips']] += out[:, col['tail']] + out[:, col[TAIL_TIP]]
    out[:, col['tail']] = 0.0
    out[:, col[TAIL_TIP]] = 0.0
    out *= (1.0 - share)[:, None]
    out[:, col['tail']] = share * (1.0 - tip_share)
    out[:, col[TAIL_TIP]] = share * tip_share
    log(f'tail: {int(inside.sum())} vertices in the tail, {int((share > 0).sum())} with a tail '
        f'weight after {rule["smooth"]} rounds, the bend {first:.3f} u from the root')
    return out


def apply_rules(verts, tris, weights, rules, heads, ends):
    """Applies the weight rules of the config: the arms, the haunch on the hips, the tail, the ears
    on their bones, and the head only above the head line."""
    w = weights.copy()
    col = {name: k for k, name in enumerate(BONES)}
    y = verts[:, 1]

    # The arms: bone heat gives a part of the arm weight to the side of the trunk, where the arm
    # hangs near it. Beyond the plane of the split, only the free arm follows the arm bones. Inside
    # it, the shoulder follows the upper arm and no lower bone of the arm.
    trunk = [col[name] for name in ('hips', 'spine', 'spine1', 'chest')]
    split = rules['armSplit']
    for side, sign in (('L', 1.0), ('R', -1.0)):
        arm = [col[f'{bone}_{side}'] for bone in ARM]
        lower = arm[1:]
        free = free_arm(verts, tris, split, ends[f'fingers_{side}'], sign)
        beyond = verts[:, 0] * sign > split
        for v in np.nonzero(beyond & ~free)[0]:
            target = trunk[int(np.argmax(w[v, trunk]))] if w[v, trunk].any() else col['spine1']
            w[v, target] += w[v, arm].sum()
            w[v, arm] = 0.0
        inside = (verts[:, 0] * sign > 0) & ~beyond
        w[inside, col[f'upper_arm_{side}']] += w[inside][:, lower].sum(axis=1)
        for k in lower:
            w[inside, k] = 0.0

    # The chest below the clavicles: the clavicle weight fades out downward, so that the turn of
    # a shoulder does not shear the faces of the chest.
    if 'clavicleFrom' in rules:
        keep = smoothstep(y, *rules['clavicleFrom'])
        for side in 'LR':
            taken = w[:, col[f'clavicle_{side}']] * (1.0 - keep)
            w[:, col[f'clavicle_{side}']] -= taken
            w[:, col['chest']] += taken

    # The neck above the shoulders: the weight of the clavicles and of the upper arms fades out
    # upward, so that a raised arm does not drag the side of the neck and the jaw.
    if 'armTop' in rules:
        keep = 1.0 - smoothstep(y, *rules['armTop'])
        for side in 'LR':
            for bone in ('clavicle', 'upper_arm'):
                taken = w[:, col[f'{bone}_{side}']] * (1.0 - keep)
                w[:, col[f'{bone}_{side}']] -= taken
                w[:, col['neck']] += taken

    # The paw: the fingers keep a share of their weight, and the hand takes the rest.
    for side in 'LR':
        moved = w[:, col[f'fingers_{side}']] * (1.0 - rules['fingers'])
        w[:, col[f'fingers_{side}']] -= moved
        w[:, col[f'hand_{side}']] += moved

    # The haunch: the thigh weight above the leg goes to the hips.
    share = smoothstep(y, *rules['haunch']['height'])
    for side in 'LR':
        taken = w[:, col[f'thigh_{side}']] * share
        w[:, col[f'thigh_{side}']] -= taken
        w[:, col['hips']] += taken

    if TAIL_TIP in BONES:
        w = tail_weights(verts, tris, w, rules['tail'], heads, ends)
    else:
        # The tail ball follows the tail only, and no other vertex follows the tail.
        ball = rules['tailBall']
        inside = np.linalg.norm(verts - ball['center'], axis=1) <= ball['radius']
        inside &= verts[:, 2] <= ball['behind']
        w[:, col['hips']] += np.where(inside, 0.0, w[:, col['tail']])
        w[:, col['tail']] = 0.0
        w[inside] = 0.0
        w[inside, col['tail']] = 1.0

    # The shoulders below the head line give the weight of the head to the neck, so that a turn
    # of the head does not pull them. The share grows from 0 at the smaller distance of
    # `shoulderHead` from the middle plane to all at the larger distance.
    if 'shoulderHead' in rules:
        share = smoothstep(np.abs(verts[:, 0]), *rules['shoulderHead']) * (y < rules['headFrom'])
        taken = w[:, col['head']] * share
        w[:, col['head']] -= taken
        w[:, col['neck']] += taken

    # The head: the eyes, the nose, and the whiskers follow the head only. Each ear follows its
    # ear bone above its base.
    above = y >= rules['headFrom']
    w[above] = 0.0
    w[above, col['head']] = 1.0
    ear = smoothstep(y, *rules['earBase'])
    for side, sign in (('L', 1.0), ('R', -1.0)):
        mine = above & (verts[:, 0] * sign > 0.01) & (ear > 0)
        w[mine, col[f'ear_{side}']] = ear[mine]
        w[mine, col['head']] = 1.0 - ear[mine]
    return w


def tail_mask(weights):
    """Tells for each vertex if a tail bone moves it."""
    mask = weights[:, BONES.index('tail')] > 0
    if TAIL_TIP in BONES:
        mask |= weights[:, BONES.index(TAIL_TIP)] > 0
    return mask


def min_angles(verts, tris):
    """Gives the smallest corner angle of each face, in degrees."""
    out = np.full(len(tris), 180.0)
    for k in range(3):
        a, b, c = verts[tris[:, k]], verts[tris[:, (k + 1) % 3]], verts[tris[:, (k + 2) % 3]]
        u, v = b - a, c - a
        cos = np.sum(u * v, axis=1) / np.maximum(
            np.linalg.norm(u, axis=1) * np.linalg.norm(v, axis=1), 1e-12)
        out = np.minimum(out, np.degrees(np.arccos(np.clip(cos, -1.0, 1.0))))
    return out


def rigid_slivers(verts, tris, weights, rules):
    """Gives the corners of each thin face of the source one set of weights: the mean of the
    weights of the thin faces that share corners. A thin face has a corner angle below `sliver`.
    Its corners lie almost on one line, so a small difference of their weights turns the face
    over when a joint bends. With one set of weights, the face moves rigidly. The vertices of the
    head, the ears, and the tail ball keep the weights of their rules."""
    limit_angle = rules['sliver']['angle']
    edges = np.stack([np.linalg.norm(verts[tris[:, k]] - verts[tris[:, (k + 1) % 3]], axis=1)
                      for k in range(3)], axis=1).max(axis=1)
    thin = np.nonzero((min_angles(verts, tris) < limit_angle)
                      & (edges < rules['sliver']['longest']))[0]
    keep = (verts[:, 1] >= rules['headFrom']) | tail_mask(weights)
    parent = list(range(len(verts)))

    def root(v):
        while parent[v] != v:
            parent[v] = parent[parent[v]]
            v = parent[v]
        return v

    for f in thin:
        corners = [int(v) for v in tris[f] if not keep[v]]
        for v in corners[1:]:
            ra, rb = root(corners[0]), root(v)
            if ra != rb:
                parent[max(ra, rb)] = min(ra, rb)
    groups = {}
    for v in sorted({int(v) for f in thin for v in tris[f] if not keep[v]}):
        groups.setdefault(root(v), []).append(v)
    out = weights.copy()
    sizes = []
    for members in groups.values():
        if len(members) < 2:
            continue
        out[members] = weights[members].mean(axis=0)
        sizes.append(len(members))
    log(f'slivers: {len(thin)} faces below {limit_angle}°, {len(sizes)} groups of '
        f'{sum(sizes)} vertices, the largest {max(sizes, default=0)}')
    return out


def straight_slivers(verts, tris, weights, rules):
    """Gives the middle corner of each long thin face the weights of the line between its two
    other corners: the mix of their weights by the place of the middle corner along that line. A
    thin face whose middle corner lags behind the line turns over when a joint bends across it,
    as the faces along the elbow do. A face is such a face when one corner angle is above `angle`.
    The vertices of the tail keep the weights of their rules. The vertices of the head and of the
    ears keep them too, unless the rule has `head`: a long thin face of the jaw then folds less
    when the head turns against the neck."""
    limit_angle = rules['line']['angle']
    keep = tail_mask(weights)
    if not rules['line'].get('head', False):
        keep |= verts[:, 1] >= rules['headFrom']
    out = weights.copy()
    moved = 0
    for t in tris:
        for k in range(3):
            m, a, b = int(t[k]), int(t[(k + 1) % 3]), int(t[(k + 2) % 3])
            u, v = verts[a] - verts[m], verts[b] - verts[m]
            cos = u.dot(v) / max(np.linalg.norm(u) * np.linalg.norm(v), 1e-12)
            if keep[m] or math.degrees(math.acos(max(-1.0, min(1.0, cos)))) <= limit_angle:
                continue
            line = verts[b] - verts[a]
            along = float(np.clip((verts[m] - verts[a]).dot(line) / line.dot(line), 0.0, 1.0))
            out[m] = (1 - along) * out[a] + along * out[b]
            moved += 1
    log(f'lines: {moved} middle corners of faces with a corner angle above {limit_angle}°')
    return out


def edge_faces(tris):
    """Gives the faces of each edge, by the sorted pair of its corners."""
    out = {}
    for f, t in enumerate(tris):
        for k in range(3):
            out.setdefault(tuple(sorted((int(t[k]), int(t[(k + 1) % 3])))), []).append(f)
    return out


def corner_angle(p, a, b):
    """Gives the angle at the point `p` between the points `a` and `b`, in degrees."""
    u, v = a - p, b - p
    cos = u.dot(v) / max(np.linalg.norm(u) * np.linalg.norm(v), 1e-12)
    return math.degrees(math.acos(max(-1.0, min(1.0, cos))))


def segment_gap(a, b, c, d):
    """Gives the smallest distance between the segments ab and cd."""
    u, v, w = b - a, d - c, a - c
    uu, uv, vv, uw, vw = u.dot(u), u.dot(v), v.dot(v), u.dot(w), v.dot(w)
    det = uu * vv - uv * uv
    s = np.clip((uv * vw - vv * uw) / det, 0.0, 1.0) if det > 1e-18 else 0.0
    t = np.clip((uv * s + vw) / vv, 0.0, 1.0)
    s = np.clip((uv * t - uw) / uu, 0.0, 1.0)
    return float(np.linalg.norm(a + s * u - (c + t * v)))


def arm_mask(weights):
    """Tells for each vertex if an arm bone of a side moves it."""
    arm = np.zeros(len(weights), bool)
    for side in 'LR':
        for bone in ARM:
            arm |= weights[:, BONES.index(f'{bone}_{side}')] > 0
    return arm


def flip_edges(verts, bind, tris, uvs, weights, rule):
    """Flips the long edge of each thin face of the arms in the seated bind pose: the edge across
    a corner angle above `angle` in the bind mesh goes to the corner of the face on its other
    side. The bind pose bends the elbows, so a face across an elbow is thin in the bind mesh only.
    A flip needs the two faces almost on one plane in the source and in the bind mesh (normals
    within `normals` degrees), a move of the surface of at most `move` units in both, the two new
    faces on the side of the old faces in both, and a larger smallest corner angle in the bind
    mesh. An edge on a seam of the texture does not flip. Gives the new triangles and corner UVs,
    the number of flips, and the largest move of the surface (at the crossing of the two
    diagonals)."""
    tris, uvs = tris.copy(), uvs.copy()
    arm = arm_mask(weights)
    flips, largest = 0, 0.0
    for _ in range(rule.get('rounds', 4)):
        changed = False
        faces_of = edge_faces(tris)
        done = set()
        for f in range(len(tris)):
            if f in done or not arm[tris[f]].all():
                continue
            t = tris[f]
            angles = [corner_angle(bind[t[k]], bind[t[(k + 1) % 3]], bind[t[(k + 2) % 3]])
                      for k in range(3)]
            k = int(np.argmax(angles))
            if angles[k] <= rule['angle']:
                continue
            m, a, b = int(t[k]), int(t[(k + 1) % 3]), int(t[(k + 2) % 3])
            others = [g for g in faces_of[tuple(sorted((a, b)))] if g != f]
            if len(others) != 1 or others[0] in done or not arm[tris[others[0]]].all():
                continue
            g = others[0]
            n = int(next(v for v in tris[g] if v not in (a, b)))
            uv_f = {int(v): uvs[f][j] for j, v in enumerate(t)}
            uv_g = {int(v): uvs[g][j] for j, v in enumerate(tris[g])}
            if any(np.abs(uv_f[v] - uv_g[v]).max() > 1e-6 for v in (a, b)):
                continue
            # The face f is (m, a, b) in its order, so the face g holds (b, a, n) in its order.
            new = np.array([[m, a, n], [m, n, b]])
            fits, gap = True, 0.0
            for points in (verts, bind):
                old_normals = face_normals(points, tris[[f, g]])
                cos = float(old_normals[0].dot(old_normals[1]))
                gap = max(gap, segment_gap(points[a], points[b], points[m], points[n]))
                fits &= math.degrees(math.acos(max(-1.0, min(1.0, cos)))) <= rule['normals']
                fits &= bool((face_normals(points, new) @ old_normals.sum(axis=0) > 0).all())
            if not fits or gap > rule['move']:
                continue
            if min_angles(bind, new).min() <= min_angles(bind, tris[[f, g]]).min():
                continue
            uv_g[m] = uv_f[m]
            tris[f], tris[g] = new
            uvs[f] = [uv_f[m], uv_f[a], uv_g[n]]
            uvs[g] = [uv_f[m], uv_g[n], uv_f[b]]
            done.update((f, g))
            flips += 1
            largest = max(largest, gap)
            changed = True
        if not changed:
            break
    return tris, uvs, flips, largest


def ring_cuts(verts, tris, weights, heads, ends, ring, side):
    """Finds the edges that a ring of one joint cuts: the plane through the joint, at right
    angles to the mean direction of the bone before it and the bone after it. An edge counts when
    both corners lie within `radius` of the joint, an arm bone of the side moves one corner, it is
    at least `minEdge` long, and the plane cuts it at least `ends` of its length from each
    corner. Gives the place of the cut along each edge, by the sorted pair of its corners."""
    joint = f"{ring['joint']}_{side}"
    parent = PARENTS[joint]
    point = heads[joint]
    normal = unit(unit(point - heads[parent]) + unit(ends[joint] - point))
    near = np.linalg.norm(verts - point, axis=1) <= ring['radius']
    arm = np.zeros(len(verts), bool)
    for bone in ARM:
        arm |= weights[:, BONES.index(f'{bone}_{side}')] > 0
    height = (verts - point) @ normal
    cuts = {}
    for a, b in edge_faces(tris):
        if not (near[a] and near[b] and (arm[a] or arm[b])) or height[a] * height[b] >= 0:
            continue
        if np.linalg.norm(verts[a] - verts[b]) < ring.get('minEdge', 0.0):
            continue
        t = height[a] / (height[a] - height[b])
        if ring.get('ends', 0.0) <= t <= 1.0 - ring.get('ends', 0.0):
            cuts[(a, b)] = float(t)
    return cuts


def split_faces(verts, tris, uvs, weights, cuts):
    """Splits each edge of `cuts` at its place, and each face with a cut edge into faces on its
    plane: two faces for one cut edge, three for two, and four for three. A new vertex takes the
    place, the UV of each face, and the weights of its place on the edge. A face keeps its index
    for its first part, and the other parts follow the faces. Gives the new vertices, triangles,
    corner UVs, and weights."""
    index = {}
    new_verts, new_weights = [verts], [weights]
    for (a, b), t in sorted(cuts.items()):
        index[(a, b)] = len(verts) + len(index)
        new_verts.append([(1 - t) * verts[a] + t * verts[b]])
        new_weights.append([(1 - t) * weights[a] + t * weights[b]])
    out_tris, out_uvs, extra_tris, extra_uvs = [], [], [], []
    for f, t in enumerate(tris):
        uv = {int(v): uvs[f][j] for j, v in enumerate(t)}
        mids = {}
        for k in range(3):
            a, b = int(t[k]), int(t[(k + 1) % 3])
            key = tuple(sorted((a, b)))
            if key in index:
                s = cuts[key] if key == (a, b) else 1.0 - cuts[key]
                mids[k] = index[key]
                uv[index[key]] = (1 - s) * uv[a] + s * uv[b]
        parts = split_triangle([int(v) for v in t], mids, np.concatenate(new_verts))
        out_tris.append(parts[0])
        out_uvs.append([uv[v] for v in parts[0]])
        extra_tris += parts[1:]
        extra_uvs += [[uv[v] for v in p] for p in parts[1:]]
    tris_out = np.array(out_tris + extra_tris, np.int64)
    uvs_out = np.array(out_uvs + extra_uvs)
    return np.concatenate(new_verts), tris_out, uvs_out, np.concatenate(new_weights)


def split_triangle(t, mids, points):
    """Splits the triangle `t` (three corners in order) at the new vertices `mids` of its edges
    (the edge k goes from the corner k to the corner k + 1). A quad takes its shorter diagonal.
    Gives the parts, in the order of the corners."""
    a, b, c = t
    if not mids:
        return [t]
    if len(mids) == 1:
        k = next(iter(mids))
        p, (u, v, w) = mids[k], (t[k], t[(k + 1) % 3], t[(k + 2) % 3])
        return [[u, p, w], [p, v, w]]
    if len(mids) == 3:
        p, q, r = mids[0], mids[1], mids[2]
        return [[a, p, r], [p, b, q], [r, q, c], [p, q, r]]
    # Two cut edges: the corner between them is alone on one side of the cut.
    k = next(j for j in range(3) if j in mids and (j + 2) % 3 in mids)
    u, v, w = t[k], t[(k + 1) % 3], t[(k + 2) % 3]
    p, q = mids[k], mids[(k + 2) % 3]
    if np.linalg.norm(points[p] - points[w]) <= np.linalg.norm(points[v] - points[q]):
        return [[u, p, q], [p, v, w], [p, w, q]]
    return [[u, p, q], [p, v, q], [v, w, q]]


def refine(verts, tris, uvs, weights, heads, ends, matrices, rule):
    """Changes the faces of the arms so that they bend at the joints (design 4.4): first a ring
    of new vertices at each joint of `rings` (`ring_cuts()`, `split_faces()`), on the sides of its
    `sides` or on both sides, then the flips of the long edges of the faces that are thin in the
    seated bind pose (`flip_edges()`). The cuts keep the surface, and each new vertex keeps four
    bones. Gives the new vertices, triangles, corner UVs, and weights, the number of flips, the
    largest move of a flip, and the number of cut edges."""
    cuts = {}
    for ring in rule['rings']:
        for side in ring.get('sides', 'LR'):
            cuts.update(ring_cuts(verts, tris, weights, heads, ends, ring, side))
    verts, tris, uvs, weights = split_faces(verts, tris, uvs, weights, cuts)
    if cuts:
        weights = limit(weights)
    tris, uvs, flips, largest = flip_edges(verts, skin(weights, matrices, verts), tris, uvs,
                                           weights, rule['flip'])
    return verts, tris, uvs, weights, flips, largest, len(cuts)


def weight_steps(row):
    """Splits weights that add up to 1 into whole steps of 1/255, as `weightSteps()` of
    `src/models/studio-format.ts`: each weight rounds down, and the largest remainders get one
    more step."""
    exact = row / row.sum() * WEIGHT_STEPS
    steps = np.floor(exact)
    order = sorted(range(len(row)), key=lambda i: (-(exact[i] - steps[i]), i))
    missing = int(WEIGHT_STEPS - steps.sum())
    for i in order[:missing]:
        steps[i] += 1
    return steps


def limit(weights):
    """Keeps the four largest weights of each vertex, in steps of 1/255 that add up to 1."""
    out = np.zeros_like(weights)
    for v, row in enumerate(weights):
        keep = sorted(np.nonzero(row > 1e-4)[0], key=lambda k: (-row[k], k))[:INFLUENCES]
        steps = weight_steps(row[keep])
        for k, s in zip(keep, steps):
            if s > 0:
                out[v, k] = s / WEIGHT_STEPS
    return out


def skin(weights, matrices, points):
    """Moves points with linear blend skinning: each matrix is (3 × 4), rotation and move."""
    out = np.zeros_like(points)
    for k, m in enumerate(matrices):
        w = weights[:, k]
        if not w.any():
            continue
        out += w[:, None] * (points @ m[:, :3].T + m[:, 3])
    return out


def move(rotation, src, dst):
    """Gives the (3 × 4) matrix that turns a point around `src` and moves `src` to `dst`."""
    return np.concatenate([rotation, (dst - rotation @ src)[:, None]], axis=1)


def stretch(verts, weights, heads, ends, children, factors):
    """Makes the limbs longer and the head larger by the factors of the config: `arm`, `leg`, and
    `head`. The upper arm and the forearm of each side grow by `arm` along their axes, and the paw
    moves with the wrist and keeps its size. The thigh and the shin grow by `leg` along their
    axes, and the foot moves with the ankle and keeps its size. The head and the ears grow by
    `head` around the neck joint. Then the body rises by the growth of the legs, so that the soles
    stay at y = 0. The root stays on the floor. Each vertex blends the moves of its bones by its
    weights, so that a growth fades over the joint at its start. Gives the moved vertices, heads,
    and tails, and the rise of the body."""
    new_heads = {k: v.copy() for k, v in heads.items()}
    new_ends = {k: v.copy() for k, v in ends.items()}
    matrices = [move(np.eye(3), np.zeros(3), np.zeros(3)) for _ in BONES]

    for side in 'LR':
        factor = factors['arm']
        s = heads[f'upper_arm_{side}']
        e = heads[f'forearm_{side}']
        wrist = heads[f'hand_{side}']
        e2 = s + factor * (e - s)
        wrist2 = e2 + factor * (wrist - e)
        for name, origin, start, axis in (
            ('upper_arm', s, s, e - s),
            ('forearm', e, e2, wrist - e),
            ('forearm_twist', e, e2, wrist - e),
        ):
            y = unit(axis)
            scale = np.eye(3) + (factor - 1) * np.outer(y, y)
            matrices[BONES.index(f'{name}_{side}')] = move(scale, origin, start)
        shift = wrist2 - wrist
        for name in ('hand', 'fingers'):
            matrices[BONES.index(f'{name}_{side}')] = move(np.eye(3), np.zeros(3), shift)
        new_heads[f'forearm_{side}'] = e2
        new_heads[f'forearm_twist_{side}'] = e2 + factor * (heads[f'forearm_twist_{side}'] - e)
        new_heads[f'hand_{side}'] = wrist2
        new_heads[f'fingers_{side}'] = heads[f'fingers_{side}'] + shift
        new_ends[f'fingers_{side}'] = ends[f'fingers_{side}'] + shift

    rise = 0.0
    if factors['leg'] != 1:
        factor = factors['leg']
        for side in 'LR':
            hip = heads[f'thigh_{side}']
            knee = heads[f'shin_{side}']
            ankle = heads[f'foot_{side}']
            knee2 = hip + factor * (knee - hip)
            ankle2 = knee2 + factor * (ankle - knee)
            for name, origin, start, axis in (('thigh', hip, hip, knee - hip),
                                              ('shin', knee, knee2, ankle - knee)):
                y = unit(axis)
                scale = np.eye(3) + (factor - 1) * np.outer(y, y)
                matrices[BONES.index(f'{name}_{side}')] = move(scale, origin, start)
            shift = ankle2 - ankle
            for name in ('foot', 'toes'):
                matrices[BONES.index(f'{name}_{side}')] = move(np.eye(3), np.zeros(3), shift)
            new_heads[f'shin_{side}'] = knee2
            new_heads[f'foot_{side}'] = ankle2
            new_heads[f'toes_{side}'] = heads[f'toes_{side}'] + shift
            new_ends[f'toes_{side}'] = ends[f'toes_{side}'] + shift
            rise = -float(shift[1])

    if factors['head'] != 1:
        factor = factors['head']
        pivot = heads['neck']
        for name in ('head', 'ear_L', 'ear_R'):
            matrices[BONES.index(name)] = move(factor * np.eye(3), pivot, pivot)
            new_heads[name] = pivot + factor * (heads[name] - pivot)
            if not children[name]:
                new_ends[name] = pivot + factor * (ends[name] - pivot)

    for name in BONES:
        if children[name]:
            new_ends[name] = new_heads[children[name]]
    if rise:
        up = np.array([0.0, rise, 0.0])
        for m in matrices:
            m[:, 3] += up
        for name in BONES:
            if name != 'root':
                new_heads[name] = new_heads[name] + up
                new_ends[name] = new_ends[name] + up
    return skin(weights, matrices, verts), new_heads, new_ends, rise


def reach(heads, side):
    """Gives the arm from the shoulder joint over the elbow and the wrist to the middle of the
    palm, as `pnpm studio-body --inspect` measures it."""
    s, e, w, f = (heads[f'{b}_{side}'] for b in ('upper_arm', 'forearm', 'hand', 'fingers'))
    palm = (w + f) / 2
    return np.linalg.norm(e - s) + np.linalg.norm(w - e) + np.linalg.norm(palm - w)


def bind_turns(config, heads, ends, rolls):
    """Gives the world turn of each bone from the pose of the source to the seated bind pose. The
    legs take the inverse of the turns of the studio from its bind pose to its clip `reference`.
    Each arm bone turns the least way onto its bind direction after the turn of its parent, so
    that the arm does not twist. The bones of a tail of two bones turn so onto the directions of
    `tailBind`. The other bones do not turn."""
    studio = config['studio']
    turns = {name: np.eye(3) for name in BONES}
    for side in 'LR':
        for bone in LEG:
            q = np.asarray(studio['legTurns'][bone], float)
            if side == 'R':
                q = q * [1, -1, -1, 1]
            turns[f'{bone}_{side}'] = quat_matrix(q).T
        parent = np.eye(3)
        for bone in ARM:
            name = f'{bone}_{side}'
            if bone in ('forearm_twist', 'fingers'):
                # The twist bone and the fingers keep the turn of their parent.
                turns[name] = parent
                continue
            target = np.asarray(studio['bindArms'][bone], float)
            if side == 'R':
                target = mirrored(target)
            now = parent @ unit(ends[name] - heads[name])
            turns[name] = swing(now, target) @ parent
            parent = turns[name]
    if TAIL_TIP in BONES:
        # Each tail bone turns the least way onto its bind direction after the turn of its parent.
        parent = np.eye(3)
        for name in ('tail', TAIL_TIP):
            now = parent @ unit(ends[name] - heads[name])
            turns[name] = swing(now, np.asarray(studio['tailBind'][name], float)) @ parent
            parent = turns[name]
    return turns


def posed_heads(heads, turns):
    """Gives the head of each bone after the world turns, from the root down."""
    out = {}
    for name in BONES:
        parent = PARENTS[name]
        if parent is None:
            out[name] = heads[name].copy()
        else:
            out[name] = out[parent] + turns[parent] @ (heads[name] - heads[parent])
    return out


def face_normals(points, tris):
    """Gives the unit normal of each face."""
    n = np.cross(points[tris[:, 1]] - points[tris[:, 0]], points[tris[:, 2]] - points[tris[:, 0]])
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def turn_dots(src, posed, tris, weights, matrices):
    """Gives for each face the cosine of its posed normal and its source normal moved by the mean
    skin of its corners (the inverse transpose), as `foldedFaces()` of `tools/fold-probe.ts`.
    Below 0, the face turned over."""
    a = np.zeros((len(src), 3, 3))
    for k, m in enumerate(matrices):
        a += weights[:, k, None, None] * m[:, :3]
    mean = a[tris].mean(axis=1)
    expected = np.einsum('nji,nj->ni', np.linalg.inv(mean), face_normals(src, tris))
    expected /= np.maximum(np.linalg.norm(expected, axis=1, keepdims=True), 1e-12)
    return np.sum(face_normals(posed, tris) * expected, axis=1)


def relax(src, bind, tris, weights, matrices, rounds=60):
    """Cleans the bind mesh where the bind pose pinches it: each vertex of a face that turns over
    (or nearly) against the source moves halfway to the middle of its neighbors, in rounds, until
    no face turns over. Only the vertices that an arm bone, a thigh, a shin, or a tail of two bones
    moves can move, and the paws and the feet keep their form. The corrective shapes give the
    source back. Gives the cleaned bind mesh and the number of rounds."""
    moving = np.zeros(len(src), bool)
    for side in 'LR':
        for bone in ('upper_arm', 'forearm', 'forearm_twist', 'thigh', 'shin'):
            moving |= weights[:, BONES.index(f'{bone}_{side}')] > 0
    if TAIL_TIP in BONES:
        moving |= tail_mask(weights)
    neighbors = [set() for _ in range(len(src))]
    for a, b, c in tris:
        neighbors[a].update((b, c))
        neighbors[b].update((a, c))
        neighbors[c].update((a, b))
    neighbors = [np.array(sorted(n)) for n in neighbors]
    out = bind.copy()
    for done in range(rounds):
        bad = np.nonzero(turn_dots(src, out, tris, weights, matrices) < 0.1)[0]
        ids = np.unique(tris[bad])
        ids = ids[moving[ids]]
        if len(ids) == 0:
            return out, done
        mids = np.array([out[neighbors[i]].mean(axis=0) for i in ids])
        out[ids] = 0.5 * out[ids] + 0.5 * mids
    return out, rounds


def boundary_loop(tris):
    """Gives the longest closed loop of the open edges of a patch of faces, in the order of the
    faces (counterclockwise from outside for faces in that order). Two parts of a patch can touch
    at one corner, with two open edges out of it, as the left eye of the fox does. The loop then
    goes around both parts and passes that corner two times: each loop is a walk that uses each
    open edge of its part one time (the algorithm of Hierholzer)."""
    count = {}
    for t in tris:
        for k in range(3):
            edge = (int(t[k]), int(t[(k + 1) % 3]))
            count[edge] = count.get(edge, 0) + 1
    outs = {}
    for a, b in sorted(count):
        if (b, a) not in count:
            outs.setdefault(a, []).append(b)
    loops, used = [], set()
    for start in sorted(outs):
        if all((start, b) in used for b in outs[start]):
            continue
        stack, walk = [start], []
        while stack:
            v = stack[-1]
            free = [b for b in outs.get(v, []) if (v, b) not in used]
            if free:
                used.add((v, free[0]))
                stack.append(free[0])
            else:
                walk.append(stack.pop())
        walk.reverse()
        if len(walk) > 1 and walk[0] == walk[-1]:
            loops.append(walk[:-1])
    return max(loops, key=len) if loops else []


def fan_gap(points, fan, inside, normal):
    """Gives the largest height of a point above a fan of triangles, along a normal: the lift
    that puts each point under the fan. A point counts for the triangle that holds it when both
    are seen along the normal."""
    gap = 0.0
    for a, b, c in fan:
        pa, pb, pc = points[a], points[b], points[c]
        face = np.cross(pb - pa, pc - pa)
        if abs(face.dot(normal)) < 1e-12:
            continue
        for p in inside:
            # The point where the line through p along the normal meets the plane of the face.
            t = (pa - p).dot(face) / normal.dot(face)
            q = p + t * normal
            u = np.cross(pb - pa, q - pa).dot(face)
            v = np.cross(pc - pb, q - pb).dot(face)
            w = np.cross(pa - pc, q - pc).dot(face)
            if (u >= 0 and v >= 0 and w >= 0) or (u <= 0 and v <= 0 and w <= 0):
                gap = max(gap, -t)
    return gap


def add_eye_shells(verts, bind, tris, colors, eyes, rule):
    """Adds a gloss shell over each eye: a fan from the middle of the eye to at most `points`
    points of the edge of the dark faces, lifted along the normal of the eye in the bind mesh. The
    fan needs fewer faces than a copy of the faces of the eye. The faces under it take the mean
    fur color of their neighbors. Gives the new vertices of the source and of the bind mesh, the
    triangles, the colors, and the materials."""
    lift, points = rule['lift'], rule['points']
    material = np.array(['fur'] * len(tris), dtype=object)
    new_src, new_bind, new_tris, new_colors = [verts], [bind], [tris], [colors.copy()]
    count = len(verts)
    eye_faces = np.concatenate([eyes['L'], eyes['R']])
    neighbors = {}
    for f, t in enumerate(tris):
        for k in range(3):
            edge = tuple(sorted((t[k], t[(k + 1) % 3])))
            neighbors.setdefault(edge, []).append(f)
    for side in 'LR':
        faces = eyes[side]
        if len(faces) == 0:
            continue
        loop = boundary_loop(tris[faces])
        if len(loop) < 3:
            raise SystemExit(f'The eye {side} has no closed edge.')
        n = min(points, len(loop))
        ring = [loop[k * len(loop) // n] for k in range(n)]
        normal = np.zeros(3)
        for f in faces:
            a, b, c = bind[tris[f]]
            normal += np.cross(b - a, c - a)
        normal = unit(normal)
        corners = np.unique(tris[faces])
        fan = [[0, 1 + k, 1 + (k + 1) % n] for k in range(n)]
        for target, place in ((new_src, verts), (new_bind, bind)):
            # The eye bulges, so the middle of the fan goes to the top of the dark faces, and the
            # fan rises until each corner of the dark faces lies under it.
            middle = place[corners].mean(axis=0)
            middle += normal * (place[corners] - middle).dot(normal).max()
            shell = np.vstack([middle, place[ring]])
            gap = fan_gap(shell, fan, place[corners], normal)
            target.append(shell + (lift + gap) * normal)
        new_tris.append(np.array([[count, count + 1 + k, count + 1 + (k + 1) % n]
                                  for k in range(n)]))
        new_colors.append(np.tile(colors[faces].mean(axis=0), (n, 1)))
        count += n + 1
        log(f'eye {side}: {len(faces)} dark faces, an edge of {len(loop)} points, a fan of {n} '
            f'faces, {gap + lift:.4f} u over the eye')
        # The faces under the shell take the mean color of the fur faces around the eye.
        around = set()
        for f in faces:
            t = tris[f]
            for k in range(3):
                around.update(neighbors[tuple(sorted((t[k], t[(k + 1) % 3])))])
        around -= set(eye_faces.tolist())
        fur = colors[sorted(around)].mean(axis=0) if around else colors[faces].mean(axis=0)
        new_colors[0][faces] = fur
    tris_out = np.concatenate(new_tris)
    material = np.concatenate([material, np.array(['gloss'] * (len(tris_out) - len(tris)),
                                                  dtype=object)])
    return (np.concatenate(new_src), np.concatenate(new_bind), tris_out,
            np.concatenate(new_colors), material)


def correctives(src, bind, weights, turns, src_heads, bind_heads):
    """Finds the move of each vertex in the bind pose that the skin of the clip `reference` takes
    to its source place: d = A⁻¹ (source − b) − bind, with the skin A p + b of the clip. Gives the
    moves, the smallest determinant of A, and the vertex of it."""
    a = np.zeros((len(src), 3, 3))
    b = np.zeros((len(src), 3))
    for k, name in enumerate(BONES):
        w = weights[:, k]
        if not w.any():
            continue
        back = turns[name].T
        a += w[:, None, None] * back
        b += w[:, None] * (src_heads[name] - back @ bind_heads[name])
    det = np.linalg.det(a)
    worst = int(np.argmin(np.abs(det)))
    moves = np.linalg.solve(a, (src - b)[:, :, None])[:, :, 0] - bind
    return moves, float(det[worst]), worst


def split_shapes(moves, weights, bind):
    """Splits the corrective moves into the four shapes: the vertices with an arm weight give the
    arm shapes, and the others give the leg shapes. Each kind splits by side with a smooth ramp
    across the middle plane, as the studio does."""
    arm = np.zeros(len(moves), bool)
    for side in 'LR':
        for bone in ARM:
            arm |= weights[:, BONES.index(f'{bone}_{side}')] > 0
    side = smoothstep(bind[:, 0], -0.02, 0.02)
    out = {}
    for kind, mask in (('arm_down', arm), ('legs_straight', ~arm)):
        part = moves * mask[:, None]
        out[f'{kind}_L'] = part * side[:, None]
        out[f'{kind}_R'] = part * (1 - side)[:, None]
    return out


def chair_mesh(rule, bind, weights):
    """Makes the chair under the seated body: a seat whose top is the lowest point of the body
    over the seat, four legs, and a back. The shins and the feet hang in front of the seat, and
    the tail goes back over it, so they do not count. Gives the vertices, the triangles, and the
    seat top."""
    hw, front, back = rule['halfWidth'], rule['front'], rule['back']
    lower = [BONES.index(f'{b}_{s}') for b in ('shin', 'foot', 'toes') for s in 'LR']
    hanging = weights[:, lower].sum(axis=1) > 0.5
    tails = [BONES.index(b) for b in ('tail', TAIL_TIP) if b in BONES]
    tail = weights[:, tails].sum(axis=1) > 0.5
    seat = (np.abs(bind[:, 0]) <= hw) & (bind[:, 2] >= back) & (bind[:, 2] <= front)
    over = seat & ~hanging & ~tail
    top = float(bind[over, 1].min())
    if (seat & tail).any():
        log(f'chair: the tail goes {bind[seat & tail, 1].min() - top:.4f} u over the seat top at '
            f'its lowest point over the seat')
    # `pnpm studio-body` finds the seat height as the lowest point of the body over the seat, so
    # a foot over the seat puts the seat on the floor.
    feet = hanging & (np.abs(bind[:, 0]) <= hw) & (bind[:, 2] >= back) & (bind[:, 2] <= front)
    if feet.any():
        raise SystemExit(f'A shin or a foot lies over the chair, at z up to '
                         f'{bind[feet, 2].min():.4f} u. Move the front edge of the chair back.')
    log(f'chair: front edge at z {front} u, the shins and the feet from z '
        f'{bind[hanging, 2].min():.4f} u')
    boxes = [
        ((-hw, top - 0.02, back), (hw, top, front)),
        ((-hw, 0, back), (-hw + 0.02, top - 0.02, back + 0.02)),
        ((hw - 0.02, 0, back), (hw, top - 0.02, back + 0.02)),
        ((-hw, 0, front - 0.02), (-hw + 0.02, top - 0.02, front)),
        ((hw - 0.02, 0, front - 0.02), (hw, top - 0.02, front)),
        ((-hw, top, back), (hw, top + rule['backHeight'], back + 0.02)),
    ]
    verts, faces = [], []
    quads = ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5))
    for lo, hi in boxes:
        base = len(verts)
        for i in range(8):
            verts.append([(lo, hi)[i >> 2 & 1][0], (lo, hi)[i >> 1 & 1][1], (lo, hi)[i & 1][2]])
        for a, b, c, d in quads:
            faces += [[base + a, base + b, base + c], [base + a, base + c, base + d]]
    return np.array(verts, float), np.array(faces), top


class GlbWriter:
    """Collects the buffer views and the accessors of a GLB file."""

    def __init__(self):
        """Starts an empty binary chunk."""
        self.bin = bytearray()
        self.views = []
        self.accessors = []

    def add(self, array, component, kind, minmax=False, normalized=False):
        """Adds an accessor of a numpy array, and gives its index."""
        data = np.ascontiguousarray(array).tobytes()
        while len(self.bin) % 4:
            self.bin.append(0)
        self.views.append({'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': len(data)})
        self.bin += data
        count = len(array)
        accessor = {'bufferView': len(self.views) - 1, 'componentType': component,
                    'count': count, 'type': kind}
        if normalized:
            accessor['normalized'] = True
        if minmax:
            flat = np.asarray(array, float).reshape(count, -1)
            accessor['min'] = [float(np.float32(x)) for x in flat.min(axis=0)]
            accessor['max'] = [float(np.float32(x)) for x in flat.max(axis=0)]
        self.accessors.append(accessor)
        return len(self.accessors) - 1

    def floats(self, array, kind, minmax=False):
        """Adds an accessor of 32-bit floats."""
        return self.add(np.asarray(array, np.float32), 5126, kind, minmax)


def primitive_arrays(points, tris, colors, materials, weights, shapes, name):
    """Gives the vertex arrays of the faces of one material: each corner with its face color is
    one vertex, so that each face keeps one color."""
    faces = np.nonzero(materials == name)[0]
    keys, index, corners = {}, [], []
    for f in faces:
        c = tuple(np.round(linear(colors[f]), 7))
        row = []
        for v in tris[f]:
            key = (int(v), c)
            if key not in keys:
                keys[key] = len(index)
                index.append(key)
            row.append(keys[key])
        corners.append(row)
    vertex = np.array([k[0] for k in index])
    color = np.array([k[1] for k in index])
    joints = np.zeros((len(vertex), 4), np.uint8)
    values = np.zeros((len(vertex), 4), np.float32)
    for i, v in enumerate(vertex):
        bones = sorted(np.nonzero(weights[v] > 0)[0], key=lambda k: (-weights[v, k], k))
        for j, k in enumerate(bones):
            joints[i, j] = k
            values[i, j] = weights[v, k]
    return {
        'position': points[vertex], 'color': color, 'joints': joints, 'weights': values,
        'shapes': [shapes[s][vertex] for s in SHAPES], 'indices': np.array(corners, np.uint32),
    }


def write_glb(path, config, bind, tris, colors, materials, weights, shapes, bind_frames,
              bind_heads, src_frames, src_heads, chair):
    """Writes the rig as a GLB file in the format of a studio body."""
    w = GlbWriter()
    mats = [{'name': name, 'doubleSided': True,
             'pbrMetallicRoughness': {'metallicFactor': 0.0, 'roughnessFactor': rough}}
            for name, rough in MATERIALS]

    chair_verts, chair_tris, _ = chair
    chair_prim = {
        'attributes': {
            'POSITION': w.floats(chair_verts, 'VEC3', minmax=True),
            'COLOR_0': w.floats(np.tile(linear(CHAIR_COLOR), (len(chair_verts), 1)), 'VEC3'),
        },
        'indices': w.add(chair_tris.astype(np.uint32).ravel(), 5125, 'SCALAR'),
        'material': 0,
    }

    primitives = []
    for k, name in ((1, 'fur'), (2, 'gloss')):
        arrays = primitive_arrays(bind, tris, colors, materials, weights, shapes, name)
        primitives.append({
            'attributes': {
                'POSITION': w.floats(arrays['position'], 'VEC3', minmax=True),
                'COLOR_0': w.floats(arrays['color'], 'VEC3'),
                'JOINTS_0': w.add(arrays['joints'], 5121, 'VEC4'),
                'WEIGHTS_0': w.floats(arrays['weights'], 'VEC4'),
            },
            'indices': w.add(arrays['indices'].ravel(), 5125, 'SCALAR'),
            'material': k,
            'targets': [{'POSITION': w.floats(s, 'VEC3', minmax=True)} for s in arrays['shapes']],
        })

    # The joints: the local place and turn of each bone in the bind pose and in the clip.
    def local(frames, heads, name):
        parent = PARENTS[name]
        if parent is None:
            return heads[name], frames[name]
        back = frames[parent].T
        return back @ (heads[name] - heads[parent]), back @ frames[name]

    first = 2
    nodes = [{'name': 'chair', 'mesh': 0}]
    nodes.append({'name': config['name'], 'mesh': 1, 'skin': 0})
    joint_index = {name: first + k for k, name in enumerate(BONES)}
    inverse = []
    for name in BONES:
        t, r = local(bind_frames, bind_heads, name)
        node = {'name': name, 'rotation': [float(x) for x in matrix_quat(r)],
                'translation': [float(x) for x in t]}
        children = [joint_index[c] for c in BONES if PARENTS[c] == name]
        if children:
            node['children'] = children
        nodes.append(node)
        world = np.eye(4)
        world[:3, :3] = bind_frames[name]
        world[:3, 3] = bind_heads[name]
        inverse.append(np.linalg.inv(world).T.ravel())
    nodes.append({'name': f"{config['name']}Rig", 'children': [1, joint_index['root']]})

    times = w.floats(np.zeros(1), 'SCALAR', minmax=True)
    channels, samplers = [], []
    for name in BONES:
        t, r = local(src_frames, src_heads, name)
        for target, value, kind in (('translation', t, 'VEC3'),
                                    ('rotation', matrix_quat(r), 'VEC4')):
            samplers.append({'input': times, 'output': w.floats(np.asarray([value]), kind),
                             'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1,
                             'target': {'node': joint_index[name], 'path': target}})
    samplers.append({'input': times, 'output': w.floats(np.ones(len(SHAPES)), 'SCALAR'),
                     'interpolation': 'LINEAR'})
    channels.append({'sampler': len(samplers) - 1, 'target': {'node': 1, 'path': 'weights'}})

    gltf = {
        'asset': {'generator': 'zoophony tools/blender/rig_mesh.py', 'version': '2.0'},
        'scene': 0,
        'scenes': [{'name': 'Scene', 'nodes': [0, len(nodes) - 1]}],
        'nodes': nodes,
        'animations': [{'name': 'reference', 'channels': channels, 'samplers': samplers}],
        'materials': mats,
        'meshes': [
            {'name': 'chair', 'primitives': [chair_prim]},
            {'name': config['name'], 'primitives': primitives,
             'weights': [0.0] * len(SHAPES), 'extras': {'targetNames': list(SHAPES)}},
        ],
        'skins': [{'name': f"{config['name']}Rig", 'joints': [joint_index[n] for n in BONES],
                   'skeleton': joint_index['root'],
                   'inverseBindMatrices': w.floats(np.array(inverse), 'MAT4')}],
        'accessors': w.accessors,
        'bufferViews': w.views,
        'buffers': [{'byteLength': len(w.bin)}],
    }
    head = config.get('headFactor', 1)
    if head != 1:
        # `pnpm studio-body` measures the head height of the holds before the head factor.
        gltf['asset']['extras'] = {'headFactor': head}
    text = json.dumps(gltf, separators=(',', ':')).encode()
    text += b' ' * (-len(text) % 4)
    data = bytes(w.bin) + b'\0' * (-len(w.bin) % 4)
    gltf['buffers'][0]['byteLength'] = len(w.bin)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(text) + 8 + len(data))
    out += struct.pack('<II', len(text), 0x4E4F534A) + text
    out += struct.pack('<II', len(data), 0x004E4942) + data
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(out)
    log(f'wrote {path}: {len(out)} bytes')


def bone_color(index):
    """Gives a color for a bone: hues by the golden ratio, so that neighbors differ."""
    return colorsys.hsv_to_rgb((index * 0.61803) % 1.0, 0.7, 0.95)


def preview(out, parts):
    """Renders the preview images. Each part is (name, [(vertices, triangles, sRGB face colors)],
    [(view name, azimuth in degrees, elevation in degrees, center, size)])."""
    os.makedirs(out, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'VERTEX'
    scene.render.resolution_x = scene.render.resolution_y = VIEW
    scene.world = bpy.data.worlds.new('world')
    camera = bpy.data.cameras.new('camera')
    camera.type = 'ORTHO'
    cam = bpy.data.objects.new('camera', camera)
    scene.collection.objects.link(cam)
    scene.camera = cam
    for name, meshes, views in parts:
        objects = []
        for k, (verts, tris, colors) in enumerate(meshes):
            mesh = bpy.data.meshes.new(f'{name}{k}')
            mesh.from_pydata(to_blender(verts).tolist(), [], np.asarray(tris).tolist())
            mesh.update()
            attr = mesh.color_attributes.new('color', 'FLOAT_COLOR', 'CORNER')
            rgba = np.concatenate([linear(colors), np.ones((len(colors), 1))], axis=1)
            attr.data.foreach_set('color', np.repeat(rgba, 3, axis=0).ravel().astype(np.float32))
            ob = bpy.data.objects.new(f'{name}{k}', mesh)
            scene.collection.objects.link(ob)
            objects.append(ob)
        paths = []
        for view, azimuth, elevation, center, size in views:
            a, e = math.radians(azimuth), math.radians(elevation)
            # The azimuth 0 looks at the front of the animal, which faces -y in Blender.
            d = np.array([math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)])
            camera.ortho_scale = size
            cam.location = (to_blender(center) + d * 5).tolist()
            cam.rotation_euler = Vector((-d).tolist()).to_track_quat('-Z', 'Y').to_euler()
            path = os.path.join(out, f'{name}-{view}.png')
            scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            paths.append(path)
        images = [bpy.data.images.load(p) for p in paths]
        pixels = [np.array(img.pixels[:], np.float32).reshape(VIEW, VIEW, 4) for img in images]
        sheet = bpy.data.images.new(name, VIEW * len(pixels), VIEW)
        sheet.pixels = np.concatenate(pixels, axis=1).ravel()
        sheet.filepath_raw = os.path.join(out, f'{name}.png')
        sheet.file_format = 'PNG'
        sheet.save()
        for img in images:
            bpy.data.images.remove(img)
        for p in paths:
            os.remove(p)
        for ob in objects:
            bpy.data.objects.remove(ob)
        log(f'preview: {sheet.filepath_raw}')


def write_obj(path, verts, tris):
    """Writes a mesh as an OBJ file."""
    with open(path, 'w') as f:
        for v in verts:
            f.write(f'v {v[0]:.7f} {v[1]:.7f} {v[2]:.7f}\n')
        for t in tris:
            f.write(f'f {t[0] + 1} {t[1] + 1} {t[2] + 1}\n')


def main():
    config_path, out_path, preview_dir, obj_path = args()
    with open(config_path) as f:
        config = json.load(f)
    rules = config['weights']
    if TAIL_TIP in config['joints']:
        global BONES
        BONES = BONES + (TAIL_TIP,)

    verts, source_tris, uvs, texture = load_mesh(config)
    heads, ends, rolls, children = joints_of(config)
    weights = apply_rules(verts, source_tris, bone_heat(verts, source_tris, heads, ends, rolls),
                          rules, heads, ends)
    weights = straight_slivers(verts, source_tris,
                               rigid_slivers(verts, source_tris, weights, rules), rules)
    weights = limit(weights)

    # The long arms, the long legs, and the large head. The scale of the app comes from the
    # shoulder joints after the rise of the legs.
    factors = {'arm': config['armFactor'], 'leg': config.get('legFactor', 1),
               'head': config.get('headFactor', 1)}
    long_verts, long_heads, long_ends, rise = stretch(verts, weights, heads, ends, children,
                                                       factors)
    meters = config['app']['shoulders'] / long_heads['upper_arm_L'][1]
    for side in 'LR':
        before, after = reach(heads, side) * meters, reach(long_heads, side) * meters
        log(f'arm {side}: reach {before:.4f} m before, {after:.4f} m after the factor '
            f"{config['armFactor']} (target {config['app']['reach']} m)")
    if factors['leg'] != 1 or factors['head'] != 1:
        log(f"legs and head: the leg factor {factors['leg']} raises the body {rise:.4f} u, the "
            f"shoulder joint to {long_heads['upper_arm_L'][1]:.4f} u "
            f"({long_heads['upper_arm_L'][1] * meters:.4f} m), and the head factor "
            f"{factors['head']} grows the head around the neck joint")

    src_frames = {n: frame(long_heads[n], long_ends[n], rolls[n]) for n in BONES}
    turns = bind_turns(config, long_heads, long_ends, rolls)
    bind_heads = posed_heads(long_heads, turns)
    bind_frames = {n: turns[n] @ src_frames[n] for n in BONES}
    matrices = [move(turns[n], long_heads[n], bind_heads[n]) for n in BONES]

    # The faces of the arms change so that they bend at the joints. The head, the trunk, and the
    # legs keep their faces, their vertices, and their weights.
    long_verts, tris, uvs, weights, flips, largest, cuts = refine(
        long_verts, source_tris, uvs, weights, long_heads, long_ends, matrices, config['refine'])
    log(f'refine: {flips} flips, the largest move {largest * meters * 1000:.3f} mm, {cuts} cut '
        f'edges, {len(tris) - len(source_tris)} new faces')
    colors, dark = face_colors(tris, uvs, texture, config['colors'])
    eyes, nose = features(long_verts, tris, colors, dark,
                          moved_boxes(config['colors'], heads['neck'], factors['head'], rise))

    bind = skin(weights, matrices, long_verts)
    dots = turn_dots(long_verts, bind, tris, weights, matrices)
    main_bone = weights[tris].sum(axis=1).argmax(axis=1)
    turned = np.nonzero(dots < 0)[0]
    names = sorted({BONES[main_bone[f]] for f in turned})
    free = int(free_arm(verts, source_tris, rules['armSplit'], ends['fingers_L'], 1.0).sum())
    log(f'arm: {free} vertices in the free left arm beyond |x| = {rules["armSplit"]}')
    log(f'bind: {len(turned)} faces turn over from the source, on the bones {names}')
    bind, rounds = relax(long_verts, bind, tris, weights, matrices)
    dots = turn_dots(long_verts, bind, tris, weights, matrices)
    log(f'bind: after {rounds} rounds of relaxing, {int((dots < 0).sum())} faces turn over')

    src_all, bind_all, tris_all, colors_all, materials = add_eye_shells(
        long_verts, bind, tris, colors, eyes, config['eyeShell'])
    materials[nose] = 'gloss'
    colors_all, worst_color, mean_color = palette(colors_all, config['colors']['palette'])
    log(f'palette: {len(np.unique(colors_all, axis=0))} colors, the Oklab distance of a face '
        f'from its color {mean_color:.4f} on the mean, {worst_color:.4f} at most')
    order = locality_order(tris_all)
    tris_all, colors_all, materials = tris_all[order], colors_all[order], materials[order]
    extra = len(src_all) - len(long_verts)
    head_only = np.zeros((extra, len(BONES)))
    head_only[:, BONES.index('head')] = 1.0
    weights_all = np.concatenate([weights, head_only])

    moves, det, worst = correctives(src_all, bind_all, weights_all, turns, long_heads, bind_heads)
    log(f'corrective: the smallest determinant of the skin is {det:.4f} at the vertex {worst}')
    back = skin(weights_all, [move(turns[n].T, bind_heads[n], long_heads[n]) for n in BONES],
                bind_all + moves)
    error = np.linalg.norm(back - src_all, axis=1).max()
    log(f'corrective: the clip gives the source back within {error:.2e} u '
        f'({error * meters * 1000:.4f} mm)')
    shapes = split_shapes(moves, weights_all, bind_all)
    for name in SHAPES:
        log(f'shape {name}: {int((np.abs(shapes[name]).max(axis=1) > 1e-6).sum())} vertices, '
            f'largest move {np.abs(shapes[name]).max():.4f} u')

    chair = chair_mesh(config['chair'], bind_all, weights_all)
    log(f'chair: seat top {chair[2]:.4f} u, lowest point of the body {bind_all[:, 1].min():.4f} u')
    if TAIL_TIP in BONES:
        tail = weights_all[:, [BONES.index('tail'), BONES.index(TAIL_TIP)]].sum(axis=1) > 0.5
        log(f'tail: the lowest point {bind_all[tail, 1].min() - bind_all[:, 1].min():.4f} u above '
            f'the soles, the farthest point back at z {bind_all[tail, 2].min():.4f} u, the widest '
            f'at |x| {np.abs(bind_all[tail, 0]).max():.4f} u')
    log(f'triangles: {len(tris_all)} ({int((materials == "gloss").sum())} gloss)')
    write_glb(out_path, config, bind_all, tris_all, colors_all, materials, weights_all, shapes,
              bind_frames, bind_heads, src_frames, long_heads, chair)

    if obj_path:
        write_obj(obj_path, long_verts, tris)
    if preview_dir:
        os.makedirs(preview_dir, exist_ok=True)
        write_obj(os.path.join(preview_dir, 'source-long-arms.obj'), long_verts, tris)
        main_bone = weights_all[tris_all].sum(axis=1).argmax(axis=1)
        bones = np.array([bone_color(k) for k in main_bone])
        chair_part = (chair[0], chair[1], np.tile(CHAIR_COLOR, (len(chair[1]), 1)))
        four = [('front', 0, 5), ('right', 90, 5), ('back', 180, 5), ('q', 35, 15)]
        # The views grow with the body: 1 unit high with no factor of the legs or the head.
        tall = float(src_all[:, 1].max())
        seated_center = np.array([0, 0.5 * tall, 0.02])
        standing_center = np.array([0, 0.5 * tall, 0])
        low = np.array([0, 0.25 + rise, -0.15])
        knees = np.array([0, 0.17 + rise, 0.02])
        preview(preview_dir, [
            ('seated', [(bind_all, tris_all, colors_all), chair_part],
             [(v, a, e, seated_center, 1.1 * tall) for v, a, e in four]),
            ('standing', [(src_all, tris_all, colors_all)],
             [(v, a, e, standing_center, 1.1 * tall) for v, a, e in four]),
            ('tail', [(bind_all, tris_all, colors_all), chair_part],
             [('right', 90, 0, low, 0.7 + rise), ('back', 180, 10, low, 0.7 + rise)]),
            ('tail-bones', [(bind_all, tris_all, bones), chair_part],
             [('right', 90, 0, low, 0.7 + rise), ('back', 180, 10, low, 0.7 + rise)]),
            ('knees', [(bind_all, tris_all, colors_all), chair_part],
             [('right', 90, 0, knees, 0.4 + rise),
              ('left', 270, 0, knees, 0.4 + rise),
              ('front', 0, 10, knees, 0.4 + rise)]),
            ('bones', [(bind_all, tris_all, bones)],
             [(v, a, e, seated_center, 1.1 * tall) for v, a, e in four]),
            ('bones-standing', [(src_all, tris_all, bones)],
             [(v, a, e, standing_center, 1.1 * tall) for v, a, e in four]),
        ])


main()
