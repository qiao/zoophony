# A patch for scratch/pit_probe.py --after: the group of thin faces (as rigid_slivers() of
# rig_mesh.py: a corner under 10 degrees and a longest edge under 0.04 units) that holds the vertex
# nearest to each point of SLIVER_AT (units, x,h,z;...).
def _groups():
    import bmesh as _bm, math as _m
    from mathutils import Vector as _V
    b = _bm.new(); b.from_mesh(s.mesh.data); b.verts.ensure_lookup_table()
    _bm.ops.triangulate(b, faces=b.faces[:])
    pt = b.verts.layers.int['arm_part']; rg = b.verts.layers.int['arm_ring']; sp = b.verts.layers.int['arm_spoke']
    Hh = s.fr.height
    parent = {}
    def root(v):
        while parent[v] != v:
            parent[v] = parent[parent[v]]; v = parent[v]
        return v
    thin = []
    for f in b.faces:
        vs = [p.co for p in f.verts]
        ang = min(_m.degrees((vs[(k+1)%3]-vs[k]).angle(vs[(k+2)%3]-vs[k], 0)) for k in range(3))
        lon = max((vs[k]-vs[(k+1)%3]).length for k in range(3)) / Hh
        if ang < 10 and lon < 0.04:
            thin.append(f)
            ids = [p.index for p in f.verts]
            for i in ids: parent.setdefault(i, i)
            for i in ids[1:]:
                a, c = root(ids[0]), root(i)
                if a != c: parent[max(a, c)] = min(a, c)
    for spec in os.environ['SLIVER_AT'].split(';'):
        x, h, z = (float(t) for t in spec.split(','))
        co = _V((x * Hh, -z * Hh, h * Hh + s.fr.floor))
        v = min(b.verts, key=lambda p: (p.co - co).length)
        if v.index not in parent:
            print('sliver group of', spec, ': v%d is in no thin face' % v.index); continue
        r = root(v.index)
        members = [i for i in parent if root(i) == r]
        def tag(i):
            p = b.verts[i]
            t = 'v%d p%d' % (i, p[pt])
            if p[pt] in (3, 13): t += ' r%ds%d' % (p[rg], p[sp])
            return t
        print('sliver group of', spec, ':', len(members), 'vertices:', ', '.join(tag(i) for i in sorted(members)))
    b.free()
_groups()
