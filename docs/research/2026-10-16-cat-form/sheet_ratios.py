"""Gives the trunk ratios of the cat sheet (front and side figures of docs/reference/cat-views.png)."""
import numpy as np

front = np.load('scratch/sheet-front.npy')
side = np.load('scratch/sheet-side.npy')
ys, xs = np.nonzero(front)
cx = 204  # the middle column of the front figure (the crown tuft at y 264 is x 199 to 210)


def center_width(m, y, c):
    row = m[y]
    if not row[c]:
        return 0
    left = c
    while left > 0 and row[left - 1]:
        left -= 1
    right = c
    while right < m.shape[1] - 1 and row[right + 1]:
        right += 1
    return right - left + 1


def extent(m, y):
    xs = np.nonzero(m[y])[0]
    if not len(xs):
        return 0
    # The largest run of the row.
    runs = np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1)
    return max(len(r) for r in runs)


crown = min(y for y in range(200, 400) if front[y, cx])
soles = 805
eye = 330
height = soles - crown
hw = center_width(front, eye, cx)
neck_y = min(range(eye, 460), key=lambda y: center_width(front, y, cx))
hh = neck_y - crown
crotch = 700  # the top of the gap between the legs at the middle column (the shadow fills it)
trunk = crotch - neck_y
band = lambda a, b: range(int(neck_y + a * trunk), int(neck_y + b * trunk) + 1)
belly_y = max(band(0.4, 0.75), key=lambda y: center_width(front, y, cx))
hips_y = max(band(0.75, 1.0), key=lambda y: center_width(front, y, cx))
paw = range(556, 605)
depth_y = max((y for y in band(0.4, 1.0) if y not in paw), key=lambda y: extent(side, y))
belly, hips, depth = (center_width(front, belly_y, cx), center_width(front, hips_y, cx),
                      extent(side, depth_y))
print(f'sheet: crown y {crown}, soles y {soles}, height {height} px; head width at the eyes (y {eye}) {hw} px; '
      f'neck narrowest y {neck_y}, head height (crown to the neck) {hh} px')
print(f'sheet: belly {belly} px (y {belly_y}) = {belly / hw:.3f} HW = {belly / hh:.3f} HH; '
      f'hips {hips} px (y {hips_y}) = {hips / hw:.3f} HW = {hips / hh:.3f} HH; '
      f'depth {depth} px (y {depth_y}, the paw rows 556 to 604 left out) = {depth / hw:.3f} HW = {depth / hh:.3f} HH; '
      f'height {height / hh:.2f} HH, neck to crotch {trunk} px = {trunk / hh:.2f} HH')
