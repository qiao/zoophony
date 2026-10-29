"""The violinist clips: each clip is a function of time (seconds) that returns a pose spec of the
biped solver (templates/biped/solver.py).

numpy only, three.js axes (x is the animal's left, y up, z forward). The clips use 120 bpm: a
beat is 0.5 s, and a bar is 2 s.

The player sits on the front part of the chair of role.toml (the hips drop by the seated drop,
and the legs keep the bent bind pose). The left paw holds the violin at the neck (a hand prop,
studio/props.py held_violin), and the right paw holds the bow (a hand prop).

All places are in the rest frame of the chest, the frame of the solver, so they move with the
lean of the trunk:

    T      the tail end of the violin, under the chin on the left collarbone
    A      the violin axis from the tail end to the scroll: to the left and forward, a little down
    N      the normal of the top plate: up, rolled a little to the right of the player
    C      the contact point of the bow on a string, between the bridge and the fingerboard
    B      the bow axis from the frog to the tip: square to the strings, in the plane of the strings

A pose of the left paw is the rotation that turns the violin of the bind pose onto (T, A, N). A
pose of the right paw is the rotation that turns the bow of the bind pose onto B, with the hair
down onto the strings, and the place on the bow (from the frog) at C.
"""

import math

import numpy as np

from props import strings as strings_kind
from studio import props
from studio.ik import euler, rot_axis, unit

BEAT = 0.5

# The violin under the chin: the tail end, the turn of the axis to the left of straight
# forward, the scroll down, and the roll of the top plate to the right of the player (degrees).
TAIL = (-0.005, 0.50, 0.13)
TURN = 40.0
SCROLL_DOWN = 8.0
ROLL = 15.0

# The contact point: a share of the violin length from the tail end (between the bridge at 0.24
# and the end of the fingerboard), and the turn of the bow about the violin axis for each string
# (degrees).
CONTACT = 0.36
STRINGS = {'A': 5.0, 'D': -5.0}

# The bow: the place of the contact from the frog, as a share of the bow length, at the frog end
# and at the tip end of a whole bow. A half bow uses the half at the frog. The arm needs about 1.4
# times the reach of the sheet arm: a shorter arm does not reach the far half of the bow.
FROG = 0.12
TIP = 0.30

# The elbows: the left elbow under the violin, the right elbow out and down.
POLE = {'L': unit([0.2, -1.0, 0.1]), 'R': unit([-1.0, -0.4, 0.0])}

# The lean of the trunk while playing, in degrees for the spine, spine1, and chest.
LEAN = (4.0, 3.0, 2.0)

# The rest: each paw hangs at its side as in the sheet pose (the hand frame of the reference
# pose), the left paw holds the violin at the neck, the right paw holds the bow. The elbows turn
# out, so that the forearms pass outside the belly. The belly of the animal covers its short
# thighs, so the violin and the bow do not lie on the lap as in the rest pose of the app. With
# the longer arms (1.4 times the reach), the elbows bend more at these places.
REST_WRIST = {'L': (0.20, 0.43, 0.15), 'R': (-0.20, 0.43, 0.15)}
REST_POLE = {'L': (1.0, -0.3, -0.4), 'R': (-1.0, -0.3, -0.4)}

# On the way between the rest and the play, the right paw passes a way point: out and forward
# of the middle of the way by WAY_R, with the bow pointing forward (WAY_BOW) and the hair down. The
# bow turns away from the belly: it points forward, then turns to its play place.
WAY_R = (-0.04, 0.02, 0.08)
WAY_BOW = (0.0, 0.15, 1.0)


def smooth(u):
    """Eases 0..1 with zero slope at both ends."""
    u = min(max(u, 0.0), 1.0)
    return u * u * (3 - 2 * u)


def slerp(Ra, Rb, u):
    """Turns the rotation Ra a share u of the way to Rb about one axis."""
    R = Ra.T @ Rb
    angle = math.acos(min(max((np.trace(R) - 1.0) / 2.0, -1.0), 1.0))
    if angle < 1e-6:
        return Ra
    axis = np.array([R[2, 1] - R[1, 2], R[0, 2] - R[2, 0], R[1, 0] - R[0, 1]])
    return Ra @ rot_axis(unit(axis), u * angle)


def frame3(a, b):
    """Makes an orthonormal frame [a, b', a x b'] with b' the part of b square to a."""
    a = unit(a)
    b = unit(np.asarray(b, float) - a * float(np.dot(b, a)))
    return np.stack([a, b, np.cross(a, b)], axis=1)


class Violinist:
    """The violinist pack: the clips and the performance."""

    def __init__(self, ctx):
        """Stores the context, the rest places of the violin and the bow, and the clips."""
        self.ctx = ctx
        self.fps = ctx.role.clips.fps
        self.blend = 0.3
        self.layout = props.scene_layout(ctx.body, ctx.role)
        skel, _ = ctx.rest_skeleton()
        self.skel = skel
        self.violin = next(p for p in ctx.role.props if p.kind == 'violin')
        self.bow = next(p for p in ctx.role.props if p.kind == 'bow')
        grip, axis, top, length, _ = props.held_violin_frame(ctx.body, self.violin, 'bind')
        self.v_grip, self.v_frame, self.v_length = grip, frame3(axis, top), length
        k = length / strings_kind.LENGTH
        self.v_neck = (self.violin.strings.neck * length, (strings_kind.THICKNESS - 0.002) * k)
        self.v_string = strings_kind.STRING_HEIGHT * k
        b_grip, b_tip = ctx.prop_points(self.bow.name, 'bind')
        joints, frames = ctx.body.arm_pose('bind')
        fh = np.diag([-1.0, 1.0, 1.0]) @ frames['hand']
        hair = fh @ np.array(self.bow.strings.hair)
        self.b_grip, self.b_frame = b_grip, frame3(b_tip - b_grip, hair)
        self.b_length = props.string_length(ctx.body, self.bow)
        self.b_back = self.b_length * 0.03 / strings_kind.BOW_LENGTH
        self.b_gap = strings_kind.BOW_HAIR_GAP * self.b_length / strings_kind.BOW_LENGTH
        self.clips = {
            'reference': ctx.reference_clip(),
            'ready': (self.clip_ready, 2.0),
            'play': (self.clip_play, 4.0),
            'rest': (self.clip_rest, 3.0),
            'stand_play': (self.clip_stand_play, 2.0),
        }
        self.performance = [
            ('ready', 0.0, 2.0),
            ('play', 0.0, 4.0),
            ('play', 0.0, 4.0),
            ('rest', 0.0, 3.0),
        ]

    def held(self):
        """Returns the violin under the chin: (tail end T, axis A, top normal N)."""
        A = euler(yaw=TURN) @ euler(pitch=SCROLL_DOWN) @ np.array([0.0, 0.0, 1.0])
        N = euler(yaw=TURN) @ euler(pitch=SCROLL_DOWN) @ rot_axis((0, 0, 1), math.radians(ROLL)) \
            @ np.array([0.0, 1.0, 0.0])
        return np.array(TAIL), unit(A), unit(N)

    def left_arm(self, T, A, N):
        """Places the left paw that holds the violin at (T, A, N). Returns (wrist, hand
        rotation, elbow pole)."""
        D = frame3(A, N) @ self.v_frame.T
        grip = T + A * self.v_neck[0] + frame3(A, N)[:, 1] * self.v_neck[1]
        W0 = self.skel.heads['hand_L']
        return grip - D @ (self.v_grip - W0), D, POLE['L']

    def right_arm(self, C, B, hair, place, pole=None):
        """Places the right paw: the bow along B with the hair toward hair, and the contact
        point C at place (a share of the bow length from the frog) on the hair. Returns (wrist,
        hand rotation, elbow pole)."""
        F = frame3(B, hair)
        D = F @ self.b_frame.T
        frog = C - F[:, 0] * place * self.b_length - F[:, 1] * self.b_gap
        grip = frog + unit(B) * self.b_back
        W0 = self.skel.heads['hand_R']
        return grip - D @ (self.b_grip - W0), D, POLE['R'] if pole is None else unit(pole)

    def on_string(self, string):
        """Returns the contact point C, the bow axis B, and the hair direction on a string."""
        T, A, N = self.held()
        turn = rot_axis(A, math.radians(STRINGS[string]))
        n = turn @ N
        C = T + A * CONTACT * self.v_length + N * self.v_string
        B = unit(np.cross(n, A))
        return C, B, -n

    def trunk(self, t, lean=1.0, nod=0.0):
        """Makes the trunk of a seated frame: the drop onto the chair, the lean, and the head on
        the chin rest. Returns (rotations, hips offset)."""
        b = math.sin(2 * math.pi * t / 4.0)
        rot = {
            'spine': euler(pitch=LEAN[0] * lean),
            'spine1': euler(pitch=LEAN[1] * lean),
            'chest': euler(pitch=LEAN[2] * lean - 0.5 * b),
            'neck': euler(pitch=2.0 * lean),
            'head': euler(pitch=4.0 * lean + nod, roll=-4.0 * lean),
        }
        return rot, np.array([0.0, -self.layout['drop'], 0.0])

    def bowing(self, t):
        """Returns (string, place on the bow) of the play clip at time t: on the A string a whole
        bow down (beats 1 and 2) and up (beats 3 and 4), on the D string half bows down and up on
        each beat of bar 2."""
        u = t % 4.0
        if u < 2.0:
            s = smooth(u / 1.0) if u < 1.0 else 1.0 - smooth((u - 1.0) / 1.0)
            return 'A', FROG + (TIP - FROG) * s
        k = (u - 2.0) / BEAT
        down = int(k) % 2 == 0
        s = smooth(k - int(k))
        half = 0.5 * (TIP - FROG)
        return 'D', FROG + half * (s if down else 1.0 - s)

    def string_blend(self, t):
        """Returns the A string share at time t: 1 on A, 0 on D, with a short change."""
        u = t % 4.0
        if u < 1.85:
            return 1.0 if u > 0.15 else smooth((u + 0.15) / 0.3)
        if u < 2.15:
            return 1.0 - smooth((u - 1.85) / 0.3)
        if u > 3.85:
            return smooth((u - 3.85) / 0.3)
        return 0.0

    def play_arms(self, t, place=None):
        """Places the paws of a frame of play."""
        T, A, N = self.held()
        _, place_t = self.bowing(t)
        place = place_t if place is None else place
        w = self.string_blend(t)
        Ca, Ba, Ha = self.on_string('A')
        Cd, Bd, Hd = self.on_string('D')
        C = w * Ca + (1 - w) * Cd
        B = unit(w * Ba + (1 - w) * Bd)
        H = unit(w * Ha + (1 - w) * Hd)
        return {'L': self.left_arm(T, A, N), 'R': self.right_arm(C, B, H, place)}

    def rest_arms(self):
        """Places the paws of the rest: each paw hangs at its side as in the sheet pose."""
        _, ref = self.ctx.body.arm_pose('reference')
        _, bind = self.ctx.body.arm_pose('bind')
        out = {}
        for side in ('L', 'R'):
            m = np.diag([1.0 if side == 'L' else -1.0, 1.0, 1.0])
            D = m @ (ref['hand'] @ bind['hand'].T) @ m
            out[side] = (np.array(REST_WRIST[side]), D, unit(REST_POLE[side]))
        return out

    def spec(self, places):
        """Turns the places of the paws {side: (wrist, hand rotation, pole)} into arm specs."""
        out = {}
        for side, (wrist, D, pole) in places.items():
            axis = self.skel.extras[f'fingers_{side}']
            palm = self.skel.extras[f'palm_{side}']
            out[side] = {'wrist': wrist, 'pole': pole, 'hand': ('fingers', D @ axis, D @ palm),
                         'twist': 0.5}
        return out

    def mix(self, a, b, w):
        """Blends the places of the paws: the wrists in a line, the hands about one axis."""
        out = {}
        for side in a:
            wa, Da, pa = a[side]
            wb, Db, pb = b[side]
            out[side] = ((1 - w) * np.asarray(wa) + w * np.asarray(wb), slerp(Da, Db, w),
                         unit((1 - w) * pa + w * pb))
        return out

    def way(self, rest, play, u):
        """Places the paws a share u of the way from the rest to the play, the right paw through
        its way point. Returns the arm specs."""
        places = self.mix(rest, play, u)
        wr, _, pr = self.mix(rest, play, 0.5)['R']
        F = frame3(unit(WAY_BOW), np.array([0.0, -1.0, 0.0]))
        mid = (wr + np.array(WAY_R), F @ self.b_frame.T, pr)
        if u < 0.5:
            places['R'] = self.mix({'R': rest['R']}, {'R': mid}, 2.0 * u)['R']
        else:
            places['R'] = self.mix({'R': mid}, {'R': play['R']}, 2.0 * u - 1.0)['R']
        return self.spec(places)

    def clip_ready(self, t):
        """Makes the ready pose: seated, the violin comes up from the rest under the chin, and
        the bow comes onto the A string at the frog."""
        u = smooth(t / 1.6)
        rot, hips = self.trunk(t, lean=u)
        arms = self.way(self.rest_arms(), self.play_arms(0.0, FROG), u)
        return {'rot': rot, 'hips': hips, 'arms': arms}

    def clip_play(self, t):
        """Makes two bars of play at 120 bpm: a whole bow down and up on the A string, then half
        bows down and up on the D string, with a small nod on each bar."""
        nod = 2.0 * (math.exp(-((t % 2.0) / 0.2) ** 2))
        rot, hips = self.trunk(t, nod=nod)
        return {'rot': rot, 'hips': hips, 'arms': self.spec(self.play_arms(t))}

    def clip_rest(self, t):
        """Makes the rest: the violin goes down onto the left thigh and the bow onto the lap."""
        u = smooth(t / 2.2)
        rot, hips = self.trunk(t, lean=1.0 - u)
        arms = self.way(self.rest_arms(), self.play_arms(0.0, FROG), 1.0 - u)
        return {'rot': rot, 'hips': hips, 'arms': arms}

    def clip_stand_play(self, t):
        """Makes the standing soloist: the legs of the sheet pose, the violin up, and a short
        stroke down and up on the A string (one bar)."""
        ref = self.ctx.reference_clip()[0](0.0)
        spec = {k: v for k, v in ref.items() if k != 'arm_fk' and not k.endswith('_scale')}
        rot, _ = self.trunk(t)
        spec['rot'] = dict(spec.get('rot', {}), **rot)
        s = smooth(t / 1.0) if t < 1.0 else 1.0 - smooth((t - 1.0) / 1.0)
        spec['arms'] = self.spec(self.play_arms(0.0, FROG + 0.5 * (TIP - FROG) * s))
        # The soloist stands in front of the chair: the chair is hidden.
        spec['chair_scale'] = 0.0
        return spec
