# Writes a WebP copy of each image: <src>=<dst> pairs.
import sys
from PIL import Image
for arg in sys.argv[1:]:
    src, dst = arg.split('=', 1)
    Image.open(src).convert('RGB').save(dst, 'WEBP', quality=82)
