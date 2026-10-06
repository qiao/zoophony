"""Encodes the frames of record.mjs as a small GIF.

Usage: python3 encode-gif.py <frame folder> <GIF file> <seconds> <skip seconds> [fps]

This is the GIF form of docs/research/scripts/step-5/encode.py, with one change: each frame
after the first keeps only the pixels that change by 16 or more in a channel. Each other pixel
gets the transparent index, so the LZW code of the GIF gets long runs. The cinematic
camera moves in each shot, and the full frames of encode.py gave 23.7 MB for 20 s.
The GIF is 720 x 450, with one palette of 127 colors and no dither. Needs Pillow.
"""

import os
import sys

from PIL import Image, ImageChops

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'step-5'))
from encode import frames_at  # noqa: E402

TRANSPARENT = 127

THRESHOLD = 16


def write_gif(folder, path, seconds, skip, fps=20, width=720, height=450):
    images = [Image.open(f).convert('RGB').resize((width, height), Image.LANCZOS)
              for f in frames_at(folder, fps, seconds, skip)]
    mosaic = Image.new('RGB', (width * 4, height * 2))
    for i in range(8):
        mosaic.paste(images[i * len(images) // 8], ((i % 4) * width, (i // 4) * height))
    palette = mosaic.quantize(colors=TRANSPARENT, method=Image.Quantize.MEDIANCUT)
    # The palette indices as gray images, so that ImageChops can compare them.
    indices = [Image.frombytes('L', (width, height),
                               image.quantize(palette=palette, dither=Image.Dither.NONE).tobytes())
               for image in images]
    colors = palette.getpalette()[:TRANSPARENT * 3] + [0, 0, 0]
    frames = []
    # The colors that the viewer sees after each frame. A pixel that differs from it by less
    # than THRESHOLD in each channel keeps it, so that the noise of the JPEG frames of the
    # screencast does not count as a change.
    shown_rgb = images[0].copy()
    for k, index in enumerate(indices):
        shown = index.copy()
        if k > 0:
            delta = ImageChops.difference(images[k], shown_rgb).split()
            changed = ImageChops.lighter(ImageChops.lighter(delta[0], delta[1]), delta[2])
            same = changed.point(lambda v: 255 if v < THRESHOLD else 0)
            shown.paste(TRANSPARENT, mask=same)
            shown_rgb.paste(images[k], mask=same.point(lambda v: 255 - v))
        frame = Image.frombytes('P', (width, height), shown.tobytes())
        frame.putpalette(colors)
        frames.append(frame)
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=round(1000 / fps),
                   loop=0, disposal=1, transparency=TRANSPARENT, optimize=False)


if __name__ == '__main__':
    folder, out, seconds, skip = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
    fps = int(sys.argv[5]) if len(sys.argv) > 5 else 20
    write_gif(folder, out, seconds, skip, fps)
    print(out, os.path.getsize(out), 'B')
