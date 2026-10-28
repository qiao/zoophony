import os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'blender'))
sys.argv = [sys.argv[0], '--', '/tmp/unused-b']
import bmesh
import cat_arms as ca
import violin_arms as va
va.clear_scene()
s = va.Session('cat', '/tmp/unused-b')
for step in ca.STEPS:
    step(s)
    if step.__name__ in ('step_belly', 'step_round_wall'):
        bm = bmesh.new(); bm.from_mesh(s.mesh.data)
        H = s.fr.height
        part = bm.verts.layers.int['arm_part']; zone = bm.faces.layers.int['arm_zone']
        bad = 0
        for f in bm.faces:
            vs = list(f.verts)
            if len(vs) < 4:
                continue
            for i in range(len(vs)):
                for j in range(i + 2, len(vs)):
                    if i == 0 and j == len(vs) - 1:
                        continue
                    e = bm.edges.get((vs[i], vs[j]))
                    if e is not None:
                        bad += 1
                        c = (vs[i].co + vs[j].co) / 2
                        print(step.__name__, 'face of', len(vs), 'zone', f[zone], 'has an edge across it at h %.3f fwd %.3f x %.3f' % ((c.z - s.fr.floor) / H, -c.y / H, c.x / H), 'parts', vs[i][part], vs[j][part], 'edge faces', [g[zone] for g in e.link_faces], flush=True)
        print(step.__name__, 'faces with an edge across them', bad, flush=True)
        bm.free()
    if step.__name__ == 'step_round_wall':
        break
