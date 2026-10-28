# For pit_probe.py --after: the sharp edges (dihedral over SHARP degrees) within FLAP units of the
# actual front end and the back end of each armpit line, ridge or valley, with the codes.
SHARP = float(os.environ.get('SHARP', 50))
for side, off in ((1, 0), (-1, 10)):
    line = [p for p in bm.verts if p[part] == ca.PART['armpit'] + off]
    for nm, end in (('front', max(line, key=lambda p: -p.co.y)), ('back', min(line, key=lambda p: -p.co.y))):
        print('side', 'LR'[off // 10], nm, 'end', tag(end))
        rows = []
        for e in bm.edges:
            if len(e.link_faces) != 2:
                continue
            mid = (e.verts[0].co + e.verts[1].co) / 2
            if (mid - end.co).length > float(os.environ.get('FLAP', 0.03)) * H:
                continue
            f0, f1 = e.link_faces
            ang = math.degrees(f0.normal.angle(f1.normal, 0))
            if ang < SHARP:
                continue
            far = next(p for p in f1.verts if p not in e.verts)
            kind = 'valley' if (far.co - mid).dot(f0.normal) > 0 else 'ridge'
            rows.append((ang, kind, e))
        for ang, kind, e in sorted(rows, key=lambda r: -r[0]):
            print('  %5.1f %-6s %s | %s  faces %s' % (ang, kind, tag(e.verts[0]), tag(e.verts[1]), ' '.join(str(f.index) for f in e.link_faces)))
