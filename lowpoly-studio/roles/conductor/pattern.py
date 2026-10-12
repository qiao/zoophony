"""Plots the 4/4 path of the baton tip and of the right wrist, as the conductor sees it.

Run with Blender, or with any Python that has numpy:

    blender -b --factory-startup --python motions/conductor/pattern.py -- [--clip beat_4_4]

Writes out/frames/pattern_plot.png: the frontal plane seen from behind the bear (the right of
the bear is on the right). The tip path is dark, the wrist path is light, the squares are the
ictus points (beat 1 red, 2 blue, 3 green, 4 orange), and the bar at the bottom left is 0.1
bear heights long. It also prints the speed of the tip at each ictus and the
lowest point of each beat, which shows the click of the ictus: the vertical speed turns over.
"""

import argparse
import os
import sys
import types

import numpy as np

STUDIO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
for _sub in ('studio', 'templates/biped', 'motions/conductor'):
    sys.path.insert(0, os.path.join(STUDIO, _sub))
sys.modules.setdefault('bpy', types.ModuleType('bpy'))

import clips as motion  # noqa: E402
import rig  # noqa: E402
from ik import Skeleton, frame, unit  # noqa: E402
from views import ROOT, write_png  # noqa: E402


def skeleton_from_layout():
    """Builds the rest skeleton from the layout, with the same bone frames as Blender."""
    bones = rig.layout('bind')
    names = rig.BONE_ORDER
    parents = {n: bones[n][2] for n in names}
    heads = {n: bones[n][0] for n in names}
    rests = {}
    for n in names:
        head, tail, _, zhint = bones[n]
        y = unit(tail - head)
        f = frame(y, zhint)
        rests[n] = np.stack([np.cross(y, f[:, 1]), y, f[:, 1]], axis=1)
    extras = {}
    for side in ('L', 'R'):
        r = rests[f'hand_{side}']
        extras[f'fingers_{side}'] = r[:, 1]
        extras[f'palm_{side}'] = r[:, 2]
    extras['baton_R'] = unit(bones['baton'][1] - bones['baton'][0])
    return Skeleton(names, parents, heads, rests, extras), bones


def tip_path(skel, bones, fn, times):
    """Calculates the wrist and the baton tip for each time."""
    grip, tip = bones['baton'][0], bones['baton'][1]
    hand0 = skel.heads['hand_R']
    wrists, tips = [], []
    for t in times:
        _, D, H = skel.solve(fn(t))
        wrists.append(H['hand_R'])
        tips.append(H['hand_R'] + D['hand_R'] @ (tip - hand0))
    return np.array(wrists), np.array(tips)


def draw(paths, marks, size=(720, 560)):
    """Draws 2D paths (lists of (n, 2) arrays with colors) and numbered marks into an image."""
    w, h = size
    img = np.full((h, w, 3), 245, np.uint8)
    allp = np.concatenate([p for p, _ in paths])
    lo, hi = allp.min(axis=0), allp.max(axis=0)
    scale = 0.8 * min(w / (hi[0] - lo[0]), h / (hi[1] - lo[1]))
    mid = (lo + hi) / 2

    def to_px(p):
        return np.stack([w / 2 + (p[:, 0] - mid[0]) * scale, h / 2 - (p[:, 1] - mid[1]) * scale], 1)

    for p, color in paths:
        q = to_px(p)
        for a, b in zip(q[:-1], q[1:]):
            n = int(max(abs(b - a)) * 2) + 1
            for s in np.linspace(0, 1, n):
                x, y = (a + (b - a) * s).astype(int)
                img[max(y - 1, 0):y + 2, max(x - 1, 0):x + 2] = color
    for p, color in marks:
        x, y = to_px(p[None])[0].astype(int)
        img[y - 6:y + 7, x - 6:x + 7] = color
    # A scale bar of 0.1 bear heights (10 cm on the 1 m bear) at the bottom left.
    bar = int(round(0.1 * scale))
    img[h - 30:h - 26, 20:20 + bar] = (60, 60, 60)
    img[h - 38:h - 18, 20:22] = (60, 60, 60)
    img[h - 38:h - 18, 18 + bar:20 + bar] = (60, 60, 60)
    return img


def main():
    """Plots the path and prints the ictus measures."""
    ap = argparse.ArgumentParser()
    ap.add_argument('--clip', default='beat_4_4')
    ap.add_argument('--bars', type=int, default=1)
    if '--' in sys.argv:
        argv = sys.argv[sys.argv.index('--') + 1:]
    else:
        # Inside Blender, the arguments before '--' belong to Blender.
        argv = [] if hasattr(sys.modules.get('bpy'), 'app') else sys.argv[1:]
    args = ap.parse_args(argv)
    skel, bones = skeleton_from_layout()
    fn = motion.CLIPS[args.clip][0]
    times = np.arange(0, 4 * args.bars, 1 / 120)
    wrists, tips = tip_path(skel, bones, fn, times)
    # The conductor view: from behind, so the right of the bear (-x) is on the right.
    view = lambda p: np.stack([-p[:, 0], p[:, 1]], axis=1)  # noqa: E731
    ictus_idx = [int(round(k * 120)) for k in range(4)]
    for k, i in enumerate(ictus_idx):
        v_before = (tips[i] - tips[i - 1]) * 120
        v_after = (tips[i + 1] - tips[i]) * 120
        print(f'beat {k + 1}: tip at x {tips[i][0]:+.3f} y {tips[i][1]:.3f}  vertical speed '
              f'before {v_before[1]:+.2f} after {v_after[1]:+.2f} (units/s)')
    colors = [(200, 40, 40), (40, 120, 200), (40, 160, 70), (180, 120, 20)]
    img = draw([(view(wrists), (190, 170, 150)), (view(tips), (40, 30, 25))],
               [(view(tips[[i]])[0], colors[k]) for k, i in enumerate(ictus_idx)])
    out = os.path.join(ROOT, 'out', 'frames', 'pattern_plot.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    write_png(out, img)
    print('wrote', out, '(beat 1 red, 2 blue, 3 green, 4 orange)')


if __name__ == '__main__':
    main()
