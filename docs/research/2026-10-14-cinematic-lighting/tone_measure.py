from PIL import Image

# The luma percentiles and the median saturation of the stage area of the snapshot and of the
# reference (docs/research/2026-10-14-cinematic-lighting.md, section 1). The stage area is the
# middle band: 45% to 85% of the height, 20% to 80% of the width, at a quarter of the size.
# Run from the root of the repository: python3 docs/research/2026-10-14-cinematic-lighting/tone_measure.py

IMAGES = [
    ('current', 'docs/snapshots/2026-10-14-55f27953/play-1440x900.webp'),
    ('reference', 'docs/reference/orchestra-latest.png'),
]


def percentile(values, q):
    ordered = sorted(values)
    return ordered[int(q * (len(ordered) - 1))]


for name, path in IMAGES:
    image = Image.open(path).convert('RGB')
    width, height = image.size
    image = image.resize((width // 4, height // 4))
    width, height = image.size
    pixels = image.load()
    lumas = []
    saturations = []
    for y in range(int(height * 0.45), int(height * 0.85)):
        for x in range(int(width * 0.2), int(width * 0.8)):
            r, g, b = pixels[x, y]
            lumas.append(0.2126 * r + 0.7152 * g + 0.0722 * b)
            top = max(r, g, b)
            saturations.append((top - min(r, g, b)) / (top + 1e-3))
    print(
        name,
        'stage luma p5/p25/p50/p75/p95:',
        [round(percentile(lumas, q)) for q in (0.05, 0.25, 0.5, 0.75, 0.95)],
        'median saturation %.2f' % percentile(saturations, 0.5),
    )
