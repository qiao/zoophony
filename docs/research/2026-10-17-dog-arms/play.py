"""Stacks play frames with a label, and a crop of the cellos beside each: play.py <out.webp> <label>=<png>..."""
import os, sys
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]
items = [a.split('=', 1) for a in sys.argv[2:]]
font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 20)
fw, fh = 900, 563
crop = (880, 440, 1240, 720)  # the cellos at the right front, in the 1440 x 900 frame
cw = int((crop[2] - crop[0]) * fh / (crop[3] - crop[1]))
W = fw + cw
band = 34
img = Image.new('RGB', (W, (fh + band) * len(items)), (24, 24, 24))
d = ImageDraw.Draw(img)
for k, (label, path) in enumerate(items):
    y = k * (fh + band)
    d.text((8, y + 7), label, fill=(255, 230, 160), font=font)
    frame = Image.open(path).convert('RGB')
    img.paste(frame.resize((fw, fh), Image.LANCZOS), (0, y + band))
    img.paste(frame.crop(crop).resize((cw, fh), Image.LANCZOS), (fw, y + band))
q = 82
while True:
    img.save(out, 'WEBP', quality=q, method=6)
    if os.path.getsize(out) <= 300_000 or q <= 30:
        break
    q -= 6
print(out, img.size, os.path.getsize(out), 'q', q)
