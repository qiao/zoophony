"""Print metadata, parts, GM programs, and an approximate duration of .mscz files."""
import zipfile, sys, re
import xml.etree.ElementTree as ET
from fractions import Fraction
for path in sys.argv[1:]:
    z = zipfile.ZipFile(path)
    name = [n for n in z.namelist() if n.endswith('.mscx') and '/' not in n.strip('/') or n.endswith('.mscx')][0]
    root = ET.fromstring(z.read(name))
    score = root.find('Score')
    print('##', path, '| version', root.get('version'))
    for mt in score.findall('metaTag'):
        if mt.get('name') in ('workTitle','movementTitle','composer','copyright','source','arranger','lyricist','translator') and (mt.text or '').strip():
            print(f'  meta {mt.get("name")}: {mt.text.strip()[:150]}')
    for part in score.findall('Part'):
        inst = part.find('Instrument')
        ln = inst.findtext('longName') or inst.findtext('trackName') or part.findtext('trackName')
        iid = inst.get('id')
        progs = [(c.get('name') or 'normal', c.find('program').get('value')) for c in inst.findall('Channel') if c.find('program') is not None]
        drum = inst.findtext('useDrumset')
        print(f'  part: {ln!r:28} id={iid!r:20} programs={progs} drumset={drum}')
    # approximate duration from the first staff
    st = score.find('Staff')
    sig = Fraction(4,4); tempo = 2.0; secs = 0.0; nmeas = 0
    for m in st.findall('Measure'):
        nmeas += 1
        if m.get('len'): mlen = Fraction(m.get('len'))
        else:
            for ts in m.iter('TimeSig'):
                sig = Fraction(int(ts.findtext('sigN')), int(ts.findtext('sigD')))
            mlen = sig
        for t in m.iter('Tempo'):
            tempo = float(t.findtext('tempo'))
        secs += float(mlen) * 4 / tempo
    print(f'  measures {nmeas}, approx duration {int(secs//60)}:{int(secs%60):02d} (no repeats, last tempo {tempo*60:.0f} qpm)')
