# For pit_probe.py --after: the vertices near the actual front end of each armpit line (the end
# with the largest z units) with the largest bump: the distance of the vertex from the middle of
# its neighbors along its normal (positive out), in units-cm.
import json as _json
for side, off in ((1, 0), (-1, 10)):
    line = [p for p in bm.verts if p[part] == ca.PART['armpit'] + off]
    fr = max(line, key=lambda p: -p.co.y)
    rows = []
    for p in bm.verts:
        if (p.co - fr.co).length > float(os.environ.get('FLAP', 0.03)) * H:
            continue
        nb = [e.other_vert(p) for e in p.link_edges]
        mid = sum((q.co for q in nb), p.co * 0) / len(nb)
        n = p.normal
        bump = -(mid - p.co).dot(n) / H * 100
        rows.append((bump, p))
    rows.sort(key=lambda r: -abs(r[0]))
    print('side', 'LR'[off // 10], 'front end', tag(fr))
    for bump, p in rows[:14]:
        print('  bump %+.3f %s faces %s' % (bump, tag(p), ' '.join(str(f.index) for f in p.link_faces)))
