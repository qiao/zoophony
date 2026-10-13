# Prints the pixel differences of frozen frames (the report 2026-10-13-frame-time.md, section 10.4).
# Run: python3 docs/research/2026-10-13-frame-time/pixel-diff.py <base dir> <dir>...
# The folders hold the PNG files of frozen.ts. Needs Pillow.
import sys
from PIL import Image, ImageChops, ImageStat
base = sys.argv[1]
for d in sys.argv[2:]:
    parts = []
    for shot in ['play', 'conductor', 'perf-wide']:
        a = Image.open(f'{base}/{shot}.png').convert('RGB')
        b = Image.open(f'{d}/{shot}.png').convert('RGB')
        diff = ImageChops.difference(a, b)
        mean = sum(ImageStat.Stat(diff).mean) / 3
        largest = max(hi for lo, hi in diff.getextrema())
        gray = diff.convert('L').point(lambda v: 255 if v > 16 else 0)
        share = ImageStat.Stat(gray).mean[0] / 255 * 100
        parts.append(f'{shot} mean {mean:.2f} max {largest} >16: {share:.1f}%')
    print(f"{d.split('/')[-1]}: " + ' | '.join(parts))
