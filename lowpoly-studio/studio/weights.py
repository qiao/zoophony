"""Generic rig helpers: the armature from a bone layout, bone heat, and skin weight arrays.

The template gives the bone layout and the weight rules (templates/<name>/rig.py). Weights are
arrays (vertices, bones) in the bone order of the armature.
"""

import bpy
import numpy as np

from studio.mesh import select_only, to_blender


def create_armature(order, bones, name):
    """Creates the armature object from a layout {bone: (head, tail, parent, z hint)} (three.js
    axes), with the bones in the given order. Returns the object."""
    arm_data = bpy.data.armatures.new(name)
    arm = bpy.data.objects.new(name, arm_data)
    bpy.context.scene.collection.objects.link(arm)
    select_only(arm)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones
    for bname in order:
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


def bind_with_heat(arm, body_obj, rigid_only):
    """Parents the body to the armature with bone heat weights (rigid-only bones excluded)."""
    for name in rigid_only:
        arm.data.bones[name].use_deform = False
    for o in bpy.context.scene.objects:
        o.select_set(False)
    body_obj.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    for name in rigid_only:
        arm.data.bones[name].use_deform = True
    missing = [b.name for b in arm.data.bones
               if b.name not in rigid_only and b.name not in body_obj.vertex_groups]
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


def write_first_weights(obj, bone_names, w, n):
    """Writes the weights of the first n vertices of a joined mesh (the body), and keeps the
    weights of the rest (the details)."""
    body_idx = list(range(n))
    for j, name in enumerate(bone_names):
        g = obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
        g.remove(body_idx)
        for i in np.nonzero(w[:, j] > 1e-4)[0]:
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


def repair_folds(w, tris, folded, neighbors, rings=1, rounds=4, amount=0.6):
    """Smooths the weights around the faces that fold over in a clip.

    A face folds when its corners take weights of bones that turn far apart, with a sharp step
    between them. Smoothing over the corners of each folded face and their neighbors (rings deep)
    spreads that step over more faces, so each face turns less. The repair stays small (one ring),
    because a wide smoothing near an elbow moves the forearm skin into the body.
    """
    mask = np.zeros(len(w))
    front = set(int(v) for f in folded for v in tris[f])
    seen = set(front)
    for _ in range(rings):
        nxt = set()
        for v in front:
            nxt.update(n for n in neighbors[v] if n not in seen)
        seen |= nxt
        front = nxt
    mask[list(seen)] = amount
    return limit_and_normalize(smooth_weights(w, neighbors, rounds, mask))


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
