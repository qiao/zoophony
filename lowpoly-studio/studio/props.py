"""The props of a role: rigid pieces on a bone of their own, a child of a hand (role.toml).

numpy only. Each prop gives detail dicts (as studio/details.py), the grip point, and the tip
point, in a pose of the arms. The kind "stick" is a handle and a long tapered shaft (a baton).
Scene props (attach.bone = "scene": a piano, a chair) are not skinned; no role uses them yet.
"""

import numpy as np

from studio.details import detail, tube


def hand_props(role):
    """Lists the props of a role that sit in a hand."""
    return [pr for pr in role.props if pr.attach.bone == 'hand']


def stick(body, pr, pose):
    """Makes a stick prop in its hand: a handle and a long tapered shaft.

    Returns (details, grip point, tip point).
    """
    joints, frames = body.arm_pose(pose)
    sx = np.diag([1.0 if pr.attach.side == 'L' else -1.0, 1.0, 1.0])
    W = sx @ joints['wrist']
    K = sx @ joints['knuckle']
    fh = sx @ frames['hand']
    # The paw closes on the grip at the palm side of the finger tips.
    grip = 0.5 * (W + K) + fh @ np.array(pr.grip)
    direction = fh @ np.array(pr.direction)
    direction /= np.linalg.norm(direction)
    hd, sh = pr.handle, pr.shaft
    back = grip - direction * hd.back
    tip = grip + direction * pr.length
    gv, gf = tube([back, back + direction * hd.steps[0], grip + direction * hd.steps[1]],
                  list(hd.radii), hd.sides, closed_tip=False)
    shaft = [grip + direction * sh.start, grip + direction * sh.middle, tip]
    bv, bf = tube(shaft, list(sh.radii), sh.sides, closed_tip=False)
    details = [
        detail(f'{pr.name}_grip', gv, gf, hd.color, pr.name, pr.name),
        detail(f'{pr.name}_shaft', bv, bf, sh.color, pr.name, pr.name),
    ]
    return details, grip, tip


def make(body, pr, pose):
    """Makes one hand prop of any kind. Returns (details, grip point, tip point)."""
    if pr.kind == 'stick':
        return stick(body, pr, pose)
    raise ValueError(f'prop {pr.name!r}: the kind {pr.kind!r} is not built yet')


def role_details(role, body, pose='bind'):
    """Lists the details of all hand props of a role, in the order of role.toml."""
    items = []
    for pr in hand_props(role):
        items += make(body, pr, pose)[0]
    return items
