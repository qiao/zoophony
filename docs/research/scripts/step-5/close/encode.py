"""Encodes the frames of capture.mjs as the WebP files of docs/reviews/step-5/.

Usage: python3 encode.py <frame folder> <review folder>
The contrabass and the choir become animated WebP files of 960 x 600 at 10 fps (quality 70).
The two frames of the blink stand side by side in one WebP file. The choir of the default view
stands sung over at rest, cropped and 3 times larger with no smoothing. Needs Pillow.
"""

import glob
import os
import sys

from PIL import Image


def animated(folder, path):
    frames = [Image.open(f).convert('RGB').resize((960, 600), Image.LANCZOS)
              for f in sorted(glob.glob(os.path.join(folder, 'f*.png')))]
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=100, loop=0,
                   quality=70, method=6)


def crop(folder, path):
    """Stacks the choir of the default view, sung and at rest, at 3 times its size."""
    box = (640, 250, 940, 380)
    images = [Image.open(os.path.join(folder, f'{name}.png')).convert('RGB').crop(box)
              .resize((900, 390), Image.NEAREST) for name in ('sung', 'rest')]
    sheet = Image.new('RGB', (900, 790), (255, 255, 255))
    sheet.paste(images[0], (0, 0))
    sheet.paste(images[1], (0, 400))
    sheet.save(path, quality=85, method=6)


def pair(folder, path):
    left = Image.open(os.path.join(folder, 'open.png')).convert('RGB')
    right = Image.open(os.path.join(folder, 'closed.png')).convert('RGB')
    width, height = 720, 450
    left, right = left.resize((width, height), Image.LANCZOS), right.resize((width, height), Image.LANCZOS)
    sheet = Image.new('RGB', (2 * width, height))
    sheet.paste(left, (0, 0))
    sheet.paste(right, (width, 0))
    sheet.save(path, quality=80, method=6)


if __name__ == '__main__':
    frames, review = sys.argv[1], sys.argv[2]
    outputs = {
        'contrabass-close-960x600.webp': lambda p: animated(os.path.join(frames, 'contrabass'), p),
        'blink-close-open-closed.webp': lambda p: pair(os.path.join(frames, 'blink'), p),
        'handel-choir-close-960x600.webp': lambda p: animated(os.path.join(frames, 'choir'), p),
        'handel-choir-default-sung-rest-3x.webp': lambda p: crop(os.path.join(frames, 'choir-default'), p),
    }
    for name, write in outputs.items():
        path = os.path.join(review, name)
        write(path)
        print(name, os.path.getsize(path), 'B')
