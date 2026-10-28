"""Reads cuts JSON files of wall_cuts2.py and prints, for each level of each side, the largest
turn (degrees) between neighbor segments of the trunk outline (trunk and wall segments, no tube)
within 5 cm of the plane of the seam, and the turn sum there."""
import json, math, sys
for f in sys.argv[1:]:
    d = json.load(open(f))
    p = d['plane']
    out = []
    for key, segs in d['cuts'].items():
        side, lv = key.split()
        lv = float(lv)
        xp = p['x'] - p['lean'] * (lv - p['armpit']) * 163.916
        pts = [(tuple(a), tuple(b)) for kind, (a, b), _ in segs if kind in ('trunk', 'wall')]
        # Chain by shared ends.
        def k(q):
            return (round(q[0], 4), round(q[1], 4))
        ends = {}
        for i, (a, b) in enumerate(pts):
            ends.setdefault(k(a), []).append(i)
            ends.setdefault(k(b), []).append(i)
        best, total = 0.0, 0.0
        for q, idx in ends.items():
            if len(idx) != 2 or q[0] < xp - 5:
                continue
            (a1, b1), (a2, b2) = pts[idx[0]], pts[idx[1]]
            o1 = a1 if k(b1) == q else b1
            o2 = a2 if k(b2) == q else b2
            u = (q[0] - o1[0], q[1] - o1[1])
            w = (o2[0] - q[0], o2[1] - q[1])
            nu, nw = math.hypot(*u), math.hypot(*w)
            if nu < 1e-6 or nw < 1e-6:
                continue
            c = max(-1, min(1, (u[0] * w[0] + u[1] * w[1]) / nu / nw))
            t = math.degrees(math.acos(c))
            best = max(best, t)
            total += t
        out.append((side, lv, best, total))
    print(f, ' '.join('%s%.2f:%.0f/%.0f' % o for o in out))
