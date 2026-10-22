"""grid.py <out.png> <cols> <scale> <img[:x,y,w,h]>... ; crops as shares; labels with file names."""
import sys
from PIL import Image, ImageDraw
out, cols, scale = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
cells = []
for a in sys.argv[4:]:
    path, _, box = a.partition('@')
    im = Image.open(path).convert('RGB')
    if box:
        x, y, w, h = map(float, box.split(','))
        W, H = im.size
        im = im.crop((int(x * W), int(y * H), int((x + w) * W), int((y + h) * H)))
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    label = path.split('/')[-3] + '/' + path.split('/')[-2] + '/' + path.split('/')[-1]
    d.rectangle((0, 0, 8 * len(label) // 1.3, 14), fill='black')
    d.text((3, 2), label, fill='white')
    cells.append(im)
w = max(c.width for c in cells); h = max(c.height for c in cells)
rows = (len(cells) + cols - 1) // cols
g = Image.new('RGB', (w * cols, h * rows), 'gray')
for i, c in enumerate(cells):
    g.paste(c, ((i % cols) * w, (i // cols) * h))
g.save(out)
print(g.size)
