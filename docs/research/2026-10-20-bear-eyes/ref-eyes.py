# Measures the eye places of the front view of docs/reference/bear-views.png: the middle of each
# dark pupil, the head width at the eye row (the fur against the gray background), and the top of
# the black nose, in pixels of the sheet, and the ratios to the head width.
# Usage: uv run --no-project --with pillow python -I docs/research/2026-10-20-bear-eyes/ref-eyes.py
from PIL import Image

im = Image.open('docs/reference/bear-views.png').convert('RGB')
px = im.load()
X0, X1, Y0, Y1 = 190, 370, 190, 260


def dark(p):
    return sum(p) < 150


def background(p):
    r, g, b = p
    return r > 185 and g > 185 and b > 185 and abs(r - b) < 20


# The pupils: dark pixels in the eye rows, split into the left and the right half.
pupils = {'left': [], 'right': []}
for y in range(205, 235):
    for x in range(X0, X1):
        if dark(px[x, y]):
            pupils['left' if x < 280 else 'right'].append((x, y))
mid = {}
for side, pts in pupils.items():
    mid[side] = (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
    print(f'pupil {side}: x {mid[side][0]:.1f} y {mid[side][1]:.1f} ({len(pts)} pixels)')
row = round((mid['left'][1] + mid['right'][1]) / 2)
xs = [x for x in range(150, 420) if not background(px[x, row])]
width = max(xs) - min(xs)
print(f'head at row {row}: x {min(xs)} to {max(xs)}, width {width}')
# The nose: the dark pixels below the eyes on the middle line.
nose = [y for y in range(225, 270) if dark(px[280, y])]
print(f'nose top at x 280: y {min(nose)}')
spacing = mid['right'][0] - mid['left'][0]
print(f'eye spacing {spacing:.1f}: {spacing / width:.3f} of the head width')
print(f'eye row above the nose top: {(min(nose) - row) / width:.3f} of the head width')
# The middle of the nose: the mean of the dark pixels of the nose.
pts = [(x, y) for y in range(228, 262) for x in range(262, 300) if dark(px[x, y])]
ny = sum(p[1] for p in pts) / len(pts)
print(f'nose middle: y {ny:.1f} ({len(pts)} pixels)')
print(f'eye row above the nose middle: {(ny - row) / width:.3f} of the head width')
