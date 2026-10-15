# Puts the screenshot of the user beside the level left views of main (top) and the branch.
import sys
from PIL import Image, ImageDraw
user, main_rest, branch_rest, main_chord, branch_chord, out = sys.argv[1:7]
def load(p, h):
    im = Image.open(p).convert('RGB')
    return im.resize((round(im.width * h / im.height), h))
H = 450
u = load(user, 2 * H)
cells = [[load(main_rest, H), load(main_chord, H)], [load(branch_rest, H), load(branch_chord, H)]]
w = u.width + sum(c.width for c in cells[0])
canvas = Image.new('RGB', (w, 2 * H), (20, 20, 20))
canvas.paste(u, (0, 0))
labels = [['main: rest, left', 'main: chord, left'], ['branch: rest, left', 'branch: chord, left']]
d = ImageDraw.Draw(canvas)
d.text((8, 8), 'user screenshot (main)', fill=(255, 255, 0))
for r, row in enumerate(cells):
    x = u.width
    for c, im in enumerate(row):
        canvas.paste(im, (x, r * H))
        d.text((x + 8, r * H + 8), labels[r][c], fill=(255, 255, 0))
        x += im.width
canvas.save(out, quality=82)
print(canvas.size)
