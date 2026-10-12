"""Small Pillow helpers of the look report and of the located crops: fonts, labels, side by side
crops with marked boxes, and a grid of tiles.

Pure Python with Pillow (the font of Pillow, so the images are the same on each machine).
"""

from PIL import Image, ImageDraw, ImageFont

# The colors of the marks: the sheet, the render, a failure, a warning, and a pass.
SHEET = (40, 110, 220)
RENDER = (235, 120, 20)
FAIL = (215, 30, 40)
WARN = (210, 150, 0)
PASS = (30, 140, 60)
INK = (25, 25, 25)
PAPER = (255, 255, 255)

_FONTS = {}


def font(size):
    """Returns the scalable font of Pillow at a size in pixels."""
    if size not in _FONTS:
        _FONTS[size] = ImageFont.load_default(size=size)
    return _FONTS[size]


def text_size(text, size):
    """Returns the width and the height of a text line."""
    box = font(size).getbbox(text)
    return box[2] - box[0], box[3] - box[1]


def label(img, xy, text, size=14, fill=INK, back=None):
    """Writes one line of text at xy (top left), on a background box when back is given."""
    d = ImageDraw.Draw(img)
    if back:
        w, h = text_size(text, size)
        d.rectangle([xy[0] - 2, xy[1] - 1, xy[0] + w + 3, xy[1] + h + 5], fill=back)
    d.text(xy, text, font=font(size), fill=fill)


def wrap(text, size, width):
    """Splits a text into lines that fit a width in pixels (at word breaks)."""
    out, line = [], ''
    for word in text.split(' '):
        test = f'{line} {word}'.strip()
        if line and text_size(test, size)[0] > width:
            out.append(line)
            line = word
        else:
            line = test
    out.append(line)
    return out


def wrapped(rows, size, width, fill=INK):
    """Wraps rows (a text or a (text, color) pair each) to a width. Returns (text, color) rows."""
    out = []
    for row in rows:
        text, color = (row, fill) if isinstance(row, str) else row
        out += [(line, color) for line in wrap(text, size, width)]
    return out


def lines(img, xy, rows, size=14, fill=INK, gap=4):
    """Writes several lines; each row is a text or a (text, color) pair. Returns the bottom y."""
    x, y = xy
    for row in rows:
        text, color = (row, fill) if isinstance(row, str) else row
        label(img, (x, y), text, size, color)
        y += size + gap
    return y


def scale_to(img, height, most=8):
    """Scales an image to a height (nearest pixels, so the facets stay sharp). Returns the image
    and the scale."""
    z = max(1.0, min(float(most), height / max(1, img.size[1])))
    size = (max(1, round(img.size[0] * z)), max(1, round(img.size[1] * z)))
    return img.resize(size, Image.NEAREST), z


def pair(left, right, boxes_left=(), boxes_right=(), height=200, captions=('sheet', 'render'),
         most=8):
    """Puts two crops of the same size side by side, scaled to a height, with boxes drawn on
    them. boxes: [(x0, y0, x1, y1, color)] in the pixels of the crop."""
    a, z = scale_to(left, height, most)
    b, _ = scale_to(right, height, most)
    cap = 20
    out = Image.new('RGB', (a.size[0] + b.size[0] + 6, a.size[1] + cap), PAPER)
    out.paste(a, (0, cap))
    out.paste(b, (a.size[0] + 6, cap))
    d = ImageDraw.Draw(out)
    for dx, boxes in ((0, boxes_left), (a.size[0] + 6, boxes_right)):
        for x0, y0, x1, y1, color in boxes:
            d.rectangle([dx + x0 * z - 1, cap + y0 * z - 1, dx + x1 * z, cap + y1 * z],
                        outline=color, width=2)
    label(out, (2, 2), captions[0], 13, SHEET)
    label(out, (a.size[0] + 8, 2), captions[1], 13, RENDER)
    return out


def stack(tiles, width, gap=8, background=PAPER):
    """Lays out tiles in rows of at most width pixels. Returns the image."""
    rows, row, row_w = [], [], 0
    for t in tiles:
        if row and row_w + gap + t.size[0] > width:
            rows.append(row)
            row, row_w = [], 0
        row.append(t)
        row_w += t.size[0] + (gap if row_w else 0)
    if row:
        rows.append(row)
    height = sum(max(t.size[1] for t in r) for r in rows) + gap * max(0, len(rows) - 1)
    out = Image.new('RGB', (width, max(1, height)), background)
    y = 0
    for r in rows:
        x = 0
        for t in r:
            out.paste(t, (x, y))
            x += t.size[0] + gap
        y += max(t.size[1] for t in r) + gap
    return out


def framed(img, title, size=15, color=INK):
    """Adds a title line above an image."""
    h = size + 8
    out = Image.new('RGB', (max(img.size[0], text_size(title, size)[0] + 8), img.size[1] + h),
                    PAPER)
    label(out, (2, 2), title, size, color)
    out.paste(img, (0, h))
    return out
