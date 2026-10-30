"""Write a copy of the score with a new MIDI port and channel for each Channel.

The edit is textual. It changes only <midiPort>, <midiChannel>, and (in some
modes) <program value="..."/> inside the <Channel> elements of the master
score Parts. MuseScore reads these values with no check (TRead::read for
InstrChannel calls MasterScore::addMidiMapping), and the MIDI export uses them.

Modes:
  naive     All channels on port 0. Each articulation channel (mute,
            pizzicato, tremolo, ...) uses the MIDI channel of its part.
  porttrick Same MIDI channels as 'naive'. The main channel of each part uses
            port 128 and articulation k uses port 128+k. MuseScore keeps the
            port in a signed char, so 128.. becomes negative and the export
            writes no FF 21 event. Different ports stop the duplicate writes.
            Articulation programs are set to the program of the main channel,
            and each group gets one program, so all tick-0 program changes on a
            shared channel agree.
  unique    Each part gets its own port (= part index) and articulation k gets
            MIDI channel k (drums: channel 9). This gives an export in which
            (track, channel) tells the articulation with no ambiguity. Use it as
            input for remap_midi.py.

With --groups FILE, the group map comes from a JSON file with the keys
"short" (the short name of each part, in score order) and "groups" (rows of
GROUPS). With no option, the scripts use the map of the Boulanger score below.

Usage: python3 -I remap_score.py MODE in.mscz out.mscz [--groups FILE]
"""
import json, re, sys, zipfile

# Part index (score order) -> group. Names are checked against the score.
GROUPS = [
    # (group name, MIDI channel 0-based, program for the group, part indexes)
    ('Flutes',      0, 73, [0, 1, 2]),
    ('Oboes',       1, 68, [3, 4, 5]),
    ('Clarinets',   2, 71, [6, 7, 8]),
    ('Bassoons',    3, 70, [9, 10, 11]),
    ('Horns',       4, 60, [12, 13, 14, 15]),
    ('Trumpets',    5, 56, [16, 17]),
    ('Trombones',   6, 57, [18, 19, 20]),
    ('Tuba',        7, 58, [21]),
    ('Celesta',     8, 8, [25]),
    ('Percussion',  9, 48, [22, 23, 24]),
    ('Harp',       10, 46, [26]),
    ('Violin 1',   11, 40, [27, 28, 29, 30, 40]),
    ('Violin 2',   12, 40, [31, 32, 33]),
    ('Violas',     13, 41, [34, 35]),
    ('Cellos',     14, 42, [36, 37, 38]),
    ('Contrabass', 15, 43, [39]),
]

EXPECTED_SHORT = ['Picc', 'Fl 1', 'Fl 2', 'Ob 1', 'Ob 2', 'E Hn', 'Cl 1', 'Cl 2', 'B Cl',
                  'Bsn 1', 'Bsn 2', 'B Sar', 'F Hn 1', 'F Hn 2', 'F Hn 3', 'F Hn 4',
                  'C Tpt 1', 'C Tpt 2', 'Tbn 1', 'Tbn 2', 'Tbn 3', 'Tba', 'Cym', 'Tamb',
                  'Tri', 'Cel', 'Hrp', 'Vln Solo.', 'Vln 1', 'Vln. 1 div(2)',
                  'Vln. 1 div(3)', 'Vln. 2 Solo', 'Vln 2', 'Vln 2 div.', 'Vla.', 'Vla',
                  'Vc. Solo', 'Vc', 'Vcs div 2.', 'Cb', 'Vln.']


def load_groups(argv):
    """Read the group map of --groups FILE in argv, or give the map of the Boulanger score."""
    if '--groups' not in argv:
        return GROUPS, EXPECTED_SHORT
    with open(argv[argv.index('--groups') + 1], encoding='utf-8') as f:
        data = json.load(f)
    return [tuple(g) for g in data['groups']], data['short']


def positional(argv):
    """Give the arguments that are not options. The value of --groups and --programs is an option."""
    out = []; skip = False
    for a in argv:
        if skip:
            skip = False
        elif a in ('--groups', '--programs'):
            skip = True
        elif not a.startswith('--'):
            out.append(a)
    return out


GROUPS, EXPECTED_SHORT = load_groups(sys.argv)

PART_RE = re.compile(rb'(<Part id="[^"]*">)(.*?)(</Part>)', re.S)
CHAN_RE = re.compile(rb'(<Channel(?: name="[^"]*")?>)(.*?)(</Channel>)', re.S)


def group_of(pi):
    for g in GROUPS:
        if pi in g[3]:
            return g
    raise KeyError(pi)


def edit_channel(body, port, chan, program):
    if b'<midiPort>' not in body and b'<midiChannel>' not in body:
        # Some scores have no MIDI mapping in a Channel. MuseScore then makes one at load time.
        # Add the two elements after the program, where MuseScore writes them.
        body, n0 = re.subn(rb'(<program value="\d+"/>)', rb'\1<midiPort>0</midiPort><midiChannel>0</midiChannel>',
                           body)
        assert n0 == 1, 'Channel without program'
    body, n1 = re.subn(rb'<midiPort>-?\d+</midiPort>', b'<midiPort>%d</midiPort>' % port, body)
    body, n2 = re.subn(rb'<midiChannel>-?\d+</midiChannel>', b'<midiChannel>%d</midiChannel>' % chan, body)
    assert n1 == 1 and n2 == 1, 'Channel without midiPort/midiChannel'
    if program is not None:
        body, n3 = re.subn(rb'<program value="\d+"/>', b'<program value="%d"/>' % program, body)
        assert n3 == 1
    return body


def remap(mscx, mode):
    parts = list(PART_RE.finditer(mscx))
    # Only the master score Parts come before the first <Staff id=...> block.
    first_staff = mscx.find(b'<Staff id="1">')
    parts = [m for m in parts if m.start() < first_staff]
    assert len(parts) == len(EXPECTED_SHORT), len(parts)
    out = []; last = 0; report = []
    for pi, m in enumerate(parts):
        body = m.group(2)
        short = re.search(rb'<shortName>(.*?)</shortName>', body)
        assert short and short.group(1).decode() == EXPECTED_SHORT[pi], (pi, short)
        gname, gchan, gprog, _ = group_of(pi)
        chans = list(CHAN_RE.finditer(body))
        drum = b'<useDrumset>1</useDrumset>' in body
        nb = []; lb = 0
        for k, cm in enumerate(chans):
            if mode == 'naive':
                port, chan, prog = 0, gchan, None
            elif mode == 'porttrick':
                port, chan, prog = 128 + k, gchan, gprog
            elif mode == 'unique':
                port, chan, prog = pi, (9 if drum else k), None
            else:
                raise SystemExit('unknown mode ' + mode)
            nb.append(body[lb:cm.start(2)]); nb.append(edit_channel(cm.group(2), port, chan, prog)); lb = cm.end(2)
            report.append((pi, gname, (cm.group(1).decode()), port, chan + 1, prog))
        nb.append(body[lb:])
        out.append(mscx[last:m.start(2)]); out.append(b''.join(nb)); last = m.end(2)
    out.append(mscx[last:])
    return b''.join(out), report


def main(mode, src, dst):
    zin = zipfile.ZipFile(src)
    main_name = [n for n in zin.namelist() if n.endswith('.mscx') and '/' not in n][0]
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename == main_name:
                data, report = remap(data, mode)
            zout.writestr(info, data)
    for r in report:
        print(f'  part {r[0]:2} {r[1]:11} {r[2]:32} port {r[3]:3} ch {r[4]:2} program {r[5]}')


if __name__ == '__main__':
    main(*positional(sys.argv[1:])[:3])
