# Puts the view sheet of the base above the view sheet of the tree, at half size, as WebP, for
# each animal and camera height of the round, and copies the 2x crop pairs.
# Usage: pair_sheet.py <repo>
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw

repo = Path(sys.argv[1])
val = repo / 'scratch' / 'val'
out_dir = repo / 'docs' / 'research' / '2026-10-24-wind-grips'
out_dir.mkdir(parents=True, exist_ok=True)
for animal, role in [('wolf', 'clarinetist'), ('mouse', 'oboist'), ('fox', 'flutist')]:
    name = 'fox-tan' if animal == 'fox' else animal
    for height in ['e20', 'e40']:
        base = Image.open(val / f'{animal}-{height}' / f'{role}-base-views.png').convert('RGB')
        tree = Image.open(val / f'{animal}-{height}' / f'{role}-views.png').convert('RGB')
        w, h = base.width // 2, base.height // 2
        sheet = Image.new('RGB', (w, h * 2 + 24), 'white')
        sheet.paste(base.resize((w, h), Image.LANCZOS), (0, 0))
        sheet.paste(tree.resize((w, h), Image.LANCZOS), (0, h + 24))
        ImageDraw.Draw(sheet).text((8, h + 4), 'above: main 6cd51b6e, below: the working tree', fill='black')
        sheet.save(out_dir / f'{name}-views-{height}.webp', quality=60)
    for moment in ['note', 'rest', 'lift50', 'lower50']:
        src = val / f'{animal}-crops' / f'{role}-lineup-{moment}-crop2.webp'
        shutil.copy(src, out_dir / f'{name}-paws-{moment}.webp')
