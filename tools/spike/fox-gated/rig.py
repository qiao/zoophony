"""Adds a skeleton to the low-poly fox, skins it with automatic weights, poses it, and exports a
GLB file.

    blender -b --factory-startup --python tools/spike/fox-gated/rig.py -- \
        --lowpoly <lowpoly.blend> --out <dir>

The skeleton fits the seated mesh: hips, spine, chest, neck, head, a shoulder, an upper arm, a
forearm, and a hand on each side, a thigh, a shin, and a foot on each side, and four tail bones.
Blender bone heat ("automatic weights") gives the weights. Then a part mask removes the
weights of bones that the nearest blockout part of a vertex does not allow (`mask_weights`;
`FOX_MASK=0` turns it off). A paw follows only its hand bone. Each vertex keeps at most 4
bones, and its weights add up to 1. The eyes follow the head with a weight of 1.

The script writes `<dir>/rigged.blend` (armature `FoxRig` with the child mesh `FoxLow`), the
pose files `<dir>/pose-<name>.blend` for `render_views.py`, and three GLB files:
`fox.glb` (a material for each palette color), `fox-colors.glb` (a color attribute), and
`fox-meshopt.glb` (a material for each color, with meshopt compression).
"""

import argparse
import gzip
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

#: The bones: (name, head, tail, parent). Meters in fox coordinates (see `sheet_camera.py`).
BONES = [
    ('hips', (0.0, -0.03, 0.42), (0.0, -0.04, 0.55), None),
    ('spine', (0.0, -0.04, 0.55), (0.0, -0.05, 0.70), 'hips'),
    ('chest', (0.0, -0.05, 0.70), (0.0, -0.05, 0.82), 'spine'),
    ('neck', (0.0, -0.05, 0.82), (0.0, -0.07, 0.95), 'chest'),
    ('head', (0.0, -0.07, 0.95), (0.0, -0.09, 1.20), 'neck'),
    ('shoulder.R', (-0.04, -0.05, 0.80), (-0.14, -0.05, 0.77), 'chest'),
    ('upper_arm.R', (-0.14, -0.05, 0.77), (-0.20, -0.08, 0.655), 'shoulder.R'),
    ('forearm.R', (-0.20, -0.08, 0.655), (-0.04, -0.28, 0.75), 'upper_arm.R'),
    ('hand.R', (-0.04, -0.28, 0.75), (0.04, -0.30, 0.75), 'forearm.R'),
    ('shoulder.L', (0.04, -0.05, 0.80), (0.14, -0.05, 0.77), 'chest'),
    ('upper_arm.L', (0.14, -0.05, 0.77), (0.245, -0.19, 0.68), 'shoulder.L'),
    ('forearm.L', (0.245, -0.19, 0.68), (0.37, -0.37, 0.79), 'upper_arm.L'),
    ('hand.L', (0.37, -0.37, 0.79), (0.40, -0.41, 0.84), 'forearm.L'),
    ('thigh.R', (-0.09, 0.0, 0.45), (-0.13, -0.28, 0.42), 'hips'),
    ('shin.R', (-0.13, -0.28, 0.42), (-0.05, -0.24, 0.15), 'thigh.R'),
    ('foot.R', (-0.05, -0.24, 0.15), (-0.05, -0.34, 0.13), 'shin.R'),
    ('thigh.L', (0.09, 0.0, 0.45), (0.13, -0.25, 0.42), 'hips'),
    ('shin.L', (0.13, -0.25, 0.42), (0.075, -0.24, 0.15), 'thigh.L'),
    ('foot.L', (0.075, -0.24, 0.15), (0.075, -0.34, 0.13), 'shin.L'),
    ('tail.1', (-0.04, 0.10, 0.42), (-0.12, 0.12, 0.45), 'hips'),
    ('tail.2', (-0.12, 0.12, 0.45), (-0.19, 0.13, 0.47), 'tail.1'),
    ('tail.3', (-0.19, 0.13, 0.47), (-0.25, 0.12, 0.45), 'tail.2'),
    ('tail.4', (-0.25, 0.12, 0.45), (-0.33, 0.10, 0.41), 'tail.3'),
]

#: The test poses: (name, [(bone, world axis, degrees)]). Each turn is about the bone head.
POSES = [
    ('arm-raised', [('upper_arm.R', (1.0, 0.0, 0.0), -95.0), ('forearm.R', (0.0, 0.0, 1.0), -150.0)]),
    ('head-turned', [('head', (0.0, 0.0, 1.0), 30.0)]),
    ('bow-moved', [('upper_arm.R', (0.0, 0.0, 1.0), -25.0), ('upper_arm.R', (1.0, 0.0, 0.0), -15.0),
                   ('forearm.R', (0.0, 0.0, 1.0), 35.0)]),
    ('paws-turned', [('hand.L', (0.0, 0.0, 1.0), 40.0), ('hand.R', (1.0, 0.0, 0.0), -40.0)]),
]


#: True to keep, for each vertex, only the bones that its nearest part allows (`mask_weights`).
MASK = os.environ.get('FOX_MASK', '1') == '1'


def args():
    """Reads the arguments after `--`."""
    p = argparse.ArgumentParser()
    p.add_argument('--lowpoly', required=True)
    p.add_argument('--out', required=True)
    return p.parse_args(sys.argv[sys.argv.index('--') + 1:])


def build_armature():
    """Makes the armature `FoxRig` in edit mode from `BONES`."""
    arm = bpy.data.armatures.new('FoxRig')
    rig = bpy.data.objects.new('FoxRig', arm)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for name, head, tail, parent in BONES:
        eb = arm.edit_bones.new(name)
        eb.head = head
        eb.tail = tail
        if parent:
            eb.parent = arm.edit_bones[parent]
            eb.use_connect = (Vector(head) - Vector(arm.edit_bones[parent].tail)).length < 1e-6
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


def split_eyes(mesh):
    """Moves the eye faces into a new object. Bone heat fails on the small loose eye islands."""
    import bmesh

    eyes = mesh.copy()
    eyes.data = mesh.data.copy()
    eyes.name = 'FoxEyes'
    bpy.context.scene.collection.objects.link(eyes)
    for ob, keep_eyes in ((mesh, False), (eyes, True)):
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        layer = bm.faces.layers.int.get('eye')
        kill = [f for f in bm.faces if bool(f[layer]) != keep_eyes]
        bmesh.ops.delete(bm, geom=kill, context='FACES')
        bm.to_mesh(ob.data)
        bm.free()
    return eyes


def allowed_bones(part):
    """Gives the bones that may move the vertices of one part of `fox_parts.PARTS`."""
    side = part[-2:] if part[-2:] in ('.L', '.R') else ''
    if part in ('cranium', 'face', 'cheeks', 'muzzle') or part.startswith(('tuft', 'ear')):
        return {'head', 'neck'}
    if part == 'neck':
        return {'neck', 'chest', 'head', 'spine'}
    if part == 'chest':
        return {'chest', 'spine', 'neck', 'shoulder.L', 'shoulder.R'}
    if part == 'pelvis':
        return {'hips', 'spine', 'chest', 'thigh.L', 'thigh.R', 'tail.1'}
    if part.startswith('upper_arm'):
        return {'shoulder' + side, 'upper_arm' + side, 'forearm' + side, 'chest'}
    if part.startswith('paw'):
        # Bone heat gives most of the left paw to the forearm, so the paw did not turn with the
        # wrist. The paw is rigid on its hand bone, and the end of the forearm bends at the wrist.
        return {'hand' + side}
    if part.startswith('forearm'):
        return {'upper_arm' + side, 'forearm' + side, 'hand' + side}
    if part.startswith('thigh'):
        return {'hips', 'thigh' + side, 'shin' + side}
    if part.startswith(('shin', 'foot')):
        return {'thigh' + side, 'shin' + side, 'foot' + side}
    return {'hips', 'tail.1', 'tail.2', 'tail.3', 'tail.4'}


def mask_weights(mesh, rig):
    """Removes the weights of the bones that the nearest part of a vertex does not allow.

    Bone heat gives a chest vertex weight on the forearm when the forearm rests in front of
    the chest, and a raised arm then pulls the chest skin with it. A vertex with no weight left
    goes to the nearest allowed bone.
    """
    import numpy as np

    import fox_parts

    points = np.array([v.co[:] for v in mesh.data.vertices], np.float32)
    fields = np.stack([fox_parts.part_sdf(points, p) for p in fox_parts.PARTS], -1)
    nearest = fields.argmin(-1)
    names = {g.index: g.name for g in mesh.vertex_groups}
    removed = 0
    for v, k in zip(mesh.data.vertices, nearest):
        allowed = allowed_bones(fox_parts.PARTS[k][0])
        # Read the group indices first: a removal changes `v.groups` under a running loop.
        drop = [g.group for g in v.groups if names[g.group] not in allowed]
        for index in drop:
            mesh.vertex_groups[index].remove([v.index])
        removed += len(drop)
        if not any(g.weight > 0 for g in v.groups):
            best = min(allowed, key=lambda b: bone_distance(rig, b, v.co))
            mesh.vertex_groups[best].add([v.index], 1.0, 'REPLACE')
    print('mask: removed weights', removed)


def bone_distance(rig, name, p):
    """Gives the distance from a point to the segment of a bone in its rest place."""
    bone = rig.data.bones[name]
    a = bone.head_local
    ab = bone.tail_local - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (a + ab * t - p).length


def skin(mesh, rig):
    """Binds the mesh with automatic weights, keeps 4 bones for each vertex, and normalizes."""
    eyes = split_eyes(mesh)
    for ob in bpy.context.view_layer.objects:
        ob.select_set(False)
    mesh.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    if MASK:
        mask_weights(mesh, rig)
    group = eyes.vertex_groups.new(name='head')
    group.add(list(range(len(eyes.data.vertices))), 1.0, 'REPLACE')
    for ob in bpy.context.view_layer.objects:
        ob.select_set(False)
    eyes.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.join()
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
    empty = sum(1 for v in mesh.data.vertices if not v.groups)
    most = max(len(v.groups) for v in mesh.data.vertices)
    print('skin: vertices', len(mesh.data.vertices), 'without weights', empty, 'most bones', most)


def pose(rig, turns):
    """Sets a pose: each turn rotates a bone about a world axis through its head."""
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    for name, axis, degrees in turns:
        pb = rig.pose.bones[name]
        head = pb.head.copy()
        r = Matrix.Translation(head) @ Matrix.Rotation(math.radians(degrees), 4, Vector(axis)) \
            @ Matrix.Translation(-head)
        pb.matrix = r @ pb.matrix
        bpy.context.view_layer.update()


def palette_materials(mesh):
    """Gives each face the material of its color: one flat material for each palette color.

    A material for each color removes the color attribute from the GLB file. Faces of one
    color share their vertices, and only the vertices on a color border are doubled.
    """
    colors = mesh.data.color_attributes['Col']
    index = {}
    mesh.data.materials.clear()
    for poly in mesh.data.polygons:
        c = tuple(round(v, 3) for v in colors.data[poly.loop_indices[0]].color_srgb[:3])
        if c not in index:
            mat = bpy.data.materials.new('Palette%d' % len(index))
            bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
            linear = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
            bsdf.inputs['Base Color'].default_value = linear + [1.0]
            bsdf.inputs['Roughness'].default_value = 0.85
            mesh.data.materials.append(mat)
            index[c] = len(index)
        poly.material_index = index[c]
    return len(index)


def export_glb(rig, mesh, path, palette, meshopt):
    """Exports the armature and the skinned mesh as a GLB file.

    With `palette`, each palette color is a material and the file has no color attribute.
    Else the face colors go into the attribute COLOR_0. With `meshopt`, the buffers use the
    extension EXT_meshopt_compression (three.js reads it with its `MeshoptDecoder`).
    """
    for ob in bpy.context.view_layer.objects:
        ob.select_set(False)
    rig.select_set(True)
    mesh.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_skins=True, export_animations=False, export_normals=False,
                              export_texcoords=False,
                              export_materials='EXPORT' if palette else 'NONE',
                              export_vertex_color='NONE' if palette else 'ACTIVE',
                              export_all_vertex_colors=False,
                              export_meshopt_compression_enable=meshopt)
    size = os.path.getsize(path)
    packed = len(gzip.compress(open(path, 'rb').read(), 9))
    print('glb', os.path.basename(path), 'bytes', size, 'gzip', packed)


def main():
    opt = args()
    os.makedirs(opt.out, exist_ok=True)
    out = os.path.abspath(opt.out)
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(opt.lowpoly))
    mesh = bpy.data.objects['FoxLow']
    rig = build_armature()
    skin(mesh, rig)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, 'rigged.blend'))
    export_glb(rig, mesh, os.path.join(out, 'fox-colors.glb'), palette=False, meshopt=False)
    colors = palette_materials(mesh)
    print('palette colors', colors)
    export_glb(rig, mesh, os.path.join(out, 'fox.glb'), palette=True, meshopt=False)
    export_glb(rig, mesh, os.path.join(out, 'fox-meshopt.glb'), palette=True, meshopt=True)
    for name, turns in POSES:
        pose(rig, turns)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, 'pose-%s.blend' % name), copy=True)
    print('bones', len(rig.data.bones))


main()
