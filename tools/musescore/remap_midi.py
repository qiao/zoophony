"""Move the tracks of a MuseScore MIDI export to 16 channels (post-processing).

Input: a MIDI file that MuseScore exported from a score with the 'unique'
layout of remap_score.py (each part on its own port, articulation k on MIDI
channel k, drums on channel 10). Thus (track, channel) gives (part,
articulation) with no ambiguity. Track i is staff i of the score.

Output: SMF format 1 with no FF 21 port events and no FF 05 lyric events.
  track 0      conductor: tempo, time signatures, key signature, markers
  tracks 1-16  one track for each MIDI channel that the group map uses

For each channel, the script writes the events in a fixed order at each tick:
note-offs, then controllers, then for each note-on a program change (only if
the program must change) followed by the note-on. The script first pairs
each note-on with its note-off in the same source (track, channel, key) and
drops zero-length notes (MuseScore restrikes). A note-off goes out only
when the last sounding note on that key ends (reference count), so one part
cannot cut a note of another part. When a later note-on of another part comes
while the key sounds, the script writes a note-off just before it (a
retrigger). Thus each note-on has exactly one note-off, and a player that
pairs them first in, first out holds no note to the end of the file. A
source note-off with no open note in its
own (track, channel, key) is dropped (MuseScore writes restrike note-offs on
every articulation channel of a part). A second note-on with the same key at the
same tick is dropped (unison).

Program modes:
  group  one program for each group (GROUPS in remap_score.py). Articulation
         channels keep their own program (pizzicato 45, contrabass pizz 32,
         tremolo 44, mute 59, ...), so an articulation switch becomes a
         program change on the shared channel.
  part   each part keeps its own program (piccolo 72 on the flute channel,
         English horn 69 on the oboe channel, and so on).

CC 2 (MuseScore single-note dynamics) is dropped unless --keep-cc2 is given,
because CC 2 values from different parts on one channel conflict. The note-on
velocity still holds the dynamic level.

Usage: python3 -I remap_midi.py in.mid score.mscz out.mid [--programs group|part] [--keep-cc2]
       [--groups FILE]
"""
import collections, os, struct, sys, zipfile
import xml.etree.ElementTree as ET
# Python -I does not put the folder of this script on sys.path. The imports below need it.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smfdump import parse
from remap_score import GROUPS, positional


def score_parts(mscz):
    z = zipfile.ZipFile(mscz)
    name = [n for n in z.namelist() if n.endswith('.mscx') and '/' not in n][0]
    score = ET.fromstring(z.read(name)).find('Score')
    parts = []
    for p in score.findall('Part'):
        inst = p.find('Instrument')
        parts.append({
            'staves': len(p.findall('Staff')),
            'drum': inst.findtext('useDrumset') == '1',
            'programs': [int(c.find('program').get('value')) for c in inst.findall('Channel')],
            'names': [c.get('name') or 'normal' for c in inst.findall('Channel')],
            'short': inst.findtext('shortName'),
        })
    return parts


def vlq(n):
    out = [n & 0x7f]
    n >>= 7
    while n:
        out.append(0x80 | (n & 0x7f)); n >>= 7
    return bytes(reversed(out))


def track_bytes(events):
    """events: list of (tick, raw bytes) in final order."""
    out = bytearray(); last = 0
    for tick, raw in events:
        out += vlq(tick - last) + raw; last = tick
    end = events[-1][0] if events else 0
    out += vlq(0) + b'\xff\x2f\x00'
    return b'MTrk' + struct.pack('>I', len(out)) + bytes(out)


def meta(typ, data):
    return bytes([0xff, typ]) + vlq(len(data)) + data


def main(src, mscz, dst, mode='group', keep_cc2=False):
    parts = score_parts(mscz)
    fmt, div, tracks = parse(src)
    track_part = [pi for pi, p in enumerate(parts) for _ in range(p['staves'])]
    assert len(track_part) == len(tracks), (len(track_part), len(tracks))
    group_of = {pi: g for g in GROUPS for pi in g[3]}

    conductor = []          # (tick, order, raw)
    per_chan = collections.defaultdict(list)   # tc -> list of (tick, kind, order, data)
    init = {}               # tc -> {cc: value} from the first part of the group
    stats = collections.Counter()
    src_open = collections.defaultdict(collections.deque)  # (track, ch, key) -> open notes
    for ti, ev in enumerate(tracks):
        pi = track_part[ti]; part = parts[pi]
        gname, tc, gprog, gparts = group_of[pi]
        for n, e in enumerate(ev):
            if e[1] == 'meta':
                typ = e[2]
                if ti == 0 and typ in (0x51, 0x58, 0x59, 0x06):
                    conductor.append((e[0], n, meta(typ, bytes(e[3]))))
                elif typ == 0x21:
                    stats['dropped FF 21'] += 1
                elif typ == 0x05:
                    stats['dropped FF 05 lyric'] += 1
                continue
            if e[1] != 'ch':
                continue
            hi, c, a = e[2], e[3], e[4]
            k = 0 if part['drum'] else c
            assert (c == 9) == part['drum'] and k < len(part['programs']), (ti, c)
            if hi == 0xc0:
                stats['dropped source PC'] += 1
                continue
            if hi == 0x90:
                # Pair each note-on with the next note-off of the same source
                # (track, channel, key) in file order. The output is built from
                # these intervals, so a note-off can only end its own note.
                src_key = (ti, c, a[0])
                if a[1] > 0:
                    if mode == 'part' or k > 0:
                        prog = part['programs'][k]
                    else:
                        prog = gprog
                    src_open[src_key].append((e[0], n, a[1], prog))
                elif src_open[src_key]:
                    on, on_n, vel, prog = src_open[src_key].popleft()
                    if e[0] > on:
                        per_chan[tc].append((on, 'on', (ti, on_n), (a[0], vel, prog)))
                        per_chan[tc].append((e[0], 'off', (ti, n), (a[0],)))
                    else:
                        # MuseScore restrike: on, off, on at one tick when two
                        # voices play one key. The second note-on holds the sound.
                        stats['dropped zero-length note'] += 1
                else:
                    # MuseScore writes a restrike note-off on every articulation
                    # channel of the part. With no open note it has no use, and
                    # on a shared channel it would stop notes of other parts.
                    stats['dropped unmatched note-off'] += 1
                continue
            if hi == 0xb0:
                cc, v = a[0], a[1]
                if e[0] == 0 and cc in (7, 10, 91, 93):
                    if k == 0 and pi == gparts[0]:
                        init.setdefault(tc, {})[cc] = v
                    continue
                if cc in (121, 100, 101, 6):
                    continue        # reset and pitch bend range: no pitch bends in this file
                if cc == 2 and not keep_cc2:
                    stats['dropped CC 2'] += 1
                    continue
                per_chan[tc].append((e[0], 'cc', (ti, n), (cc, v)))
                continue
            per_chan[tc].append((e[0], 'other', (ti, n), (hi, bytes(a))))
        last_tick = max((e[0] for e in ev), default=0)
        for (sti, c, key), q in list(src_open.items()):
            if sti != ti:
                continue
            while q:
                on, on_n, vel, prog = q.popleft()
                stats['closed open note at track end'] += 1
                per_chan[tc].append((on, 'on', (ti, on_n), (key, vel, prog)))
                per_chan[tc].append((max(last_tick, on + 1), 'off', (ti, 1 << 30), (key,)))

    out_tracks = []
    cond = sorted(conductor, key=lambda x: (x[0], x[1]))
    title = meta(0x03, b'Conductor')
    out_tracks.append(track_bytes([(0, title)] + [(t, raw) for t, _, raw in cond]))
    order = {'off': 0, 'cc': 1, 'other': 1, 'on': 2}
    channel_report = []
    for tc in sorted(per_chan):
        gname = [g[0] for g in GROUPS if g[1] == tc][0]
        evs = sorted(per_chan[tc], key=lambda x: (x[0], order[x[1]], x[3][2] if x[1] == 'on' else 0, x[2]))
        out = [(0, meta(0x03, gname.encode()))]
        for cc, v in sorted(init.get(tc, {7: 100, 10: 64}).items()):
            out.append((0, bytes([0xb0 | tc, cc, v])))
        cur_prog = None; count = collections.Counter(); started_at = {}
        pcs = 0; notes_in = notes_out = unison = retriggers = 0
        for tick, kind, _, d in evs:
            if kind == 'on':
                key, vel, prog = d
                notes_in += 1
                count[key] += 1
                if started_at.get(key) == tick and count[key] > 1:
                    unison += 1
                    continue
                if count[key] > 1:
                    # The key already sounds from an earlier note of another part.
                    # End that sound first, so that each note-on has exactly one
                    # note-off. A player pairs note-offs first in, first out, so a
                    # second note-on without this note-off would sound to the end.
                    out.append((tick, bytes([0x90 | tc, key, 0])))
                    retriggers += 1
                if tc != 9 and prog != cur_prog or (tc == 9 and cur_prog is None):
                    out.append((tick, bytes([0xc0 | tc, prog]))); cur_prog = prog; pcs += 1
                out.append((tick, bytes([0x90 | tc, key, vel]))); notes_out += 1
                started_at[key] = tick
            elif kind == 'off':
                key = d[0]
                if count[key] == 0:
                    continue
                count[key] -= 1
                if count[key] == 0:
                    out.append((tick, bytes([0x90 | tc, key, 0])))
            elif kind == 'cc':
                out.append((tick, bytes([0xb0 | tc, d[0], d[1]])))
            else:
                hi, data = d
                out.append((tick, bytes([hi | tc]) + data))
        out_tracks.append(track_bytes(out))
        channel_report.append((tc + 1, gname, notes_in, notes_out, unison, pcs, retriggers))
    with open(dst, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 1, len(out_tracks), div))
        for t in out_tracks:
            f.write(t)
    print(f'wrote {dst}: {len(out_tracks)} tracks, mode {mode}')
    for k, v in stats.items():
        print(f'  {k}: {v}')
    for r in channel_report:
        print(f'  ch {r[0]:2} {r[1]:11} notes in {r[2]:5} out {r[3]:5} unison dropped {r[4]:4} '
              f'program changes {r[5]:4} retriggers {r[6]:4}')


if __name__ == '__main__':
    args = positional(sys.argv[1:])
    mode = 'group'
    if '--programs' in sys.argv:
        mode = sys.argv[sys.argv.index('--programs') + 1]
    main(*args[:3], mode=mode, keep_cc2='--keep-cc2' in sys.argv)
