"""Print the measure number, start tick, and tempo texts of staff 1 of an mscx file.

Usage: python3 measures.py file.mscx [--all]
"""
import re, sys
from fractions import Fraction

DIV = 480
s = open(sys.argv[1], 'rb').read()
first = s.find(b'<Staff id="1">')
end = s.find(b'<Staff id="2">', first)
staff = s[first:end]
measures = re.findall(rb'<Measure([^>]*)>(.*?)</Measure>', staff, re.S)
sig = Fraction(4, 4)
tick = 0
number = 0
rows = []
for attrs, body in measures:
    ts = re.search(rb'<TimeSig>.*?<sigN>(\d+)</sigN>\s*<sigD>(\d+)</sigD>', body, re.S)
    if ts:
        sig = Fraction(int(ts.group(1)), int(ts.group(2)))
    length = sig
    m = re.search(rb'len="(\d+)/(\d+)"', attrs)
    if m:
        length = Fraction(int(m.group(1)), int(m.group(2)))
    irregular = b'irregular' in body or b'<irregular>' in body
    if not irregular:
        number += 1
    tempos = [re.sub(rb'<[^>]+>', b'', t).decode()[:60] for t in re.findall(rb'<Tempo>.*?<text>(.*?)</text>', body, re.S)]
    texts = [re.sub(rb'<[^>]+>', b'', t).decode()[:60] for t in re.findall(rb'<StaffText>.*?<text>(.*?)</text>', body, re.S)]
    rows.append((number, tick, str(sig), str(length), tempos, texts, b'<Fermata>' in body, b'<BarLine>' in body))
    tick += int(length * 4 * DIV)
for r in rows:
    if '--all' in sys.argv or r[4]:
        print(r)
print('measures', len(rows), 'end tick', tick)
