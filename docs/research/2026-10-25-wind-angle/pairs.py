"""Makes the pair images of the wind angle report: main above the branch, one column a view."""

from PIL import Image, ImageDraw

OUT = 'docs/research/2026-10-25-wind-angle/'


def row(paths, label):
    ims = [Image.open(p).convert('RGB') for p in paths]
    r = Image.new('RGB', (sum(i.width for i in ims), ims[0].height))
    x = 0
    for i in ims:
        r.paste(i, (x, 0))
        x += i.width
    d = ImageDraw.Draw(r)
    d.rectangle([0, r.height - 24, 260, r.height], fill=(0, 0, 0))
    d.text((6, r.height - 19), label, fill=(255, 255, 0))
    return r


def pair(name, main, tree, views, moment, role):
    a = row([f'scratch/{main}/{role}-{moment}-{v}.png' for v in views], f'main: {moment} ' + ', '.join(views))
    b = row([f'scratch/{tree}/{role}-{moment}-{v}.png' for v in views], f'branch: {moment} ' + ', '.join(views))
    s = Image.new('RGB', (a.width, a.height * 2))
    s.paste(a, (0, 0))
    s.paste(b, (0, a.height))
    s.save(OUT + name, quality=82)
    print(name, s.size)


for role, main, tree in [('oboist', 'w-main', 'w-v2'), ('clarinetist', 'wc-main', 'wc-c2')]:
    pair(f'{role}-play-side.webp', main, tree, ['front', 'left', 'right', 'back'], 'note', role)
    pair(f'{role}-play-35.webp', main, tree, ['az35', 'az-35'], 'note', role)
    pair(f'{role}-rest.webp', main, tree, ['front', 'left', 'right', 'back'], 'rest', role)

# The 2x paw crops of the play.
cells = []
for d, lab in [('w-main', 'main'), ('w-v2', 'branch')]:
    for v, b in [('front', (100, 150, 260, 310)), ('az35', (170, 160, 330, 320)), ('az-35', (30, 160, 190, 320))]:
        im = Image.open(f'scratch/{d}/oboist-note-{v}.png').convert('RGB').crop(b).resize((480, 480), Image.LANCZOS)
        ImageDraw.Draw(im).text((6, 6), f'{lab} {v}', fill=(255, 255, 0))
        cells.append(im)
s = Image.new('RGB', (480 * 3, 960))
for i, c in enumerate(cells):
    s.paste(c, ((i % 3) * 480, (i // 3) * 480))
s.save(OUT + 'oboist-paws.webp', quality=85)

# The reference wolf beside the app wolf at 20, 30, and 35 degrees from the camera of the images.
ref = [Image.open('scratch/g-latest.png').convert('RGB').resize((330, 360)), Image.open('scratch/g-side.png').convert('RGB').resize((240, 360))]
cal = Image.open('scratch/g-cal.png').convert('RGB').resize((630, 360))
s = Image.new('RGB', (330 + 240 + 630, 360))
s.paste(ref[0], (0, 0))
s.paste(ref[1], (330, 0))
s.paste(cal, (570, 0))
s.save(OUT + 'wolf-reference.webp', quality=85)

# The play bands of the audit sheets.
for role in ['oboist', 'clarinetist']:
    Image.open(f'scratch/audit/{role}-e20-0.webp').save(OUT + f'{role}-audit-e20-play.webp', quality=80)
    Image.open(f'scratch/audit/{role}-e40-0.webp').save(OUT + f'{role}-audit-e40-play.webp', quality=80)
