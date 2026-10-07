"""Print the pitch classes of the notes that start in the last N ticks of a MIDI file.

Usage: python3 -I run.py lastchord.py file.mid [ticks]
"""
import sys
from collections import Counter
from smfdump import parse

NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
fmt, div, tracks = parse(sys.argv[1])
span = int(sys.argv[2]) if len(sys.argv) > 2 else div * 2
ons = [(e[0], e[3], e[4][0]) for tr in tracks for e in tr
       if e[1] == 'ch' and e[2] == 0x90 and e[4][1] > 0]
last = max(t for t, c, k in ons)
pcs = Counter(NAMES[k % 12] for t, c, k in ons if t >= last - span and c != 9)
print('last onset tick', last, 'pitch classes', pcs.most_common())
# The notes that sound at the last note-off tick minus one.
events = sorted((e[0], e[2] == 0x90 and e[4][1] > 0, e[3], e[4][0]) for tr in tracks for e in tr
                if e[1] == 'ch' and e[2] in (0x80, 0x90))
end = max(t for t, on, c, k in events)
open_ = Counter()
for t, on, c, k in events:
    if t >= end:
        break
    if on:
        open_[(c, k)] += 1
    elif open_[(c, k)] > 0:
        open_[(c, k)] -= 1
held = Counter(NAMES[k % 12] for (c, k), n in open_.items() if n > 0 and c != 9)
print('end tick', end, 'held at the end', held.most_common())

