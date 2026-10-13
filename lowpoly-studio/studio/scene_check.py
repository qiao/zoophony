"""The scene check of a clip: the deepest body point inside a scene prop, the rest of the rump
and of the thighs on the seat (the gap to the top of the seat under each skin point), and the
distance of the knuckles or the claw tips of the digits from the targets that the role pack
gives (pack.hand_targets).

studio/build.py check_clips runs it beside the contact check (studio/contacts.py), on the same
posed body of each frame: make() reads the role and the body once for each round, frame()
measures one frame into a plain record, and reduce() turns the records of a clip into the scene
values of the clip. The frame cache of studio/contacts.py keeps the records.

Runs inside Blender (studio/props.py). All values are in animal heights.
"""

import numpy as np

from studio import props


class SceneCheck:
    """The scene props, the seat, and the hand targets of one round of the contact check."""

    def __init__(self, boxes, bench, size, trunk, thighs, tips, targets, check):
        """Stores the values of make(): the test boxes, the name of the seat prop (or None) and
        its sizes, the sitting skin (masks of the trunk and the thighs), the rest tips of the
        claws of the digits {side: [point]}, the target function of the pack (or None), and the
        contact check (the bone names, the weights, and the skeleton)."""
        self.boxes = boxes
        self.bench = bench
        self.size = size
        self.trunk = trunk
        self.thighs = thighs
        self.tips = tips
        self.targets = targets
        self.check = check

    def content(self):
        """Returns the plain values that decide the record of a frame, besides the pose, the
        posed body, and the targets of the frame (for the key of the frame cache)."""
        return [self.boxes, self.bench, self.size, self.trunk, self.thighs, self.tips,
                self.targets is not None]

    def goal(self, clip, t):
        """Returns the targets of the digits at time t of a clip (pack.hand_targets), or None."""
        if self.targets is None:
            return None
        return self.targets(clip, t)

    def frame(self, pose, goal, posed_body):
        """Measures one frame (posed_body: the result of ContactCheck.pose_body).

        Returns the frame record (plain values): 'boxes' [(depth, prop, piece, position, bone)]
        of the first shown prop box and of each shown box that the body goes into, 'seat'
        {part: gap} of the sitting skin over the seat (or None), and 'hands' [(side, digit or
        None, distance)] of each target. A box with no depth never wins over an earlier box in
        reduce(), because its compare is strict, so the record leaves it out (the piano of the
        pianist has about 100 boxes).
        """
        D, H, _, _, posed = posed_body
        check = self.check
        names = check.names
        boxes = []
        for prop, piece, center, half in self.boxes:
            if not _shown(pose, prop):
                continue
            q = np.abs(posed - center) - half
            sdf = np.linalg.norm(np.maximum(q, 0.0), axis=1) + np.minimum(q.max(axis=1), 0.0)
            k = int(np.argmin(sdf))
            depth = max(0.0, -float(sdf[k]))
            if boxes and depth == 0.0:
                continue
            boxes.append((depth, prop, piece, [round(float(v), 4) for v in posed[k]],
                          names[int(np.argmax(check.w[k]))]))
        seat = None
        if self.bench and _shown(pose, self.bench):
            size = self.size
            over = ((np.abs(posed[:, 0]) <= 0.5 * size['width'])
                    & (np.abs(posed[:, 2] - size['center_z']) <= 0.5 * size['depth']))
            seat = {}
            for part, member in (('trunk', self.trunk), ('thighs', self.thighs)):
                if (over & member).any():
                    at = posed[over & member]
                    seat[part] = float((at[:, 1] - props.seat_top_at(size, at[:, 0],
                                                                     at[:, 2])).min())
        hands = []
        for side, aim in (goal or {}).items():
            if aim is None:
                continue
            # A point: the knuckle of the paw. A dict {digit: point}: the claw tip of each digit
            # that presses a key ([rig] fingers > 1).
            aims = aim.items() if isinstance(aim, dict) else [(None, aim)]
            for finger, g in aims:
                if finger is None:
                    at = H[f'fingers_{side}']
                else:
                    bone = f'finger{finger}_{side}'
                    at = H[bone] + D[bone] @ (self.tips[side][finger - 1] - check.skel.heads[bone])
                hands.append((side, finger, float(np.linalg.norm(at - np.asarray(g, float)))))
        return {'boxes': boxes, 'seat': seat, 'hands': hands}

    def reduce(self, frames, fps):
        """Turns the frame records of a clip into its scene values.

        Returns {'scene': {depth, prop, piece, frame, time_s, position, bone}, 'seat': {gap,
        part, frame, time_s, trunk, thighs}, 'hands': {distance, side, frame, time_s, finger}},
        each part only when it applies.
        """
        out = {}
        for i, fr in enumerate(frames):
            for depth, prop, piece, position, bone in fr['boxes']:
                if 'scene' not in out or depth > out['scene']['depth']:
                    out['scene'] = {'depth': round(depth, 4), 'prop': prop, 'piece': piece,
                                    'frame': i, 'time_s': round(i / fps, 3),
                                    'position': position, 'bone': bone}
            gaps = fr['seat']
            if gaps:
                part = max(gaps, key=lambda k: abs(gaps[k]))
                gap = gaps[part]
                if 'seat' not in out or abs(gap) > abs(out['seat']['gap']):
                    out['seat'] = {'gap': round(gap, 4), 'part': part, 'frame': i,
                                   'time_s': round(i / fps, 3),
                                   **{k: round(v, 4) for k, v in gaps.items()}}
            for side, finger, dist in fr['hands']:
                if 'hands' not in out or dist > out['hands']['distance']:
                    out['hands'] = {'distance': round(dist, 4), 'side': side, 'frame': i,
                                    'time_s': round(i / fps, 3)}
                    if finger is not None:
                        out['hands']['finger'] = int(finger)
        return out


def _shown(pose, prop):
    """Tells if a scene prop shows in a pose (a hidden prop has a scale near 0)."""
    return pose[prop][2] >= 0.05 if prop in pose else True


def make(cfg, body, pack, check):
    """Makes the scene check of a round of the contact check, or returns None for a role with
    no scene prop and no hand targets."""
    role = cfg.role
    boxes = props.scene_boxes(role, body)
    targets = getattr(pack, 'hand_targets', None)
    if not boxes and targets is None:
        return None
    bench = next((pr for pr in props.scene_props(role) if pr.kind in ('bench', 'chair')), None)
    size = None
    if bench is not None:
        size = (props.bench_sizes if bench.kind == 'bench' else props.chair_sizes)(body, bench,
                                                                                   role)
    names = check.names
    # The skin that sits: the trunk and the thighs (the shins and the feet hang in front). Each
    # one rests on the seat: the rump does not float, and the thighs do not float. The seated
    # thighs take trunk weights where they meet the seat, so their skin is the sitting skin out
    # from the hip joints (in the bind pose).
    col = {n: k for k, n in enumerate(names)}
    sit = check.w[:, [col[n] for n in names if n in ('root', 'hips', 'spine', 'tail')
                      or n.startswith('thigh_')]].sum(axis=1) > 0.5
    hip_x = abs(float(body.leg_pose('bind')[0]['hip'][0]))
    trunk = sit & (np.abs(check.verts[:, 0]) < hip_x)
    thighs = sit & (np.abs(check.verts[:, 0]) >= hip_x)
    # The rest tips of the claws of the digits, the points that strike the keys.
    tips = {}
    if body.fingers > 1:
        for side, m in (('L', np.array([1.0, 1.0, 1.0])), ('R', np.array([-1.0, 1.0, 1.0]))):
            tips[side] = [d['tail'] * m for d in body.digits('bind')]
    return SceneCheck(boxes, bench.name if bench is not None else None, size, trunk, thighs,
                      tips, targets, check)
