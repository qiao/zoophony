# Measures the white fur of the choir of penguins against the front rabbits in frames of the
# camera `default` of `pnpm close-views play --demo beethoven-9 --time 33.5` (1440 x 900), as in
# back-fur-crops.py: the luma p50 and p90 of the pixels with a saturation below 0.4.
# Usage: python b9_measures.py <frame.png>...
import sys, colorsys
from PIL import Image

def q(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(p * len(v)))]

BOXES = {'front rabbits': (365, 470, 565, 640), 'choir penguins': (575, 135, 860, 178)}
for path in sys.argv[1:]:
    im = Image.open(path).convert('RGB')
    out = {}
    for label, box in BOXES.items():
        fur = []
        for y in range(box[1], box[3]):
            for x in range(box[0], box[2]):
                r, g, b = im.getpixel((x, y))
                if colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[1] < 0.4:
                    fur.append(0.2126 * r + 0.7152 * g + 0.0722 * b)
        out[label] = (q(fur, 0.5), q(fur, 0.9), len(fur))
    f, c = out['front rabbits'], out['choir penguins']
    print(f'{path.split("/")[-2]:8} front rabbits p50 {f[0]:.0f} p90 {f[1]:.0f} | penguins p50 {c[0]:.0f} '
          f'p90 {c[1]:.0f} ({c[1] / f[1]:.2f} of the front) n {c[2]}')
