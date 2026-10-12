"""The skeleton of the bear conductor: bone layout, armature creation, and skin weights.

The layout comes from the measured joints of body.py, in the bind pose (arms raised to the
middle of the conducting range). Bone names use '_L' and '_R' so that three.js keeps them.
"""

import bpy
import numpy as np

import body
import details
from mesh import select_only, to_blender

# Bones that get no weights from bone heat. They own only the meshes that are given to them.
RIGID_ONLY = ('root', 'baton')

# The mean lengths of each bone for a bear 1 unit tall are in the layout; the order is the
# parent order.
BONE_ORDER = [
    'root', 'hips', 'spine', 'spine1', 'chest', 'neck', 'head', 'ear_L', 'ear_R',
    'clavicle_L', 'upper_arm_L', 'forearm_L', 'hand_L', 'fingers_L',
    'clavicle_R', 'upper_arm_R', 'forearm_R', 'hand_R', 'fingers_R', 'baton',
    'thigh_L', 'shin_L', 'foot_L', 'toes_L', 'thigh_R', 'shin_R', 'foot_R', 'toes_R', 'tail',
]


def layout(pose='bind'):
    """Lists the bones: name -> (head, tail, parent, z hint), all in three.js axes."""
    fwd = np.array([0.0, 0.0, 1.0])
    up = np.array([0.0, 1.0, 0.0])
    sp = {k: np.array([0.0, y, z]) for k, (y, z) in body.SPINE.items()}
    b = {
        'root': (np.zeros(3), np.array([0.0, 0.0, 0.12]), None, up),
        'hips': (sp['hips'], sp['spine'], 'root', fwd),
        'spine': (sp['spine'], sp['spine1'], 'hips', fwd),
        'spine1': (sp['spine1'], sp['chest'], 'spine', fwd),
        'chest': (sp['chest'], sp['neck'], 'spine1', fwd),
        'neck': (sp['neck'], sp['head'], 'chest', fwd),
        'head': (sp['head'], sp['head_end'], 'neck', fwd),
        'tail': (np.array([0.0, 0.265, -0.12]), np.array([0.0, 0.235, -0.175]), 'hips', up),
    }
    joints, frames = body.arm_pose(pose)
    for side, s in ((1, 'L'), (-1, 'R')):
        m = np.array([side, 1.0, 1.0])
        J = {k: v * m for k, v in joints.items()}
        F = {k: np.diag(m) @ v for k, v in frames.items()}
        hand_dir = (J['knuckle'] - J['wrist']) / np.linalg.norm(J['knuckle'] - J['wrist'])
        b[f'clavicle_{s}'] = (J['clavicle'], J['shoulder'], 'chest', fwd)
        b[f'upper_arm_{s}'] = (J['shoulder'], J['elbow'], f'clavicle_{s}', F['upper'][:, 2])
        b[f'forearm_{s}'] = (J['elbow'], J['wrist'], f'upper_arm_{s}', F['fore'][:, 2])
        b[f'hand_{s}'] = (J['wrist'], J['knuckle'], f'forearm_{s}', F['hand'][:, 2])
        b[f'fingers_{s}'] = (J['knuckle'], J['knuckle'] + hand_dir * 0.045, f'hand_{s}',
                             F['hand'][:, 2])
        L = {k: np.array(v) * m for k, v in body.LEG.items()}
        b[f'thigh_{s}'] = (L['hip'], L['knee'], 'hips', fwd)
        b[f'shin_{s}'] = (L['knee'], L['ankle'], f'thigh_{s}', fwd)
        b[f'foot_{s}'] = (L['ankle'], L['ball'], f'shin_{s}', up)
        b[f'toes_{s}'] = (L['ball'], L['toe'], f'foot_{s}', up)
        ec, er = body.HEAD['ear']
        ec = np.array(ec) * m
        b[f'ear_{s}'] = (ec + np.array([-0.012 * side, -0.03, -0.005]), ec + np.array([0.004 * side, 0.03, 0.0]),
                         'head', fwd)
    _, grip, tip = details.baton(pose)
    b['baton'] = (grip, tip, 'hand_R', up)
    return b


def create_armature(bones, name='BearRig'):
    """Creates the armature object from a layout. Returns the object."""
    arm_data = bpy.data.armatures.new(name)
    arm = bpy.data.objects.new(name, arm_data)
    bpy.context.scene.collection.objects.link(arm)
    select_only(arm)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones
    for bname in BONE_ORDER:
        head, tail, parent, zhint = bones[bname]
        e = eb.new(bname)
        e.head = to_blender(head)
        e.tail = to_blender(tail)
        e.align_roll(to_blender(zhint))
        if parent:
            e.parent = eb[parent]
            e.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    for bone in arm_data.bones:
        bone.use_deform = True
    return arm


def bind_with_heat(arm, body_obj):
    """Parents the body to the armature with bone heat weights (rigid-only bones excluded)."""
    for name in RIGID_ONLY:
        arm.data.bones[name].use_deform = False
    for o in bpy.context.scene.objects:
        o.select_set(False)
    body_obj.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    for name in RIGID_ONLY:
        arm.data.bones[name].use_deform = True
    missing = [b.name for b in arm.data.bones
               if b.name not in RIGID_ONLY and b.name not in body_obj.vertex_groups]
    return missing


def weight_table(obj, bone_names):
    """Reads the weights of a mesh into an array (vertices, bones)."""
    index = {g.index: bone_names.index(g.name) for g in obj.vertex_groups if g.name in bone_names}
    w = np.zeros((len(obj.data.vertices), len(bone_names)))
    for v in obj.data.vertices:
        for g in v.groups:
            if g.group in index:
                w[v.index, index[g.group]] = g.weight
    return w


def write_weights(obj, bone_names, w):
    """Writes an array of weights (vertices, bones) back into the vertex groups."""
    for name in bone_names:
        if name not in obj.vertex_groups:
            obj.vertex_groups.new(name=name)
    groups = [obj.vertex_groups[name] for name in bone_names]
    all_idx = list(range(len(obj.data.vertices)))
    for g in groups:
        g.remove(all_idx)
    for j, g in enumerate(groups):
        nz = np.nonzero(w[:, j] > 1e-4)[0]
        for i in nz:
            g.add([int(i)], float(w[i, j]), 'REPLACE')


def limit_and_normalize(w, keep=4):
    """Keeps the largest influences of each vertex and makes them sum to 1."""
    w = w.copy()
    if w.shape[1] > keep:
        idx = np.argsort(w, axis=1)[:, :-keep]
        np.put_along_axis(w, idx, 0.0, axis=1)
    s = w.sum(axis=1, keepdims=True)
    return np.where(s > 0, w / np.maximum(s, 1e-9), w)


def smooth_weights(w, neighbors, rounds=2, amount=0.5):
    """Blurs weights over mesh edges, which softens the bands that bone heat leaves."""
    for _ in range(rounds):
        avg = np.zeros_like(w)
        for i, nb in enumerate(neighbors):
            avg[i] = w[nb].mean(axis=0) if nb else w[i]
        w = (1 - amount) * w + amount * avg
    return w


def vertex_neighbors(obj):
    """Lists the edge neighbors of each vertex."""
    nb = [[] for _ in obj.data.vertices]
    for e in obj.data.edges:
        a, b = e.vertices
        nb[a].append(b)
        nb[b].append(a)
    return nb


def rigid_group(obj, bone):
    """Gives all vertices of obj to one bone."""
    g = obj.vertex_groups.new(name=bone)
    g.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
