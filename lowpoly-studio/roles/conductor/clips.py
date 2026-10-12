"""The conducting clips: each clip is a function of time (seconds) that returns a pose spec of
the biped solver (templates/biped/solver.py).

numpy only, three.js axes (x is the animal's left, y up, z forward). The beat clips use 60 bpm,
so one beat is one second and the ictus of beat n is at t = n - 1. A player plays a clip at
another tempo with a time scale of bpm / 60.

The IK targets below were made on the bear (role.toml [targets]). On another body the studio
moves each wrist target with the shoulder of its side and scales it by the arm reach
(studio/roles.py Context.place).

The right paw holds the baton. Its wrist follows a 4/4 path in a plane in front of the chest:
beat 1 down, beat 2 in (toward the bear's left), beat 3 out, beat 4 up. Between two ictus
points the wrist rebounds like a ball: the vertical speed turns over at the ictus, which gives
the sharp click of the ictus, and the hand falls fast into the next one.
"""

import math

import numpy as np

from studio.ik import euler, rot_axis, unit

# The forward lean of the spine and the chest while conducting (degrees each).
LEAN = 3.0

# Rest positions of the wrists (in the rest frame of the chest) and the elbow poles.
# The beat plane is at the chest, in front of the right shoulder (x -0.16, y 0.662).
HOME_R = np.array([-0.18, 0.665, 0.285])
HOME_L = np.array([0.215, 0.62, 0.27])
POLE_R = unit([-1.0, -0.35, -0.25])
POLE_L = unit([1.0, -0.7, -0.35])

# The 4/4 path of the right wrist: ictus points (offsets from HOME_R) and rebound heights.
# The wrist stays 0.26 to 0.32 from the shoulder: the arm reaches 0.336 when it is straight,
# so the elbow stays bent by 35 degrees or more. The tip of the baton spans 0.29 wide and 0.23
# tall (roles/conductor/pattern.py).
ICTUS = np.array([
    [0.000, -0.080, 0.005],
    [0.09, -0.055, 0.025],
    [-0.140, -0.055, -0.045],
    [-0.005, -0.005, 0.000],
])
REBOUND = [0.06, 0.05, 0.055, 0.125]
REBOUND_SHAPE = (0.7, 0.85)

# The baton points up, in, and forward from the paw. Its projection on the frontal plane is 0.67
# of its length, so it reads from the front and from the back.
BATON_DIR = unit([0.3, 0.6, 0.75])
PALM_R = unit([0.35, -1.0, 0.05])
FINGERS_L = unit([-0.3, 0.1, 1.0])
PALM_L = unit([-0.55, -0.8, 0.0])


def smooth(u):
    """Eases 0..1 with zero slope at both ends."""
    u = min(max(u, 0.0), 1.0)
    return u * u * (3 - 2 * u)


def window(t, t0, t1, t2, t3):
    """Makes an envelope: 0 before t0, up to 1 at t1, 1 to t2, down to 0 at t3."""
    if t <= t0 or t >= t3:
        return 0.0
    if t < t1:
        return smooth((t - t0) / (t1 - t0))
    if t <= t2:
        return 1.0
    return 1.0 - smooth((t - t2) / (t3 - t2))


def pulse(t, center, width):
    """Makes a bell-shaped pulse."""
    return math.exp(-((t - center) / width) ** 2)


def bounce(u):
    """Makes the rebound curve between two ictus points: 0 at both ends, 1 at the top."""
    a, b = REBOUND_SHAPE
    peak = (a / (a + b)) ** a * (b / (a + b)) ** b
    u = min(max(u, 0.0), 1.0)
    return (u ** a) * ((1 - u) ** b) / peak


def beat_right(t, size=1.0):
    """Calculates the right wrist, the baton direction, and the beat phase at time t.

    Returns (wrist, baton direction, beat index 0..3, phase u in the beat).
    """
    k = math.floor(t + 1e-9)
    i = k % 4
    u = t - k
    j = (i + 1) % 4
    s = smooth(u * 1.25)
    up = np.array([0.0, 1.0, 0.0])
    b = bounce(u)
    off = ICTUS[i] * (1 - s) + ICTUS[j] * s + up * REBOUND[i] * b
    off = off + np.array([0.0, 0.0, 0.014 * (1 - b)])
    wrist = HOME_R + size * off
    # The tip of the baton dips at the ictus (a flick of the wrist) and lifts in the rebound.
    dip = (1 - b) ** 2
    direction = unit(BATON_DIR + np.array([0.0, -0.09 * dip, 0.0]))
    return wrist, direction, i, u


def right_arm(t, size=1.0):
    """Makes the arm spec of the beating right arm."""
    wrist, direction, _, _ = beat_right(t, size)
    return {'wrist': wrist, 'pole': POLE_R, 'hand': ('baton', direction, PALM_R), 'twist': 0.5}


def left_rest(t, lift=0.0):
    """Makes the arm spec of the quiet left arm (it echoes the beat a little)."""
    _, _, _, u = beat_right(t)
    wrist = HOME_L + np.array([0.0, 0.006 * bounce(u) + lift, 0.0])
    return {'wrist': wrist, 'pole': POLE_L, 'hand': ('fingers', FINGERS_L, PALM_L), 'twist': 0.5}


def beat_body(t, amount=1.0):
    """Makes the body motion of a beat bar: a knee dip at each ictus, a sway, and a nod on 1."""
    k = t % 4
    dip = 0.0
    for n in range(5):
        strength = 0.009 if n % 4 == 0 else 0.004
        dip += strength * pulse(k, n - 0.03, 0.16)
    # The torso turns a little with the right paw (+ yaw turns to the bear's left), and the
    # head stays on the players.
    wrist, _, _, _ = beat_right(t)
    lateral = (wrist[0] - HOME_R[0]) / 0.1
    roll = 1.8 * math.sin(math.pi * (t - 0.5))
    rot = {
        'hips': euler(roll=0.5 * roll * amount),
        'spine1': euler(pitch=LEAN + 1.0 * amount, yaw=1.5 * lateral * amount),
        'chest': euler(pitch=LEAN, roll=0.6 * roll * amount, yaw=1.5 * lateral * amount),
        'neck': euler(pitch=2.0 * pulse(k, 0.05, 0.25) * amount),
        'head': euler(pitch=4.0 * pulse(k, 0.0, 0.22) * amount, yaw=-1.0 * lateral * amount,
                      roll=-0.5 * roll * amount),
    }
    return rot, np.array([0.0, -dip * amount, 0.0])


def spec(rot, hips, arms, **extra):
    """Bundles a pose spec with planted feet."""
    out = {'rot': rot, 'hips': hips, 'arms': arms, 'legs': 'planted'}
    out.update(extra)
    return out


def ears(t, flick=0.0):
    """Makes a small ear motion: a slow drift and an optional flick."""
    a = 3.0 * math.sin(t * 1.3) + 14.0 * flick
    return {'ear_L': euler(pitch=-a * 0.5, roll=-a * 0.4), 'ear_R': euler(pitch=-a * 0.5, roll=a * 0.4)}


def breath(t):
    """Makes the breathing of the chest (a period of 3.2 s)."""
    return 1.2 * math.sin(2 * math.pi * t / 3.2)


# The clips.

def clip_ready(t):
    """Makes the ready pose: both paws up in front of the chest, the baton up."""
    b = breath(t)
    rot = {'spine1': euler(pitch=LEAN), 'chest': euler(pitch=LEAN - 0.6 * b),
           'head': euler(pitch=-2.0 + 0.4 * b)}
    rot.update(ears(t))
    lift = 0.004 * b
    arms = {
        'R': {'wrist': np.array([-0.205, 0.655 + lift, 0.275]), 'pole': POLE_R,
              'hand': ('baton', unit([0.1, 0.62, 1.0]), unit([1.0, -0.15, 0.1])), 'twist': 0.5},
        'L': {'wrist': np.array([0.21, 0.645 + lift, 0.27]), 'pole': POLE_L,
              'hand': ('fingers', unit([-0.2, 0.5, 1.0]), unit([-1.0, -0.1, 0.25])),
              'twist': 0.5},
    }
    return spec(rot, np.zeros(3), arms)


def clip_beat(t):
    """Makes one bar of 4/4 with the right paw; the left paw rests."""
    rot, hips = beat_body(t)
    rot.update(ears(t))
    return spec(rot, hips, {'R': right_arm(t), 'L': left_rest(t)})


def clip_cue_left(t):
    """Makes a bar with a cue of the left paw to the players on the left, on beat 3."""
    rot, hips = beat_body(t, 0.7)
    look = window(t, 0.6, 1.5, 3.0, 3.9)
    nod = pulse(t, 2.05, 0.18)
    rot['neck'] = euler(pitch=3.0 * nod, yaw=10.0 * look)
    rot['head'] = euler(pitch=-3.0 * look + 9.0 * nod, yaw=20.0 * look)
    rot['chest'] = rot['chest'] @ euler(yaw=6.0 * look)
    rot.update(ears(t, flick=nod))
    # The left paw: up to a preparation, a quick throw to the cue point, a hold, and back.
    # The preparation keeps the elbow bent about 70 degrees, as in the beat. Nearer to the
    # shoulder the elbow bends past 100 degrees, and the inner elbow skin folds.
    prep = np.array([0.27, 0.69, 0.25])
    cue = np.array([0.33, 0.63, 0.29])
    w = HOME_L.copy()
    if t < 1.9:
        w = HOME_L + (prep - HOME_L) * smooth((t - 0.8) / 1.0)
        fingers, palm = FINGERS_L, PALM_L
    elif t < 3.0:
        w = prep + (cue - prep) * smooth((t - 1.9) / 0.15)
        fingers, palm = unit([0.8, -0.05, 1.0]), unit([-0.35, -1.0, 0.1])
    else:
        w = cue + (HOME_L - cue) * smooth((t - 3.0) / 0.9)
        fingers, palm = unit([0.8, -0.05, 1.0]), unit([-0.35, -1.0, 0.1])
    if t >= 1.75:
        g = smooth((t - 1.75) / 0.25) if t < 3.0 else 1 - smooth((t - 3.0) / 0.9)
        fingers = unit(FINGERS_L * (1 - g) + unit([0.8, -0.05, 1.0]) * g)
        palm = unit(PALM_L * (1 - g) + unit([-0.35, -1.0, 0.1]) * g)
    left = {'wrist': w, 'pole': POLE_L, 'hand': ('fingers', fingers, palm), 'twist': 0.65}
    return spec(rot, hips, {'R': right_arm(t, 0.9), 'L': left})


def clip_crescendo(t):
    """Makes a bar with the left palm up, lifting; the beat grows."""
    u = smooth(t / 4.0)
    rot, hips = beat_body(t, 0.8 + 0.5 * u)
    rot['chest'] = rot['chest'] @ euler(pitch=-3.0 * u)
    rot['head'] = rot['head'] @ euler(pitch=-6.0 * u)
    rot.update(ears(t, flick=0.4 * u))
    w = np.array([0.21, 0.53, 0.25]) * (1 - u) + np.array([0.29, 0.72, 0.29]) * u
    left = {'wrist': w, 'pole': POLE_L,
            'hand': ('fingers', unit([-0.3, 0.25, 1.0]), unit([-1.0, 0.45, 0.1])), 'twist': 0.55}
    return spec(rot, hips, {'R': right_arm(t, 0.85 + 0.35 * u), 'L': left})


def clip_hush(t):
    """Makes a bar with the left palm down, pressing; the beat gets small."""
    u = smooth(t / 3.6)
    rot, hips = beat_body(t, 1.0 - 0.6 * u)
    rot['spine1'] = rot['spine1'] @ euler(pitch=3.0 * u)
    rot['chest'] = rot['chest'] @ euler(pitch=3.0 * u)
    rot['head'] = rot['head'] @ euler(pitch=7.0 * u)
    rot.update(ears(t))
    hips = hips + np.array([0.0, -0.010 * u, 0.0])
    _, _, _, ph = beat_right(t)
    w = np.array([0.20, 0.72, 0.27]) * (1 - u) + np.array([0.19, 0.54, 0.30]) * u
    w = w + np.array([0.0, -0.008 * (1 - bounce(ph)), 0.0])
    left = {'wrist': w, 'pole': POLE_L,
            'hand': ('fingers', unit([-0.25, -0.05, 1.0]), unit([0.0, -1.0, 0.12])), 'twist': 0.5}
    return spec(rot, hips, {'R': right_arm(t, 1.0 - 0.55 * u), 'L': left})


def clip_cutoff(t, curl):
    """Makes a release: both paws lift, loop, cut off with a click, and hold.

    curl: a function (side, degrees) -> the curl of the finger bone.
    """
    # The paws close the cutoff in front of the shoulders, and they stay 0.35 apart.
    up_r = np.array([-0.25, 0.74, 0.25])
    up_l = np.array([0.25, 0.74, 0.25])
    end_r = np.array([-0.17, 0.635, 0.30])
    end_l = np.array([0.18, 0.625, 0.29])
    if t < 0.5:
        u = smooth(t / 0.5)
        wr = HOME_R + (up_r - HOME_R) * u
        wl = HOME_L + (up_l - HOME_L) * u
    elif t < 1.3:
        # A loop: out, down, in, and up again (mirrored for the left paw).
        a = 2 * math.pi * smooth((t - 0.5) / 0.8)
        r = 0.05
        wr = up_r + np.array([-r * math.sin(a), -r * (1 - math.cos(a)), 0.0])
        wl = up_l + np.array([r * math.sin(a), -r * (1 - math.cos(a)), 0.0])
    elif t < 1.45:
        u = smooth((t - 1.3) / 0.15)
        wr = up_r + (end_r - up_r) * u
        wl = up_l + (end_l - up_l) * u
    else:
        settle = 0.006 * math.exp(-(t - 1.45) * 6) * math.sin((t - 1.45) * 25)
        wr = end_r + np.array([0.0, settle, 0.0])
        wl = end_l + np.array([0.0, settle, 0.0])
    close = smooth((t - 1.3) / 0.15)
    tip = unit([0.2, 0.55 - 0.7 * close, 1.0])
    rot = {
        'chest': euler(pitch=-2.0 * window(t, 0.2, 0.6, 1.3, 1.5) + 2.0 * close),
        'head': euler(pitch=-6.0 * window(t, 0.2, 0.6, 1.3, 1.5) + 4.0 * close),
        'fingers_L': curl('L', 55.0 * close),
    }
    rot.update(ears(t, flick=pulse(t, 1.4, 0.12)))
    hips = np.array([0.0, -0.008 * pulse(t, 1.42, 0.1), 0.0])
    arms = {
        'R': {'wrist': wr, 'pole': POLE_R, 'hand': ('baton', tip, PALM_R), 'twist': 0.5},
        'L': {'wrist': wl, 'pole': POLE_L,
              'hand': ('fingers', unit([-0.4, 0.2 - 0.3 * close, 1.0]), unit([-0.6, -0.5, 0.2])),
              'twist': 0.5},
    }
    return spec(rot, hips, arms)


def clip_nod_turn(t):
    """Makes a head nod, a turn to the left section, a turn to the right section, and a return."""
    yaw = 0.0
    if t < 1.0:
        yaw = 0.0
    elif t < 1.7:
        yaw = 30.0 * smooth((t - 1.0) / 0.6)
    elif t < 2.4:
        yaw = 30.0
    elif t < 3.2:
        yaw = 30.0 - 60.0 * smooth((t - 2.4) / 0.7)
    else:
        yaw = -30.0 + 30.0 * smooth((t - 3.2) / 0.7)
    if 3.9 < t:
        yaw = 0.0
    nod = 14.0 * pulse(t, 0.45, 0.22) + 9.0 * pulse(t, 1.95, 0.16) + 9.0 * pulse(t, 3.0, 0.16)
    rot = {
        'spine1': euler(pitch=LEAN),
        'chest': euler(pitch=LEAN, yaw=0.25 * yaw),
        'neck': euler(yaw=0.3 * yaw, pitch=0.3 * nod),
        'head': euler(yaw=0.45 * yaw, pitch=0.7 * nod),
    }
    rot.update(ears(t, flick=pulse(t, 1.95, 0.15) + pulse(t, 3.0, 0.15)))
    arms = {'R': right_arm(3.5), 'L': left_rest(0.0)}
    return spec(rot, np.zeros(3), arms)


def clip_sway_dip(t):
    """Makes a torso sway over two beats and a knee dip on each beat."""
    roll = 5.0 * math.sin(math.pi * (t - 0.5))
    dip = sum(0.014 * pulse(t, n, 0.18) for n in range(5))
    rot = {
        'hips': euler(roll=0.4 * roll),
        'spine': euler(roll=0.35 * roll),
        'spine1': euler(pitch=LEAN),
        'chest': euler(roll=0.4 * roll, pitch=LEAN + 2.0 * dip / 0.014),
        'head': euler(roll=-0.7 * roll, pitch=-1.0 * dip / 0.014),
    }
    rot.update(ears(t))
    arms = {'R': right_arm(3.5), 'L': left_rest(0.0)}
    shift = -0.012 * math.sin(math.pi * (t - 0.5))
    return spec(rot, np.array([shift, -dip, 0.0]), arms)


class Conductor:
    """The conductor pack: the clips, the performance, and the parts that need the body."""

    def __init__(self, ctx):
        """Stores the context of the studio (studio/roles.py) and lists the clips."""
        self.ctx = ctx
        self.fps = ctx.role.clips.fps
        self.blend = 0.3
        self._cache = {}
        place = self._placed
        self.clips = {
            'reference': ctx.reference_clip(),
            'ready': (place(clip_ready), 3.2),
            'beat_4_4': (place(clip_beat), 4.0),
            'cue_left': (place(clip_cue_left), 4.0),
            'crescendo': (place(clip_crescendo), 4.0),
            'hush': (place(clip_hush), 4.0),
            'cutoff': (place(lambda t: clip_cutoff(t, self.fingers_curl)), 3.0),
            'nod_turn': (place(clip_nod_turn), 4.0),
            'sway_dip': (place(clip_sway_dip), 4.0),
            'bow': (place(self.clip_bow), 4.0),
        }
        # The performance: the clips in order. (clip, start time in the clip, duration).
        self.performance = [
            ('ready', 0.0, 1.6),
            ('beat_4_4', 3.6, 0.4),
            ('beat_4_4', 0.0, 8.0),
            ('cue_left', 0.0, 4.0),
            ('crescendo', 0.0, 4.0),
            ('hush', 0.0, 4.0),
            ('cutoff', 0.0, 3.4),
            ('bow', 0.0, 4.0),
        ]

    def _placed(self, fn):
        """Wraps a clip so that its wrist targets move onto the body of the animal."""
        if self.ctx.identity:
            return fn

        def placed(t):
            out = fn(t)
            for side, arm in out.get('arms', {}).items():
                arm['wrist'] = self.ctx.place(side, arm['wrist'])
            return out

        return placed

    def fingers_curl(self, side, degrees):
        """Makes the curl of the finger bone about the breadth axis of the paw."""
        _, frames = self.ctx.body.arm_pose('bind')
        axis = frames['hand'][:, 0] * np.array([1.0 if side == 'L' else -1.0, 1.0, 1.0])
        return rot_axis(axis, math.radians(degrees))

    def _right_sheet_pose(self):
        """Calculates the right wrist (in the frame of the pack), the elbow pole, and the paw
        frame of the sheet pose."""
        if 'sheet' not in self._cache:
            joints, frames = self.ctx.body.arm_pose('reference')
            m = np.diag([-1.0, 1.0, 1.0])
            S, E, W, K = (m @ joints[k] for k in ('shoulder', 'elbow', 'wrist', 'knuckle'))
            d = unit(W - S)
            self._cache['sheet'] = {
                'wrist': self.ctx.unplace('R', W),
                'pole': unit(E - (S + np.dot(E - S, d) * d)),
                'fingers': unit(K - W),
                'palm': unit(m @ frames['hand'][:, 2]),
            }
        return self._cache['sheet']

    def _bow_baton_turn(self, amount):
        """Calculates the turn of the baton in the right paw for the bow (a share amount of
        it)."""
        if 'baton' not in self._cache:
            bind_j, bind_f = self.ctx.body.arm_pose('bind')
            ref_j, ref_f = self.ctx.body.arm_pose('reference')
            m = np.diag([-1.0, 1.0, 1.0])
            hand = m @ (ref_f['hand'] @ bind_f['hand'].T) @ m
            grip, tip = self.ctx.prop_points('baton')
            b_rest = unit(tip - grip)
            want = hand.T @ unit([-0.45, -0.45, -0.77])
            axis = np.cross(b_rest, want)
            angle = math.atan2(np.linalg.norm(axis), float(np.dot(b_rest, want)))
            self._cache['baton'] = (axis, angle)
        axis, angle = self._cache['baton']
        return rot_axis(axis, amount * angle)

    def _right_home_frame(self):
        """Calculates the frame of the right paw at the beat home (the fingers and the palm)."""
        if 'home' not in self._cache:
            skel, _ = self.ctx.rest_skeleton()
            arms = {'R': {'wrist': self.ctx.place('R', HOME_R), 'pole': POLE_R,
                          'hand': ('baton', BATON_DIR, PALM_R), 'twist': 0.5}}
            _, D, _ = skel.solve({'rot': {}, 'arms': arms})
            Dh = D['hand_R']
            self._cache['home'] = {'fingers': unit(Dh @ skel.extras['fingers_R']),
                                   'palm': unit(Dh @ skel.extras['palm_R'])}
        return self._cache['home']

    def clip_bow(self, t):
        """Makes the bow at the end: the paws come down, the animal bends at the hips, and rises."""
        down = smooth(t / 0.6)
        bend = window(t, 0.5, 1.7, 2.3, 3.5)
        rot = {
            'hips': euler(pitch=18.0 * bend),
            'spine': euler(pitch=5.0 * bend),
            'spine1': euler(pitch=5.0 * bend),
            'chest': euler(pitch=6.0 * bend),
            'neck': euler(pitch=6.0 * bend),
            'head': euler(pitch=10.0 * bend),
            'tail': euler(pitch=-20.0 * bend),
            'fingers_R': self.fingers_curl('R', 10.0 * down),
        }
        rot.update(ears(t, flick=0.5 * bend))
        hips = np.array([0.0, -0.012 * bend, -0.03 * bend])
        # Right paw: from the beat home down to the pose of the sheet (in the frame of the chest),
        # where the arm-down corrective of the rig fits exactly. The elbow pole and the frame of the
        # paw blend from the home values to the values of the sheet pose.
        home = self._right_home_frame()
        ref = self._right_sheet_pose()
        wr = HOME_R + (ref['wrist'] - HOME_R) * down
        # The paw swings out on its way down, so the forearm passes clear of the belly.
        wr = wr + np.array([-0.06, 0.0, 0.03]) * math.sin(math.pi * down)
        pole_r = unit(POLE_R * (1 - down) + ref['pole'] * down)
        # In the sheet pose the fingers point down, so the baton would point into the ground in the
        # deep bow. The baton turns in the paw to point down, out, and back past the hip.
        rot['baton'] = self._bow_baton_turn(down)
        fingers_r = unit(home['fingers'] * (1 - down) + ref['fingers'] * down)
        palm_r = unit(home['palm'] * (1 - down) + ref['palm'] * down)
        # Left paw: on the chest, the elbow out to the side, so the forearm passes above the belly.
        belly = np.array([0.08, 0.60, 0.29])
        wl = HOME_L + (belly - HOME_L) * down
        fingers = unit(FINGERS_L * (1 - down) + unit([-1.0, 0.05, 0.1]) * down)
        palm = unit(PALM_L * (1 - down) + unit([-0.1, 0.0, -1.0]) * down)
        arms = {
            'R': {'wrist': wr, 'pole': pole_r, 'hand': ('fingers', fingers_r, palm_r), 'twist': 0.5},
            'L': {'wrist': wl, 'pole': unit([1.0, -0.15, -0.35]), 'hand': ('fingers', fingers, palm),
                  'twist': 0.5},
        }
        return spec(rot, hips, arms)



    #####
