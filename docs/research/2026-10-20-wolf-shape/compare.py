"""Puts the lineup grid and the play grid of close-views side by side in one compare image, the
base above the round in each grid.

    uv run --no-project --with pillow python -I compare.py <lineup-base-views.png> <play-base-views.png> <out.webp>
"""
import sys

from PIL import Image

lineup, play = (Image.open(p).convert('RGB') for p in sys.argv[1:3])
h = play.height
lineup = lineup.resize((round(lineup.width * h / lineup.height), h), Image.LANCZOS)
out = Image.new('RGB', (lineup.width + play.width, h))
out.paste(lineup, (0, 0))
out.paste(play, (lineup.width, 0))
out.save(sys.argv[3], quality=82)
