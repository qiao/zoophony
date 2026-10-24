import sys
from pathlib import Path
from PIL import Image
for p in Path(sys.argv[1]).glob('strips/*.webp'):
    im = Image.open(p).convert('RGB')
    im.resize((im.width // 2, im.height // 2), Image.LANCZOS).save(p, quality=70)
for p in Path(sys.argv[1]).glob('*-paws-*.webp'):
    Image.open(p).convert('RGB').save(p, quality=68)
