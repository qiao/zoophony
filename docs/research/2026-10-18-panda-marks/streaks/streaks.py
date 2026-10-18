"""Measures the gray streaks under the arms of the panda: the share of the pixels with an Oklab
lightness from 0.3 to 0.62 in a box on each side of the belly, in the renders of shots.ts.
python -I streaks.py <dir> [<overlay.png>]"""
import sys
import numpy as np
from PIL import Image, ImageDraw

#: The boxes of the streaks in a 600 x 750 render: x0, y0, x1, y1.
BOXES = {
    'rest-left': (150, 400, 340, 570),
    'rest-q-left': (360, 380, 520, 540),
    'rest-right': (280, 430, 470, 530),
    'rest-q-right': (120, 420, 300, 520),
    'first-left': (220, 410, 400, 540),
    'first-q-left': (370, 360, 530, 480),
    'first-right': (280, 430, 470, 530),
    'first-q-right': (110, 420, 290, 520),
    'first-front': (460, 360, 540, 470),
}


def lightness(rgb):
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                  [0.2119034982, 0.6806995451, 0.1073969566],
                  [0.0883024619, 0.2817188376, 0.6299787005]])
    return np.cbrt(lin @ m.T) @ np.array([0.2104542553, 0.7936177850, -0.0040720468])


folder = sys.argv[1]
shares = []
overlay = []
for name, (x0, y0, x1, y1) in BOXES.items():
    im = Image.open(f'{folder}/{name}.png').convert('RGB')
    L = lightness(np.asarray(im, float)[y0:y1, x0:x1])
    share = ((L > 0.3) & (L < 0.62)).mean()
    shares.append(share)
    print(f'{name}: box {(x0, y0, x1, y1)}, gray share {100 * share:.1f}%')
    d = ImageDraw.Draw(im)
    d.rectangle([x0, y0, x1, y1], outline=(0, 255, 0), width=3)
    overlay.append(im.resize((300, 375)))
print(f'mean {100 * np.mean(shares):.1f}%')
if len(sys.argv) > 2:
    sheet = Image.new('RGB', (300 * 5, 375 * 2))
    for k, im in enumerate(overlay):
        sheet.paste(im, ((k % 5) * 300, (k // 5) * 375))
    sheet.save(sys.argv[2])
