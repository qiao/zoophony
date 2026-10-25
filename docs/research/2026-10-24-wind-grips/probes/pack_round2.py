# Packs the crop pairs of the second round into the research folder at half size, and the trial
# image of the mouse rest on the belly.
# Usage: pack_round2.py <repo>
import sys
from pathlib import Path

from PIL import Image

repo = Path(sys.argv[1])
val = repo / 'scratch' / 'val2'
out = repo / 'docs' / 'research' / '2026-10-24-wind-grips'
for old in list(out.glob('*-views-e*.webp')) + list(out.glob('*-paws-*.webp')) + list(out.glob('strips/*.webp')):
    old.unlink()
if (out / 'strips').exists():
    (out / 'strips').rmdir()
for animal, role in [('wolf', 'clarinetist'), ('mouse', 'oboist'), ('fox', 'flutist')]:
    name = 'fox-tan' if animal == 'fox' else animal
    for height in ['e20', 'e40']:
        for moment in ['note', 'rest', 'lift50', 'lower50']:
            src = val / f'{animal}-crops-{height}' / f'{role}-lineup-{moment}-crop2.png'
            im = Image.open(src).convert('RGB')
            im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
            im.save(out / f'{name}-paws-{moment}-{height}.webp', quality=72)
trial = Image.open(repo / 'scratch' / 'm8b' / 'oboist-views.png').convert('RGB')
trial.resize((trial.width // 2, trial.height // 2), Image.LANCZOS).save(
    out / 'mouse-rest-belly-trial.webp', quality=72)
