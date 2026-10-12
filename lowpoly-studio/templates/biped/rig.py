"""The skin weights of the biped: bone heat, then weight rules whose places come from the config.

numpy only (the bone heat itself is in studio/weights.py). The rules, in the order of weights():

1. trunk_weights: the trunk takes bands along the spine; the limbs, the tail, and the head keep
   bone heat.
2. trunk_owned, arm_owned: the forearm, paw, and twist weights stay on their own parts.
3. Smoothing: everywhere, under the shoulders, and around the shoulders, elbows, and wrists.
4. chain_limits: each child bone of a limb stops at the middle of its parent, and a parent stops
   past the middle of its child.
5. throat_to_neck: no clavicle weight on the throat, no head weight on the shoulder tops.
6. The face and the muzzle move only with the head, the ears give their body weight to the head,
   and the crotch moves only with the hips.
7. digit_weights: with digits ([rig] fingers > 1), the front of each paw goes to its digits.
8. At most 4 influences for each vertex.
"""

import numpy as np

from studio.weights import force_bone, limit_and_normalize, smooth_weights
from templates.biped.solver import is_finger

# The limb chains: each child bone loses its weight above the middle of its parent bone.
CHAINS = (('upper_arm', 'forearm'), ('forearm', 'forearm_twist'), ('forearm_twist', 'hand'),
          ('hand', 'fingers'),
          # In the bind pose a raised paw lies near the upper arm, so bone heat gives the skin of
          # the upper arm some twist, paw, and finger weight.
          ('upper_arm', 'forearm_twist'), ('upper_arm', 'hand'), ('upper_arm', 'fingers'),
          ('thigh', 'shin'), ('shin', 'foot'), ('foot', 'toes'))

# The parent limits: a parent bone loses its weight beyond the middle of its child bone. On the
# twist chain no face of the wrist then mixes the forearm (no twist), the twist bone (half), and
# the paw (all of it), and no stray upper arm weight from the smoothing reaches the wrist.
PARENT_LIMITS = (('upper_arm', 'forearm'), ('forearm', 'forearm_twist'))

# The spine bones that carry the trunk.
SPINE_BANDS = ('hips', 'spine', 'spine1', 'chest')

# The digits of a paw ([rig] fingers > 1) take its weight from this far behind their heads.
DIGIT_RAMP = 0.02


def cols_of(base, side, names):
    """Lists the columns of a bone kind of one side: 'fingers' is every finger bone of the paw
    (one, or the digits of role.toml [rig] fingers)."""
    if base == 'fingers':
        return [i for i, n in enumerate(names) if is_finger(n) and n.endswith('_' + side)]
    return [names.index(f'{base}_{side}')]


def trunk_owned(points, parts, w, names):
    """Removes the forearm, hand, and finger weights from the skin of the trunk.

    In the bind pose a raised forearm can lie near the side of the trunk, so bone heat gives the
    trunk some forearm weight, and the trunk folds when the elbow bends. A vertex that is nearer
    to the trunk part than to the forearm parts loses these weights (fully at 0.02).
    """
    p = np.asarray(points, float)
    w = w.copy()
    col = {n: i for i, n in enumerate(names)}
    trunk = [q for q in parts if q.name == 'trunk'][0].fn(p)
    for side, sign in (('L', 1.0), ('R', -1.0)):
        low = [q for q in parts if q.name in ('forearm', 'forearm_bulge', 'paw')
               and np.sign(0.5 * (q.lo[0] + q.hi[0])) == sign]
        d_low = np.min([q.fn(p) for q in low], axis=0)
        drop = np.clip((d_low - trunk) / 0.02, 0.0, 1.0)
        for bone in ('forearm', 'forearm_twist', 'hand', 'fingers'):
            w[:, cols_of(bone, side, names)] *= (1.0 - drop)[:, None]
    s = w.sum(axis=1, keepdims=True)
    return w / np.maximum(s, 1e-9)


def arm_owned(points, parts, w, names):
    """Keeps the paw and the twist weights on their own parts of the arm.

    In the bind pose a raised paw can lie near the end of the upper arm, so bone heat gives the
    upper arm skin there some paw and twist weight, and a face with upper arm, twist, and paw
    weight folds over when the wrist turns. A vertex nearer to the upper arm or the forearm part
    than to the paw part loses its paw and finger weight, and a vertex nearer to the upper arm
    part than to the forearm part loses its twist weight (fully at 0.02).
    """
    p = np.asarray(points, float)
    w = w.copy()
    col = {n: i for i, n in enumerate(names)}
    for side, sign in (('L', 1.0), ('R', -1.0)):
        def dist(kinds):
            own = [q for q in parts if q.name in kinds
                   and np.sign(0.5 * (q.lo[0] + q.hi[0])) == sign]
            return np.min([q.fn(p) for q in own], axis=0)

        d_up = dist(('upper_arm', 'deltoid'))
        d_fore = dist(('forearm', 'forearm_bulge'))
        d_paw = dist(('paw',))
        drop = np.clip((d_paw - np.minimum(d_up, d_fore)) / 0.02, 0.0, 1.0)
        for bone in ('hand', 'fingers'):
            w[:, cols_of(bone, side, names)] *= (1.0 - drop)[:, None]
        drop = np.clip((d_fore - d_up) / 0.02, 0.0, 1.0)
        w[:, col[f'forearm_twist_{side}']] *= 1.0 - drop
    s = w.sum(axis=1, keepdims=True)
    return w / np.maximum(s, 1e-9)


def chain_limits(points, w, names, bones):
    """Keeps the weight of each child bone of a limb below the middle of its parent bone.

    Bone heat and the smoothing spread, for example, hand weight up the short forearm to the
    elbow. Then the twist of the paw twists the elbow skin, and it folds. Here the weight of the
    child falls from 1 to 0 between 0.85 and 0.45 of the parent bone (from its head), for the skin
    near the parent bone (within 0.13). The twist weight starts later (0.7): a face of the inner
    elbow with upper arm and twist weight folds over when the paw turns.
    """
    p = np.asarray(points, float)
    w = w.copy()
    col = {n: i for i, n in enumerate(names)}
    for side in 'LR':
        for parent, child in CHAINS:
            head, tail = bones[f'{parent}_{side}'][0], bones[f'{parent}_{side}'][1]
            seg = tail - head
            t = (p - head) @ seg / (seg @ seg)
            near = np.linalg.norm(p - (head + np.clip(t, 0, 1)[:, None] * seg), axis=1) < 0.13
            start = 0.7 if child == 'forearm_twist' else 0.45
            keep = np.clip((t - start) / (0.85 - start), 0.0, 1.0)
            keep = keep * keep * (3 - 2 * keep)
            factor = np.where(near, keep, 1.0)
            w[:, cols_of(child, side, names)] *= factor[:, None]
        for parent, child in PARENT_LIMITS:
            head, tail = bones[f'{child}_{side}'][0], bones[f'{child}_{side}'][1]
            seg = tail - head
            t = (p - head) @ seg / (seg @ seg)
            near = np.linalg.norm(p - (head + np.clip(t, 0, 1)[:, None] * seg), axis=1) < 0.13
            fade = np.clip((0.55 - t) / 0.4, 0.0, 1.0)
            fade = fade * fade * (3 - 2 * fade)
            w[:, col[f'{parent}_{side}']] *= np.where(near, fade, 1.0)
    s = w.sum(axis=1, keepdims=True)
    return w / np.maximum(s, 1e-9)


def throat_to_neck(c, points, w, names):
    """Moves the clavicle weight of the front of the neck, and the head weight of the shoulder
    tops, to the neck bone.

    Bone heat gives the throat under the chin some weight of both clavicles. A face there with
    clavicle and head weight folds over when the head turns and a shoulder lifts.
    c: the config section rig.weights.
    """
    p = np.asarray(points, float)
    w = w.copy()
    col = {n: i for i, n in enumerate(names)}
    th = c.throat
    keep = 1.0 - (1.0 - np.clip((np.abs(p[:, 0]) - th.x[0]) / th.x[1], 0.0, 1.0)) \
        * np.clip((p[:, 1] - th.y[0]) / th.y[1], 0.0, 1.0)
    for side in 'LR':
        j = col[f'clavicle_{side}']
        moved = w[:, j] * (1.0 - keep)
        w[:, j] -= moved
        w[:, col['neck']] += moved
    # Below the chin and out from the neck (the tops of the shoulders), the head weight of bone
    # heat moves to the neck too: a round head sits close above them.
    st = c.shoulder_tops
    away = np.clip((st.y[0] - p[:, 1]) / st.y[1], 0.0, 1.0) \
        * np.clip((np.abs(p[:, 0]) - st.x[0]) / st.x[1], 0.0, 1.0)
    moved = w[:, col['head']] * away
    w[:, col['head']] -= moved
    w[:, col['neck']] += moved
    return w


def ears_to_head(w, names):
    """Gives the ear weight of the body skin to the head.

    The ears are separate rigid pieces on the ear bones. Bone heat still gives the crown of the
    body some weight of both ears, and a crown face with head and ear weight folds over when an
    ear moves.
    """
    w = w.copy()
    col = {n: i for i, n in enumerate(names)}
    for side in 'LR':
        j = col[f'ear_{side}']
        w[:, col['head']] += w[:, j]
        w[:, j] = 0.0
    return w


def joint_mask(c, body, points):
    """Weights (0..1) of the regions around each shoulder, elbow, and wrist (bind pose), where
    the weights get more smoothing."""
    p = np.asarray(points, float)
    joints, _ = body.arm_pose('bind')
    out = np.zeros(len(p))
    for side in (1, -1):
        for joint, radius in c.joints.items():
            e = joints[joint] * np.array([side, 1, 1])
            d = np.linalg.norm(p - e, axis=1) / radius
            out = np.maximum(out, np.clip(1.5 - d, 0.0, 1.0))
    return out


def crotch_mask(c, points):
    """Weights (0..1) of the crotch between the legs, which moves only with the hips.

    The mask fades out low at the sides, where the inner thighs begin. On the center line there
    is only the crotch down to its lowest point, so the mask stays full there: a face of the
    crotch keel with half hips and half thigh weight folds over in a bow.
    """
    p = np.asarray(points, float)
    cr = c.crotch
    low = np.maximum(np.clip((p[:, 1] - cr.low[0]) / cr.low[1], 0, 1),
                     np.clip((cr.keel_x[0] - np.abs(p[:, 0])) / cr.keel_x[1], 0, 1)
                     * np.clip((p[:, 1] - cr.keel_y[0]) / cr.keel_y[1], 0, 1))
    return (np.clip((cr.half_x[0] - np.abs(p[:, 0])) / cr.half_x[1], 0, 1)
            * np.clip((cr.top[0] - p[:, 1]) / cr.top[1], 0, 1) * low)


def armpit_mask(c, body, points):
    """Weights (0..1) of the region under each shoulder, where the arm meets the chest."""
    p = np.asarray(points, float)
    joints, _ = body.arm_pose('bind')
    s = joints['shoulder']
    a = c.armpit
    out = np.zeros(len(p))
    for side in (1, -1):
        cen = np.array([s[0] * side * a.x_scale, s[1] - a.drop, s[2]])
        d = np.linalg.norm((p - cen) / np.array(a.radii), axis=1)
        out = np.maximum(out, np.clip(1.6 - d, 0.0, 1.0))
    return out


def head_rigidity(cfg, points):
    """Weights (0..1) of the places that must move only with the head: the muzzle and the face.

    Bone heat gives the low muzzle some weight of the neck. Then the details on the muzzle (the
    mouth line, the nose) and the muzzle part ways when the neck bends.
    """
    p = np.asarray(points, float)
    h = cfg.rig.weights.head
    region = cfg.field.snout.region
    q = (p - np.array(region.center)) / (np.array(region.radii) * h.muzzle_scale)
    muzzle = 1.0 - np.clip((np.sqrt(np.sum(q * q, axis=1)) - 0.8) / 0.4, 0.0, 1.0)
    q = (p - np.array(h.skull.center)) / (np.array(h.skull.radii) * 1.05)
    cranium = 1.0 - np.clip((np.sqrt(np.sum(q * q, axis=1)) - 0.85) / 0.3, 0.0, 1.0)
    cranium *= np.clip((p[:, 1] - h.skull_from_y[0]) / h.skull_from_y[1], 0.0, 1.0)
    return np.maximum(muzzle, cranium)


def trunk_weights(cfg, body, points, w_heat, names):
    """Replaces the bone heat weights of the trunk with bands along the spine.

    Bone heat gives the front of a big belly weight from the thighs, the clavicles, and the upper
    arms, because those bones are nearer to it than the spine. Then the belly folds when a leg or
    an arm moves. The trunk therefore takes weights by height: each vertex blends the two spine
    bones whose centers are above and below it. The arms, the legs, the tail, and the head keep
    the bone heat weights, with soft borders.
    """
    p = np.asarray(points, float)
    col = {n: i for i, n in enumerate(names)}
    sp = cfg.rig.spine
    tc = cfg.rig.weights.trunk
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

    arm = heat([n for s in 'LR' for b in ('clavicle', 'upper_arm', 'forearm', 'forearm_twist',
                                          'hand', 'fingers')
                for n in ([names[i] for i in cols_of(b, s, names)] if b == 'fingers'
                          else [f'{b}_{s}'])])
    keep_arm = np.clip((arm - 0.35) / 0.3, 0, 1)
    keep_tail = np.clip((heat(['tail']) - 0.2) / 0.3, 0, 1)
    keep_head = np.clip((y - tc.head_from_y[0]) / tc.head_from_y[1], 0, 1)
    # The legs keep bone heat inside the thigh and the shin, and below the trunk. A low belly
    # can hang over the knees in front of the legs: it takes the trunk bands, because a face with
    # hips, thigh, and shin weight there folds over when the knee bends.
    # The tops are heights of a standing leg. A seated bind pose (bent legs) lays the thigh at the
    # height of the hip, so its top is the top of the thigh there, and the shin hangs from the
    # raised knee.
    lg = tc.legs
    leg, _ = body.leg_pose('bind')
    thigh_top, shin_top = lg.thigh_top, lg.shin_top
    if not body.legs_straight:
        thigh_top = max(thigh_top, leg['hip'][1] + lg.radius)
        shin_top = max(shin_top, leg['knee'][1])
    keep_leg = np.zeros(len(p))
    for side in (1, -1):
        hip = leg['hip'] * np.array([side, 1, 1])
        knee = leg['knee'] * np.array([side, 1, 1])
        ankle = leg['ankle'] * np.array([side, 1, 1])
        for a, b, top in ((hip, knee, thigh_top), (knee, ankle, shin_top)):
            seg = b - a
            t = np.clip((p - a) @ seg / (seg @ seg), 0, 1)
            d = np.linalg.norm(p - (a + t[:, None] * seg), axis=1)
            inside = np.clip((lg.radius - d) / lg.ramp, 0, 1) * np.clip((top - y) / lg.top_ramp,
                                                                         0, 1)
            keep_leg = np.maximum(keep_leg, inside)
    keep_leg = np.maximum(keep_leg, np.clip((tc.below[0] - y) / tc.below[1], 0, 1))
    # The crotch between the legs follows the hips: it takes weight from both legs otherwise, and
    # its faces turn over when one knee bends.
    cr = tc.crotch
    crotch = np.clip((cr.half_x[0] - np.abs(p[:, 0])) / cr.half_x[1], 0, 1) \
        * np.clip((cr.top[0] - y) / cr.top[1], 0, 1)
    keep_leg = keep_leg * (1.0 - crotch)
    keep = np.maximum.reduce([keep_arm, keep_tail, keep_head, keep_leg])
    return w_heat * keep[:, None] + band * (1 - keep)[:, None]


def digit_weights(body, points, w, names):
    """Splits the paw weight between the hand and the digits ([rig] fingers > 1) by the place on
    the paw.

    Bone heat spreads the weight of four parallel digit bones over the whole front of the paw.
    Here the weight of the hand and the digits of each skin point stays, and it goes to the
    digits from DIGIT_RAMP behind the digit heads (none) to their heads (all), and across the
    paw to the two nearest digits by the distance to each (a linear blend), so one digit moves
    the front of the paw over its claw, and its neighbors bend a little with it.
    """
    p = np.asarray(points, float)
    w = w.copy()
    joints, frames = body.arm_pose('bind')
    digits = body.digits('bind')
    for side, sign in (('L', 1.0), ('R', -1.0)):
        m = np.array([sign, 1.0, 1.0])
        fh = np.diag(m) @ frames['hand']
        hand = names.index(f'hand_{side}')
        cols = [names.index(f'finger{k + 1}_{side}') for k in range(len(digits))]
        total = w[:, hand] + w[:, cols].sum(axis=1)
        heads = np.array([d['head'] * m for d in digits])
        along = (p - heads.mean(axis=0)) @ fh[:, 1]
        share = np.clip((along + DIGIT_RAMP) / DIGIT_RAMP, 0.0, 1.0)
        share = share * share * (3 - 2 * share)
        across = p @ fh[:, 0]
        at = heads @ fh[:, 0]
        order = np.argsort(at)
        at_sorted = at[order]
        u = np.clip(across, at_sorted[0], at_sorted[-1])
        split = np.zeros((len(p), len(cols)))
        for j in range(len(order) - 1):
            a, b = at_sorted[j], at_sorted[j + 1]
            inside = (u >= a) & (u <= b)
            t = (u[inside] - a) / (b - a)
            split[inside, order[j]] = 1.0 - t
            split[inside, order[j + 1]] = t
        split /= np.maximum(split.sum(axis=1, keepdims=True), 1e-9)
        paw = total > 0
        w[paw, hand] = total[paw] * (1.0 - share[paw])
        for k, c in enumerate(cols):
            w[paw, c] = total[paw] * share[paw] * split[paw, k]
    return w


def weights(cfg, body, w_heat, verts, parts, bones, names, neighbors):
    """Runs the weight rules on the bone heat weights of the body vertices (see the module doc).

    Returns the final weights (vertices, bones).
    """
    c = cfg.rig.weights
    w = trunk_weights(cfg, body, verts, w_heat, names)
    w = trunk_owned(verts, parts, w, names)
    w = arm_owned(verts, parts, w, names)
    w = smooth_weights(w, neighbors, rounds=2, amount=0.5)
    w = smooth_weights(w, neighbors, rounds=10, amount=0.7 * armpit_mask(c, body, verts))
    w = smooth_weights(w, neighbors, rounds=10, amount=0.7 * joint_mask(c, body, verts))
    w = chain_limits(verts, w, names, bones)
    w = throat_to_neck(c, verts, w, names)
    w = force_bone(w, names, 'head', head_rigidity(cfg, verts), keep=('ear_L', 'ear_R'))
    w = ears_to_head(w, names)
    w = force_bone(w, names, 'hips', crotch_mask(c, verts))
    if body.fingers > 1:
        w = digit_weights(body, verts, w, names)
    return limit_and_normalize(w)
