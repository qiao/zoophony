"""Prepares the skinned mesh of a rigged GLB body for the app, and writes it as JSON (design 4.4,
4.7).

    blender -b --factory-startup --python tools/blender/rig_body.py -- <config.json> <out.json>

`pnpm rig-body <species>` runs this script and packs its output. The steps:

1. Read the skinned mesh and the skeleton of the source GLB file of the config, and weld the
   corners at one point.
2. Give each face the color region of the nearest color of the palette of the config: `fur`,
   `accent`, or `dark`. Each face in the box of the eyes becomes `fur`, because the app puts an
   eye plate over each eye. The script measures each eye from the dark faces of the box, and the
   tip of the nose from the faces of the box of the nose.
3. Collapse the mesh to the triangle budget of the config. Blender mixes the weights of the
   joined vertices, and each new face takes the role of the nearest source face.
4. Move the weights of the source joints onto the bones of the player (`joints` of the config).
   Each extra bone of the config (a bone that the source skeleton does not have) takes a part of
   the weight of another bone: the part grows from 0 at the head of the extra bone to 1 at the
   ramp distance along the bone. Each vertex keeps its two largest weights.
5. Write the vertices, the faces with their roles, the weights, the head of each bone, the eyes,
   and the tip of the nose. The JSON keeps the axes and the units of Blender: +x is the left
   side of the animal, -y is the front, and +z is up.
"""

import json
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
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


def face_colors(ob, image):
    """Gives the median sRGB color of the texture samples of each face."""
    height, width, _ = image.shape
    uv = ob.data.uv_layers.active.data
    colors = []
    for poly in ob.data.polygons:
        loops = list(poly.loop_indices)
        samples = []
        for weights in SAMPLE_POINTS:
            u = sum(w * uv[i].uv[0] for w, i in zip(weights, loops))
            v = sum(w * uv[i].uv[1] for w, i in zip(weights, loops))
            x = min(width - 1, max(0, int((u % 1.0) * width)))
            y = min(height - 1, max(0, int((v % 1.0) * height)))
            samples.append(image[y, x])
        colors.append(np.median(np.array(samples), axis=0))
    return np.array(colors)


def srgb(hex_color):
    """Gives the sRGB values of a CSS hex color, from 0 to 1."""
    return np.array([int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5)])


def inside(point, box):
    """Tells if a point is in a box of two corners."""
    lo, hi = box
    return all(lo[k] <= point[k] <= hi[k] for k in range(3))


def classify(ob, colors, rules):
    """Gives the region of each face, the faces of the eyes, and the faces of the nose."""
    names = list(rules['palette'])
    palette = np.array([srgb(rules['palette'][name]) for name in names])
    regions = []
    eyes = []
    nose = []
    for poly, color in zip(ob.data.polygons, colors):
        luma = 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]
        region = names[int(np.argmin(((palette - color) ** 2).sum(axis=1)))]
        if inside(poly.center, rules['eyeBox']):
            # The eye plates cover the eyes, so the light rim of an eye is fur too.
            region = 'fur'
            if luma < rules['eyeLuma']:
                eyes.append(poly.index)
        elif inside(poly.center, rules['noseBox']) and region != 'fur':
            nose.append(poly.index)
        regions.append(region)
    return regions, eyes, nose


def measure_eyes(ob, eye_faces):
    """Gives the middle, the outward normal, and the radius of each eye from its dark faces."""
    out = {}
    for name, side in (('eyeL', 1), ('eyeR', -1)):
        faces = [ob.data.polygons[i] for i in eye_faces if ob.data.polygons[i].center.x * side > 0]
        if not faces:
            raise SystemExit(f'The texture has no dark faces of {name}.')
        area = sum(f.area for f in faces)
        middle = sum((f.center * f.area for f in faces), Vector()) / area
        normal = sum((f.normal * f.area for f in faces), Vector()).normalized()
        corners = [ob.data.vertices[i].co for f in faces for i in f.vertices]
        radius = max((p - middle).length for p in corners)
        out[name] = {'middle': middle[:], 'normal': normal[:], 'radius': radius}
    return out


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


def main():
    config_path, out_path = args()
    with open(config_path) as f:
        config = json.load(f)
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    ob, heads = load(os.path.join(root, config['source']))
    image = base_color_image(ob)
    colors = face_colors(ob, image)
    roles, eye_faces, nose_faces = classify(ob, colors, config['colors'])
    eyes = measure_eyes(ob, eye_faces)
    nose_points = [
        ob.data.vertices[i].co.copy() for f in nose_faces for i in ob.data.polygons[f].vertices
    ]
    if not nose_points:
        raise SystemExit('No face of the nose is in the box of the nose. Check the box.')
    nose = min(nose_points, key=lambda p: p.y)
    source_faces = len(ob.data.polygons)

    # The roles of the source faces carry over to the collapsed mesh by the nearest source face.
    tree = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
    collapse(ob, config['triangles'])
    face_roles = []
    for poly in ob.data.polygons:
        _, _, index, _ = tree.find_nearest(poly.center)
        face_roles.append(roles[index])

    weights = player_weights(ob, config['joints'], config['extraBones'])
    out = {
        'source': config['source'],
        'sourceFaces': source_faces,
        'floor': min(v.co.z for v in ob.data.vertices),
        'top': max(v.co.z for v in ob.data.vertices),
        'vertices': [[round(c, 6) for c in v.co] for v in ob.data.vertices],
        'faces': [list(p.vertices) for p in ob.data.polygons],
        'roles': face_roles,
        'weights': weights,
        'heads': bone_heads(heads, config['joints'], config['extraBones']),
        'eyes': eyes,
        'nose': nose[:],
    }
    with open(out_path, 'w') as f:
        json.dump(out, f)
    counts = {role: face_roles.count(role) for role in sorted(set(face_roles))}
    used = sorted({pair[0] for pairs in weights for pair in pairs})
    print(
        f'rig_body: {source_faces} -> {len(ob.data.polygons)} faces, regions {counts}, '
        f'{len(eye_faces)} eye faces, {len(nose_faces)} nose faces, bones {used}'
    )


main()
