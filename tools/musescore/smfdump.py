"""Detailed SMF dump: per-track port, channels, programs, meta types, notes.

Usage: python3 -I smfdump.py file.mid [--events TRACK] [--meta]
"""
import struct, sys, collections

META = {0x00: 'seqnum', 0x01: 'text', 0x02: 'copyright', 0x03: 'trackname',
        0x04: 'instname', 0x05: 'lyric', 0x06: 'marker', 0x07: 'cue',
        0x20: 'chanprefix', 0x21: 'port', 0x2f: 'eot', 0x51: 'tempo',
        0x54: 'smpte', 0x58: 'timesig', 0x59: 'keysig', 0x7f: 'seqspec'}


def vlq(d, i):
    v = 0
    while True:
        b = d[i]; i += 1
        v = (v << 7) | (b & 0x7f)
        if not b & 0x80:
            return v, i


def parse(path):
    """Return (fmt, div, tracks). Each track is a list of events.

    Event tuples: (tick, 'meta', type, bytes) | (tick, 'sysex', bytes)
                  (tick, 'ch', status_hi, channel, data_bytes)
    """
    d = open(path, 'rb').read()
    assert d[:4] == b'MThd'
    hl, fmt, ntrk, div = struct.unpack('>IHHH', d[4:14])
    i = 8 + hl
    tracks = []
    for _ in range(ntrk):
        assert d[i:i + 4] == b'MTrk'
        ln = struct.unpack('>I', d[i + 4:i + 8])[0]
        j = i + 8; end = j + ln; tick = 0; rs = None; ev = []
        while j < end:
            dt, j = vlq(d, j); tick += dt
            st = d[j]
            if st == 0xff:
                typ = d[j + 1]; l, k = vlq(d, j + 2)
                ev.append((tick, 'meta', typ, d[k:k + l])); j = k + l
                if typ == 0x2f:
                    break
                continue
            if st in (0xf0, 0xf7):
                l, k = vlq(d, j + 1); ev.append((tick, 'sysex', d[k:k + l])); j = k + l
                continue
            if st & 0x80:
                rs = st; j += 1
            else:
                st = rs
            hi = st & 0xf0; ch = st & 0x0f
            n = 1 if hi in (0xc0, 0xd0) else 2
            ev.append((tick, 'ch', hi, ch, bytes(d[j:j + n]))); j += n
        tracks.append(ev)
        i = end
    return fmt, div, tracks


def summarize(path):
    fmt, div, tracks = parse(path)
    print(f'## {path}: format {fmt}, {len(tracks)} tracks, division {div}')
    allmeta = collections.Counter()
    for ti, ev in enumerate(tracks):
        name = None; ports = []; metas = collections.Counter(); chans = collections.Counter()
        progs = []; ccs = collections.Counter(); notes = 0; texts = []
        for e in ev:
            if e[1] == 'meta':
                typ = e[2]; metas[META.get(typ, hex(typ))] += 1; allmeta[META.get(typ, hex(typ))] += 1
                if typ == 0x03 and name is None:
                    name = e[3].decode('latin1')
                if typ == 0x21:
                    ports.append(e[3][0])
                if typ in (0x01, 0x05, 0x06, 0x07):
                    texts.append((e[0], META[typ], e[3].decode('utf-8', 'replace')))
            elif e[1] == 'ch':
                hi, ch, a = e[2], e[3], e[4]
                if hi == 0x90 and a[1] > 0:
                    notes += 1; chans[ch + 1] += 1
                elif hi == 0xc0:
                    progs.append((e[0], ch + 1, a[0]))
                elif hi == 0xb0:
                    ccs[a[0]] += 1
        # collapse program list: distinct (ch, prog) in order + count of PCs
        seen = []
        for _, c, p in progs:
            if (c, p) not in seen:
                seen.append((c, p))
        print(f'  T{ti:02d} {name!r:22} port={ports} notes={notes:5} ch={dict(chans)} '
              f'PCs={len(progs)} distinct={seen} metas={dict(metas)} cc={dict(sorted(ccs.items()))}')
        if '--meta' in sys.argv and texts:
            for t in texts[:20]:
                print('      ', t)
            if len(texts) > 20:
                print(f'       ... {len(texts) - 20} more')
    print('  all meta types:', dict(allmeta))


def events(path, track):
    fmt, div, tracks = parse(path)
    for e in tracks[track]:
        if e[1] == 'ch':
            print(e[0], hex(e[2]), 'ch', e[3] + 1, list(e[4]))
        elif e[1] == 'meta':
            print(e[0], 'meta', META.get(e[2], hex(e[2])), bytes(e[3])[:40])
        else:
            print(e[0], 'sysex', bytes(e[2]).hex())


if __name__ == '__main__':
    if '--events' in sys.argv:
        events(sys.argv[1], int(sys.argv[sys.argv.index('--events') + 1]))
    else:
        for p in sys.argv[1:]:
            if not p.startswith('--'):
                summarize(p)
