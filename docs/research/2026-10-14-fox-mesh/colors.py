"""Runs the color rules of `tools/blender/rig_mesh.py` on the fox mesh of the user, and makes a tan
variant of the same faces with a color map.

    blender -b --factory-startup --python colors.py -- <fox.json> <out dir>

The script runs the functions of `rig_mesh.py` (with no call of its `main()`): the load, the face
colors with the dark rule of the config, and the palette in Oklab. It prints the dark faces, the
faces with dark samples that took the mean of their other samples (the rule of the black gaps
between the islands of the texture), the share of dark pixels of the texture, and the largest
colors of the palette. The tan map moves the Oklab color of each face by the step from the color
of `fox-red` to the color of `fox-tan` (`src/models/colors.ts`) of the fur, the belly, and the
accent, blended by the nearness of the face to each red color, so that a face between two
classes gets no sudden step. The hue step of the fur shrinks with the chroma of the face. The script counts the faces that the map turns cool (Oklab b below
0), as a check of the map. The
faces of the eyes and of the nose keep their colors. It renders the red and the tan faces from
the front, the right side, and the back into `colors-red.png` and `colors-tan.png`.
"""

import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RIG = os.path.join(HERE, '..', '..', '..', 'tools', 'blender', 'rig_mesh.py')
argv = sys.argv[sys.argv.index('--') + 1 :]
with open(argv[0]) as f:
    config = json.load(f)
out = argv[1]
with open(RIG) as f:
    code = f.read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)

os.chdir(os.path.join(HERE, '..', '..', '..'))
verts, tris, uvs, texture = rig['load_mesh'](config)
rules = config['colors']
colors, dark = rig['face_colors'](tris, uvs, texture, rules)

# The share of dark samples of each face, as face_colors() counts it.
n = rules['samples']
grid = np.array([(i / n, j / n, (n - i - j) / n) for i in range(n + 1) for j in range(n + 1 - i)])
height, width, _ = texture.shape
share = np.zeros(len(tris))
for f in range(len(tris)):
    at = grid @ uvs[f]
    x = np.clip(((at[:, 0] % 1.0) * width).astype(int), 0, width - 1)
    y = np.clip(((at[:, 1] % 1.0) * height).astype(int), 0, height - 1)
    lum = rig['linear'](texture[y, x]) @ [0.2126, 0.7152, 0.0722]
    share[f] = (lum < rules['dark']).mean()
lum_all = rig['linear'](texture.reshape(-1, 3)) @ [0.2126, 0.7152, 0.0722]
print(f'texture: {width} x {height}, dark pixels (linear luminance below {rules["dark"]}): '
      f'{(lum_all < rules["dark"]).mean():.3f}, black pixels (all channels below 0.01): '
      f'{(texture.reshape(-1, 3).max(axis=1) < 0.01).mean():.3f}')
centers = verts[tris].mean(axis=1)
mixed = (share > 0) & ~dark
print(f'faces: {len(tris)}, dark {int(dark.sum())}, with some dark samples but not dark {int(mixed.sum())}')

# A mixed face next to a dark face lies at the edge of the black fur. A mixed face with no dark
# neighbor has its dark samples in a gap between the islands of the texture.
faces_of = {}
for f, t in enumerate(tris):
    for k in range(3):
        faces_of.setdefault(tuple(sorted((int(t[k]), int(t[(k + 1) % 3])))), []).append(f)
next_to_dark = np.zeros(len(tris), bool)
for f, t in enumerate(tris):
    for k in range(3):
        for g in faces_of[tuple(sorted((int(t[k]), int(t[(k + 1) % 3]))))]:
            next_to_dark[f] |= dark[g]
edge = mixed & next_to_dark
gap = mixed & ~next_to_dark
print(f'  mixed faces next to a dark face (the edge of the black fur): {int(edge.sum())}, '
      f'share of dark samples {share[edge].mean():.2f} on the mean')
print(f'  mixed faces with no dark neighbor (dark samples in a gap of the atlas): {int(gap.sum())}, '
      f'share {share[gap].mean():.2f} on the mean, {share[gap].max():.2f} at most')
for part, lo, hi in (('feet and shins', 0, 0.13), ('legs and body', 0.13, 0.53),
                     ('arms and shoulders', 0.53, 0.71), ('head', 0.71, 0.89), ('ears', 0.89, 1.01)):
    inside = (centers[:, 1] >= lo) & (centers[:, 1] < hi)
    print(f'  y {lo:.2f} to {hi:.2f} ({part}): dark {int((dark & inside).sum())}, edge '
          f'{int((edge & inside).sum())}, gap {int((gap & inside).sum())}')

eyes, nose = rig['features'](verts, tris, colors, dark, rules)
keep = np.zeros(len(tris), bool)
keep[np.concatenate([eyes['L'], eyes['R'], nose])] = True
pal, worst, mean = rig['palette'](colors, rules['palette'])
print(f'palette: {len(np.unique(pal, axis=0))} colors, Oklab distance {mean:.4f} on the mean, '
      f'{worst:.4f} at most')
values, counts = np.unique(np.round(pal, 4), axis=0, return_counts=True)
order = np.argsort(-counts)
for k in order[:12]:
    c = values[k]
    mine = np.all(np.isclose(np.round(pal, 4), c), axis=1)
    hexa = '#' + ''.join(f'{int(round(x * 255)):02x}' for x in c)
    print(f'  {hexa}: {counts[k]} faces, y {centers[mine, 1].min():.2f} to {centers[mine, 1].max():.2f}')

# The three classes of the mesh: the mean color of the faces nearest to each species color.
oklab = rig['oklab']
lab = oklab(pal)
red = {'fur': '#f0934c', 'belly': '#f6eee0', 'accent': '#4a3324'}
tan = {'fur': '#c9a273', 'belly': '#e6d3b5', 'accent': '#9a7148'}


def rgb(hexa):
    return np.array([int(hexa[i:i + 2], 16) / 255 for i in (1, 3, 5)])


anchors = oklab(np.array([rgb(red[k]) for k in red]))
label = np.argmin(np.linalg.norm(lab[:, None] - anchors[None], axis=2), axis=1)
steps = oklab(np.array([rgb(tan[k]) for k in red])) - anchors
distance = np.linalg.norm(lab[:, None] - anchors[None], axis=2)
# A face far from each red color takes the step of its nearest class.
near = np.exp(-((distance / 0.08) ** 2))
near[np.arange(len(lab)), label] += 1e-12
near /= near.sum(axis=1, keepdims=True)
# The hue step of the fur shrinks with the chroma of the face, so that a pale face does not turn
# cool.
chroma = np.minimum(1.0, np.hypot(lab[:, 1], lab[:, 2]) / np.hypot(*anchors[0, 1:]))
fur_step = steps[0] * np.stack([np.ones(len(lab)), chroma, chroma], axis=1)
tan_lab = lab + near[:, :1] * fur_step + near[:, 1:] @ steps[1:]
cool = (tan_lab[:, 2] < 0) & ~keep
print(f"tan map: {int(cool.sum())} faces turn cool (Oklab b below 0, the lowest "
      f"{tan_lab[cool, 2].min(initial=0):.4f}), {int(((lab[:, 2] < 0) & ~keep).sum())} before the map")
tan_colors = rig['srgb_of_oklab'](tan_lab)
tan_colors[keep] = pal[keep]
for k, name in enumerate(red):
    mine = (label == k) & ~keep
    c = rig['srgb_of_oklab'](lab[mine].mean(axis=0)[None])[0]
    t = rig['srgb_of_oklab'](tan_lab[mine].mean(axis=0)[None])[0]
    hexa = lambda v: '#' + ''.join(f'{int(round(x * 255)):02x}' for x in v)
    print(f'class {name}: {int(mine.sum())} faces, mean {hexa(c)} to tan {hexa(t)}')

views = [('front', 0, 5), ('right', 90, 5), ('back', 180, 5)]
center = np.array([0, 0.5, 0])
rig['preview'](out, [
    ('colors-red', [(verts, tris, pal)], [(v, a, e, center, 1.1) for v, a, e in views]),
    ('colors-tan', [(verts, tris, tan_colors)], [(v, a, e, center, 1.1) for v, a, e in views]),
])
