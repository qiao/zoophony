"""Copies the results of a `run_all.sh` work folder into the report folder, each image at most
300 kB.

    uv run --no-project --with pillow --with numpy \
        python tools/spike/fox-gated/publish.py <work-dir> <sheet.png> <out-dir> [<before-dir>]

The full-size renders stay at 2494 x 1354 px: the fox alone as a PNG file with a palette of at
most 256 colors and its transparency, the fox on the chair as a JPEG file (its soft shadows have
noise that a PNG file cannot pack), and the silhouette as a 1-bit PNG file. The other images are
JPEG or palette PNG files, most at half size. The script also copies `fox.glb` and prints the size of each file.

With `<before-dir>` (the work folder of an earlier run), the script also writes three compare
images, each with the sheet, the earlier fox, and this fox in rows: `before-after.jpg` (the
three views at half size), `heads-before-after.jpg`, and `legs-before-after.jpg` (crops at
full size).
"""

import io
import os
import shutil
import sys

from PIL import Image

#: The largest file size, in bytes.
LIMIT = 300_000


#: The boxes of the head close-ups of the compare images: front, side, and back view.
HEAD_BOXES = [(210, 120, 610, 490), (1020, 120, 1420, 490), (1830, 120, 2230, 490)]

#: The boxes of the leg close-ups of the compare images: front and side view.
LEG_BOXES = [(160, 560, 640, 1130), (1000, 560, 1480, 1130)]


def save_png(img, path, colors=256):
    """Saves a palette PNG file, with fewer colors until it fits the limit."""
    while True:
        if img.mode == 'RGBA':
            pal = img.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        else:
            pal = img.convert('RGB').quantize(colors=colors, dither=Image.Dither.NONE)
        buf = io.BytesIO()
        pal.save(buf, 'PNG', optimize=True)
        if buf.tell() <= LIMIT or colors <= 16:
            break
        colors //= 2
    open(path, 'wb').write(buf.getvalue())


def save_jpeg(img, path, quality=86):
    """Saves a JPEG file, with a lower quality until it fits the limit."""
    while True:
        buf = io.BytesIO()
        img.convert('RGB').save(buf, 'JPEG', quality=quality, optimize=True)
        if buf.tell() <= LIMIT or quality <= 40:
            break
        quality -= 6
    open(path, 'wb').write(buf.getvalue())


def half(img):
    """Scales an image to half its size."""
    return img.resize((img.width // 2, img.height // 2), Image.LANCZOS)


def stack(images, columns):
    """Puts images of one size into a grid."""
    w, h = images[0].size
    rows = (len(images) + columns - 1) // columns
    out = Image.new('RGB', (w * columns, h * rows), (15, 15, 15))
    for i, im in enumerate(images):
        out.paste(im.convert('RGB'), ((i % columns) * w, (i // columns) * h))
    return out


def main():
    work, sheet_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out, exist_ok=True)
    sheet = Image.open(sheet_path).convert('RGB')

    save_png(Image.open(f'{work}/fox-views-render.png').convert('RGBA'),
             f'{out}/fox-views-render.png')
    save_jpeg(Image.open(f'{work}/fox-views-chair.png'), f'{out}/fox-views-chair.jpg')
    sil = Image.open(f'{work}/fox-views-silhouette.png').getchannel('A').point(
        lambda a: 255 if a > 127 else 0).convert('1')
    sil.save(f'{out}/fox-views-silhouette.png', optimize=True)
    save_jpeg(Image.open(f'{work}/overlay.png'), f'{out}/overlay.jpg')
    save_jpeg(Image.open(f'{work}/side-by-side.png'), f'{out}/side-by-side.jpg')

    for phase in ('blockout', 'forms', 'lowpoly'):
        save_png(half(Image.open(f'{work}/{phase}/diff.png').convert('RGB')),
                 f'{out}/{phase}-diff.png', colors=16)
    for phase in ('blockout', 'forms'):
        save_jpeg(half(Image.open(f'{work}/{phase}/clay.png')), f'{out}/{phase}-clay.jpg')

    render = Image.open(f'{work}/fox-views-chair.png').convert('RGB')
    boxes = [(150, 100, 650, 500), (980, 100, 1480, 500), (1800, 100, 2300, 500)]
    heads = [sheet.crop(b) for b in boxes] + [render.crop(b) for b in boxes]
    save_jpeg(stack(heads, 3), f'{out}/heads.jpg')

    poses = []
    for name in ('arm-raised', 'head-turned', 'bow-moved'):
        im = Image.open(f'{work}/rig/pose-{name}.png').convert('RGB').crop((0, 0, 1700, 1354))
        poses.append(im.resize((850, 677), Image.LANCZOS))
    save_jpeg(stack(poses, 1), f'{out}/rig-poses.jpg')

    if len(sys.argv) > 4:
        rows = [sheet, Image.open(f'{sys.argv[4]}/fox-views-chair.png').convert('RGB'), render]
        save_jpeg(stack([half(r) for r in rows], 1), f'{out}/before-after.jpg')
        for name, crops in (('heads', HEAD_BOXES), ('legs', LEG_BOXES)):
            save_jpeg(stack([r.crop(b) for r in rows for b in crops], len(crops)),
                      f'{out}/{name}-before-after.jpg')

    shutil.copy(f'{work}/rig/fox.glb', f'{out}/fox.glb')
    for name in sorted(os.listdir(out)):
        print('%-28s %7d' % (name, os.path.getsize(os.path.join(out, name))))


if __name__ == '__main__':
    main()
