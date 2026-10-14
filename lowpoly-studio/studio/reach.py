"""The IK reach of the clips of a role (pure Python, no numpy and no bpy, so that the unit tests
of the CLI run it).

studio/bake.py records the reach that each IK arm asks for in each frame. reach_report() sums it
up with the lengths of the arm in the bind skeleton. The stage "clips" writes the result, and
studio/checks.py reach_checks() reads it.
"""

import math


def distance(a, b):
    """Returns the distance of two points (any sequences of three numbers)."""
    return math.sqrt(sum((float(x) - float(y)) ** 2 for x, y in zip(a, b)))


def mean(points):
    """Returns the mean of points (sequences of three numbers)."""
    return [sum(float(p[i]) for p in points) / len(points) for i in range(3)]


def reach_report(heads, parents, names, asked, side='L'):
    """Sums up the IK reach of the clips: the reach of the arm of one side in the bind skeleton,
    and the largest share of the reach that the IK targets of each clip ask for.

    heads: {bone: head point}, parents: {bone: parent or None}, names: the bone order.
    asked: {clip: [[(side, share of the reach)] for each frame]} (studio/bake.py).
    Returns {"ik": the upper arm plus the forearm, "palm": ik plus half the paw (the hand head to
    the mean head of its finger bones: "fingers" or the digits, not the prop bones), "clips":
    {clip: {side: [largest share, frame]}}}. A share above 1 asks for more than the reach: the IK
    stops at the reach.
    """
    s, e, w = heads[f'upper_arm_{side}'], heads[f'forearm_{side}'], heads[f'hand_{side}']
    ik = distance(s, e) + distance(e, w)
    kids = [heads[n] for n in names
            if parents.get(n) == f'hand_{side}' and n.startswith('finger')]
    paw = distance(mean(kids), w) if kids else 0.0
    clips = {}
    for name, frames in asked.items():
        worst = {}
        for i, arms in enumerate(frames):
            for arm_side, share in arms:
                if arm_side not in worst or share > worst[arm_side][0]:
                    worst[arm_side] = [round(share, 4), i]
        clips[name] = worst
    return {'ik': round(ik, 4), 'palm': round(ik + 0.5 * paw, 4), 'clips': clips}
