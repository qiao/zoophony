"""stack.py <out.webp> <image>...: stacks images from top to bottom, and saves WebP."""
import sys
from PIL import Image
ims = [Image.open(p).convert('RGB') for p in sys.argv[2:]]
w = max(i.width for i in ims)
out = Image.new('RGB', (w, sum(i.height for i in ims)), (0, 0, 0))
y = 0
for i in ims:
    out.paste(i, (0, y))
    y += i.height
out.save(sys.argv[1], quality=82)
print(sys.argv[1], out.size)
