"""Puts the base image above the round image for each camera, cropped around the middle.

Usage: python pairs.py <time dir> <out prefix> <crop w> <crop h> <cam,...>
"""
import sys
from PIL import Image, ImageDraw

d, out, cw, ch, cams = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5].split(',')
cells = []
for cam in cams:
    a = Image.open(f'{d}/play-base-{cam}.png').convert('RGB')
    b = Image.open(f'{d}/play-{cam}.png').convert('RGB')
    w, h = a.size
    box = ((w - cw) // 2, (h - ch) // 2, (w + cw) // 2, (h + ch) // 2)
    cells.append((cam, a.crop(box), b.crop(box)))
sheet = Image.new('RGB', (cw * len(cells), ch * 2))
dr = ImageDraw.Draw(sheet)
for i, (cam, a, b) in enumerate(cells):
    sheet.paste(a, (i * cw, 0))
    sheet.paste(b, (i * cw, ch))
    dr.text((i * cw + 6, 6), f'main {cam}', fill=(255, 255, 0))
    dr.text((i * cw + 6, ch + 6), f'round {cam}', fill=(255, 255, 0))
sheet.save(out)
