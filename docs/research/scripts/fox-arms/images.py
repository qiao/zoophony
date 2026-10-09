"""Makes the images of the report `docs/research/2026-10-08-fox-arms.md`, each at most 300 kB.

    uv run --no-project --with pillow python docs/research/scripts/fox-arms/images.py \
        <before-dir> <after-dir> <stage.webp> <work-dir> <old-rig-dir> <option-dir> <out-dir>

- <before-dir> and <after-dir>: the captures of `main` and of this branch: `close-6s.png`,
  `close-8s.png` (from `close.mjs`), and `sheet-side-by-side.png` (from `capture.mjs` and
  `compose.py` of `docs/research/scripts/views-page/`).
- <stage.webp>: the default demo after 6 s of play, from `pnpm screenshots <dir> --play`.
- <work-dir>: the work folder of `tools/spike/fox-gated/run_all.sh` of this branch.
- <old-rig-dir>: the output of the `rig.py` of `main`, with the pose `paws-turned` added, on
  the low-poly fox of the same run.
- <option-dir>: the work folder of the run with the elbow 0.045 m back.
"""
import io
import os
import sys

from PIL import Image

LIMIT = 300_000


def save(image, path):
    """Saves a JPEG file at the highest quality that keeps it at most LIMIT bytes."""
    for quality in range(90, 40, -5):
        buffer = io.BytesIO()
        image.convert('RGB').save(buffer, 'JPEG', quality=quality, optimize=True)
        if buffer.tell() <= LIMIT:
            open(path, 'wb').write(buffer.getvalue())
            print(os.path.basename(path), image.size, buffer.tell(), 'B, quality', quality)
            return
    raise SystemExit(f'{path}: larger than {LIMIT} B')


def grid(rows, gap=8):
    """Puts a list of rows of images into one image, with a dark gap between them."""
    width = max(sum(im.width for im in row) + gap * (len(row) - 1) for row in rows)
    height = sum(max(im.height for im in row) for row in rows) + gap * (len(rows) - 1)
    out = Image.new('RGB', (width, height), (20, 20, 20))
    y = 0
    for row in rows:
        x = 0
        for im in row:
            out.paste(im, (x, y))
            x += im.width + gap
        y += max(im.height for im in row) + gap
    return out


def scaled(image, width):
    """Scales an image to a width."""
    return image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)


def main():
    before, after, stage, work, old_rig, option, out = sys.argv[1:8]
    os.makedirs(out, exist_ok=True)
    rgb = lambda path: Image.open(path).convert('RGB')

    save(scaled(rgb(f'{before}/sheet-side-by-side.png'), 1100), f'{out}/sheet-before.jpg')
    save(scaled(rgb(f'{after}/sheet-side-by-side.png'), 1100), f'{out}/sheet-after.jpg')

    close = [[rgb(f'{d}/close-{s}s.png') for d in (before, after)] for s in (6, 8)]
    save(scaled(grid(close), 1400), f'{out}/foxes-before-after.jpg')

    save(rgb(stage), f'{out}/stage.jpg')

    save(scaled(rgb(f'{work}/side-by-side.png'), 1100), f'{out}/model.jpg')

    poses = [rgb(f'{work}/rig/pose-{name}.png')
             for name in ('arm-raised', 'head-turned', 'bow-moved', 'paws-turned')]
    save(scaled(grid([[p] for p in poses]), 1100), f'{out}/rig-poses.jpg')

    box = (60, 300, 760, 820)
    paws = [rgb(f'{old_rig}/pose-paws-turned.png').crop(box),
            rgb(f'{work}/rig/pose-paws-turned.png').crop(box)]
    save(grid([paws]), f'{out}/paws-before-after.jpg')

    box = (60, 200, 560, 700)
    raised = [rgb(path).crop(box) for path in (f'{old_rig}/pose-arm-raised.png',
                                                 f'{option}/rig/pose-arm-raised.png',
                                                 f'{work}/rig/pose-arm-raised.png')]
    save(grid([raised]), f'{out}/raised-arm.jpg')


main()
