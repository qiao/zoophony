"""Measures the exposure of frames (round stage-exposure, 2026-10-21): the luma percentiles of
the stage band, the clipped share of the pale fur and of the floor, the luma and the saturation
of the floor in the pool, the falloff of the floor from the pool to the edges, and the contrast of
the lit fur against the floor. The pale fur takes the mask of the first frame of each kind, so
each variant measures the same pixels. Usage:
exposure_measure.py <boxes.json> <kind>=<png> ... [--overlay <dir>]
The boxes file gives the floor boxes of each kind: pool, edge, back (x0, y0, x1, y1 in pixels)."""
import json, sys, os
import numpy as np
from PIL import Image, ImageDraw
args = sys.argv[1:]
overlay = None
if '--overlay' in args:
    i = args.index('--overlay'); overlay = args[i + 1]; del args[i:i + 2]
boxes = json.load(open(args[0]))
rows = []; masks = {}
def hsv(a):
    top = a.max(-1); low = a.min(-1); sat = np.where(top > 0, (top - low) / np.maximum(top, 1), 0)
    return top, sat
for item in args[1:]:
    label, path = item.split('=', 1)
    kind = label.split(':')[0]
    a = np.asarray(Image.open(path).convert('RGB'), float)
    h, w, _ = a.shape
    L = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    top, sat = hsv(a)
    band = np.zeros((h, w), bool); band[int(.2 * h):int(.95 * h), int(.1 * w):int(.9 * w)] = True
    if kind not in masks:
        fb = np.zeros((h, w), bool)
        for x0, y0, x1, y1 in boxes[kind]["fur"]:
            fb[y0:y1, x0:x1] = True
        masks[kind] = fb & (sat < 0.4) & (L > 60)
    fur = masks[kind]
    floor = {k: np.zeros((h, w), bool) for k in ('pool', 'edge', 'back')}
    for k in floor:
        for x0, y0, x1, y1 in boxes[kind][k]:
            floor[k][y0:y1, x0:x1] = True
    allfloor = floor['pool'] | floor['edge'] | floor['back']
    p = np.percentile(L[band], [5, 50, 95, 99])
    clip = lambda m: 100 * ((top[m] >= 250).mean())
    near = lambda m: 100 * ((L[m] >= 235).mean())
    med = lambda m: float(np.median(L[m]))
    fur90 = float(np.percentile(L[fur], 90))
    pool = med(floor['pool']); edge = med(floor['edge']); back = med(floor['back'])
    rows.append((label, {
        'stage p5/p50/p95/p99': '/'.join(f'{v:.0f}' for v in p),
        'fur px': int(fur.sum()),
        'fur p50/p90': f'{med(fur):.0f}/{fur90:.0f}',
        'fur clip % (255) / near % (L>=235)': f'{clip(fur):.1f} / {near(fur):.1f}',
        'floor clip % / near %': f'{clip(allfloor):.1f} / {near(allfloor):.1f}',
        'pool floor L / sat': f'{pool:.0f} / {np.median(sat[floor["pool"]]):.2f}',
        'falloff edge/pool, back/pool': f'{edge / pool:.2f}, {back / pool:.2f}',
        'fur p90 / pool floor, / edge floor': f'{fur90 / pool:.2f}, {fur90 / edge:.2f}',
    }))
    if overlay:
        os.makedirs(overlay, exist_ok=True)
        im = Image.open(path).convert('RGB'); d = ImageDraw.Draw(im)
        tint = np.asarray(im).copy(); tint[fur] = (tint[fur] * 0.4 + np.array([255, 0, 255]) * 0.6).astype(np.uint8)
        im = Image.fromarray(tint); d = ImageDraw.Draw(im)
        for k, c in (('pool', (0, 255, 0)), ('edge', (0, 160, 255)), ('back', (255, 255, 0))):
            for b in boxes[kind][k]: d.rectangle(b, outline=c, width=3)
        im.save(f'{overlay}/{label.replace(":", "-")}.png')
keys = list(rows[0][1])
print('| Measure | ' + ' | '.join(r[0] for r in rows) + ' |')
print('|---|' + '---|' * len(rows))
for k in keys:
    print(f'| {k} | ' + ' | '.join(str(r[1][k]) for r in rows) + ' |')
