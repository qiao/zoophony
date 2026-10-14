"""Gives the leg turns of a seat with the thighs about level and the shins vertical, for a config
of `pnpm rig-mesh` (`studio.legTurns`): the world turn of each left leg bone from the seated bind
pose to the source, as a quaternion (x, y, z, w). The thigh points forward, `down` degrees below
the level and `out` degrees out to the left. The shin points straight down. The foot and the toes
turn `toe` degrees further down than in the source, as relaxed feet that hang above the floor, or
keep the turn of the source with 0, so the soles stay flat. Usage:

    uv run --no-project --with numpy python -I leg_turns.py <config.json> <down degrees> <out degrees> [<toe degrees>]
"""
import json
import math
import sys

import numpy as np


def unit(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def swing_quat(a, b):
    """Gives the smallest turn (x, y, z, w) from the unit vector a onto the unit vector b."""
    a, b = unit(a), unit(b)
    axis = np.cross(a, b)
    s, c = np.linalg.norm(axis), float(np.dot(a, b))
    if s < 1e-12:
        return [0.0, 0.0, 0.0, 1.0]
    half = math.atan2(s, c) / 2
    k = axis / s * math.sin(half)
    return [float(k[0]), float(k[1]), float(k[2]), math.cos(half)]


config = json.load(open(sys.argv[1]))
down, out = math.radians(float(sys.argv[2])), math.radians(float(sys.argv[3]))
toe = math.radians(float(sys.argv[4])) if len(sys.argv) > 4 else 0.0
joints = config['joints']
hip, knee, ankle = (np.array(joints[n]['head'], float) for n in ('thigh_L', 'shin_L', 'foot_L'))
ball = np.array(joints['toes_L']['head'], float)
foot = unit(ball - ankle)
# The foot of the bind pose: the foot of the source turned down around the axis across the body.
bind_foot = [foot[0], foot[1] * math.cos(toe) - foot[2] * math.sin(toe),
             foot[1] * math.sin(toe) + foot[2] * math.cos(toe)]
bind_thigh = [math.sin(out) * math.cos(down), -math.sin(down), math.cos(out) * math.cos(down)]
turns = {
    'thigh': swing_quat(bind_thigh, knee - hip),
    'shin': swing_quat([0, -1, 0], ankle - knee),
    'foot': swing_quat(bind_foot, foot),
    'toes': swing_quat(bind_foot, foot),
}
src_thigh, src_shin = unit(knee - hip), unit(ankle - knee)
print('source thigh', np.round(src_thigh, 4), 'source shin', np.round(src_shin, 4),
      f'(shin {math.degrees(math.atan2(-src_shin[2], -src_shin[1])):.1f} deg back of vertical)')
print(json.dumps({k: [round(x, 6) for x in v] for k, v in turns.items()}))
