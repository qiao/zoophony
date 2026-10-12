"""Located failures: the places of the contacts, the folds, and the mesh faces of a build.

Pure Python with Pillow. It reads the data of the stage "diagnostics" of the last Blender build
(studio/contacts.py), and writes into <out>/diag/:

    folds.json     the fold debug list: each folded, turned, repaired, inward, or sliver face
                   with its place, weights, smallest angle, rest direction, and crops
    contacts.json  the deepest contact and the closest approach of each clip
    *.png          one crop of each place: a flat-shaded render of the mesh around it, from
                   outside the body and from the side, with the face or the contact marked

checks.py asks it for the "where" of a failing or near check (Diagnostics.where_*). A position
is in three.js axes in animal heights (x to the left of the animal, y up, z forward); a "rest"
position is in the bind pose, the other positions are in the pose of the frame.
"""

import json
import math
import os

from PIL import Image, ImageDraw

from studio import drawing

# The colors of the crops: the body, the arm of a contact, a marked face, a test part (a claw or
# a prop), and a face that shows its back to the camera (turned more than 90 degrees).
COLORS = {0: (200, 172, 140), 1: (150, 178, 214), 2: (226, 40, 40), 3: (70, 70, 74)}
BACK = (118, 72, 160)
CROP = 260
SUPER = 2


def _sub(a, b):
    """Subtracts two 3D vectors."""
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _dot(a, b):
    """Calculates the dot product of two 3D vectors."""
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _cross(a, b):
    """Calculates the cross product of two 3D vectors."""
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def _unit(a):
    """Makes a 3D vector unit length (a zero vector stays zero)."""
    n = math.sqrt(_dot(a, a))
    return (a[0] / n, a[1] / n, a[2] / n) if n > 1e-12 else (0.0, 0.0, 0.0)


def _face_normals(verts, tris):
    """Calculates the unit normal and the area of each face."""
    out = []
    for a, b, c in tris:
        n = _cross(_sub(verts[b], verts[a]), _sub(verts[c], verts[a]))
        area = 0.5 * math.sqrt(_dot(n, n))
        out.append((_unit(n), area))
    return out


def outside_direction(patch):
    """Calculates the direction out of the body at a patch: the area-weighted mean normal of
    its body faces (the arm of a contact, a marked face, or a part does not count)."""
    normals = _face_normals(patch['verts'], patch['tris'])
    use = (0,) if 0 in patch['kinds'] else (0, 1)
    acc = [0.0, 0.0, 0.0]
    for (n, area), kind in zip(normals, patch['kinds']):
        if kind in use:
            for k in range(3):
                acc[k] += n[k] * area
    d = _unit(acc)
    return d if d != (0.0, 0.0, 0.0) else (0.0, 0.0, 1.0)


def render(patch, center, toward, size=CROP, back_tint=True, points=()):
    """Renders a patch with flat shading from the direction `toward` (the camera is on that
    side of the center). Faces are drawn from far to near. Returns an RGB image.

    back_tint: a body face that shows its back to the camera gets the color BACK (a turned
    face). The arm and the parts of a contact keep their colors, because the cut of the patch
    opens them.
    points: [(position, color)] drawn as dots.
    """
    d = _unit(toward)
    up = (0.0, 1.0, 0.0) if abs(d[1]) < 0.9 else (0.0, 0.0, 1.0)
    right = _unit(_cross(up, d))
    upv = _cross(d, right)
    light = _unit((d[0] + 0.6 * upv[0] + 0.3 * right[0], d[1] + 0.6 * upv[1] + 0.3 * right[1],
                   d[2] + 0.6 * upv[2] + 0.3 * right[2]))
    verts = patch['verts']
    local = [_sub(v, center) for v in verts]
    proj = [(_dot(p, right), _dot(p, upv), _dot(p, d)) for p in local]
    reach = max([max(abs(x), abs(y)) for x, y, _ in proj] + [1e-6])
    big = size * SUPER
    scale = 0.45 * big / reach

    def screen(x, y):
        return (big / 2 + x * scale, big / 2 - y * scale)

    img = Image.new('RGB', (big, big), (236, 236, 238))
    draw = ImageDraw.Draw(img)
    normals = _face_normals(verts, patch['tris'])
    order = sorted(range(len(patch['tris'])),
                   key=lambda i: sum(proj[v][2] for v in patch['tris'][i]))
    marked = []
    for i in order:
        tri = patch['tris'][i]
        kind = patch['kinds'][i]
        n, _ = normals[i]
        facing = _dot(n, d)
        base = COLORS[kind]
        if back_tint and facing < 0 and kind == 0:
            base = BACK
        shade = 0.45 + 0.55 * abs(_dot(n, light))
        fill = tuple(int(c * shade) for c in base)
        edge = tuple(int(c * 0.55) for c in fill)
        pts = [screen(proj[v][0], proj[v][1]) for v in tri]
        draw.polygon(pts, fill=fill, outline=edge)
        if kind == 2:
            marked.append(pts)
    # The marked faces again on top, so they show also behind other faces, and a ring around.
    for pts in marked:
        draw.polygon(pts, fill=COLORS[2])
        draw.line(pts + [pts[0]], fill=(255, 210, 0), width=2 * SUPER)
        cx = sum(p[0] for p in pts) / 3
        cy = sum(p[1] for p in pts) / 3
        r = 22 * SUPER
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=COLORS[2], width=2 * SUPER)
    for p, color in points:
        q = _sub(p, center)
        x, y = screen(_dot(q, right), _dot(q, upv))
        r = 4 * SUPER
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color, outline=(0, 0, 0))
    return img.resize((size, size), Image.LANCZOS)


def crop_image(patch, center, caption, points=()):
    """Makes the crop of a place: the view from outside the body beside the view from the side,
    with a caption below."""
    out_dir = outside_direction(patch)
    up = (0.0, 1.0, 0.0) if abs(out_dir[1]) < 0.9 else (0.0, 0.0, 1.0)
    side_dir = _unit(_cross(up, out_dir))
    a = render(patch, center, out_dir, points=points)
    b = render(patch, center, side_dir, back_tint=False, points=points)
    tiles = [drawing.framed(a, 'from outside', 13), drawing.framed(b, 'from the side', 13)]
    row = drawing.stack(tiles, 2 * CROP + 8)
    rows = drawing.wrapped(caption + [('red with a yellow line and a ring: the face; purple: a '
                                       'face that shows its back; blue: the arm; gray: a claw or '
                                       'a prop', (90, 90, 90))], 12, row.size[0] - 8)
    board = Image.new('RGB', (row.size[0], row.size[1] + 8 + 17 * len(rows)), drawing.PAPER)
    board.paste(row, (0, 0))
    drawing.lines(board, (4, row.size[1] + 4), rows, 12, gap=5)
    return board


def _fmt_weights(weights):
    """Formats [[bone, weight]] as a short text."""
    return ', '.join(f'{b} {w:.2f}' for b, w in weights)


def _strip(item):
    """Copies an item without its patches (for the JSON lists)."""
    out = {k: v for k, v in item.items() if k != 'patch'}
    if 'clips' in out:
        out['clips'] = {c: {k: v for k, v in rec.items() if k != 'patch'}
                        for c, rec in out['clips'].items()}
    return out


class Diagnostics:
    """The located contacts and faces of one build."""

    def __init__(self, data, out):
        """Stores the data of the stage "diagnostics" and the output folder of the build."""
        self.data = data
        self.out = out
        self.folder = os.path.join(out, 'diag')
        self.faces = data.get('faces', [])
        self.contacts = data.get('contacts', {})
        self.gaps = data.get('gaps', {})

    def write(self):
        """Writes the crops, the fold debug list, and the contact list into <out>/diag/."""
        os.makedirs(self.folder, exist_ok=True)
        for name in os.listdir(self.folder):
            if name.endswith('.png'):
                os.remove(os.path.join(self.folder, name))
        for item in self.faces:
            self._face_crops(item)
        for clip, item in self.contacts.items():
            self._contact_crop(clip, item)
        with open(os.path.join(self.folder, 'folds.json'), 'w') as f:
            json.dump({'note': 'The fold debug list: each folded, turned (past 90 degrees), '
                               'repaired, inward, or sliver face of the body. A position is in '
                               'animal heights (x to the left of the animal, y up, z forward). '
                               'rest_dot is the cosine between the face normal and the outward '
                               'direction of the field (below 0: the face points in).',
                       'rounds': self.data.get('rounds'), 'counts': self.data.get('counts'),
                       'faces': [_strip(item) for item in self.faces]}, f, indent=1)
            f.write('\n')
        with open(os.path.join(self.folder, 'contacts.json'), 'w') as f:
            json.dump({'note': 'The deepest contact (depth, only when a part goes into the '
                               'body) and the closest approach (gap) of each clip, in animal '
                               'heights.',
                       'contacts': {c: _strip(i) for c, i in self.contacts.items()},
                       'gaps': self.gaps}, f, indent=1)
            f.write('\n')

    def _face_crops(self, item):
        """Draws the crops of one face: one for each clip with a patch, or one at rest."""
        f = item['face']
        head = (f'face {f}: {item["region"]} ({item["status"]}; tags {", ".join(item["tags"])})',
                drawing.FAIL if item['status'] in ('folded', 'inward') else drawing.INK)
        info = (f'weights {_fmt_weights(item["weights"])}; smallest angle '
                f'{item["smallest_angle_deg"]} deg; rest dot {item["rest_dot"]}')
        for clip, rec in item.get('clips', {}).items():
            if 'patch' not in rec:
                continue
            file = f'fold-{f}-{clip}.png'
            rows = [head, f'{clip} {rec["time_s"]} s (frame {rec["frame"]}): the face turns '
                    f'{rec["angle_deg"]} deg (fold limit 120 deg), {rec["frames"]} frames past 90 '
                    f'deg', info]
            if 'weights_before_repair' in item:
                rows.append(f'weights before the repair {_fmt_weights(item["weights_before_repair"])}')
            img = crop_image(rec['patch'], rec['position'], rows)
            img.save(os.path.join(self.folder, file))
            rec['crop'] = f'diag/{file}'
        if 'patch' in item:
            file = f'face-{f}.png'
            img = crop_image(item['patch'], item['rest_position'],
                             [head, 'the rest mesh (bind pose)', info])
            img.save(os.path.join(self.folder, file))
            item['crop'] = f'diag/{file}'

    def _contact_crop(self, clip, item):
        """Draws the crop of the deepest contact of a clip."""
        if 'patch' not in item:
            return
        file = f'contact-{clip}.png'
        rows = [(f'contact: {item["part"]} {item["side"]} ({item["bone"]}) into {item["region"]}'
                 f' ({item["into_bone"]})', drawing.FAIL),
                f'{clip} {item["time_s"]} s (frame {item["frame"]}): depth '
                f'{item["depth"] * 100:.2f} cm at {item["position"]}',
                'red dot: the deepest point of the part; blue dot: the nearest point of the body']
        img = crop_image(item['patch'], item['position'], rows,
                         [(item['position'], (230, 30, 30)), (item['nearest'], (40, 90, 230))])
        img.save(os.path.join(self.folder, file))
        item['crop'] = f'diag/{file}'

    def where_contact(self, clip):
        """Returns the place of the deepest contact of a clip, or None."""
        item = self.contacts.get(clip)
        if not item:
            return None
        keys = ('clip', 'frame', 'time_s', 'side', 'part', 'bone', 'detail', 'into_bone',
                'region', 'position', 'nearest', 'depth', 'crop')
        return {k: item[k] for k in keys if k in item}

    def where_fold(self, clip, tags):
        """Returns the place of the worst face of a clip with one of the tags (the final round),
        or None. The place lists all such faces of the clip."""
        found = [item for item in self.faces if clip in item.get('clips', {})
                 and set(item['tags']) & set(tags)]
        if not found:
            return None
        found.sort(key=lambda item: -item['clips'][clip]['angle_deg'])
        item, rec = found[0], found[0]['clips'][clip]
        out = {'clip': clip, 'frame': rec['frame'], 'time_s': rec['time_s'],
               'face': item['face'], 'faces': [i['face'] for i in found], 'bone': item['bone'],
               'side': item['side'], 'region': item['region'], 'position': rec['position'],
               'rest_position': item['rest_position'], 'angle_deg': rec['angle_deg'],
               'weights': item['weights'], 'smallest_angle_deg': item['smallest_angle_deg'],
               'rest_dot': item['rest_dot']}
        if 'crop' in rec:
            out['crop'] = rec['crop']
        return out

    def where_mesh(self, tag):
        """Returns the place of the rest mesh faces with a tag ('inward' or 'sliver'), or None."""
        found = [item for item in self.faces if tag in item['tags']]
        if not found:
            return None
        key = (lambda i: i['rest_dot']) if tag == 'inward' else (lambda i: i['smallest_angle_deg'])
        item = min(found, key=key)
        out = {'face': item['face'], 'faces': [i['face'] for i in found], 'bone': item['bone'],
               'side': item['side'], 'region': item['region'],
               'rest_position': item['rest_position'],
               'smallest_angle_deg': item['smallest_angle_deg'], 'rest_dot': item['rest_dot']}
        if 'crop' in item:
            out['crop'] = item['crop']
        return out


def load(cfg, stage_data):
    """Reads the diagnostics of the last Blender build. Returns a Diagnostics, or None when the
    build has no stage "diagnostics" (stage_data: checks.stage_data)."""
    data = stage_data(cfg, 'diagnostics')
    if not data or not data.get('diagnostics'):
        return None
    return Diagnostics(data['diagnostics'], cfg.paths.out)
