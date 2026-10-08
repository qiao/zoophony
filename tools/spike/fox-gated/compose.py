"""Makes the compare images of the spike and measures the fur light of a render and the sheet.

    uv run --no-project --with pillow --with numpy python tools/spike/fox-gated/compose.py \
        <sheet.png> <matte.png> <render.png> <out-dir> [<scale>]

The render is the fox alone on a transparent film. The script writes:

- `overlay.png`: the sheet with the render on it at 50% opacity.
- `side-by-side.png`: the sheet above the render on the dark background of the sheet.

Both images are scaled by `<scale>` (default 0.5). The script also prints the lit and the
shaded orange fur of the sheet (inside the matte) and of the render, with the method of
`docs/research/scripts/views-page/measure.py`: orange is hue 12 to 34 and saturation above
0.4, the lit fur is the 90th percentile of the value, and the shade is the 25th percentile.
"""

import sys

import numpy as np
from PIL import Image

#: The background of the sheet, in sRGB.
BACKGROUND = (15, 15, 15)


def fur(rgb, mask):
    """Gives the 90th and the 25th percentile of the value of the orange pixels in the mask."""
    x = rgb[mask].astype(np.float32) / 255
    mx = x.max(-1)
    mn = x.min(-1)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = x[:, 0], x[:, 1], x[:, 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = (mx - mn) / np.maximum(mx, 1e-6)
    v = (0.2126 * x[:, 0] + 0.7152 * x[:, 1] + 0.0722 * x[:, 2]) * 255
    orange = (h >= 12) & (h <= 34) & (s > 0.4)
    return np.percentile(v[orange], 90), np.percentile(v[orange], 25), int(orange.sum())


def main():
    sheet = Image.open(sys.argv[1]).convert('RGB')
    matte = np.asarray(Image.open(sys.argv[2]).convert('L'))
    render = Image.open(sys.argv[3]).convert('RGBA')
    out = sys.argv[4]
    scale = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
    size = (int(sheet.width * scale), int(sheet.height * scale))

    over = sheet.convert('RGBA')
    faded = render.copy()
    faded.putalpha(Image.fromarray((np.asarray(render)[..., 3] * 0.5).astype(np.uint8)))
    over.alpha_composite(faded)
    over.convert('RGB').resize(size, Image.LANCZOS).save(out + '/overlay.png', optimize=True)

    back = Image.new('RGBA', render.size, BACKGROUND + (255,))
    back.alpha_composite(render)
    both = Image.new('RGB', (sheet.width, sheet.height * 2))
    both.paste(sheet, (0, 0))
    both.paste(back.convert('RGB'), (0, sheet.height))
    both.resize((size[0], size[1] * 2), Image.LANCZOS).save(out + '/side-by-side.png', optimize=True)

    s_lit, s_shade, s_n = fur(np.asarray(sheet), matte == 255)
    alpha = np.asarray(render)[..., 3] > 200
    r_lit, r_shade, r_n = fur(np.asarray(render)[..., :3], alpha)
    print('sheet  fur lit %.0f shade %.0f (%d px)' % (s_lit, s_shade, s_n))
    print('render fur lit %.0f shade %.0f (%d px)' % (r_lit, r_shade, r_n))


if __name__ == '__main__':
    main()
