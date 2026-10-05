"""Encodes the frames of record.mjs as a GIF of 10 s and as a WebM of 10 s.

Usage: python3 encode.py <frame folder> <name> <ffmpeg>
Or: python3 encode.py <frame folder> <GIF file> --gif <seconds> <skip seconds>
The second form writes only a GIF of the given length, from the given time after the start of
the recording. The click on play comes 0.5 s after the start.
The GIF is 720 x 450 at 20 fps, with one palette of 256 colors and no dither. A GIF keeps
the frame time in steps of 10 ms, so 15 fps (67 ms) would play 10 s in 9 s. The WebM is
1440 x 900 at 30 fps, VP8. Each output frame takes the last screencast frame at its time.
Needs Pillow. The ffmpeg of the Playwright cache can encode VP8.
"""

import json
import os
import subprocess
import sys

from PIL import Image

SECONDS = 10


def frames_at(folder, fps, seconds=SECONDS, skip=0.0):
    """Gives the file of the last screencast frame at each output time."""
    frames = json.load(open(os.path.join(folder, 'frames.json')))['frames']
    start = frames[0]['t'] + skip
    picked = []
    j = 0
    for k in range(round(seconds * fps)):
        t = start + k / fps
        while j + 1 < len(frames) and frames[j + 1]['t'] <= t:
            j += 1
        picked.append(os.path.join(folder, frames[j]['file']))
    return picked


def write_gif(folder, path, width=720, height=450, fps=20, seconds=SECONDS, skip=0.0):
    images = [Image.open(f).convert('RGB').resize((width, height), Image.LANCZOS)
              for f in frames_at(folder, fps, seconds, skip)]
    # One palette from a mosaic of 8 frames. A Floyd-Steinberg dither doubled the file size.
    mosaic = Image.new('RGB', (width * 4, height * 2))
    for i in range(8):
        mosaic.paste(images[i * len(images) // 8], ((i % 4) * width, (i // 4) * height))
    palette = mosaic.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    frames = [image.quantize(palette=palette, dither=Image.Dither.NONE) for image in images]
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=round(1000 / fps),
                   loop=0, disposal=1)


def write_webm(folder, path, ffmpeg, fps=30):
    # The ffmpeg of the Playwright cache has no pipe protocol, so the JPEG stream goes to a file.
    stream = path + '.mjpeg'
    with open(stream, 'wb') as out:
        for f in frames_at(folder, fps):
            out.write(open(f, 'rb').read())
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe',
                    '-framerate', str(fps), '-c:v', 'mjpeg', '-i', stream, '-c:v', 'libvpx',
                    '-b:v', '1500k', '-crf', '10', '-deadline', 'good', '-an', path], check=True)
    os.remove(stream)


if __name__ == '__main__':
    if len(sys.argv) == 6 and sys.argv[3] == '--gif':
        write_gif(sys.argv[1], sys.argv[2], seconds=float(sys.argv[4]), skip=float(sys.argv[5]))
        print(sys.argv[2], os.path.getsize(sys.argv[2]), 'B')
        sys.exit(0)
    folder, name, ffmpeg = sys.argv[1], sys.argv[2], sys.argv[3]
    write_gif(folder, f'{name}-play-720x450.gif')
    write_webm(folder, f'{name}-play-1440x900.webm', ffmpeg)
    for suffix in ('-play-720x450.gif', '-play-1440x900.webm'):
        print(name + suffix, os.path.getsize(name + suffix), 'B')
