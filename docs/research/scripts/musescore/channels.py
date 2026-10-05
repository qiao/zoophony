"""List each Part, its staves, and the port and channel of each Channel element.

Usage: python3 channels.py score.mscz|score.mscx
"""
import sys, zipfile
import xml.etree.ElementTree as ET


def load(path):
    if path.endswith('.mscz'):
        z = zipfile.ZipFile(path)
        name = [n for n in z.namelist() if n.endswith('.mscx') and '/' not in n][0]
        return ET.fromstring(z.read(name))
    return ET.parse(path).getroot()


def parts(root):
    score = root.find('Score')
    out = []
    for i, part in enumerate(score.findall('Part')):
        inst = part.find('Instrument')
        nstaves = len(part.findall('Staff'))
        chans = []
        for c in inst.findall('Channel'):
            prog = c.find('program')
            chans.append({
                'name': c.get('name') or '(default)',
                'program': int(prog.get('value')) if prog is not None else None,
                'port': int(c.findtext('midiPort', '-1')),
                'channel': int(c.findtext('midiChannel', '-1')),
            })
        out.append({'index': i, 'id': part.get('id'), 'long': inst.findtext('longName'),
                    'track': part.findtext('trackName'), 'instr': inst.get('id'),
                    'staves': nstaves, 'drumset': inst.findtext('useDrumset') == '1',
                    'channels': chans})
    return out


if __name__ == '__main__':
    for p in parts(load(sys.argv[1])):
        cs = ', '.join(f"{c['name']}:p{c['program']}@{c['port']}/{c['channel'] + 1}" for c in p['channels'])
        print(f"{p['index']:2} part{p['id']:>3} {p['long']!r:22} staves={p['staves']} "
              f"{'DRUM ' if p['drumset'] else ''}[{cs}]")
