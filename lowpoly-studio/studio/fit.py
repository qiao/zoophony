"""Scores the body field against the sheet masks, with no mesh and no browser (about 1 s).

Run with Blender (the intake must have run):

    blender -b --factory-startup --python studio/fit.py -- <animal> [--out DIR] [--step 0.006]
        [--rows] [--pose reference] [--azimuths 30,35,40]

Prints the silhouette IoU of each view and writes <out>/fit/overlay.png: gray where the model
and the sheet agree, red where only the sheet has the animal, blue where only the model has it.
"""

import argparse
import importlib
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from studio import config, views  # noqa: E402
from studio.field import field_on_grid, load_profiles  # noqa: E402


def print_rows(name, model, ref, view_meta):
    """Prints the outer edges of the model and the reference for rows of each 0.025 height.

    A positive dL or dR means that the model reaches further out than the reference.
    """
    ground = view_meta['ground_px']
    height = view_meta['height_px']
    print('   y    refL  modL   dL |  refR  modR   dR   runs(ref) runs(model)')
    for i in range(1, 40):
        y = i * 0.025
        row = int(round(ground - y * height))
        r = np.nonzero(ref[row])[0]
        m = np.nonzero(model[row])[0]
        if len(r) == 0 and len(m) == 0:
            continue
        rl, rr = (r.min(), r.max()) if len(r) else (-1, -1)
        ml, mr = (m.min(), m.max()) if len(m) else (-1, -1)
        nr = int(np.sum(np.diff(ref[row].astype(int)) == 1))
        nm = int(np.sum(np.diff(model[row].astype(int)) == 1))
        print(f'  {y:.3f} {rl:5d} {ml:5d} {rl - ml:+4d} | {rr:5d} {mr:5d} {mr - rr:+4d}   {nr} {nm}')


def main():
    """Builds the field, projects it into each view, and prints the IoU."""
    ap = argparse.ArgumentParser(prog='studio/fit.py')
    ap.add_argument('animal')
    ap.add_argument('--out', default=None)
    ap.add_argument('--step', type=float, default=0.006)
    ap.add_argument('--pose', default='reference')
    ap.add_argument('--azimuths', default='')
    ap.add_argument('--rows', action='store_true', help='print the edges of each row')
    if '--' in sys.argv:
        argv = sys.argv[sys.argv.index('--') + 1:]
    else:
        # Inside Blender, the arguments before '--' belong to Blender.
        argv = [] if hasattr(sys.modules.get('bpy'), 'app') else sys.argv[1:]
    args = ap.parse_args(argv)

    t0 = time.time()
    cfg = config.load(args.animal, args.out)
    template = importlib.import_module(f'templates.{cfg.animal.template}')
    meta, masks = views.load_reference(cfg)
    body = template.Body(cfg, load_profiles(cfg.paths.measure), cfg.role.bind)
    parts = body.parts(args.pose)
    field, origin, step = field_on_grid(parts, args.step)
    idx = np.nonzero(field < 0)
    pts = origin + step * np.stack(idx, axis=1)
    print(f'field {field.shape} inside {len(pts)} in {time.time() - t0:.1f} s')

    out = os.path.join(cfg.paths.out, 'fit')
    os.makedirs(out, exist_ok=True)
    tiles = []
    r0, r1 = cfg.compare.rows
    for name, view in cfg.sheet.views.items():
        az = view.azimuth
        candidates = [az]
        if name == 'three_quarter' and args.azimuths:
            candidates = [float(a) for a in args.azimuths.split(',')]
        best = None
        for a in candidates:
            u, v = views.project(pts, a, cfg.sheet.camera)
            iou, m, dx = views.align_and_score(u, v, masks[name], meta['views'][name], step)
            if len(candidates) > 1:
                print(f'  {name} azimuth {a:.0f}: IoU {iou:.4f}')
            if best is None or iou > best[0]:
                best = (iou, m, dx, a)
        iou, m, dx, a = best
        c0, c1 = meta['views'][name]['column']
        ref = masks[name][:, c0:c1]
        tiles.append(views.overlay(m, ref)[r0:r1])
        print(f'{name:14s} azimuth {a:5.1f}  IoU {iou:.4f}  x shift {dx:+d} px')
        if args.rows:
            print_rows(name, m, ref, meta['views'][name])
    views.write_png(os.path.join(out, 'overlay.png'), np.concatenate(tiles, axis=1))


if __name__ == '__main__':
    main()
