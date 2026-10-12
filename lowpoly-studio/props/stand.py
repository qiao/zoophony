"""A low-poly music stand: a tripod, a post, a tilted desk with a lip, and a sheet of music, as
the stands of the app (src/models/props.ts buildMusicStand).

numpy only, three.js axes. The stand stands in front of the player at (x, z), and the desk
faces the player (-z). The desk has a dark face and lighter edges, as in the app, so it reads as
an object in a close view.
"""

import numpy as np

from props.shapes import Builder, box, rot_x, rot_y, tube


def build(c):
    """Builds the stand.

    c: {name, at (x, z) of the post on the floor, desk_center (the height of the middle of the
    desk), desk_width, desk_height, tilt (degrees, the top leans away from the player), colors
    {stand, desk, edge, sheet}}.
    Returns (nodes, boxes).
    """
    x0, z0 = c['at']
    h = c['desk_center']
    dw, dh = c['desk_width'], c['desk_height']
    col = c['colors']
    s = h / 1.05
    b = Builder()
    boxes = []
    hub = np.array([x0, 0.05 * s, z0])
    for i in range(3):
        turn = rot_y(i * 120.0 + 60.0)
        foot = hub + turn @ np.array([0.0, -0.05 * s, 0.26 * s])
        b.add(tube([hub, foot], [0.01 * s, 0.007 * s], 4), col['stand'])
    b.add(tube([[x0, 0.0, z0], [x0, h - 0.5 * dh, z0]], [0.012 * s, 0.01 * s], 6), col['stand'])
    boxes.append(('post', np.array([x0, 0.5 * h, z0]), np.array([0.015, 0.5 * h, 0.015])))
    tilt = rot_x(c['tilt'])
    center = np.array([x0, h, z0])
    b.add(box((dw, dh, 0.012 * s)), col['desk'], tilt, center)
    # The edges: a thin light frame around the face of the desk.
    for size, off in (((dw + 0.006 * s, 0.008 * s, 0.014 * s), (0.0, 0.5 * dh, 0.0)),
                      ((dw + 0.006 * s, 0.008 * s, 0.014 * s), (0.0, -0.5 * dh, 0.0)),
                      ((0.008 * s, dh, 0.014 * s), (0.5 * dw, 0.0, 0.0)),
                      ((0.008 * s, dh, 0.014 * s), (-0.5 * dw, 0.0, 0.0))):
        b.add(box(size, off), col['edge'], tilt, center)
    # The lip at the bottom holds the sheet, and the sheet lies on the face toward the player.
    b.add(box((dw, 0.012 * s, 0.03 * s), (0.0, -0.5 * dh, -0.015 * s)), col['edge'], tilt, center)
    b.add(box((dw - 0.08 * s, dh - 0.08 * s, 0.003 * s), (0.0, 0.0, -0.008 * s)), col['sheet'],
          tilt, center)
    half = np.abs(tilt) @ np.array([0.5 * dw, 0.5 * dh, 0.025 * s])
    boxes.append(('desk', center, half))
    v, f, fc = b.mesh()
    return [{'name': c['name'], 'verts': v, 'faces': f, 'colors': fc, 'parent': None,
             'origin': np.zeros(3)}], boxes
