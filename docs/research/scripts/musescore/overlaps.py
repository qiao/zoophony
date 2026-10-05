"""Note facts per MIDI channel: duplicates, same-key overlaps, program at each note.

For each channel, the script merges all tracks in file order at equal ticks
(the order that most players use) and reports:
  notes        note-on events with velocity > 0
  dup_start    note-ons with the same tick and key as a note that already sounds
  overlap      note-ons on a key that already sounds on the channel
  cut          notes that end early in a synth that releases every voice of a
               key on note-off (FluidSynth-like). The script plays the merged
               stream and compares each real end with the written end.
  lost_s       the sum of the time that the cut notes lose, in seconds
  programs     program at note-on time -> note count

With --ports, the channel key is (port, channel). The port is the first FF 21
value in the track, for all events of the track. (MuseScore writes the FF 21
event after the setup events of the first channel, and all FF 21 values in one
track are equal.) Without it, the script ignores FF 21, as a
single-port player does.

Usage: python3 overlaps.py file.mid [--tracks] [--ports]
"""
import collections, sys
from smfdump import parse


USE_PORTS = '--ports' in sys.argv


def chan_key(port, ch):
    return (port, ch) if USE_PORTS else ch


def track_port(ev):
    for e in ev:
        if e[1] == 'meta' and e[2] == 0x21:
            return e[3][0]
    return None


def notes_by_channel(tracks):
    """Return {ch: [(on_tick, off_tick, key, track)]} with FIFO pairing per track."""
    out = collections.defaultdict(list)
    for ti, ev in enumerate(tracks):
        open_ = collections.defaultdict(collections.deque)
        port = track_port(ev)
        for e in ev:
            if e[1] != 'ch':
                continue
            hi, a = e[2], e[4]
            ch = chan_key(port, e[3])
            if hi == 0x90 and a[1] > 0:
                open_[(ch, a[0])].append(e[0])
            elif hi == 0x80 or (hi == 0x90 and a[1] == 0):
                q = open_[(ch, a[0])]
                if q:
                    out[ch].append((q.popleft(), e[0], a[0], ti))
        for (ch, key), q in open_.items():
            for t in q:
                out[ch].append((t, None, key, ti))
    return out


def merged_stream(tracks):
    """All channel events in player order: by tick, then track index, then file order."""
    evs = []
    for ti, ev in enumerate(tracks):
        port = track_port(ev)
        for n, e in enumerate(ev):
            if e[1] == 'ch':
                evs.append((e[0], ti, n, (e[0], 'ch', e[2], chan_key(port, e[3]), e[4])))
    evs.sort(key=lambda x: (x[0], x[1], x[2]))
    return evs


def program_at_notes(tracks):
    prog = {}
    count = collections.defaultdict(collections.Counter)
    pertrack = collections.defaultdict(collections.Counter)
    for tick, ti, n, e in merged_stream(tracks):
        hi, ch, a = e[2], e[3], e[4]
        if hi == 0xc0:
            prog[ch] = a[0]
        elif hi == 0x90 and a[1] > 0:
            count[ch][prog.get(ch)] += 1
            pertrack[(ti, ch)][prog.get(ch)] += 1
    return count, pertrack


def tempo_map(tracks):
    return sorted((e[0], int.from_bytes(e[3], 'big')) for t in tracks for e in t
                  if e[1] == 'meta' and e[2] == 0x51)


def to_secs(tick, tempos, div):
    s = 0.0; last = 0; us = 500000
    for tt, u in tempos:
        if tt >= tick:
            break
        s += (tt - last) * us / 1e6 / div; last = tt; us = u
    return s + (tick - last) * us / 1e6 / div


def simulate_cuts(tracks, div):
    """Play the merged stream. Return {ch: (cut_count, lost_seconds)}."""
    tempos = tempo_map(tracks)
    # written end of each note-on, by (track, event index)
    written_end = {}
    for ti, ev in enumerate(tracks):
        open_ = collections.defaultdict(collections.deque)
        for n, e in enumerate(ev):
            if e[1] != 'ch':
                continue
            hi, ch, a = e[2], e[3], e[4]
            if hi == 0x90 and a[1] > 0:
                open_[(ch, a[0])].append((ti, n))
            elif hi == 0x80 or (hi == 0x90 and a[1] == 0):
                q = open_[(ch, a[0])]
                if q:
                    written_end[q.popleft()] = e[0]
    active = collections.defaultdict(list)
    res = collections.defaultdict(lambda: [0, 0.0])
    for tick, ti, n, e in merged_stream(tracks):
        hi, ch, a = e[2], e[3], e[4]
        if hi == 0x90 and a[1] > 0:
            active[(ch, a[0])].append(written_end.get((ti, n)))
        elif hi == 0x80 or (hi == 0x90 and a[1] == 0):
            for end in active.pop((ch, a[0]), []):
                if end is not None and end > tick:
                    res[ch][0] += 1
                    res[ch][1] += to_secs(end, tempos, div) - to_secs(tick, tempos, div)
    return res


def analyze(path, show_tracks=False):
    fmt, div, tracks = parse(path)
    byc = notes_by_channel(tracks)
    progs, pertrack = program_at_notes(tracks)
    cuts = simulate_cuts(tracks, div)
    print(f'## {path}')
    tot = collections.Counter()
    for ch in sorted(byc):
        ns = sorted(byc[ch], key=lambda x: (x[0], x[1] if x[1] is not None else 1 << 60, x[2], x[3]))
        dup = overl = cut = 0
        bykey = collections.defaultdict(list)
        for n in ns:
            bykey[n[2]].append(n)
        for key, lst in bykey.items():
            lst.sort(key=lambda x: (x[0], x[1] if x[1] is not None else 1 << 60, x[3]))
            for i, (on, off, _, ti) in enumerate(lst):
                for (on2, off2, _, ti2) in lst[:i]:
                    if off2 is None or off2 > on:
                        overl += 1
                        if on2 == on:
                            dup += 1
                        break
        cut, lost = cuts.get(ch, (0, 0.0))
        tot['notes'] += len(ns); tot['dup'] += dup; tot['overlap'] += overl; tot['cut'] += cut; tot['lost'] += lost
        pr = ', '.join(f'{p}:{c}' for p, c in progs[ch].most_common())
        label = f'{ch[0]}/{ch[1] + 1:2}' if USE_PORTS else f'{ch + 1:2}'
        print(f'  ch {label}: notes {len(ns):5} dup_start {dup:4} overlap {overl:4} cut {cut:4} lost_s {lost:6.1f}  program@note {{{pr}}}')
    print(f'  TOTAL notes {tot["notes"]}, dup_start {tot["dup"]}, overlap {tot["overlap"]}, cut {tot["cut"]}, lost_s {tot["lost"]:.1f}')
    if show_tracks:
        for (ti, ch), c in sorted(pertrack.items()):
            print(f'    track {ti:2} ch {ch}: {dict(c)}')


if __name__ == '__main__':
    for p in sys.argv[1:]:
        if not p.startswith('--'):
            analyze(p, '--tracks' in sys.argv)
