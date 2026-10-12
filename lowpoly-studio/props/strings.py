"""A low-poly violin, a cello, and a bow, as the bowed strings of the app
(src/models/instruments/strings.ts).

numpy only. The parts use the sizes of the violin model of the app in meters (0.4 m long), and a
build scales them to the length that studio/props.py takes from the body. Each build returns a
mesh (verts, faces, face colors) in the axes of the instrument:

    violin, cello   along +x from the tail end (x = 0) to the scroll, the top plate faces +y, the
                    strings cross the top at y = string height. The cello has an end pin along
                    -x from the tail end.
    bow             along +x from the frog (x = 0) to the tip, the hair below the stick (-y).

studio/props.py places a mesh with a frame: a hand prop on its bone, or a scene prop on the
floor.
"""

import numpy as np

from props.shapes import Builder, box, plate, rot_x, rot_y, rot_z, tube

# The sizes of the violin model of the app, in meters.
LENGTH = 0.4
BODY_LENGTH = 0.24
THICKNESS = 0.04
BRIDGE = 0.095
STRING_HEIGHT = 0.068

# The half outline of the body around its center (x along the violin, z across): the upper
# bout at +x, the waist, and the lower bout at -x.
BODY_HALF = ((0.12, 0.0), (0.11, -0.035), (0.085, -0.055), (0.055, -0.057), (0.03, -0.045),
             (0.0, -0.04), (-0.03, -0.045), (-0.06, -0.065), (-0.09, -0.068), (-0.11, -0.05),
             (-0.12, 0.0))

# The levels of the body: (scale of the outline, share of the thickness). The levels up to the
# rib top have the wood color, the arch above them the color of the top plate.
SIDES = ((0.93, 0.0), (1.0, 0.18), (1.0, 0.76), (0.96, 0.86))
ARCH = ((0.96, 0.86), (0.8, 0.95), (0.45, 1.0))

# The sizes of the bow model of the app, in meters.
BOW_LENGTH = 0.45
BOW_HAIR_GAP = 0.012


def body_outline():
    """Lists the outline of the body (x, z) around the middle of the body, counterclockwise."""
    half = list(BODY_HALF)
    return np.array(half + [(x, -z) for x, z in reversed(half[1:-1])])


def violin_mesh(length, colors, upright=False, pin=0.0):
    """Makes the violin model (or the cello model with upright=True) scaled to a length from
    the tail end to the scroll.

    colors: {wood, top, dark, bridge, strings}. pin: the length of the end pin (a cello).
    Returns (verts, faces, face colors).
    """
    k = length / LENGTH
    t = THICKNESS
    b = Builder()

    def part(shape, color, rot=None, at=(0.0, 0.0, 0.0)):
        v, f = shape
        if rot is not None:
            v = v @ rot.T
        b.add(((v + np.asarray(at)) * k, f), color)

    outline = body_outline() + np.array([BODY_LENGTH / 2, 0.0])
    center = np.array([BODY_LENGTH / 2, 0.0])
    part(plate(outline, [(s, y * t) for s, y in SIDES], center), colors['wood'])
    part(plate(outline, [(s, y * t) for s, y in ARCH], center), colors['top'])
    for side in (1.0, -1.0):
        part(box((0.036, 0.003, 0.004)), colors['dark'], rot_y(side * 14.0),
             (BRIDGE + 0.004, 0.95 * t - 0.0016, side * 0.026))
    part(box((0.1, 0.02, 0.022)), colors['wood'], at=(BODY_LENGTH + 0.045, t - 0.002, 0.0))
    part(box((0.045, 0.025, 0.02)), colors['wood'], at=(0.355, t + 0.002, 0.0))
    part(tube([[0.385, t + 0.008, -0.011], [0.385, t + 0.008, 0.011]], [0.016, 0.016], 8),
         colors['top'])
    for x in (0.343, 0.365):
        part(box((0.006, 0.006, 0.03)), colors['dark'], at=(x, t + 0.004, 0.0))
    part(box((0.17, 0.008, 0.026)), colors['dark'], at=(0.255, t + 0.016, 0.0))
    part(box((0.05, 0.006, 0.03)), colors['dark'], at=(0.04, t + 0.008, 0.0))
    if not upright:
        part(box((0.04, 0.012, 0.05)), colors['dark'], at=(0.018, t + 0.006, 0.03))
    part(box((0.004, 0.024, 0.032)), colors['bridge'], at=(BRIDGE, t + 0.012, 0.0))
    part(box((0.27, 0.002, 0.008)), colors['strings'], at=(0.2, STRING_HEIGHT - 0.001, 0.0))
    if pin > 0:
        part(tube([[0.0, 0.5 * t, 0.0], [-pin / k, 0.5 * t, 0.0]], [0.004, 0.0], 5), colors['dark'])
    return b.mesh()


def bow_mesh(length, colors):
    """Makes the bow scaled to a length: the stick, the hair below it, the frog, and the tip.

    colors: {stick, hair, frog}. Returns (verts, faces, face colors).
    """
    k = length / BOW_LENGTH
    b = Builder()

    def part(shape, color, at):
        v, f = shape
        b.add(((v + np.asarray(at)) * k, f), color)

    part(tube([[0.0, 0.0, 0.0], [BOW_LENGTH, 0.0, 0.0]], [0.0035, 0.0025], 5), colors['stick'],
         (0.0, 0.0, 0.0))
    part(box((BOW_LENGTH - 0.05, 0.002, 0.008)), colors['hair'],
         (BOW_LENGTH / 2, -BOW_HAIR_GAP, 0.0))
    part(box((0.035, 0.016, 0.01)), colors['frog'], (0.02, -0.007, 0.0))
    part(box((0.012, 0.014, 0.007)), colors['stick'], (BOW_LENGTH - 0.006, -0.006, 0.0))
    return b.mesh()


def upright(lean, side_lean=0.0):
    """Calculates the rotation of an upright instrument: its length axis (+x) to up, leaned
    back toward the player (-z) by lean degrees and to the left (x > 0) by side_lean degrees,
    and its top plate (+y) to the front (+z)."""
    stand = np.array([[0.0, 0.0, 1.0], [1.0, 0.0, 0.0], [0.0, 1.0, 0.0]])
    return rot_x(-lean) @ rot_z(-side_lean) @ stand
