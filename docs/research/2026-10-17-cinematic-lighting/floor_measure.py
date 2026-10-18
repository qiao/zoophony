import colorsys

from PIL import Image

# The floor of the play frame against the floor of the reference
# (docs/research/2026-10-17-cinematic-lighting.md, section 2).
# 1. Floor with cast shadows: the luma p5 and p90, their ratio, and the mean color of the darkest
#    5% of the pixels (the shadow color).
# 2. Lit floor with no shadow and no animal: the median color, its hue, and its saturation.
# Each box is (left, top, right, bottom) in the pixels of the image. compare.py shows the boxes.
# Run from the root of the repository:
# uv run --no-project --with pillow python -I docs/research/2026-10-17-cinematic-lighting/floor_measure.py

REFERENCE = 'docs/reference/orchestra-latest.png'
APP = 'docs/snapshots/2026-10-17-eb4002fe/play-1440x900.webp'

SHADOW_BOXES = [
    ('reference, cello stands', REFERENCE, (1250, 880, 1450, 1000)),
    ('reference, podium front', REFERENCE, (820, 1150, 1180, 1235)),
    ('app, rabbit shadows', APP, (400, 590, 640, 700)),
    ('app, viola shadows', APP, (1000, 640, 1200, 715)),
]

LIT_BOXES = [
    ('reference, right of cellos', REFERENCE, (1330, 930, 1380, 985)),
    ('reference, left of podium', REFERENCE, (700, 1050, 860, 1150)),
    ('reference, right of podium', REFERENCE, (1220, 1040, 1340, 1110)),
    ('app, right of podium', APP, (780, 660, 900, 700)),
    ('app, left of podium', APP, (560, 640, 660, 700)),
    ('app, front left', APP, (520, 700, 660, 740)),
]


def luma(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def pixels(path, box):
    image = Image.open(path).convert('RGB').crop(box)
    return [image.getpixel((x, y)) for y in range(image.height) for x in range(image.width)]


print('Floor with cast shadows')
for name, path, box in SHADOW_BOXES:
    values = sorted(pixels(path, box), key=luma)
    lo = luma(values[int(0.05 * (len(values) - 1))])
    hi = luma(values[int(0.90 * (len(values) - 1))])
    dark = values[: max(1, len(values) // 20)]
    mean = tuple(round(sum(p[i] for p in dark) / len(dark)) for i in range(3))
    print('  %-26s luma p5 %5.1f  p90 %5.1f  ratio %3.1f  shadow color %s' % (name, lo, hi, hi / lo, mean))

print('Lit floor')
for name, path, box in LIT_BOXES:
    values = sorted(pixels(path, box), key=sum)
    r, g, b = values[len(values) // 2]
    h, s, _ = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    print('  %-26s median RGB (%3d, %3d, %3d)  hue %3.0f  saturation %.2f' % (name, r, g, b, h * 360, s))
