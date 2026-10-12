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
    """Blurs weights over mesh edges, which softens the bands that bone heat leaves.

    amount: one value, or one value for each vertex.
    """
    a = np.broadcast_to(np.asarray(amount, float), (len(w),))[:, None]
    for _ in range(rounds):
        avg = np.zeros_like(w)
        for i, nb in enumerate(neighbors):
            avg[i] = w[nb].mean(axis=0) if nb else w[i]
        w = (1 - a) * w + a * avg
    return w


def armpit_mask(points):
    """Weights (0..1) of the region under each shoulder, where the arm meets the chest."""
    p = np.asarray(points, float)
    joints, _ = body.arm_pose('bind')
    s = joints['shoulder']
    out = np.zeros(len(p))
    for side in (1, -1):
        c = np.array([s[0] * side * 1.08, s[1] - 0.12, s[2]])
        d = np.linalg.norm((p - c) / np.array([0.08, 0.1, 0.1]), axis=1)
        out = np.maximum(out, np.clip(1.6 - d, 0.0, 1.0))
    return out


def vertex_neighbors(obj):
    """Lists the edge neighbors of each vertex."""
    nb = [[] for _ in obj.data.vertices]
    for e in obj.data.edges:
        a, b = e.vertices
        nb[a].append(b)
        nb[b].append(a)
    return nb


def head_rigidity(points):
    """Weights (0..1) of the places that must move only with the head: the muzzle and the face.

    Bone heat gives the low muzzle some weight of the neck. Then the details on the muzzle
    (the mouth line, the nose) and the muzzle part ways when the neck bends.
    """
    p = np.asarray(points, float)
    c, r = body.HEAD['muzzle']
    q = (p - np.array(c)) / (np.array(r) * 1.45)
    muzzle = 1.0 - np.clip((np.sqrt(np.sum(q * q, axis=1)) - 0.8) / 0.4, 0.0, 1.0)
    cc, cr = body.HEAD['cranium']
    q = (p - np.array(cc)) / (np.array(cr) * 1.05)
    cranium = 1.0 - np.clip((np.sqrt(np.sum(q * q, axis=1)) - 0.85) / 0.3, 0.0, 1.0)
    cranium *= np.clip((p[:, 1] - 0.80) / 0.04, 0.0, 1.0)
    return np.maximum(muzzle, cranium)


# The spine bones that carry the trunk, and the heights of their centers.
SPINE_BANDS = ('hips', 'spine', 'spine1', 'chest')


def trunk_weights(points, w_heat, names):
    """Replaces the bone heat weights of the trunk with bands along the spine.

    Bone heat gives the front of the big belly weight from the thighs, the clavicles, and the
    upper arms, because those bones are nearer to it than the spine. Then the belly folds when a
    leg or an arm moves. The trunk therefore takes weights by height: each vertex blends the two
    spine bones whose centers are above and below it. The arms, the legs, the tail, and the head
    keep the bone heat weights, with soft borders.
    """
    p = np.asarray(points, float)
    col = {n: i for i, n in enumerate(names)}
    sp = body.SPINE
    keys = ['hips', 'spine', 'spine1', 'chest', 'neck']
    centers = [0.5 * (sp[a][0] + sp[b][0]) for a, b in zip(keys[:-1], keys[1:])]
    band = np.zeros_like(w_heat)
    y = p[:, 1]
    for k, bone in enumerate(SPINE_BANDS):
        lo = centers[k - 1] if k > 0 else -1.0
        hi = centers[k + 1] if k + 1 < len(centers) else 2.0
        c = centers[k]
        up = np.clip((y - lo) / (c - lo), 0, 1) if k > 0 else np.ones_like(y)
        down = np.clip((hi - y) / (hi - c), 0, 1) if k + 1 < len(centers) else np.ones_like(y)
        band[:, col[bone]] = np.minimum(up, down)
    band /= band.sum(axis=1, keepdims=True)

    def heat(bones):
        return w_heat[:, [col[b] for b in bones]].sum(axis=1)

    arm = heat([f'{b}_{s}' for s in 'LR' for b in ('clavicle', 'upper_arm', 'forearm', 'hand',
                                                    'fingers')])
    keep_arm = np.clip((arm - 0.35) / 0.3, 0, 1)
    keep_tail = np.clip((heat(['tail']) - 0.2) / 0.3, 0, 1)
    keep_head = np.clip((y - 0.74) / 0.05, 0, 1)
    keep_leg = np.zeros(len(p))
    for side in (1, -1):
        hip = np.array(body.LEG['hip']) * np.array([side, 1, 1])
        knee = np.array(body.LEG['knee']) * np.array([side, 1, 1])
        seg = knee - hip
        t = np.clip((p - hip) @ seg / (seg @ seg), 0, 1)
        d = np.linalg.norm(p - (hip + t[:, None] * seg), axis=1)
        inside = np.clip((0.118 - d) / 0.04, 0, 1) * np.clip((0.29 - y) / 0.05, 0, 1)
        keep_leg = np.maximum(keep_leg, inside)
    keep_leg = np.maximum(keep_leg, np.clip((0.19 - y) / 0.03, 0, 1))
    keep = np.maximum.reduce([keep_arm, keep_tail, keep_head, keep_leg])
    return w_heat * keep[:, None] + band * (1 - keep)[:, None]


def force_bone(w, names, bone, amount, keep=()):
    """Moves the weight of each vertex toward one bone by amount (0..1 per vertex).

    The bones in keep (such as the ears) keep their weight.
    """
    w = w.copy()
    j = names.index(bone)
    kept = np.zeros(len(w))
    for k in keep:
        kept += w[:, names.index(k)]
    free = np.clip(1.0 - kept, 0.0, 1.0)
    target = np.zeros_like(w)
    for k in keep:
        target[:, names.index(k)] = w[:, names.index(k)]
    target[:, j] += free
    a = np.asarray(amount)[:, None]
    return w * (1 - a) + target * a


def rigid_group(obj, bone):
    """Gives all vertices of obj to one bone."""
    g = obj.vertex_groups.new(name=bone)
    g.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
