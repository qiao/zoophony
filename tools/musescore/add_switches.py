"""Add <channelSwitch> to "pizz." and "arco" play technique marks.

MuseScore 4 MIDI export selects an articulation channel only from a StaffText
or PlayTechAnnotation that has a channel name (<channelSwitch>, see
Score::updateChannel). The "pizz." and "arco" marks of MuseScore 4 have no
channel name, so the export ignores them. This script adds:
  playTechType pizzicato           -> <channelSwitch name="pizzicato"/>
  text "arco" (no playTechType)    -> <channelSwitch name="NAME0"/>
where NAME0 is the name of the first Channel of the part ("arco" or "normal").
With no voice attribute, the switch applies to all four voices.

Usage: python3 -I add_switches.py in.mscz out.mscz
"""
import re, sys, zipfile

STAFF_START = re.compile(rb'<Staff id="(\d+)">')
PTA_RE = re.compile(rb'(<PlayTechAnnotation>)(.*?)(</PlayTechAnnotation>)', re.S)
PART_RE = re.compile(rb'<Part id="[^"]*">(.*?)</Part>', re.S)


def edit(mscx):
    first_staff = mscx.find(b'<Staff id="1">')
    staff_chan0 = []
    for m in PART_RE.finditer(mscx[:first_staff]):
        body = m.group(1)
        cm = re.search(rb'<Channel(?: name="([^"]*)")?>', body)
        name0 = cm.group(1) or b'normal'
        names = re.findall(rb'<Channel(?: name="([^"]*)")?>', body)
        has_pizz = b'pizzicato' in names
        for _ in re.findall(rb'<Staff>', body):
            staff_chan0.append((name0, has_pizz))
    counts = {'pizz': 0, 'arco': 0, 'skipped': 0}

    def fix_staff(staff_id, block):
        name0, has_pizz = staff_chan0[staff_id - 1]

        def fix_pta(pm):
            body = pm.group(2)
            text = re.sub(rb'<[^>]+>', b'', re.search(rb'<text>(.*?)</text>', body, re.S).group(1)).strip()
            if b'channelSwitch' in body or not has_pizz:
                counts['skipped'] += 1
                return pm.group(0)
            if b'<playTechType>pizzicato</playTechType>' in body:
                counts['pizz'] += 1
                sw = b'<channelSwitch name="pizzicato"/>'
            elif b'arco' in text and b'<playTechType>' not in body:
                counts['arco'] += 1
                sw = b'<channelSwitch name="' + name0 + b'"/>'
            else:
                counts['skipped'] += 1
                return pm.group(0)
            return pm.group(1) + b'\n' + sw + body + pm.group(3)

        return PTA_RE.sub(fix_pta, block)

    # Each staff block runs from its <Staff id="N"> to the next one.
    starts = [(m.start(), int(m.group(1))) for m in STAFF_START.finditer(mscx) if m.start() >= first_staff]
    pieces = [mscx[:first_staff]]
    for i, (pos, sid) in enumerate(starts):
        end = starts[i + 1][0] if i + 1 < len(starts) else len(mscx)
        pieces.append(fix_staff(sid, mscx[pos:end]))
    return b''.join(pieces), counts


def main(src, dst):
    zin = zipfile.ZipFile(src)
    main_name = [n for n in zin.namelist() if n.endswith('.mscx') and '/' not in n][0]
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename == main_name:
                data, counts = edit(data)
                print('added switches:', counts)
            zout.writestr(info, data)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
