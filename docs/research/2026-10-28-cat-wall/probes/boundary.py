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
    bm = bmesh.new(); bm.from_mesh(s.mesh.data)
    if step.__name__ in ('step_belly', 'step_round_wall', 'step_inner_color'):
        b = [e for e in bm.edges if e.is_boundary]
        nm = [e for e in bm.edges if len(e.link_faces) > 2]
        loops = va.edge_loops(b)
        print(step.__name__, 'boundary edges', len(b), 'loops', len(loops), [len(l) for l in loops], 'nonmanifold', len(nm), flush=True)
    bm.free()
    if step.__name__ == 'step_inner_color':
        break
