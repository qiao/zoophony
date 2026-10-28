"""Makes a sheet of the close paw images: one row for each trial turn, one column for each camera.
Each turn came from a temporary edit that added it to the turn of the right paw in poseArm() of
src/models/studio-rig.ts, the same as a share of turn / 24.9° of `pawKeepR` now.

Usage: python turn-sheet.py <out> <crop> <time dir name> <cam,...> <delta,...>
"""
import sys
from PIL import Image, ImageDraw

out, crop, tdir, cams, deltas = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4].split(','), sys.argv[5].split(',')
sheet = Image.new('RGB', (crop * len(cams), crop * len(deltas)))
dr = ImageDraw.Draw(sheet)
for r, d in enumerate(deltas):
    for c, cam in enumerate(cams):
        im = Image.open(f'scratch/delta/d{d}/{tdir}/play-{cam}.png').convert('RGB')
        w, h = im.size
        box = ((w - crop) // 2, (h - crop) // 2, (w + crop) // 2, (h + crop) // 2)
        sheet.paste(im.crop(box), (c * crop, r * crop))
        dr.text((c * crop + 6, r * crop + 6), f'turn {d} {cam}', fill=(255, 255, 0))
sheet.save(out)
