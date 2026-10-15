"""Puts the side view and the front view of the standing neck of the base and each neck variant in
one image, beside the reference fox of the violins crop."""
import sys
from PIL import Image, ImageDraw
root, ref_path, out_path = sys.argv[1:4]
labels = [('base', 'neck 1.0 (main)'), ('v08', 'neck 0.8'), ('v065', 'neck 0.65 (chosen)'), ('v05', 'neck 0.5')]
H = 300
ref = Image.open(ref_path).convert('RGB').crop((800, 330, 1100, 600))
ref = ref.resize((int(ref.width * H / ref.height), H))
rows = []
for view in (0, 1):
    cells = [('reference fox', ref)] if view == 0 else [('', Image.new('RGB', ref.size, 'white'))]
    for folder, label in labels:
        img = Image.open(f'{root}/{folder}/neck-standing.png').convert('RGB')
        w = img.width // 3
        cells.append((f"{label}, {'side' if view == 0 else 'front'}",
                      img.crop((view * w, 0, (view + 1) * w, img.height)).resize((H, H))))
    rows.append(cells)
W = sum(c.width for _, c in rows[0])
out = Image.new('RGB', (W, 2 * (H + 20)), 'white')
d = ImageDraw.Draw(out)
for r, cells in enumerate(rows):
    x = 0
    for label, c in cells:
        out.paste(c, (x, r * (H + 20) + 20))
        d.text((x + 4, r * (H + 20) + 4), label, fill='black')
        x += c.width
out.save(out_path)
out.save(out_path.replace('.png', '.webp'), quality=85)
