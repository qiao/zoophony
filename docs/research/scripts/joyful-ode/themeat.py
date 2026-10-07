"""Print the first time of the "Freude" head (0 +1 +2 0 -2 -1 -2) in the top line of any channel,
the time of the first note, and the length of the file.

Usage: python3 -I run.py themeat.py file.mid...
"""
import sys
from smfdump import parse

HEAD = [0, 1, 2, 0, -2, -1, -2]

for path in sys.argv[1:]:
    fmt, div, tracks = parse(path)
    tempos = sorted((e[0], int.from_bytes(bytes(e[3]), 'big')) for tr in tracks for e in tr
                    if e[1] == 'meta' and e[2] == 0x51)

    def seconds(tick):
        sec, last_tick, us = 0.0, 0, 500000
        for t, u in tempos:
            if t >= tick:
                break
            sec += (t - last_tick) * us / div / 1e6
            last_tick, us = t, u
        return sec + (tick - last_tick) * us / div / 1e6

    top = {}
    last = 0
    for tr in tracks:
        for e in tr:
            if e[1] == 'ch' and e[2] in (0x80, 0x90):
                last = max(last, e[0])
            if e[1] == 'ch' and e[2] == 0x90 and e[4][1] > 0 and e[3] != 9:
                d = top.setdefault(e[3], {})
                d[e[0]] = max(d.get(e[0], 0), e[4][0])
    first_note = min(t for d in top.values() for t in d)
    hits = []
    for c, d in top.items():
        seq = sorted(d.items())
        for i in range(len(seq) - len(HEAD)):
            keys = [seq[i + j][1] for j in range(len(HEAD) + 1)]
            if [keys[j + 1] - keys[j] for j in range(len(HEAD))] == HEAD:
                hits.append((seq[i][0], c))
                break
    hits.sort()
    head = f'{seconds(hits[0][0]):.1f} s (channel {hits[0][1] + 1})' if hits else 'none'
    print(f'{path.split("/")[-1]}: first note {seconds(first_note):.1f} s, first theme head {head}, '
          f'last event {seconds(last):.1f} s')
