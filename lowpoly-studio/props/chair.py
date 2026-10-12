"""A low-poly orchestra chair: a seat, two front legs, two back legs that go on up as the posts
of the back, and one wide top rail, as the chairs of the app (src/models/props.ts buildChair).

numpy only, three.js axes. The player sits at the seat and faces +z, so the back is at -z.
"""

import numpy as np

from props.bench import fitted_pad, leg, pad
from props.shapes import Builder, box


def build(c):
    """Builds the chair.

    c: {name, seat_top (the top at the sides), width, depth, center_z, back_height, colors
    {wood}}, and map: the top of a seat that fits the body (props/bench.py), or None.
    Returns (nodes, boxes).
    """
    top, w, d, cz = c['seat_top'], c['width'], c['depth'], c['center_z']
    t = 0.1 * d
    r = 0.04 * w
    wood = c['colors']['wood']
    b = Builder()
    boxes = []
    if c.get('map'):
        b.add(fitted_pad(c['map'], float(np.min(c['map']['heights'])) - t)[0], wood)
    else:
        b.add(pad(w, d, top, t, 0.0, cz), wood)
    boxes.append(('seat', np.array([0.0, top - 0.5 * t, cz]), np.array([0.5 * w, 0.5 * t, 0.5 * d])))
    under = top - t
    x = 0.5 * w - r
    back_z = cz - 0.5 * d + r
    for sx in (1.0, -1.0):
        b.add(leg(sx * x, cz + 0.5 * d - r, 0.0, under, 0.8 * r, r), wood)
        # A back leg goes on up to the top of the back.
        b.add(leg(sx * x, back_z, 0.0, top + c['back_height'], 0.8 * r, r), wood)
        boxes.append((f'post{int(sx)}', np.array([sx * x, 0.5 * (top + c['back_height']), back_z]),
                      np.array([r, 0.5 * (top + c['back_height']), r])))
    rail = 0.2 * c['back_height']
    rail_c = np.array([0.0, top + c['back_height'] - 0.5 * rail, back_z])
    b.add(box((w - 2 * r, rail, 1.4 * r), rail_c), wood)
    boxes.append(('rail', rail_c, np.array([0.5 * w - r, 0.5 * rail, 0.7 * r])))
    # A thin stretcher between the front legs keeps the frame from reading as four sticks.
    b.add(box((w - 2 * r, 0.6 * r, 0.6 * r), (0.0, 0.3 * under, cz + 0.5 * d - r)), wood)
    v, f, fc = b.mesh()
    return [{'name': c['name'], 'verts': v, 'faces': f, 'colors': fc, 'parent': None,
             'origin': np.zeros(3)}], boxes
