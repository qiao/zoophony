"""Print the structure of a format 1 MIDI file of remap_midi.py.

Usage: python3 -I run.py structure.py file.mid measures.txt [--bars A B]
measures.txt is the output of ../cheerful-demos/measures.py with --all.
Prints, for each bar: start second, the channels that play, the note count, the mean
velocity, and the theme incipits (the "Freude" head: 0 +1 +2 0 -2 -1 -2) of each channel.
"""
import ast, sys
from smfdump import parse

NAMES = {0: 'Fl', 1: 'Ob', 2: 'Cl', 3: 'Bsn', 4: 'Hn', 5: 'Tpt', 6: 'Trb', 7: 'Timp',
         8: 'Solo', 9: 'Perc', 10: 'Choir', 11: 'Vn1', 12: 'Vn2', 13: 'Va', 14: 'Vc', 15: 'Cb'}
HEAD = [0, 1, 2, 0, -2, -1, -2]

path, mpath = sys.argv[1], sys.argv[2]
fmt, div, tracks = parse(path)
tempos = sorted((e[0], int.from_bytes(bytes(e[3]), 'big')) for e in tracks[0]
                if e[1] == 'meta' and e[2] == 0x51)


def seconds(tick):
    sec, last_tick, us = 0.0, 0, 500000
    for t, u in tempos:
        if t >= tick:
            break
        sec += (t - last_tick) * us / div / 1e6
        last_tick, us = t, u
    return sec + (tick - last_tick) * us / div / 1e6


notes = []  # (tick, channel, key, velocity)
for tr in tracks:
    for e in tr:
        if e[1] == 'ch' and e[2] == 0x90 and e[4][1] > 0:
            notes.append((e[0], e[3], e[4][0], e[4][1]))
notes.sort()

bars = []
for line in open(mpath):
    if line.startswith('('):
        r = ast.literal_eval(line)
        bars.append((r[0], r[1]))

# The top line of each channel: the highest key at each onset tick.
top = {}
for t, c, k, v in notes:
    d = top.setdefault(c, {})
    d[t] = max(d.get(t, 0), k)
theme_at = {}
for c, d in top.items():
    seq = sorted(d.items())
    for i in range(len(seq) - len(HEAD)):
        keys = [seq[i + j][1] for j in range(len(HEAD) + 1)]
        if [keys[j + 1] - keys[j] for j in range(len(HEAD))] == HEAD:
            theme_at.setdefault(seq[i][0], []).append(f'{NAMES[c]}:{keys[0]}')

only = None
if '--bars' in sys.argv:
    i = sys.argv.index('--bars')
    only = (int(sys.argv[i + 1]), int(sys.argv[i + 2]))
for n, (m, tick) in enumerate(bars):
    if only and not (only[0] <= m <= only[1]):
        continue
    end = bars[n + 1][1] if n + 1 < len(bars) else 10**9
    inside = [x for x in notes if tick <= x[0] < end]
    chans = sorted({x[1] for x in inside})
    vel = sum(x[3] for x in inside) / len(inside) if inside else 0
    themes = [f'{s}@{seconds(t):.1f}' for t, s0 in theme_at.items() if tick <= t < end for s in s0]
    print(f'{m:4d} {tick:8d} {seconds(tick):8.2f}s n={len(inside):4d} v={vel:5.1f} '
          f'{" ".join(NAMES[c] for c in chans)}  {" ".join(themes)}')
print('tempos', [(t, round(60e6 / u, 2)) for t, u in tempos])
