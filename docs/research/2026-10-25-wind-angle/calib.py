"""Makes the gridded crops of the clarinet of the wolf: the two reference images, and the renders
of the app at 20, 30, and 35 degrees from the camera az-55, elevation 35.

The renders come first, from the root of the tree:

    pnpm close-views clarinetist scratch/cal-20 --views -40,-55,-70 --moments note --elevation 35 --zoom 1
    pnpm close-views clarinetist scratch/cal-30 ... --set 'clarinet@wolf.play=holdTurn(5,0)'
    pnpm close-views clarinetist scratch/cal-35 ... --set 'clarinet@wolf.play=holdTurn(10,0)'

The angle of a tube is read by hand from two points on the grid of each crop: the mouthpiece and
the bell. The angle from the image vertical is atan(dx / dy).
"""

from PIL import Image, ImageDraw


def grid(src, box, out, k, step=40):
    a = Image.open(src).convert('RGB').crop(box)
    a = a.resize((a.width * k, a.height * k), Image.LANCZOS)
    d = ImageDraw.Draw(a)
    for x in range(0, a.width, step):
        d.line([(x, 0), (x, a.height)], fill=(0, 255, 0) if x % 200 == 0 else (0, 90, 0))
    for y in range(0, a.height, step):
        d.line([(0, y), (a.width, y)], fill=(0, 255, 0) if y % 200 == 0 else (0, 90, 0))
    a.save(out)


grid('docs/reference/orchestra-latest.png', (1570, 520, 1680, 640), 'scratch/g-latest.png', 6)
grid('docs/reference/orchestra-side.png', (1800, 570, 1880, 690), 'scratch/g-side.png', 6)
out = Image.new('RGB', (3 * 280, 480))
for i, angle in enumerate(['20', '30', '35']):
    im = Image.open(f'scratch/cal-{angle}/clarinetist-note-az-55.png').convert('RGB')
    im = im.crop((70, 170, 140, 290)).resize((280, 480), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    for x in range(0, 280, 20):
        d.line([(x, 0), (x, 480)], fill=(0, 255, 0) if x % 100 == 0 else (0, 90, 0))
    for y in range(0, 480, 20):
        d.line([(0, y), (280, y)], fill=(0, 255, 0) if y % 100 == 0 else (0, 90, 0))
    out.paste(im, (i * 280, 0))
out.save('scratch/g-cal.png')
