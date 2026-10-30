"""Check a 16-channel candidate MIDI file against the intended result.

The intended result comes from the 'unique' export (each part and articulation
on its own port and channel) and the group map in remap_score.py:
  - each source note goes to the channel of its group;
  - its program is the group program (articulation 0) or the program of its
    articulation channel (pizzicato, tremolo, mute, ...).

The script plays the candidate as a synth that ends every voice of a key on
note-off, and reports per channel:
  attacks    source attacks (distinct tick and key) / attacks found in candidate
  miss       source attacks with no note-on in the candidate
  extra      candidate note-ons that are not source attacks (duplicates)
  badprog    source notes whose note-on in the candidate has a different program
  lost_s     time in which a key should sound but does not (seconds)
  extra_s    time in which a key sounds but should not (seconds)
It also reports FF 21 events, channels used, and non-drum keys on channel 10.

With --programs part, the intended program of articulation 0 is the program
of the part itself (as in remap_midi.py --programs part).

Usage: python3 validate.py unique.mid score.mscz candidate.mid [...] [--programs part]
       [--groups FILE]
"""
import collections, os, sys
# Python -I does not put the folder of this script on sys.path. The imports below need it.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smfdump import parse
from remap_midi import score_parts
from remap_score import GROUPS

PART_MODE = '--programs' in sys.argv and sys.argv[sys.argv.index('--programs') + 1] == 'part'


def tempo_secs(tracks, div):
    tempos = sorted((e[0], int.from_bytes(e[3], 'big')) for t in tracks for e in t
                    if e[1] == 'meta' and e[2] == 0x51)
    def f(tick):
        s = 0.0; last = 0; us = 500000
        for tt, u in tempos:
            if tt >= tick:
                break
            s += (tt - last) * us / 1e6 / div; last = tt; us = u
        return s + (tick - last) * us / 1e6 / div
    return f


def union(intervals):
    out = []
    for a, b in sorted(intervals):
        if out and a <= out[-1][1]:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def minus(A, B):
    """Parts of interval list A that are not in interval list B (both unions)."""
    out = []; j = 0
    for a, b in A:
        cur = a
        while j < len(B) and B[j][1] <= cur:
            j += 1
        k = j
        while k < len(B) and B[k][0] < b:
            if B[k][0] > cur:
                out.append((cur, B[k][0]))
            cur = max(cur, B[k][1])
            k += 1
        if cur < b:
            out.append((cur, b))
    return out


def intended(unique_mid, mscz):
    parts = score_parts(mscz)
    _, div, tracks = parse(unique_mid)
    track_part = [pi for pi, p in enumerate(parts) for _ in range(p['staves'])]
    group_of = {pi: g for g in GROUPS for pi in g[3]}
    notes = collections.defaultdict(list)   # tc -> [(on, off, key, prog)]
    for ti, ev in enumerate(tracks):
        pi = track_part[ti]; part = parts[pi]; _, tc, gprog, _ = group_of[pi]
        open_ = collections.defaultdict(collections.deque)
        for e in ev:
            if e[1] != 'ch' or e[2] != 0x90:
                continue
            c, key, vel = e[3], e[4][0], e[4][1]
            k = 0 if part['drum'] else c
            if vel > 0:
                prog = gprog if (k == 0 and not PART_MODE) else part['programs'][k]
                open_[(c, key)].append((e[0], prog))
            elif open_[(c, key)]:
                on, prog = open_[(c, key)].popleft()
                notes[tc].append((on, e[0], key, prog))
    return notes, tracks, div


def candidate(path):
    _, div, tracks = parse(path)
    evs = []; ports = 0
    for ti, ev in enumerate(tracks):
        for n, e in enumerate(ev):
            if e[1] == 'meta' and e[2] == 0x21:
                ports += 1
            if e[1] == 'ch':
                evs.append((e[0], ti, n, e))
    evs.sort(key=lambda x: (x[0], x[1], x[2]))
    prog = {}; sounding = {}
    attacks = collections.defaultdict(list)       # (tc, tick, key) -> [programs]
    intervals = collections.defaultdict(list)     # (tc, key) -> [(a, b)]
    end = max((x[0] for x in evs), default=0)
    for tick, ti, n, e in evs:
        hi, ch, a = e[2], e[3], e[4]
        if hi == 0xc0:
            prog[ch] = a[0]
        elif hi == 0x90 and a[1] > 0:
            attacks[(ch, tick, a[0])].append(prog.get(ch))
            sounding.setdefault((ch, a[0]), tick)
        elif hi == 0x80 or (hi == 0x90 and a[1] == 0):
            st = sounding.pop((ch, a[0]), None)
            if st is not None and tick > st:
                intervals[(ch, a[0])].append((st, tick))
    for (ch, key), st in sounding.items():
        intervals[(ch, key)].append((st, end))
    return attacks, intervals, ports


def check(unique_mid, mscz, cand):
    want, src_tracks, div = intended(unique_mid, mscz)
    secs = tempo_secs(src_tracks, div)
    attacks, have_iv, ports = candidate(cand)
    print(f'## {cand}: FF 21 events {ports}, channels with notes {sorted({k[0] + 1 for k in attacks})}')
    drum_bad = sum(len(v) for (ch, t, key), v in attacks.items() if ch == 9 and key not in (54, 57, 81))
    tot = collections.Counter()
    for tc in sorted(set(want) | {k[0] for k in attacks}):
        src = want.get(tc, [])
        src_att = collections.defaultdict(list)
        for on, off, key, prog in src:
            src_att[(tc, on, key)].append(prog)
        cand_att = {k: v for k, v in attacks.items() if k[0] == tc}
        miss = sum(1 for k in src_att if k not in cand_att)
        extra = sum(len(v) for k, v in cand_att.items()) - sum(1 for k in cand_att if k in src_att)
        badprog = 0
        for k, progs in src_att.items():
            if k in cand_att:
                badprog += sum(1 for p in progs if p not in cand_att[k])
        lost = extra_s = 0.0
        keys = {key for _, _, key, _ in src} | {k[1] for k in have_iv if k[0] == tc}
        for key in keys:
            w = union([(on, off) for on, off, kk, _ in src if kk == key and off > on])
            h = union(have_iv.get((tc, key), []))
            lost += sum(secs(b) - secs(a) for a, b in minus(w, h))
            extra_s += sum(secs(b) - secs(a) for a, b in minus(h, w))
        print(f'  ch {tc + 1:2}: attacks {len(src_att):5}/{len(cand_att):5} miss {miss:4} extra {extra:5} '
              f'badprog {badprog:5} lost_s {lost:7.1f} extra_s {extra_s:7.1f}')
        for name, v in (('attacks', len(src_att)), ('miss', miss), ('extra', extra), ('badprog', badprog),
                        ('lost', lost), ('extra_s', extra_s)):
            tot[name] += v
    print(f'  TOTAL attacks {tot["attacks"]}, miss {tot["miss"]}, extra {tot["extra"]}, badprog {tot["badprog"]}, '
          f'lost_s {tot["lost"]:.1f}, extra_s {tot["extra_s"]:.1f}, non-drum keys on ch 10: {drum_bad}')


if __name__ == '__main__':
    for c in [a for a in sys.argv[3:] if a.endswith('.mid')]:
        check(sys.argv[1], sys.argv[2], c)
