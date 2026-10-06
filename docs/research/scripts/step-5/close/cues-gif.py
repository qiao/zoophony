"""Encodes the frames of cues.mjs as docs/reviews/step-5/conductor-cues-720x450.gif.

Usage: python3 cues-gif.py <frame folder> <review folder>
The GIF is 720 x 450 at 20 fps, with one adaptive palette of 128 colors for all frames, so that
the file stays below 5 MB. Needs Pillow.
"""

import glob
import os
import sys

from PIL import Image


def main(frames: str, review: str) -> None:
    images = [Image.open(f).convert('RGB').resize((720, 450), Image.LANCZOS)
              for f in sorted(glob.glob(os.path.join(frames, 'f*.png')))]
    # One palette from a sample of the frames keeps the colors steady from frame to frame.
    sample = Image.new('RGB', (720, 450 * 4))
    for i, image in enumerate(images[::max(1, len(images) // 4)][:4]):
        sample.paste(image, (0, 450 * i))
    palette = sample.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    paletted = [image.quantize(palette=palette, dither=Image.Dither.NONE) for image in images]
    path = os.path.join(review, 'conductor-cues-720x450.gif')
    paletted[0].save(path, save_all=True, append_images=paletted[1:], duration=50, loop=0,
                     optimize=True)
    print(os.path.basename(path), len(images), 'frames', os.path.getsize(path), 'B')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
