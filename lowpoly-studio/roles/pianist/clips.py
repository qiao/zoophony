"""The pianist clips: each clip is a function of time (seconds) that returns a pose spec of the
biped solver (templates/biped/solver.py).

numpy only, three.js axes (x is the animal's left, y up, z forward). The clips use 120 bpm: a
beat is 0.5 s, a bar is 2 s, and an eighth note is 0.25 s.

The scene is the bench and the piano of role.toml, sized to the body (studio/props.py
scene_layout). The hips drop by the seated drop, so the feet of the bent legs stand on the floor
and the trunk sits on the bench. The legs keep the bind pose (no leg spec): the bind pose of the
role is seated.

The targets of the paws are knuckle points in model space: over a key, at the height of the key
top plus the thickness of the paw under the knuckle. The pack turns each one into a wrist target
in the rest frame of the chest, which is the frame of the solver, with the chest of the same
pose. The keys of the piano run from C on the animal's left (x > 0) to the right; the right paw
plays the melody on the right half, the left paw plays chords on the left half.
"""

import math

import numpy as np

from studio import props
from studio.ik import euler, rot_axis, unit

# One eighth note at 120 bpm, in seconds.
EIGHTH = 0.25

# The forward lean of the trunk while playing, in degrees for the spine, spine1, and chest.
LEAN = (5.0, 4.0, 3.0)

# The height of the knuckle over the key top: the paw pads on the key (pressed), the lift
# between two notes, and the hover of the ready pose.
PRESS = 0.048
LIFT = 0.03
HOVER = 0.075

# The paw on the keys: the fingers point forward and down, the palm faces down. The elbows
# point out, down, and back.
FINGERS = unit([0.0, -0.4, 1.0])
PALM = unit([0.0, -1.0, 0.4])
POLE = {'R': unit([-1.0, -0.6, -0.4]), 'L': unit([1.0, -0.6, -0.4])}

# The melody of the right paw (white key indices, one eighth each, a loop of two bars): the
# first line of "Ode to Joy" in C, from the C at index 10.
MELODY = [12, 12, 13, 14, 14, 13, 12, 11, 10, 10, 11, 12, 12, 11, 11, 11]

# The chords of the left paw: the white key under the middle of each chord, one chord each beat
# 1 and 3 (C, G, C, G).
CHORDS = [2, 5, 2, 5]
CHORD_STEP = 1.0
CHORD_HOLD = 0.55


def smooth(u):
    """Eases 0..1 with zero slope at both ends."""
    u = min(max(u, 0.0), 1.0)
    return u * u * (3 - 2 * u)


def pulse(t, center, width):
    """Makes a bell-shaped pulse."""
    return math.exp(-((t - center) / width) ** 2)


def breath(t):
    """Makes the breathing of the chest (a period of 4 s, so the play loop closes)."""
    return 1.0 * math.sin(2 * math.pi * t / 4.0)


class Pianist:
    """The pianist pack: the clips, the performance, and the targets of the paws."""

    def __init__(self, ctx):
        """Stores the context of the studio (studio/roles.py), the scene layout, and the
        clips."""
        self.ctx = ctx
        self.fps = ctx.role.clips.fps
        self.blend = 0.3
        self.layout = props.scene_layout(ctx.body, ctx.role)
        self.keys = {k[0]: np.array(k[1:4]) for k in props.piano_keys(ctx.body, ctx.role)}
        joints, frames = ctx.body.arm_pose('bind')
        self.hand_length = float(np.linalg.norm(joints['knuckle'] - joints['wrist']))
        self.breadth = frames['hand'][:, 0]
        legs, _ = ctx.body.leg_pose('bind')
        self.knee = legs['knee']
        self.clips = {
            'reference': ctx.reference_clip(),
            'ready': (self.clip_ready, 2.0),
            'play': (self.clip_play, 4.0),
            'chord': (self.clip_chord, 3.0),
            'rest': (self.clip_rest, 3.0),
        }
        self.performance = [
            ('ready', 0.0, 2.0),
            ('play', 0.0, 4.0),
            ('play', 0.0, 4.0),
            ('chord', 0.0, 3.0),
            ('rest', 0.0, 3.0),
        ]

    def key(self, index, height):
        """Returns the knuckle point over the press point of a white key, height over its top."""
        return self.keys[index] + np.array([0.0, height, 0.0])

    def curl(self, side, degrees):
        """Makes the curl of the finger bone about the breadth axis of the paw."""
        axis = self.breadth * np.array([1.0 if side == 'L' else -1.0, 1.0, 1.0])
        return rot_axis(axis, math.radians(degrees))

    def body(self, t, lean=1.0, sway=0.0, nod=0.0, head=0.0):
        """Makes the trunk of a seated frame: the drop onto the bench, the lean, the sway (roll in
        degrees), and the head. Returns (rotations, hips offset)."""
        b = breath(t)
        rot = {
            'spine': euler(pitch=LEAN[0] * lean, roll=0.3 * sway),
            'spine1': euler(pitch=LEAN[1] * lean, roll=0.4 * sway),
            'chest': euler(pitch=LEAN[2] * lean - 0.5 * b, roll=0.3 * sway),
            'neck': euler(pitch=0.4 * nod),
            'head': euler(pitch=head + nod - 0.3 * sway, roll=-0.4 * sway),
        }
        return rot, np.array([0.0, -self.layout['drop'], 0.0])

    def arms(self, rot, hips, knuckles, fingers=None, palms=None, poles=None):
        """Turns knuckle points in model space into the arm specs of the solver.

        The solver reads the wrists and the directions in the rest frame of the chest, so the
        chest of this pose (with no arms) maps them. Returns {side: arm spec}.
        """
        skel, _ = self.ctx.rest_skeleton()
        _, D, H = skel.solve({'rot': rot, 'hips': hips})
        Dc, Hc, c0 = D['chest'], H['chest'], skel.heads['chest']
        out = {}
        for side, k in knuckles.items():
            f = (fingers or {}).get(side, FINGERS)
            p = (palms or {}).get(side, PALM)
            wrist = np.asarray(k, float) - self.hand_length * f
            pole = (poles or {}).get(side, POLE[side])
            out[side] = {'wrist': c0 + Dc.T @ (wrist - Hc), 'pole': Dc.T @ pole,
                         'hand': ('fingers', Dc.T @ f, Dc.T @ p), 'twist': 0.5}
        return out

    def melody(self, t):
        """Calculates the right knuckle of the melody at time t (a loop).

        Returns (knuckle, the key it presses or None, the press share 0..1 for the finger curl).
        """
        n = len(MELODY)
        k = int(math.floor(t / EIGHTH)) % n
        u = (t / EIGHTH) % 1.0
        prev, cur = self.key(MELODY[k - 1], PRESS), self.key(MELODY[k], PRESS)
        move = smooth(u / 0.4)
        lift = LIFT * math.sin(math.pi * min(u / 0.4, 1.0))
        knuckle = prev + (cur - prev) * move + np.array([0.0, lift, 0.0])
        pressed = cur if u >= 0.4 else None
        return knuckle, pressed, smooth((u - 0.3) / 0.15) * (1.0 - smooth((u - 0.8) / 0.2))

    def chords(self, t):
        """Calculates the left knuckle of the chords at time t (a loop).

        Returns (knuckle, the key it presses or None, the press share 0..1)."""
        n = len(CHORDS)
        k = int(math.floor(t / CHORD_STEP)) % n
        u = t - math.floor(t / CHORD_STEP) * CHORD_STEP
        cur = self.key(CHORDS[k], PRESS)
        nxt = self.key(CHORDS[(k + 1) % n], PRESS)
        if u <= CHORD_HOLD:
            return cur, cur, 1.0 - smooth((u - 0.4) / 0.15)
        v = (u - CHORD_HOLD) / (CHORD_STEP - CHORD_HOLD)
        knuckle = cur + (nxt - cur) * smooth(v) + np.array([0.0, 0.04 * math.sin(math.pi * v), 0.0])
        return knuckle, None, 0.0

    def clip_ready(self, t):
        """Makes the ready pose: seated, both paws above the first notes."""
        rot, hips = self.body(t, lean=0.8, head=-2.0)
        knuckles = {'R': self.key(MELODY[0], HOVER), 'L': self.key(CHORDS[0], HOVER)}
        rot['fingers_R'] = self.curl('R', 4.0)
        rot['fingers_L'] = self.curl('L', 4.0)
        return {'rot': rot, 'hips': hips, 'arms': self.arms(rot, hips, knuckles)}

    def clip_play(self, t):
        """Makes two bars of play: the melody, the chords, a sway, and a nod on each bar."""
        sway = 2.0 * math.sin(2 * math.pi * t / 2.0)
        nod = 4.0 * (pulse(t, 0.0, 0.2) + pulse(t, 2.0, 0.2) + pulse(t, 4.0, 0.2))
        rot, hips = self.body(t, sway=sway, nod=nod)
        right, _, press_r = self.melody(t)
        left, _, press_l = self.chords(t)
        rot['fingers_R'] = self.curl('R', 4.0 + 10.0 * press_r)
        rot['fingers_L'] = self.curl('L', 4.0 + 8.0 * press_l)
        return {'rot': rot, 'hips': hips, 'arms': self.arms(rot, hips, {'R': right, 'L': left})}

    def chord_knuckles(self, t):
        """Calculates both knuckles of the big chord at time t, and whether they press."""
        right_key, left_key = self.key(13, PRESS), self.key(3, PRESS)
        up = np.array([0.0, 0.2, 0.0])
        rise = smooth(t / 1.0)
        strike = smooth((t - 1.0) / 0.25)
        lift = smooth((t - 1.9) / 0.8)
        out = {}
        for side, k in (('R', right_key), ('L', left_key)):
            wide = np.array([0.04 if side == 'L' else -0.04, 0.0, -0.03])
            high = k + up + wide
            p = k + (high - k) * rise
            p = p + (k - p) * strike
            p = p + (k + 0.8 * up + wide - p) * lift
            out[side] = p
        pressed = 1.25 <= t <= 1.9
        return out, pressed

    def clip_chord(self, t):
        """Makes the big chord: both paws rise, strike, hold, and lift with the head."""
        rise = smooth(t / 1.0)
        strike = smooth((t - 1.0) / 0.25)
        lift = smooth((t - 1.9) / 0.8)
        lean = 1.0 - 0.6 * rise + 0.9 * strike - 0.7 * lift
        head = -6.0 * rise + 12.0 * strike - 14.0 * lift
        rot, hips = self.body(t, lean=lean, head=head)
        knuckles, _ = self.chord_knuckles(t)
        curl = 4.0 + 12.0 * strike * (1.0 - lift)
        rot['fingers_R'] = self.curl('R', curl)
        rot['fingers_L'] = self.curl('L', curl)
        return {'rot': rot, 'hips': hips, 'arms': self.arms(rot, hips, knuckles)}

    def rest_point(self, side):
        """Returns the knuckle point of a paw that rests on the outer top of its knee.

        The belly of a heavy animal hangs over the inner thighs, so the paw lies on the outer
        side of the knee: out by 1.45 of the knee radius, on the outer top of the knee, forward.
        """
        m = np.array([1.0 if side == 'L' else -1.0, 1.0, 1.0])
        r = self.ctx.cfg.field.leg.thigh.radii[1]
        k = self.knee
        point = np.array([k[0] + 1.45 * r, k[1] + 0.5 * r + PRESS - self.layout['drop'],
                          k[2] + 1.3 * r])
        return point * m

    def clip_rest(self, t):
        """Makes the rest: the paws lift off the keys, come back and out around the belly, and
        lie on the knees. The trunk leans further forward, so the arms stay bent and close to
        the bind pose, and the elbows turn out, so the forearms pass outside the hips."""
        back = smooth(t / 0.8)
        down = smooth((t - 0.6) / 1.3)
        rot, hips = self.body(t, lean=1.0 + 0.6 * down, head=3.0 * down)
        knuckles, fingers, palms, poles = {}, {}, {}, {}
        for side, start in (('R', self.key(MELODY[0], PRESS)), ('L', self.key(CHORDS[0], PRESS))):
            out = 1.0 if side == 'L' else -1.0
            over = start + np.array([0.08 * out, 0.05, -0.08])
            p = start + (over - start) * back
            p = p + (self.rest_point(side) - p) * down
            knuckles[side] = p
            fingers[side] = unit(FINGERS * (1 - down) + unit([0.3 * out, -0.35, 1.0]) * down)
            palms[side] = unit(PALM * (1 - down) + unit([0.0, -1.0, -0.25]) * down)
            poles[side] = unit(POLE[side] * (1 - down) + unit([out, 0.0, -0.25]) * down)
            rot[f'fingers_{side}'] = self.curl(side, 4.0 * (1.0 - down))
        return {'rot': rot, 'hips': hips,
                'arms': self.arms(rot, hips, knuckles, fingers, palms, poles)}

    def hand_targets(self, clip, t):
        """Returns the knuckle targets of the paws that press a key at time t of a clip:
        {side: point or None}, or None for a clip with no key presses. The scene check of the
        build measures the posed knuckles against them (role.toml [checks] hand_targets)."""
        if clip == 'play':
            _, right, _ = self.melody(t)
            _, left, _ = self.chords(t)
            return {'R': right, 'L': left}
        if clip == 'chord':
            knuckles, pressed = self.chord_knuckles(t)
            return knuckles if pressed else None
        return None
