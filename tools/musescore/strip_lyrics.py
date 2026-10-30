"""Copy an .mscz file and remove all <Lyrics> elements from every .mscx in it.

The edit is textual: it deletes each <Lyrics>...</Lyrics> block and keeps all
other bytes. MuseScore does not nest Lyrics elements, so a non-greedy match is
safe. The script also checks that each result is well-formed XML.

Usage: python3 -I strip_lyrics.py in.mscz out.mscz
"""
import re, sys, zipfile
import xml.etree.ElementTree as ET

LYRICS = re.compile(rb'\n[ \t]*<Lyrics>.*?</Lyrics>', re.S)


def main(src, dst):
    zin = zipfile.ZipFile(src)
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename.endswith('.mscx'):
                data, n = LYRICS.subn(b'', data)
                ET.fromstring(data)  # raises if the edit broke the XML
                assert b'<Lyrics' not in data, info.filename
                print(f'{info.filename}: removed {n} Lyrics')
            zout.writestr(info, data)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
