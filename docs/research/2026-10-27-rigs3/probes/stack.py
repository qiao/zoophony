"""Stacks images into one WebP file: stack.py <out.webp> <quality> <image>..."""
import sys
from PIL import Image
images = [Image.open(p).convert('RGB') for p in sys.argv[3:]]
w = max(i.width for i in images)
out = Image.new('RGB', (w, sum(i.height for i in images)), 'white')
y = 0
for i in images:
    out.paste(i, (0, y))
    y += i.height
out.save(sys.argv[1], 'WEBP', quality=int(sys.argv[2]), method=6)
