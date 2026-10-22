import sys
from PIL import Image
for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    im = Image.open(src).convert('RGB')
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    q = 85
    while True:
        im.save(dst, 'WEBP', quality=q)
        import os
        if os.path.getsize(dst) <= 300_000 or q <= 30: break
        q -= 10
    print(dst, im.size, os.path.getsize(dst))
