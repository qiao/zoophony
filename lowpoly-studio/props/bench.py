"""A low-poly piano bench: a padded top, an apron, and four tapered legs.

numpy only, three.js axes. The top of the pad follows the lowest points of the seated body over
it (studio/props.py takes them from templates/biped Body.seat): a soft pad under a heavy body
takes its form, so the rump and the thighs rest on it. With no seated body, the pad is flat with
a soft bevel.
"""

import numpy as np

from props.shapes import Builder, box, heightfield, loft, tube


def chamfered_rect(width, depth, cut, y, cx=0.0, cz=0.0):
    """Lists the 8 corners of a rectangle with cut corners at height y."""
    w, d = 0.5 * width, 0.5 * depth
    c = min(cut, 0.45 * min(width, depth))
    pts = [(w, -d + c), (w, d - c), (w - c, d), (-w + c, d), (-w, d - c), (-w, -d + c),
           (-w + c, -d), (w - c, -d)]
    return np.array([[cx + x, y, cz + z] for x, z in pts])


def pad(width, depth, top, thickness, cx=0.0, cz=0.0):
    """Makes a padded top: straight sides, then a bevel to a smaller top face."""
    bevel = 0.35 * thickness
    rings = [chamfered_rect(width, depth, 0.15 * thickness, top - thickness, cx, cz),
             chamfered_rect(width, depth, 0.15 * thickness, top - bevel, cx, cz),
             chamfered_rect(width - 2 * bevel, depth - 2 * bevel, 0.6 * thickness, top, cx, cz)]
    return loft(rings)


def leg(x, z, y0, y1, r0, r1):
    """Makes a square leg that tapers from r1 at the top to r0 at the floor."""
    return tube([[x, y0, z], [x, y1, z]], [r0 * 1.41, r1 * 1.41], 4, phase=np.pi / 4)


def top_at(m, x, z):
    """Returns the height of the top of a fitted pad (map {'xs', 'zs', 'heights' [x][z]}) at
    points (x, z), by bilinear interpolation, flat past the edges."""
    xs, zs, H = np.asarray(m['xs']), np.asarray(m['zs']), np.asarray(m['heights'])
    x = np.clip(np.asarray(x, float), xs[0], xs[-1])
    z = np.clip(np.asarray(z, float), zs[0], zs[-1])
    i = np.clip(np.searchsorted(xs, x) - 1, 0, len(xs) - 2)
    j = np.clip(np.searchsorted(zs, z) - 1, 0, len(zs) - 2)
    u = (x - xs[i]) / (xs[i + 1] - xs[i])
    v = (z - zs[j]) / (zs[j + 1] - zs[j])
    return ((1 - u) * (1 - v) * H[i, j] + u * (1 - v) * H[i + 1, j] + (1 - u) * v * H[i, j + 1]
            + u * v * H[i + 1, j + 1])


def fitted_pad(m, bottom):
    """Makes a pad whose top is the map {'xs', 'zs', 'heights' [x][z]}: a soft pad under a heavy
    body takes its form, so the rump sinks into its middle and the thighs rest on it. Returns
    (the solid, the test boxes of its cells: (piece, center, half sizes) under the lowest
    corner of each cell)."""
    xs, zs, H = m['xs'], m['zs'], np.asarray(m['heights'])
    solid = heightfield(xs, zs, H, bottom)
    boxes = []
    for i in range(len(xs) - 1):
        for j in range(len(zs) - 1):
            top = float(H[i:i + 2, j:j + 2].min())
            boxes.append((f'top{i}_{j}', np.array([0.5 * (xs[i] + xs[i + 1]), 0.5 * (top + bottom),
                                                    0.5 * (zs[j] + zs[j + 1])]),
                          np.array([0.5 * (xs[i + 1] - xs[i]), 0.5 * (top - bottom),
                                    0.5 * (zs[j + 1] - zs[j])])))
    return solid, boxes


def build(c):
    """Builds the bench.

    c: {name, seat_top, width, depth, center_z, top_thickness, colors {top, legs}}, and map:
    the top of a pad that fits the body (studio/props.py bench_sizes), or None for a flat pad
    at seat_top.
    Returns (nodes, boxes).
    """
    t = c['top_thickness']
    w, d, cz = c['width'], c['depth'], c['center_z']
    b = Builder()
    boxes = []
    if c.get('map'):
        under = max(float(np.min(c['map']['heights'])) - t, 0.02)
        solid, cells = fitted_pad(c['map'], under)
        b.add(solid, c['colors']['top'])
        boxes += cells
    else:
        top = c['seat_top']
        b.add(pad(w, d, top, t, 0.0, cz), c['colors']['top'])
        boxes.append(('top', np.array([0.0, top - 0.5 * t, cz]),
                      np.array([0.5 * w, 0.5 * t, 0.5 * d])))
        under = top - t
    apron = min(0.3 * under, 0.04)
    b.add(box((w - 0.02, apron, d - 0.02), (0.0, under - 0.5 * apron, cz)), c['colors']['legs'])
    boxes.append(('apron', np.array([0.0, under - 0.5 * apron, cz]),
                  np.array([0.5 * w - 0.01, 0.5 * apron, 0.5 * d - 0.01])))
    r = min(0.018, 0.12 * d)
    for i, (sx, sz) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
        x, z = sx * (0.5 * w - 0.02 - r), cz + sz * (0.5 * d - 0.02 - r)
        b.add(leg(x, z, 0.0, under - apron, 0.7 * r, r), c['colors']['legs'])
        boxes.append((f'leg{i}', np.array([x, 0.5 * (under - apron), z]),
                      np.array([r, 0.5 * (under - apron), r])))
    v, f, fc = b.mesh()
    return [{'name': c['name'], 'verts': v, 'faces': f, 'colors': fc, 'parent': None,
             'origin': np.zeros(3)}], boxes
