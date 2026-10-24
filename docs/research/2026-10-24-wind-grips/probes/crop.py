# Crops boxes of an image and joins them in a row, scaled up.
# Usage: crop.py <in> <out> <scale> x,y,w,h ...
import sys
from PIL import Image
src = Image.open(sys.argv[1]).convert('RGB')
scale = float(sys.argv[3])
parts = []
for box in sys.argv[4:]:
    x, y, w, h = [int(v) for v in box.split(',')]
    parts.append(src.crop((x, y, x + w, y + h)).resize((int(w * scale), int(h * scale)), Image.LANCZOS))
out = Image.new('RGB', (sum(p.width for p in parts) + 8 * (len(parts) - 1), max(p.height for p in parts)), 'white')
x = 0
for p in parts:
    out.paste(p, (x, 0)); x += p.width + 8
out.save(sys.argv[2])
