# A patch for scratch/pit_probe.py: after the steps, prints for each side the distance of each
# vertex of the shoulder rings (ring 0 and 1) and of the socket near the front end of the armpit
# line to the armpit line (cm-units, 1 unit = 100).
def _pit_dist():
    import bmesh as _bm
    from mathutils.geometry import intersect_point_line
    b = _bm.new(); b.from_mesh(s.mesh.data)
    pt = b.verts.layers.int['arm_part']; rg = b.verts.layers.int['arm_ring']; sp = b.verts.layers.int['arm_spoke']; fl = b.verts.layers.int['arm_flat']
    H = s.fr.height
    for side, off in ((1, 0), (-1, 10)):
        pit = sorted([p for p in b.verts if p[pt] == ca.PART['armpit'] + off], key=lambda p: -p.co.y)
        def dist(co):
            best = 1e9
            for a, c in zip(pit, pit[1:]):
                q, t = intersect_point_line(co, a.co, c.co)
                t = min(1, max(0, t)); q = a.co.lerp(c.co, t)
                best = min(best, (co - q).length)
            return best / H * 100
        rows = []
        for p in b.verts:
            if p[pt] == ca.PART['tube'] + off and p[rg] < 3:
                d = dist(p.co)
                if d < 1.5:
                    rows.append((p[rg], p[sp], p[fl], d, p.index))
        rows.sort()
        print('side', 'L' if side > 0 else 'R', 'tube vertices within 1.5 cm-units of the armpit line (ring, spoke, flat, distance, index):')
        for r in rows:
            print('   r%d s%d f%d %.2f v%d' % r)
    b.free()
_pit_dist()
