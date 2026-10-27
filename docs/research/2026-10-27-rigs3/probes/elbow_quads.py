"""Lists the quads (two faces that share an edge) near each elbow of a rig, in the source and in the
upright bind of refine(): the corners across the shared edge, and the five edge turns of
quad_turns() in the bind before and after a flip (Blender, background).

    Blender -b --factory-startup --python scratch/a/elbow_quads.py -- <config> <out.glb> [radius]
"""
import os
import sys

import numpy as np

src = open('tools/blender/rig_mesh.py').read()
src = src[:src.rstrip().rfind('main()')]
ns = {'__name__': 'rig_probe'}
exec(compile(src, 'rig_mesh.py', 'exec'), ns)

argv = sys.argv[sys.argv.index('--') + 1:]
radius = float(argv[2]) if len(argv) > 2 else 0.05
sys.argv = sys.argv[:sys.argv.index('--') + 1] + argv[:2]
original_refine = ns['refine']


def refine(*args, **kwargs):
    verts, tris, uvs, weights, heads, ends, matrices, config, source = args
    bind = ns['bind_skin'](config, weights, matrices, verts)
    corner_angle, edge_faces, quad_turns = ns['corner_angle'], ns['edge_faces'], ns['quad_turns']
    bones = ns['BONES']
    for side in 'LR':
        elbow = heads[f'forearm_{side}']
        arm = np.zeros(len(verts), bool)
        for name in ns['arm_bones'](side):
            arm |= weights[:, bones.index(name)] > 0
        share = sum(weights[:, bones.index(n)] for n in ns['arm_bones'](side))
        near = np.linalg.norm(verts - elbow, axis=1) <= radius
        faces_of = edge_faces(tris)
        rows = []
        for (a, b), faces in faces_of.items():
            if len(faces) != 2 or not (near[tris[faces]].all() and (share[tris[faces]] >= 0.5).all()):
                continue
            f, g = faces
            t = [int(v) for v in tris[f]]
            m = next(v for v in t if v not in (a, b))
            a, b = t[(t.index(m) + 1) % 3], t[(t.index(m) + 2) % 3]
            n = int(next(v for v in tris[g] if v not in (a, b)))
            src_across = corner_angle(verts[m], verts[a], verts[b]) + corner_angle(verts[n], verts[a], verts[b])
            bind_across = corner_angle(bind[m], bind[a], bind[b]) + corner_angle(bind[n], bind[a], bind[b])
            outer = {}
            for key in ((a, m), (m, b), (b, n), (n, a)):
                key = tuple(sorted(key))
                others = [h for h in faces_of.get(key, []) if h not in (f, g)]
                if len(others) == 1:
                    outer[key] = tris[others[0]]
            before = quad_turns(bind, tris[[f, g]], outer)
            after = quad_turns(bind, np.array([[m, a, n], [m, n, b]]), outer)
            mid = verts[[a, b, m, n]].mean(axis=0)
            rows.append((bind_across, src_across, f, g, a, b, m, n, mid, before, after,
                         float(np.linalg.norm(mid - elbow))))
        rows.sort(key=lambda r: -r[0])
        print(f'SIDE {side}: elbow {np.round(elbow, 4).tolist()}, {len(rows)} quads within {radius}')
        for r in rows[:25]:
            bind_across, src_across, f, g, a, b, m, n, mid, before, after, dist = r
            smoother = after.max() <= before.max() and (after ** 2).sum() < (before ** 2).sum()
            print(f'  faces {f}/{g} edge {a}-{b}: across bind {bind_across:.1f} source {src_across:.1f}, '
                  f'dist {dist:.4f}, mid {np.round(mid, 4).tolist()}, turns before max {before.max():.1f} '
                  f'ss {(before ** 2).sum():.0f}, after max {after.max():.1f} ss {(after ** 2).sum():.0f}'
                  f'{" SMOOTHER" if smoother else ""}')
    return original_refine(*args, **kwargs)


ns['refine'] = refine
ns['main']()
