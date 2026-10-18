# Measures the subject of a close shot (Cinematic solo shots of Boulanger, 1440 x 900): the luma
# p10, p50, p90 of its fur (saturation below 0.4, luma above 40), the shade ratio p10 / p90, and
# the part of the fur pixels above 245 (near the white point).
# Usage: python close_measures.py <runs dir>
import sys, colorsys
from PIL import Image

def q(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(p * len(v)))]

BOXES = {
    'close-rabbit': (660, 200, 900, 840),  # the front rabbit of the first desk, the subject
    'close-badger': (620, 340, 940, 740),  # the badger of the back row at the left
    'close-hippo': (495, 0, 930, 795),     # the hippo of the back row with its double bass
}
root = sys.argv[1]
for shot, box in BOXES.items():
    for variant in ('main', 's2'):
        im = Image.open(f'{root}/{shot}/{variant}.png').convert('RGB')
        fur = []
        for y in range(box[1], box[3]):
            for x in range(box[0], box[2]):
                r, g, b = im.getpixel((x, y))
                h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                l = 0.2126 * r + 0.7152 * g + 0.0722 * b
                if s < 0.4 and l > 40:
                    fur.append(l)
        hot = sum(1 for l in fur if l > 245) / len(fur)
        print(f'{shot:13} {variant:5} fur p10 {q(fur, .1):5.0f} p50 {q(fur, .5):5.0f} p90 {q(fur, .9):5.0f} '
              f'shade {q(fur, .1) / q(fur, .9):.2f} above 245 {hot * 100:4.1f}% n {len(fur)}')
