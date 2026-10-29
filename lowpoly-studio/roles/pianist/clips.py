"""The pianist clips: each clip is a function of time (seconds) that returns a pose spec of the
biped solver (templates/biped/solver.py).

numpy only, three.js axes (x is the animal's left, y up, z forward). The clips use 120 bpm: a
beat is 0.5 s, and a bar is 2 s.

The scene is the bench and the piano of role.toml, sized to the body (studio/props.py
scene_layout). The hips drop by the seated drop, so the feet of the bent legs stand on the floor
and the trunk and the thighs sit on the bench. The legs keep the bind pose (no leg spec): the bind
pose of the role is seated.

Each paw has four digits (role.toml [rig] fingers = 4), from the inner digit 1 to the outer digit
4, and each digit ends at the tip of its claw. A white key is as wide as the spacing of the claws,
so in a hand position each digit is over its own key: for the right paw digit 1 is on the anchor
key and digit 4 three white keys higher, for the left paw digit 1 is on the anchor key and digit
4 three white keys lower. A note is a digit that curls down until its claw tip is on the key, then
pushes the key down by the key dip (the key node of the piano turns with it), and lifts again.
The paw keeps its place, so a single digit strikes a single key, and a chord is several digits at
the same time.

The pack turns each wrist place into a target in the rest frame of the chest, the frame of the
solver, with the chest of the same pose.
"""

import math

import numpy as np

from studio import props
from studio.ik import align, euler, rot_axis, unit

# The forward lean of the trunk while playing, in degrees for the spine, spine1, and chest.
LEAN = (5.0, 4.0, 3.0)

# The paw over the keys: the fingers point forward and down, the palm faces down. The elbows
# point out, down, and back.
FINGERS = unit([0.0, -0.35, 1.0])
PALM = unit([0.0, -1.0, 0.35])
POLE = {'R': unit([-1.0, -0.6, -0.4]), 'L': unit([1.0, -0.6, -0.4])}

# A straight digit (curl 0) has its claw tip on the key top, and a digit that does not play is
# lifted by LIFT degrees (negative: up), about 1.4 cm over its key. A strike then uses the steep
# part of the arc of the claw tip, so the tip goes down onto its key and does not slide along it.
# The times of a note: the claw goes down to the key, the key goes down, and both come up after
# the note.
LIFT = -12.0
ATTACK = 0.08
PRESS = 0.04
RELEASE = 0.08

# The melody of the right paw (one note each beat, two bars, a loop): the first line of "Ode to
# Joy", in the hand position on D5 (digit 1 on D5 to digit 4 on G5).
BEAT = 0.5
MELODY = ['E5', 'E5', 'F5', 'G5', 'G5', 'F5', 'E5', 'D5']
MELODY_HOME = 'D5'
MELODY_HOLD = 0.32

# The chords of the left paw, on beats 1 and 3, in the hand position on E3 (digit 1 on E3 to digit
# 4 on B2): C and E (digits 3 and 1), then B and D (digits 4 and 2).
CHORDS = [('C3', 'E3'), ('B2', 'D3'), ('C3', 'E3'), ('B2', 'D3')]
CHORD_HOME = 'E3'
CHORD_STEP = 1.0
CHORD_HOLD = 0.55

# The big chord: three digits of each paw. The right paw on C5 (digits 1, 3, 4), the left paw on
# F3 (digits 1, 2, 4).
BIG = {'R': ('C5', ('C5', 'E5', 'F5')), 'L': ('F3', ('F3', 'E3', 'C3'))}

# How high the paws rise over the keys before the big chord, and after it.
CHORD_RISE = 0.12
CHORD_LIFT = 0.1

WHITE = 'CDEFGAB'

# The rest: the paws lie on the outer tops of the knees, out by REST_OUT and forward by
# REST_FORWARD of the knee radius. On their way they first lift off the keys (out, up, and back by
# REST_LIFT). The elbows turn out and back (REST_POLE) in the first REST_POLE_FIRST of the way
# down, and the trunk leans further forward by REST_LEAN of the play lean, so the forearms pass
# outside the belly and the shoulders do not fold. The values fit the 7 seeds of the polar bear
# that pass the remesh gate.
REST_OUT = 2.1
REST_FORWARD = 1.3
REST_LIFT = (0.03, 0.09, -0.02)
REST_POLE = (1.0, 0.0, -0.4)
REST_POLE_FIRST = 0.5
REST_LEAN = 1.5

# A lifted paw points its fingers further down: the y of the fingers changes by TILT for each unit
# of lift over the keys. The forearm of a lifted paw points down more steeply, and the tilt keeps
# the bend of the wrist near the bend of the play pose (a wrist bent past about 90 degrees folds
# its skin).
TILT = -1.5


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


def white_index(name):
    """Returns the place of a white key from C0 (C4 -> 28)."""
    return 7 * int(name[-1]) + WHITE.index(name[0])


def white_name(index):
    """Returns the name of a white key from its place from C0."""
    return f'{WHITE[index % 7]}{index // 7}'


def envelope(t, start, hold):
    """Calculates how far a digit goes down for a note from start to start + hold: 0 (over the
    key) to 1 (on the key top) to 2 (the key fully down), and back."""
    if t < start - ATTACK or t > start + hold + RELEASE:
        return 0.0
    if t < start:
        return smooth((t - start + ATTACK) / ATTACK)
    if t < start + hold:
        return 1.0 + smooth((t - start) / PRESS)
    return 2.0 * (1.0 - smooth((t - start - hold) / RELEASE))


class Paw:
    """The rest geometry of one paw from the rest skeleton: the wrist, the digits (head and claw
    tip), the axes of the hand frame, and the curl axis of the digits."""

    def __init__(self, ctx, side):
        """Reads the paw of one side."""
        skel, _ = ctx.rest_skeleton()
        m = np.array([1.0 if side == 'L' else -1.0, 1.0, 1.0])
        self.side = side
        self.wrist = skel.heads[f'hand_{side}']
        self.axis = skel.extras[f'fingers_{side}']
        self.palm = skel.extras[f'palm_{side}']
        self.curl_axis = skel.rest[f'hand_{side}'][:, 0]
        digits = ctx.body.digits('bind')
        self.heads = [skel.heads[f'finger{k + 1}_{side}'] for k in range(len(digits))]
        self.tips = [d['tail'] * m for d in digits]

    def frame(self, fingers, palm):
        """Returns the world rotation of the hand that points the fingers and the palm."""
        return align(self.axis, self.palm, fingers, palm)

    def tip(self, Dh, wrist, k, curl):
        """Returns the claw tip of digit k (1..4) for the hand rotation, the wrist, and the curl
        of the digit in degrees (positive: toward the palm)."""
        h, p = self.heads[k - 1], self.tips[k - 1]
        R = rot_axis(self.curl_axis, math.radians(curl))
        return wrist + Dh @ (h - self.wrist) + Dh @ R @ (p - h)

    def wrist_for(self, Dh, k, point, curl=0.0):
        """Returns the wrist that puts the claw tip of digit k on a point."""
        return point - (self.tip(Dh, np.zeros(3), k, curl))

    def curl_for(self, Dh, wrist, k, y):
        """Solves the curl of digit k that puts its claw tip at the height y, by bisection (the tip
        goes down as the curl grows)."""
        lo, hi = -40.0, 80.0
        for _ in range(30):
            mid = 0.5 * (lo + hi)
            if self.tip(Dh, wrist, k, mid)[1] > y:
                lo = mid
            else:
                hi = mid
        return 0.5 * (lo + hi)


class Pianist:
    """The pianist pack: the clips, the performance, the key presses, and the targets of the
    claw tips."""

    def __init__(self, ctx):
        """Stores the context of the studio (studio/roles.py), the scene layout, the keys, the
        paws, and the clips."""
        self.ctx = ctx
        self.fps = ctx.role.clips.fps
        self.blend = 0.3
        self.layout = props.scene_layout(ctx.body, ctx.role)
        self.keys = {k['name']: k for k in props.piano_keys(ctx.body, ctx.role)}
        piano = next(p for p in props.scene_props(ctx.role) if p.kind == 'piano')
        sizes = props.piano_sizes(ctx.body, piano, ctx.role)
        self.dip = sizes['key_dip']
        # The front part of a white key, where a claw tip presses it: from a tenth of the key to
        # the front of the black keys.
        depth = sizes['keys_depth']
        self.press_z = (sizes['keys_front'] + 0.1 * depth,
                        sizes['keys_front'] + depth - sizes['black_depth'] - 0.004)
        self.paws = {side: Paw(ctx, side) for side in ('L', 'R')}
        legs, _ = ctx.body.leg_pose('bind')
        self.knee = legs['knee']
        self.pressed_keys = sorted(set(MELODY) | {k for c in CHORDS for k in c}
                                   | {k for _, keys in BIG.values() for k in keys})
        # The claw tip moves back as a digit curls down, and the inner claws sit further forward
        # on the paw. For each digit: the place of its pressed claw tip from the tip of straight
        # digit 1 on its key top. The paw then goes back by the mean of these places, so the
        # pressed tips center on the press points of their keys.
        self.land = {}
        for side, paw in self.paws.items():
            Dh = paw.frame(FINGERS, PALM)
            W = paw.wrist_for(Dh, 1, np.zeros(3))
            land = []
            for k in range(1, len(paw.heads) + 1):
                curl = paw.curl_for(Dh, W, k, -self.dip)
                land.append(float(paw.tip(Dh, W, k, curl)[2]))
            self.land[side] = np.array(land) - float(np.mean(land))
            self.land[side + 'mean'] = float(np.mean(land))
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

    def digit_key(self, side, home, k):
        """Returns the white key under digit k in the hand position on the home key."""
        step = k - 1 if side == 'R' else 1 - k
        return white_name(white_index(home) + step)

    def digit_of(self, side, home, key):
        """Returns the digit that plays a key in the hand position on the home key."""
        step = white_index(key) - white_index(home)
        return 1 + (step if side == 'R' else -step)

    def place(self, side, home, lift=0.0, palm=PALM):
        """Places a paw in the hand position on a home key: the claw tip of straight digit 1 on
        the press point of the home key (lift over the key top). A lifted paw tilts its fingers
        by TILT for each unit of lift. Returns (hand rotation, wrist)."""
        paw = self.paws[side]
        Dh = paw.frame(unit(FINGERS + np.array([0.0, TILT * lift, 0.0])), palm)
        p = self.keys[home]['press'] + np.array([0.0, lift, -self.land[side + 'mean']])
        return Dh, paw.wrist_for(Dh, 1, p)

    def fingers(self, side, home, Dh, wrist, notes, t):
        """Curls the digits of a paw for the notes [(key, start, hold)] at time t.

        Returns ({bone: rotation}, {key: press share}, {digit: claw tip target of a pressed
        key})."""
        paw = self.paws[side]
        rot, keys, targets = {}, {}, {}
        for k in range(1, len(paw.heads) + 1):
            key = self.digit_key(side, home, k)
            down = max((envelope(t, start, hold) for name, start, hold in notes if name == key),
                       default=0.0)
            top = self.keys[key]['press'][1]
            curl = LIFT
            if down > 0.0:
                # From the lifted digit down to the key top, then the key dip.
                up = paw.tip(Dh, wrist, k, LIFT)[1]
                y = up - min(down, 1.0) * (up - top) - max(down - 1.0, 0.0) * self.dip
                curl = paw.curl_for(Dh, wrist, k, y)
            if down > 1.0:
                # The claw tip is on its key, at the depth of the key, on the front part of the
                # key: the tip slides a little along the key as the digit curls.
                share = down - 1.0
                keys[key] = share
                press = self.keys[key]['press']
                z = float(np.clip(paw.tip(Dh, wrist, k, curl)[2], *self.press_z))
                targets[k] = np.array([press[0], top - share * self.dip, z])
            rot[f'finger{k}_{side}'] = rot_axis(paw.curl_axis, math.radians(curl))
        return rot, keys, targets

    def arms(self, rot, hips, wrists, fingers=None, palms=None, poles=None):
        """Turns wrist points in model space into the arm specs of the solver.

        The solver reads the wrists and the directions in the rest frame of the chest, so the
        chest of this pose (with no arms) maps them. Returns {side: arm spec}.
        """
        skel, _ = self.ctx.rest_skeleton()
        _, D, H = skel.solve({'rot': rot, 'hips': hips})
        Dc, Hc, c0 = D['chest'], H['chest'], skel.heads['chest']
        out = {}
        for side, wrist in wrists.items():
            f = (fingers or {}).get(side, FINGERS)
            p = (palms or {}).get(side, PALM)
            pole = (poles or {}).get(side, POLE[side])
            out[side] = {'wrist': c0 + Dc.T @ (np.asarray(wrist, float) - Hc),
                         'pole': Dc.T @ pole, 'hand': ('fingers', Dc.T @ f, Dc.T @ p),
                         'twist': 0.5}
        return out

    def melody_notes(self):
        """Lists the notes of the right paw in one loop: (key, start, hold), and the first note
        of the next loop."""
        notes = [(key, i * BEAT, MELODY_HOLD) for i, key in enumerate(MELODY)]
        return notes + [(MELODY[0], len(MELODY) * BEAT, MELODY_HOLD)]

    def chord_notes(self):
        """Lists the notes of the left paw in one loop, and the first chord of the next loop."""
        out = []
        for i, chord in enumerate(CHORDS + CHORDS[:1]):
            out += [(key, i * CHORD_STEP, CHORD_HOLD) for key in chord]
        return out

    def frame(self, t, homes, notes, lifts=None):
        """Makes the paws of one frame: the place of each paw in its hand position, and the
        digits for its notes. Returns (wrists, rotations of the digits, key presses, targets)."""
        wrists, rot, keys, targets = {}, {}, {}, {}
        for side, home in homes.items():
            Dh, wrist = self.place(side, home, (lifts or {}).get(side, 0.0))
            r, k, tg = self.fingers(side, home, Dh, wrist, notes.get(side, ()), t)
            wrists[side] = wrist
            rot.update(r)
            keys.update(k)
            if tg:
                targets[side] = tg
        return wrists, rot, keys, targets

    def clip_ready(self, t):
        """Makes the ready pose: seated, both paws over the first notes, the digits a little
        up."""
        rot, hips = self.body(t, lean=0.8, head=-2.0)
        lift = 0.03 * (1.0 - smooth(t / 2.0))
        wrists, r, _, _ = self.frame(t, {'R': MELODY_HOME, 'L': CHORD_HOME}, {},
                                     {'R': lift, 'L': lift})
        rot.update(r)
        return {'rot': rot, 'hips': hips, 'arms': self.arms(rot, hips, wrists)}

    def play(self, t):
        """Calculates the paws of the play clip at time t: (wrists, digits, keys, targets)."""
        u = t % (len(MELODY) * BEAT)
        return self.frame(u, {'R': MELODY_HOME, 'L': CHORD_HOME},
                          {'R': self.melody_notes(), 'L': self.chord_notes()})

    def clip_play(self, t):
        """Makes two bars of play: the melody, the chords, a sway, and a nod on each bar."""
        sway = 2.0 * math.sin(2 * math.pi * t / 2.0)
        nod = 4.0 * (pulse(t, 0.0, 0.2) + pulse(t, 2.0, 0.2) + pulse(t, 4.0, 0.2))
        rot, hips = self.body(t, sway=sway, nod=nod)
        wrists, r, keys, _ = self.play(t)
        rot.update(r)
        return {'rot': rot, 'hips': hips, 'keys': keys, 'arms': self.arms(rot, hips, wrists)}

    def chord(self, t):
        """Calculates the paws of the big chord at time t: the paws rise from their play places
        to over the chord, come down, the digits strike and hold, and the paws lift."""
        rise = smooth(t / 1.0)
        down = smooth((t - 0.9) / 0.3)
        lift = smooth((t - 2.0) / 0.8)
        high = CHORD_RISE * rise * (1.0 - down) + CHORD_LIFT * lift
        notes = {side: [(key, 1.25, 0.65) for key in keys] for side, (_, keys) in BIG.items()}
        homes = {side: home for side, (home, _) in BIG.items()}
        wrists, rot, keys, targets = self.frame(t, homes, notes, {'R': high, 'L': high})
        # The paws glide from the places of the play clip to the chord as they rise.
        start, *_ = self.frame(0.0, {'R': MELODY_HOME, 'L': CHORD_HOME}, {})
        for side in wrists:
            wrists[side] = start[side] + (wrists[side] - start[side]) * smooth(t / 0.9)
        return wrists, rot, keys, targets

    def clip_chord(self, t):
        """Makes the big chord: both paws rise, strike, hold, and lift with the head."""
        rise = smooth(t / 1.0)
        strike = smooth((t - 1.0) / 0.25)
        lift = smooth((t - 1.9) / 0.8)
        lean = 1.0 - 0.6 * rise + 0.9 * strike - 0.7 * lift
        head = -6.0 * rise + 12.0 * strike - 14.0 * lift
        rot, hips = self.body(t, lean=lean, head=head)
        wrists, r, keys, _ = self.chord(t)
        rot.update(r)
        return {'rot': rot, 'hips': hips, 'keys': keys, 'arms': self.arms(rot, hips, wrists)}

    def rest_point(self, side):
        """Returns the point of a paw that rests on the outer top of its knee.

        The belly of a heavy animal hangs over the inner thighs, so the paw lies on the outer
        side of the knee: out by REST_OUT and forward by REST_FORWARD of the knee radius, on the
        outer top of the knee.
        """
        m = np.array([1.0 if side == 'L' else -1.0, 1.0, 1.0])
        r = self.ctx.cfg.field.leg.thigh.radii[1]
        k = self.knee
        point = np.array([k[0] + REST_OUT * r, k[1] + 0.5 * r + 0.048 - self.layout['drop'],
                          k[2] + REST_FORWARD * r])
        return point * m

    def clip_rest(self, t):
        """Makes the rest: the paws lift off the keys, go out around the belly, and lie on the
        outer tops of the knees. The trunk leans further forward, so the arms stay bent and
        close to the bind pose, and the elbows turn out and back, so the forearms pass outside
        the belly."""
        back = smooth(t / 0.8)
        down = smooth((t - 0.6) / 1.3)
        # The elbows turn out and back in the first half of the way down.
        turn = smooth((t - 0.6) / (1.3 * REST_POLE_FIRST))
        rot, hips = self.body(t, lean=1.0 + REST_LEAN * down, head=3.0 * down)
        starts, r, _, _ = self.frame(0.0, {'R': MELODY_HOME, 'L': CHORD_HOME}, {})
        wrists, fingers, palms, poles = {}, {}, {}, {}
        for side, start in starts.items():
            out = 1.0 if side == 'L' else -1.0
            over = start + np.array([REST_LIFT[0] * out, REST_LIFT[1], REST_LIFT[2]])
            p = start + (over - start) * back
            f_end = unit([0.3 * out, -0.35, 1.0])
            palm_end = unit([0.0, -1.0, -0.25])
            pole_end = unit([out * REST_POLE[0], REST_POLE[1], REST_POLE[2]])
            end = self.rest_point(side) - 0.07 * unit(FINGERS * (1 - down) + f_end * down)
            wrists[side] = p + (end - p) * down
            fingers[side] = unit(FINGERS * (1 - down) + f_end * down)
            palms[side] = unit(PALM * (1 - down) + palm_end * down)
            poles[side] = unit(POLE[side] * (1 - turn) + pole_end * turn)
            for k in range(1, 5):
                rot[f'finger{k}_{side}'] = rot_axis(self.paws[side].curl_axis,
                                                    math.radians(LIFT * (1.0 - down) + 6.0 * down))
        return {'rot': rot, 'hips': hips,
                'arms': self.arms(rot, hips, wrists, fingers, palms, poles)}

    def hand_targets(self, clip, t):
        """Returns the claw tip targets of the digits that press a key at time t of a clip:
        {side: {digit: point}}, or None for a clip with no key presses. The scene check of the
        build measures the posed claw tips against them (role.toml [checks] hand_targets)."""
        if clip == 'play':
            return self.play(t)[3] or None
        if clip == 'chord':
            return self.chord(t)[3] or None
        return None

