# Puts the head of the front view of bear-views.png beside the front views of 3a6932df and of the
# tree (pnpm close-views conductor scratch/gate/head --target head --base 3a6932df), each at the
# width of its head at the eye row, so that the eye places compare by eye.
# Usage: uv run --no-project --with pillow python -I docs/research/2026-10-20-bear-eyes/place-crops.py
from PIL import Image, ImageDraw

ref = Image.open('docs/reference/bear-views.png').convert('RGB').crop((197, 150, 362, 290))
base = Image.open('scratch/gate/head/conductor-head-base-rest-front.png').convert('RGB').crop((85, 120, 275, 280))
tree = Image.open('scratch/gate/head/conductor-head-rest-front.png').convert('RGB').crop((85, 120, 275, 280))
tiles = [(t, im.resize((400, round(400 * im.height / im.width)), Image.LANCZOS)) for t, im in
         [('bear-views.png', ref), ('3a6932df', base), ('the tree', tree)]]
g = Image.new('RGB', (3 * 406, max(im.height for _, im in tiles) + 22), 'white')
d = ImageDraw.Draw(g)
for k, (t, im) in enumerate(tiles):
    d.text((k * 406 + 4, 5), t, fill='black')
    g.paste(im, (k * 406, 22))
g.save('docs/research/2026-10-20-bear-eyes/place-crops.webp', 'WEBP', quality=90)
