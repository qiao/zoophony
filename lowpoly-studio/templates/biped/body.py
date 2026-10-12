"""The body plan of a standing biped: measured parts that blend into one signed distance field.

numpy only. Model units: the animal is 1 unit tall (sole to ear top). Axes of three.js: x is the
left of the animal, y up, z forward. All parts of the right side are mirrors of the left side.

The trunk and the head are lofts whose sections come from the sheet masks (studio/field.py). The
snout, the limbs, the ears, and the tail are measured primitives from the config (field.*). The
arms are built in a pose: 'reference' (the arms as on the sheet) or 'bind' (raised by the bind
pose of the role, so that skinning bends them less).

The bind pose comes from the role pack (roles/<role>/role.toml [bind]): the arm turns of a
standing conductor, or later the hip and knee bends of a seated player. It is the only input of
the role to the model.
"""

import math

import numpy as np

from studio.field import Part, box_of_points, head_table, trunk_table
from studio.sdf import ellipsoid, frame_from, loft, rot_axis, round_cone, smax

# The field parts of each arm: they move with the arm, so the occlusion and the correctives
# treat them apart from the rest.
ARM_PARTS = ('upper_arm', 'deltoid', 'forearm', 'forearm_bulge', 'paw')


def _local(frame, origin, v):
    """Moves a point from a bone frame to model space."""
    return origin + frame @ np.asarray(v, float)


class Body:
    """The body of one animal: the parts of the field, the arm poses, and named regions."""

    def __init__(self, cfg, views, bind):
        """Stores the config, the row profiles of the sheet views (measure.json), and the bind
        pose of the role."""
        self.cfg = cfg
        self.views = views
        self.f = cfg.field
        self.bind = bind
        self.legs_straight = bind.hip_flex == 0.0 and bind.knee_flex == 0.0

    def arm_pose(self, pose):
        """Calculates the joints and the bone frames of the left arm in a pose.

        Returns a dict of joint positions and a dict of 3x3 frames (columns x, y, z, with y
        along the bone) for 'upper', 'fore', and 'hand'.
        """
        j = self.f.arm.joints
        S = np.array(j.shoulder)
        E = np.array(j.elbow)
        W = np.array(j.wrist)
        K = np.array(j.knuckle)
        fwd = np.array([0.0, 0.0, 1.0])
        frames = {
            'upper': frame_from(E - S, fwd),
            'fore': frame_from(W - E, fwd),
            'hand': frame_from(K - W, self.f.arm.palm),
        }
        if pose == 'bind':
            b = self.bind
            r1 = rot_axis((0, 0, 1), math.radians(b.shoulder_abduct)) @ \
                rot_axis((1, 0, 0), -math.radians(b.shoulder_flex))
            E2 = S + r1 @ (E - S)
            W1 = S + r1 @ (W - S)
            K1 = S + r1 @ (K - S)
            hinge = r1 @ np.array([1.0, 0.0, 0.0])
            r2 = rot_axis(hinge, -math.radians(b.elbow_flex))
            W2 = E2 + r2 @ (W1 - E2)
            K2 = E2 + r2 @ (K1 - E2)
            frames = {
                'upper': r1 @ frames['upper'],
                'fore': r2 @ r1 @ frames['fore'],
                'hand': r2 @ r1 @ frames['hand'],
            }
            E, W, K = E2, W2, K2
        joints = {'clavicle': np.array(j.clavicle), 'shoulder': S, 'elbow': E,
                  'wrist': W, 'knuckle': K}
        return joints, frames

    def leg_pose(self, pose):
        """Calculates the joints of the left leg in a pose, and the rigid move of the foot.

        Returns ({hip, knee, ankle, ball, toe}, (R, t) or None). The legs of the sheet are
        straight. A bind pose with hip_flex and knee_flex (a seated player) raises the thigh
        forward at the hip and bends the shin back at the knee; the foot moves with the shin,
        p -> R @ p + t. (The seated bind pose is a seam for a seated role: no role uses it yet.)
        """
        j = self.f.leg.joints
        joints = {k: np.array(j[k]) for k in ('hip', 'knee', 'ankle', 'ball', 'toe')}
        if pose != 'bind' or self.legs_straight:
            return joints, None
        H = joints['hip']
        r1 = rot_axis((1, 0, 0), -math.radians(self.bind.hip_flex))
        K = H + r1 @ (joints['knee'] - H)
        r2 = rot_axis((1, 0, 0), math.radians(self.bind.knee_flex)) @ r1
        out = {'hip': H, 'knee': K}
        for k in ('ankle', 'ball', 'toe'):
            out[k] = K + r2 @ (joints[k] - joints['knee'])
        return out, (r2, K - r2 @ joints['knee'])

    def reference_spec(self, props):
        """Makes the pose spec of the sheet: the arms (and the legs) turn from the bind pose back
        to the pose of the sheet, and the props are hidden (scale 0). The compare and the
        correctives use it, and the clip 'reference' of every role."""
        ref_j, ref_f = self.arm_pose('reference')
        bind_j, bind_f = self.arm_pose('bind')
        fk = {}
        for side, m in (('L', np.diag([1.0, 1.0, 1.0])), ('R', np.diag([-1.0, 1.0, 1.0]))):
            fk[side] = {
                'upper_arm': m @ (ref_f['upper'] @ bind_f['upper'].T) @ m,
                'forearm': m @ (ref_f['fore'] @ bind_f['fore'].T) @ m,
                'forearm_twist': m @ (ref_f['fore'] @ bind_f['fore'].T) @ m,
                'hand': m @ (ref_f['hand'] @ bind_f['hand'].T) @ m,
            }
        spec = {'rot': {}, 'arm_fk': fk, 'legs': 'planted'}
        _, move = self.leg_pose('bind')
        if move is not None:
            # A seated bind pose: the legs turn back to straight with forward kinematics.
            b = self.bind
            r1 = rot_axis((1, 0, 0), -math.radians(b.hip_flex))
            r2 = rot_axis((1, 0, 0), math.radians(b.knee_flex)) @ r1
            spec['leg_fk'] = {}
            for side, m in (('L', np.diag([1.0, 1.0, 1.0])), ('R', np.diag([-1.0, 1.0, 1.0]))):
                spec['leg_fk'][side] = {'thigh': m @ r1.T @ m, 'shin': m @ r2.T @ m,
                                        'foot': m @ r2.T @ m}
            del spec['legs']
        for name in props:
            spec[f'{name}_scale'] = 0.0
        return spec

    def anchor(self, name):
        """Returns a named point of the body: 'paw' is the middle of the left paw (bind pose)."""
        if name == 'paw':
            joints, _ = self.arm_pose('bind')
            return 0.5 * (joints['wrist'] + joints['knuckle'])
        raise ValueError(f'unknown anchor {name!r} (the biped template knows: paw)')

    def arm_parts(self, pose, side):
        """Makes the parts of one arm (side +1 left, -1 right)."""
        c = self.f.arm
        joints, frames = self.arm_pose(pose)
        sx = np.array([side, 1.0, 1.0])

        def m(v):
            return np.asarray(v) * sx

        def mf(f):
            return np.diag(sx) @ f

        S, E, W, K = (m(joints[k]) for k in ('shoulder', 'elbow', 'wrist', 'knuckle'))
        fu, ff, fh = mf(frames['upper']), mf(frames['fore']), mf(frames['hand'])
        parts = []
        u = c.upper
        lo, hi = box_of_points([S, E], u.box_pad)
        fwd = fu[:, 2]
        parts.append(Part('upper_arm', lambda p: round_cone(p, S, E, u.radii[0], u.radii[1],
                                                            (fwd, u.squash)), lo, hi, u.blend))
        d = c.deltoid
        delt_c = _local(fu, S, d.center)
        lo, hi = box_of_points([delt_c], d.box_pad)
        parts.append(Part('deltoid', lambda p: ellipsoid(p, delt_c, d.radii, fu), lo, hi, d.blend))
        fa = c.forearm
        lo, hi = box_of_points([E, W], fa.box_pad)
        parts.append(Part('forearm', lambda p: round_cone(p, E, W, fa.radii[0], fa.radii[1]),
                          lo, hi, fa.blend))
        fb = c.forearm_bulge
        fb_c = _local(ff, E, fb.center)
        lo, hi = box_of_points([fb_c], fb.box_pad)
        parts.append(Part('forearm_bulge', lambda p: ellipsoid(p, fb_c, fb.radii, ff),
                          lo, hi, fb.blend))
        pw = c.paw
        paw_c = 0.5 * (W + K)
        lo, hi = box_of_points([paw_c], pw.box_pad)
        parts.append(Part('paw', lambda p: ellipsoid(p, paw_c, pw.radii, fh), lo, hi, pw.blend))
        return parts

    def leg_parts(self, pose, side):
        """Makes the parts of one leg (side +1 left, -1 right)."""
        c = self.f.leg
        sx = np.array([side, 1.0, 1.0])
        joints, move = self.leg_pose(pose)
        H, Kn, A = (joints[k] * sx for k in ('hip', 'knee', 'ankle'))
        fwd = (0.0, 0.0, 1.0)
        parts = []
        th = c.thigh
        lo, hi = box_of_points([H, Kn], th.box_pad)
        parts.append(Part('thigh', lambda p: round_cone(p, H, Kn, th.radii[0], th.radii[1],
                                                        (fwd, th.squash)), lo, hi, th.blend))
        sh = c.shin
        lo, hi = box_of_points([Kn, A], sh.box_pad)
        parts.append(Part('shin', lambda p: round_cone(p, Kn, A, sh.radii[0], sh.radii[1],
                                                       (fwd, sh.squash)), lo, hi, sh.blend))
        ft = c.foot
        foot_c = np.array([ft.center[0] * side, ft.center[1], ft.center[2]])
        rot = None
        if move is not None:
            # A bent leg: the foot, its toes, and its sole plane move with the shin.
            rot = np.diag(sx) @ move[0] @ np.diag(sx)
            foot_c = rot @ foot_c + move[1] * sx

        def sole(p):
            return -p[..., 1] if rot is None else -((p - move[1] * sx) @ rot)[..., 1]

        def foot(p):
            d = ellipsoid(p, foot_c, ft.radii) if rot is None else ellipsoid(p, foot_c, ft.radii,
                                                                             rot)
            return smax(d, sole(p), ft.sole_blend)

        lo, hi = box_of_points([foot_c], ft.box_pad)
        parts.append(Part('foot', foot, lo, hi, ft.blend))
        for i, cen in enumerate(self.toe_centers(side, pose)):
            lo, hi = box_of_points([cen], c.toes.box_pad)
            parts.append(Part(f'toe{i}', lambda p, cen=cen: smax(
                ellipsoid(p, cen, c.toes.radii, rot), sole(p), c.toes.sole_blend), lo, hi,
                c.toes.blend))
        return parts

    def toe_centers(self, side, pose='bind'):
        """Lists the centers of the toes of one foot (with the offset of each toe)."""
        t = self.f.leg.toes
        out = [np.array([(t.x + off * t.spread) * side, t.y, t.z - abs(off) * t.z_drop])
               for off in t.offsets]
        _, move = self.leg_pose(pose)
        if move is None:
            return out
        sx = np.array([side, 1.0, 1.0])
        rot = np.diag(sx) @ move[0] @ np.diag(sx)
        return [rot @ c + move[1] * sx for c in out]

    def ear_frame(self, side):
        """Calculates the frame of one ear: z is the normal of the ear's front face.

        The ear turns out by yaw (so it reads as a broad oval from the side), and its top leans
        out by roll.
        """
        e = self.f.ears
        yaw = math.radians(e.yaw) * side
        roll = math.radians(e.roll) * side
        normal = np.array([math.sin(yaw), e.lift, math.cos(yaw)])
        return frame_from((math.sin(roll), math.cos(roll), 0.0), normal)

    def snout(self, p):
        """Calculates the distance to the snout cone."""
        s = self.f.snout
        return round_cone(p, s.base, s.tip, s.radii[0], s.radii[1], ((0.0, 1.0, 0.0), s.squash))

    def part_distance(self, name, p):
        """Calculates the distance to a named part of the body (the paint and the remesh use
        it)."""
        if name == 'snout':
            return self.snout(p)
        raise ValueError(f'unknown part {name!r} (the biped template knows: snout)')

    def head_parts(self):
        """Makes the parts of the head: the head ball, the brow, the muzzle, and the ears."""
        h = self.f.head
        parts = []
        table = head_table(h, self.views)
        lo = np.array([-h.box_x, h.bottom - h.box_pad, h.box_z[0]])
        hi = np.array([h.box_x, h.top + h.box_pad, h.box_z[1]])
        parts.append(Part('head', lambda p: loft(p, table), lo, hi, h.blend))
        b = self.f.brow
        lo, hi = box_of_points([b.center], max(b.radii) + b.box_pad)
        parts.append(Part('brow', lambda p: ellipsoid(p, b.center, b.radii), lo, hi, b.blend))
        s = self.f.snout
        lo, hi = box_of_points([s.region.center], max(s.region.radii) + s.box_pad)
        parts.append(Part('muzzle', self.snout, lo, hi, s.blend))
        e = self.f.ears
        for side in (1, -1):
            r = e.radii
            c = np.array(e.center) * np.array([side, 1, 1])
            f = self.ear_frame(side)
            hollow = c + f @ np.array([e.hollow_offset[0], e.hollow_offset[1],
                                       e.hollow_offset[2] * r[2]])
            hr = (e.hollow_scale[0] * r[0], e.hollow_scale[1] * r[1], e.hollow_scale[2] * r[2])

            def ear(p, c=c, r=r, f=f, hollow=hollow, hr=hr):
                d = ellipsoid(p, c, r, f)
                h_ = ellipsoid(p, hollow, hr, f)
                return smax(d, -h_, e.hollow_blend)

            lo, hi = box_of_points([c], e.box_pad)
            parts.append(Part(f'ear_{side}', ear, lo, hi, e.blend))
        return parts

    def tail_rotation(self):
        """Calculates the tilt of the tail about x."""
        return rot_axis((1, 0, 0), math.radians(self.f.tail.tilt))

    def parts(self, pose, small=True):
        """Lists every part of the body in a pose, the trunk first.

        small: also the ears and the tail. The low-poly surface leaves them out, because quads of
        the facet size cannot hold them; the details make them as separate low-poly pieces.
        """
        tr = self.f.trunk
        table = trunk_table(tr, self.views)
        parts = [Part('trunk', lambda p: loft(p, table), tr.box[0], tr.box[1], 0.0)]
        parts += [p for p in self.head_parts() if small or not p.name.startswith('ear')]
        for side in (1, -1):
            parts += self.arm_parts(pose, side)
            parts += self.leg_parts(pose, side)
        if small:
            t = self.f.tail
            lo, hi = box_of_points([t.center], t.box_pad)
            parts.append(Part('tail', lambda p: ellipsoid(p, t.center, t.radii,
                                                          self.tail_rotation()), lo, hi, t.blend))
        return parts

    def moving_groups(self, parts):
        """Splits the parts into the parts that move far (each arm) and the rest.

        Returns (rest, {side sign: parts of that arm}).
        """
        rest = [p for p in parts if p.name not in ARM_PARTS]
        arms = {s: [p for p in parts if p.name in ARM_PARTS and np.sign(p.lo[0] + p.hi[0]) == s]
                for s in (1.0, -1.0)}
        return rest, arms

    def protect(self, points):
        """Marks the skin that the organic pass leaves alone (facets.protect): the skin around
        the joints that bend far (bind pose), a box on the center line (the crotch), and the
        skin near a named part (the snout keeps the rings of the remesh, so it reads round)."""
        c = self.cfg.facets.protect
        p = np.asarray(points, float)
        joints, _ = self.arm_pose('bind')
        out = np.zeros(len(p), bool)
        for side in (1.0, -1.0):
            for name, radius in c.joints.items():
                cen = joints[name] * np.array([side, 1.0, 1.0])
                out |= np.linalg.norm(p - cen, axis=1) < radius
        out |= (np.abs(p[:, 0]) < c.box.half_x) & (p[:, 1] < c.box.y[1]) & (p[:, 1] > c.box.y[0])
        out |= self.part_distance(c.near.part, p) < c.near.within
        return out
