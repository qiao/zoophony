"""Compare two SMF files track by track.

Prints, per track, the events that only one file has. Use --ignore-lyrics to
remove FF 05 events from file A before the compare.

Usage: python3 midicmp.py a.mid b.mid [--ignore-lyrics]
"""
import collections, sys
from smfdump import parse, META


def key(e):
    if e[1] == 'meta':
        return (e[0], 'meta', META.get(e[2], hex(e[2])), bytes(e[3]))
    if e[1] == 'sysex':
        return (e[0], 'sysex', bytes(e[2]))
    return (e[0], 'ch', e[2], e[3], bytes(e[4]))


def main(a, b, ignore_lyrics):
    _, da, ta = parse(a)
    _, db, tb = parse(b)
    print(f'A {a}: {len(ta)} tracks, div {da}; B {b}: {len(tb)} tracks, div {db}')
    total_a = total_b = 0
    for i in range(max(len(ta), len(tb))):
        ea = [key(e) for e in (ta[i] if i < len(ta) else [])]
        eb = [key(e) for e in (tb[i] if i < len(tb) else [])]
        if ignore_lyrics:
            ea = [e for e in ea if not (e[1] == 'meta' and e[2] == 'lyric')]
        ca, cb = collections.Counter(ea), collections.Counter(eb)
        only_a, only_b = ca - cb, cb - ca
        total_a += sum(only_a.values()); total_b += sum(only_b.values())
        if only_a or only_b:
            print(f'  track {i}: only in A {sum(only_a.values())}, only in B {sum(only_b.values())}')
            for e in list(only_a)[:5]:
                print('     A:', e)
            for e in list(only_b)[:5]:
                print('     B:', e)
        elif ea != eb:
            print(f'  track {i}: same events, different order')
    print(f'events only in A: {total_a}, only in B: {total_b}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], '--ignore-lyrics' in sys.argv)
