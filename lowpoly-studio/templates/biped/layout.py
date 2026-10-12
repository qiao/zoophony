"""The skeleton of the biped template: the bone names, their order, and their layout.

numpy only. 30 body bones plus one bone for each prop (a child of its hand). Bone names use '_L'
and '_R' so that three.js keeps them. The layout comes from the joints of the config in the bind
pose (the arms raised to the middle of the motion range).

    root
    └─ hips ─┬─ spine ─ spine1 ─ chest ─┬─ neck ─ head ─┬─ ear_L
             │                          │               └─ ear_R
             │                          ├─ clavicle_L ─ upper_arm_L ─ forearm_L ─ forearm_twist_L
             │                          │               └─ hand_L ─ fingers_L (+ props of L)
             │                          └─ clavicle_R ─ upper_arm_R ─ forearm_R ─ forearm_twist_R
             │                                          └─ hand_R ─ fingers_R (+ props of R)
             ├─ thigh_L ─ shin_L ─ foot_L ─ toes_L
             ├─ thigh_R ─ shin_R ─ foot_R ─ toes_R
             └─ tail
"""

import numpy as np

from studio import props
from studio.ik import frame, unit
from templates.biped.solver import BODY_BONES, Skeleton

# Bones that get no weights from bone heat: they own only the meshes that are given to them.
RIGID_ONLY = ('root',)


def bone_order(role):
    """Lists all bones in parent order: each hand prop of the role comes right after the fingers
    of its hand."""
    order = list(BODY_BONES)
    for pr in props.hand_props(role):
        order.insert(order.index(f'fingers_{pr.attach.side}') + 1, pr.name)
    return order


def rigid_only(role):
    """Lists the bones that bone heat leaves out (the root and the hand props)."""
    return RIGID_ONLY + tuple(pr.name for pr in props.hand_props(role))


def layout(cfg, body, role, pose='bind'):
    """Lists the bones: name -> (head, tail, parent, z hint), all in three.js axes."""
    r = cfg.rig
    fwd = np.array([0.0, 0.0, 1.0])
    up = np.array([0.0, 1.0, 0.0])
    sp = {k: np.array([0.0, y, z]) for k, (y, z) in r.spine.items()}
    b = {
        'root': (np.zeros(3), np.array([0.0, 0.0, 0.12]), None, up),
        'hips': (sp['hips'], sp['spine'], 'root', fwd),
        'spine': (sp['spine'], sp['spine1'], 'hips', fwd),
        'spine1': (sp['spine1'], sp['chest'], 'spine', fwd),
        'chest': (sp['chest'], sp['neck'], 'spine1', fwd),
        'neck': (sp['neck'], sp['head'], 'chest', fwd),
        'head': (sp['head'], sp['head_end'], 'neck', fwd),
        'tail': (np.array(r.tail_bone[0]), np.array(r.tail_bone[1]), 'hips', up),
    }
    joints, frames = body.arm_pose(pose)
    for side, s in ((1, 'L'), (-1, 'R')):
        m = np.array([side, 1.0, 1.0])
        J = {k: v * m for k, v in joints.items()}
        F = {k: np.diag(m) @ v for k, v in frames.items()}
        hand_dir = (J['knuckle'] - J['wrist']) / np.linalg.norm(J['knuckle'] - J['wrist'])
        b[f'clavicle_{s}'] = (J['clavicle'], J['shoulder'], 'chest', fwd)
        b[f'upper_arm_{s}'] = (J['shoulder'], J['elbow'], f'clavicle_{s}', F['upper'][:, 2])
        # The forearm bends at the elbow. The twist bone, from the middle of the forearm to the
        # wrist, takes the twist of the paw, so the elbow skin does not twist.
        mid = 0.5 * (J['elbow'] + J['wrist'])
        b[f'forearm_{s}'] = (J['elbow'], mid, f'upper_arm_{s}', F['fore'][:, 2])
        b[f'forearm_twist_{s}'] = (mid, J['wrist'], f'forearm_{s}', F['fore'][:, 2])
        b[f'hand_{s}'] = (J['wrist'], J['knuckle'], f'forearm_twist_{s}', F['hand'][:, 2])
        b[f'fingers_{s}'] = (J['knuckle'], J['knuckle'] + hand_dir * r.fingers_length,
                             f'hand_{s}', F['hand'][:, 2])
        L = {k: v * m for k, v in body.leg_pose(pose)[0].items()}
        b[f'thigh_{s}'] = (L['hip'], L['knee'], 'hips', fwd)
        b[f'shin_{s}'] = (L['knee'], L['ankle'], f'thigh_{s}', fwd)
        b[f'foot_{s}'] = (L['ankle'], L['ball'], f'shin_{s}', up)
        b[f'toes_{s}'] = (L['ball'], L['toe'], f'foot_{s}', up)
        ec = np.array(cfg.field.ears.center) * m
        e0, e1 = r.ear_bone
        b[f'ear_{s}'] = (ec + np.array([e0[0] * side, e0[1], e0[2]]),
                         ec + np.array([e1[0] * side, e1[1], e1[2]]), 'head', fwd)
    for pr in props.hand_props(role):
        _, grip, tip = props.make(body, pr, pose)
        b[pr.name] = (grip, tip, f'hand_{pr.attach.side}', up)
    return b


def skeleton_extras(role, rests, bones):
    """Collects the rest directions that the pose solver needs: the fingers and the palm of each
    hand, and the axis of each prop."""
    extras = {}
    for side in ('L', 'R'):
        r = rests[f'hand_{side}']
        extras[f'fingers_{side}'] = r[:, 1]
        extras[f'palm_{side}'] = r[:, 2]
    for pr in props.hand_props(role):
        grip, tip = bones[pr.name][0], bones[pr.name][1]
        d = tip - grip
        extras[f'{pr.name}_{pr.attach.side}'] = d / np.linalg.norm(d)
    return extras


def rest_skeleton(cfg, body, role):
    """Builds the rest skeleton from the layout, with the same bone frames as Blender (no
    Blender needed). The motion packs and the 4/4 plot use it."""
    bones = layout(cfg, body, role, 'bind')
    names = bone_order(role)
    parents = {n: bones[n][2] for n in names}
    heads = {n: bones[n][0] for n in names}
    rests = {}
    for n in names:
        head, tail, _, zhint = bones[n]
        y = unit(tail - head)
        f = frame(y, zhint)
        rests[n] = np.stack([np.cross(y, f[:, 1]), y, f[:, 1]], axis=1)
    extras = {}
    for side in ('L', 'R'):
        r = rests[f'hand_{side}']
        extras[f'fingers_{side}'] = r[:, 1]
        extras[f'palm_{side}'] = r[:, 2]
    for pr in props.hand_props(role):
        extras[f'{pr.name}_{pr.attach.side}'] = unit(bones[pr.name][1] - bones[pr.name][0])
    return Skeleton(names, parents, heads, rests, extras, cfg.rig), bones
