"""Print SMF facts: format, tracks, channels, programs, drums, duration."""
import struct, sys, collections

GM = ["Acoustic Grand Piano","Bright Acoustic Piano","Electric Grand Piano","Honky-tonk Piano","Electric Piano 1","Electric Piano 2","Harpsichord","Clavi","Celesta","Glockenspiel","Music Box","Vibraphone","Marimba","Xylophone","Tubular Bells","Dulcimer","Drawbar Organ","Percussive Organ","Rock Organ","Church Organ","Reed Organ","Accordion","Harmonica","Tango Accordion","Acoustic Guitar (nylon)","Acoustic Guitar (steel)","Electric Guitar (jazz)","Electric Guitar (clean)","Electric Guitar (muted)","Overdriven Guitar","Distortion Guitar","Guitar harmonics","Acoustic Bass","Electric Bass (finger)","Electric Bass (pick)","Fretless Bass","Slap Bass 1","Slap Bass 2","Synth Bass 1","Synth Bass 2","Violin","Viola","Cello","Contrabass","Tremolo Strings","Pizzicato Strings","Orchestral Harp","Timpani","String Ensemble 1","String Ensemble 2","SynthStrings 1","SynthStrings 2","Choir Aahs","Voice Oohs","Synth Voice","Orchestra Hit","Trumpet","Trombone","Tuba","Muted Trumpet","French Horn","Brass Section","SynthBrass 1","SynthBrass 2","Soprano Sax","Alto Sax","Tenor Sax","Baritone Sax","Oboe","English Horn","Bassoon","Clarinet","Piccolo","Flute","Recorder","Pan Flute","Blown Bottle","Shakuhachi","Whistle","Ocarina"] + ["(other)"]*48

def vlq(d, i):
    v = 0
    while True:
        b = d[i]; i += 1
        v = (v << 7) | (b & 0x7f)
        if not b & 0x80: return v, i

def parse(path):
    d = open(path, 'rb').read()
    assert d[:4] == b'MThd'
    hl, fmt, ntrk, div = struct.unpack('>IHHH', d[4:14])
    i = 8 + hl
    tracks = []
    tempos = []  # (tick, usec/qn)
    for t in range(ntrk):
        assert d[i:i+4] == b'MTrk', 'bad chunk'
        ln = struct.unpack('>I', d[i+4:i+8])[0]
        j = i + 8; end = j + ln; tick = 0; rs = None
        ev = []; name = None; instname = None
        while j < end:
            dt, j = vlq(d, j); tick += dt
            st = d[j]
            if st == 0xff:
                typ = d[j+1]; l, k = vlq(d, j+2); data = d[k:k+l]; j = k + l
                if typ == 0x51: tempos.append((tick, int.from_bytes(data, 'big')))
                elif typ == 0x03 and name is None: name = data.decode('latin1')
                elif typ == 0x04: instname = data.decode('latin1')
                elif typ == 0x02: ev.append((tick, 'copyright', data.decode('latin1')))
                elif typ == 0x2f: break
                continue
            if st in (0xf0, 0xf7):
                l, k = vlq(d, j+1); j = k + l; continue
            if st & 0x80: rs = st; j += 1
            else: st = rs
            hi = st & 0xf0; ch = st & 0x0f
            n = 1 if hi in (0xc0, 0xd0) else 2
            a = d[j:j+n]; j += n
            if hi == 0x90 and a[1] > 0: ev.append((tick, 'on', ch, a[0]))
            elif hi == 0xc0: ev.append((tick, 'pc', ch, a[0]))
            elif hi == 0xb0 and a[0] in (0, 32): ev.append((tick, 'bank', ch, a[0], a[1]))
        tracks.append({'name': name, 'inst': instname, 'ev': ev})
        i = end if j <= end else j
    return fmt, ntrk, div, tracks, sorted(tempos)

def secs(tick, tempos, div):
    s = 0.0; last = 0; us = 500000
    for tt, u in tempos:
        if tt >= tick: break
        s += (tt - last) * us / 1e6 / div; last = tt; us = u
    return s + (tick - last) * us / 1e6 / div

for p in sys.argv[1:]:
    fmt, ntrk, div, tracks, tempos = parse(p)
    if div & 0x8000: print(p, 'SMPTE division, skip'); continue
    progs = collections.defaultdict(list); notes = collections.Counter(); first_on = {}
    first_pc = {}; banks = collections.defaultdict(set); drumkeys = collections.Counter()
    maxtick = 0; copyright = []
    for t in tracks:
        for e in t['ev']:
            if e[1] == 'copyright': copyright.append(e[2]); continue
            tick, kind, ch = e[0], e[1], e[2]
            maxtick = max(maxtick, tick)
            if kind == 'on':
                notes[ch] += 1; first_on[ch] = min(first_on.get(ch, 1 << 60), tick)
                if ch == 9: drumkeys[e[3]] += 1
            elif kind == 'pc':
                if e[3] not in progs[ch]: progs[ch].append(e[3])
                first_pc[ch] = min(first_pc.get(ch, 1 << 60), tick)
            elif kind == 'bank': banks[ch].add((e[3], e[4]))
    dur = secs(maxtick, tempos, div)
    print(f'## {p}')
    print(f'  SMF format {fmt}, tracks {ntrk}, division {div} ticks/qn, tempo events {len(tempos)}, duration {int(dur//60)}:{int(dur%60):02d} ({dur:.0f} s)')
    if copyright: print('  copyright meta:', copyright)
    print('  track names:', [t['name'] for t in tracks])
    for ch in sorted(set(notes) | set(progs)):
        pl = ', '.join(f'{x} {GM[x]}' for x in progs[ch]) or 'NONE'
        late = ' (no PC before first note)' if ch in notes and (ch not in first_pc or first_pc[ch] > first_on[ch]) else ''
        print(f'  ch {ch+1:>2} (idx {ch:>2}): notes {notes[ch]:>5}, programs [{pl}]{late}' + (f' bank {sorted(banks[ch])}' if banks[ch] else ''))
    print('  channel 10 used:', 'YES' if 9 in notes else 'no', dict(drumkeys) if drumkeys else '')
