"""Cut tick ranges out of a format 1 MIDI file of remap_midi.py (an excerpt).

The result starts at tick 0 with the state at the start tick: the last tempo,
time signature, and key signature of track 0, and on each channel the last
program change, controller values, and pitch bend. A note that starts in the
range stays. If it sounds past the end tick, its note-off moves to the end
tick. A note that starts before the range is dropped, and so is its note-off.
Each note-on pairs with the next note-off of its channel and key, first in,
first out, as in remap_midi.py. A channel track with no note in the range is
removed.

With more than one range, the ranges follow each other in the given order.
Each later range starts with its own state at the join tick, after the
note-offs at the end of the range before it. A channel track stays if it has
a note in one of the ranges.

Usage: python3 -I cut_midi.py in.mid out.mid START_TICK END_TICK [START_TICK END_TICK ...]
"""
import os, struct, sys
# Python -I does not put the folder of this script on sys.path. The imports below need it.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smfdump import parse
from remap_midi import meta, track_bytes

KEEP_META = (0x51, 0x58, 0x59)


def cut_track(events, start, end, conductor):
    """Give the track names, and the events in the range with the state at the start tick first."""
    names = []
    rest = []
    state_meta = {}
    state_ch = {}            # (kind, channel[, controller]) -> raw bytes, in the order of first use
    open_notes = {}          # (channel, key) -> note-on ticks in the range, None before it
    dropped = clipped = 0
    for e in events:
        tick = e[0]
        if e[1] == 'meta':
            typ = e[2]
            if tick == 0 and typ == 0x03:
                names.append((0, meta(typ, bytes(e[3]))))
            elif typ in KEEP_META and tick <= start:
                state_meta[typ] = meta(typ, bytes(e[3]))
            elif (typ in KEEP_META or (typ == 0x06 and conductor)) and start < tick < end:
                rest.append((tick - start, meta(typ, bytes(e[3]))))
            continue
        if e[1] != 'ch':
            continue
        hi, c, data = e[2], e[3], e[4]
        raw = bytes([hi | c]) + data
        if hi == 0x90 and data[1] > 0:
            inside = start <= tick < end
            open_notes.setdefault((c, data[0]), []).append(tick if inside else None)
            if inside:
                rest.append((tick - start, raw))
            elif tick < start:
                dropped += 1
            continue
        if hi == 0x80 or hi == 0x90:
            queue = open_notes.get((c, data[0]))
            on = queue.pop(0) if queue else None
            if on is None:
                continue
            if tick > end:
                clipped += 1
                tick = end
            rest.append((tick - start, bytes([0x90 | c, data[0], 0])))
            continue
        if tick <= start:
            state_ch[('cc', c, data[0]) if hi == 0xb0 else (hi, c)] = raw
        elif tick < end:
            rest.append((tick - start, raw))
    head = [(0, raw) for raw in state_meta.values()] + [(0, raw) for raw in state_ch.values()]
    # A stable sort keeps the file order of the events at one tick.
    rest.sort(key=lambda ev: ev[0])
    has_notes = any(raw[0] & 0xf0 == 0x90 and raw[2] > 0 for _, raw in rest if raw[0] < 0xf0)
    return names, head + rest, has_notes, dropped, clipped


def main(src, dst, *ticks):
    ticks = [int(t) for t in ticks]
    ranges = list(zip(ticks[0::2], ticks[1::2]))
    fmt, div, tracks = parse(src)
    assert fmt == 1 and ranges and len(ticks) % 2 == 0, (fmt, ticks)
    assert all(0 <= start < end for start, end in ranges), ranges
    out_tracks = []
    for i, events in enumerate(tracks):
        evs = []
        any_notes = False
        offset = 0
        counts = []
        for n, (start, end) in enumerate(ranges):
            names, body, has_notes, dropped, clipped = cut_track(events, start, end, i == 0)
            if n == 0:
                evs += names
            # The events of a range end at or before its end tick, so the list stays in order.
            evs += [(tick + offset, raw) for tick, raw in body]
            any_notes = any_notes or has_notes
            offset += end - start
            counts.append(f'{dropped} notes before the range, {clipped} notes cut at the end')
        if i > 0 and not any_notes:
            print(f'  track {i}: no note in the range, removed')
            continue
        print(f'  track {i}: {len(evs)} events, {"; ".join(counts)}')
        out_tracks.append(track_bytes(evs))
    with open(dst, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 1, len(out_tracks), div))
        for t in out_tracks:
            f.write(t)
    spans = ', '.join(f'{start} to {end}' for start, end in ranges)
    print(f'wrote {dst}: {len(out_tracks)} tracks, ticks {spans}')


if __name__ == '__main__':
    main(*sys.argv[1:])
