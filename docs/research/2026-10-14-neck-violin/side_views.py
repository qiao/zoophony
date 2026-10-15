"""Usage: uv run --no-project --with pillow python -I side_views.py <close-views dir> <out.png>

Puts the side close views of the violin at the neck and of the seat, main above the branch, for
the rabbit and the red fox, into one image."""
import sys
from PIL import Image, ImageDraw
root, out_path = sys.argv[1:3]
cells = [('frog-left', 'frog, left side'), ('frog-right', 'frog, right side'), ('rest-left', 'rest, left side (seat)'), ('rest-right', 'rest, right side (seat)')]
rows = []
for folder, role in (('violinist', 'violinist'), ('fox', 'fox-violinist')):
    for tree, prefix in (('main', f'{role}-base-'), ('branch', f'{role}-')):
        row = []
        for cell, label in cells:
            img = Image.open(f'{root}/{folder}/{prefix}{cell}.png').convert('RGB')
            row.append((f"{'rabbit' if folder == 'violinist' else 'red fox'} {tree}: {label}", img))
        rows.append(row)
w, h = rows[0][0][1].size
scale = 360 / h
W, H = int(w * scale), 360
out = Image.new('RGB', (W * 4, (H + 18) * len(rows)), 'white')
d = ImageDraw.Draw(out)
for r, row in enumerate(rows):
    for c, (label, img) in enumerate(row):
        out.paste(img.resize((W, H)), (c * W, r * (H + 18) + 18))
        d.text((c * W + 4, r * (H + 18) + 3), label, fill='black')
out.save(out_path)
out.save(out_path.replace('.png', '.webp'), quality=82)
