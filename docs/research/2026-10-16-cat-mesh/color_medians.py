"""Prints the median sRGB color, the Oklab lightness, and the Oklab hue and chroma of the gray fur
and of the cream belly in the front view of the sheet and in a front render of the app gallery
(the standing cat in the rest pose). The boxes are in sheet-boxes.png and app-boxes.png."""
import sys
import numpy as np
from PIL import Image

SHEET = sys.argv[1]
APP = sys.argv[2]

def oklab(rgb):
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]])
    lms = np.cbrt(lin @ m1.T)
    m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                   [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]])
    return lms @ m2.T

def report(name, image, boxes):
    im = np.asarray(Image.open(image).convert('RGB'), dtype=float)
    px = np.concatenate([im[b[1]:b[3], b[0]:b[2]].reshape(-1, 3) for b in boxes])
    med = np.median(px, axis=0)
    lab = oklab(med)
    hue = np.degrees(np.arctan2(lab[2], lab[1])) % 360
    chroma = np.hypot(lab[1], lab[2])
    print(f'{name}: {len(px)} px, median sRGB {med.astype(int).tolist()} '
          f'#{int(med[0]):02x}{int(med[1]):02x}{int(med[2]):02x}, Oklab L {lab[0]:.3f}, '
          f'a {lab[1]:+.4f}, b {lab[2]:+.4f}, chroma {chroma:.4f}, hue {hue:.0f} deg')

# The sheet front view, crop (0, 180, 420, 840) of cat-sheet.png: boxes in the crop, moved back.
def sheet_boxes(boxes):
    return [(x0, y0 + 180, x1, y1 + 180) for x0, y0, x1, y1 in boxes]

report('sheet fur', SHEET, sheet_boxes([(125, 250, 160, 330), (250, 250, 285, 330),
                                         (140, 430, 175, 520), (240, 430, 275, 520)]))
report('sheet belly', SHEET, sheet_boxes([(180, 270, 240, 360)]))
report('app fur', APP, [(255, 230, 272, 290), (330, 230, 347, 290), (255, 400, 275, 450),
                         (325, 400, 345, 450)])
report('app belly', APP, [(285, 260, 315, 330)])
