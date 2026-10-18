# Measures the back rows against the front rows in frames of the camera `default` of
# `pnpm look-lab` (1440 x 900, Boulanger at 33.5 s), and in orchestra-latest.png.
# White fur: the pixels with a saturation below 0.4 (as back-fur-crops.py). Shade ratio: p10 / p90
# of the white fur with a luma above 60, so the black fur of the pandas and the black stands drop
# out. Floor: luma p50 of boxes of the stage top behind and between the back-row players.
# Usage: python back_measures.py <reference.png> <frame.png>...
import sys, colorsys
from PIL import Image

def q(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(p * len(v)))] if v else float('nan')

def pixels(im, box):
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            r, g, b = im.getpixel((x, y))
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            yield 0.2126 * r + 0.7152 * g + 0.0722 * b, s

def white(im, boxes, lo=0.0):
    return [l for box in boxes for l, s in pixels(im, box) if s < 0.4 and l > lo]

def luma(im, boxes):
    return [l for box in boxes for l, s in pixels(im, box)]

APP = {
    'front rabbits': [(357, 460, 430, 600), (413, 417, 470, 553), (450, 497, 517, 633), (503, 450, 577, 593)],
    'back pandas': [(768, 158, 818, 248), (857, 165, 909, 255), (951, 178, 1001, 272)],
    'back hippo': [(695, 140, 765, 247)],
    'wolves, second row from the back': [(595, 232, 632, 330), (668, 232, 702, 330), (738, 232, 772, 330)],
    'back floor': [(390, 232, 440, 252), (822, 222, 848, 248), (912, 215, 942, 250), (1020, 228, 1048, 242)],
    'front rows, all pixels': [(340, 400, 1130, 700)],
    'back rows, all pixels': [(330, 140, 1110, 330)],
}
REF = {
    'front rabbits': [(150, 650, 230, 790), (470, 740, 550, 860)],
    'back pandas': [(300, 390, 370, 520), (455, 380, 525, 510), (570, 370, 640, 500)],
    'penguin bellies': [(960, 190, 1020, 330)],
    'back floor': [(1200, 505, 1260, 545), (225, 455, 275, 490)],
}

def report(name, im, boxes):
    out = {}
    for label in ('front rabbits', 'back pandas', 'back hippo', 'wolves, second row from the back', 'penguin bellies'):
        if label in boxes:
            w = white(im, boxes[label])
            m = white(im, boxes[label], 60)
            out[label] = (q(w, 0.5), q(w, 0.9), q(m, 0.1) / q(m, 0.9) if m else float('nan'), len(w))
    floor = q(luma(im, boxes['back floor']), 0.5)
    front = luma(im, boxes['front rows, all pixels']) if 'front rows, all pixels' in boxes else []
    fr = out['front rabbits'][1]
    line = [f'{name:10}']
    for label, (p50, p90, shade, n) in out.items():
        line.append(f'{label}: p50 {p50:.0f} p90 {p90:.0f} ({p90 / fr:.2f} of the front) shade {shade:.2f} n {n}')
    line.append(f'back floor p50 {floor:.0f}')
    if front:
        line.append(f'front rows p50 {q(front, 0.5):.1f} p90 {q(front, 0.9):.1f}')
        back = luma(im, boxes['back rows, all pixels'])
        line.append(f'back rows p50 {q(back, 0.5):.1f} p90 {q(back, 0.9):.1f}')
    print('\n  '.join(line))

report('reference', Image.open(sys.argv[1]).convert('RGB'), REF)
for path in sys.argv[2:]:
    report(path.split('/')[-2], Image.open(path).convert('RGB'), APP)
