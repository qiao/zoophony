"""Writes scratch/rig_probe.py: the rig script with a print of each face that the stretch turns or
squeezes (stretch_faces()), with the place, the long place, and the three largest weights of each
corner, and the joints of the right leg before and after the stretch. Run it from the root of the
worktree, then rig with the environment variable FACE_PROBE:

    python3 docs/research/2026-10-16-cat-trunk/make_face_probe.py
    FACE_PROBE=1 blender -b --factory-startup --python scratch/rig_probe.py -- \
        tools/mesh-rigs/cat.json scratch/probe.glb --check
"""
s = open('tools/blender/rig_mesh.py').read()
old = "    stretched = stretch_faces(verts, long_verts, source_tris) if check else []\n"
new = old + """    if os.environ.get('FACE_PROBE'):
        for f, t, k in stretch_faces(verts, long_verts, source_tris):
            log(f'probe face {f}: turn {t:.1f}, kept {k:.2f}')
            for c in source_tris[f]:
                top = np.argsort(-weights[c])[:3]
                ws = ', '.join(f'{BONES[b]} {weights[c, b]:.3f}' for b in top if weights[c, b] > 0)
                log(f'  corner {c}: source {np.round(verts[c], 4).tolist()} long '
                    f'{np.round(long_verts[c], 4).tolist()} weights {ws}')
            a, b, c = verts[source_tris[f]]
            n = np.cross(b - a, c - a)
            log(f'  source normal {np.round(n / np.linalg.norm(n), 3).tolist()} area '
                f'{0.5 * np.linalg.norm(n):.2e}')
        for n in ('shin_R', 'foot_R', 'toes_R'):
            log(f'  joint {n}: {np.round(heads[n], 4).tolist()} -> {np.round(long_heads[n], 4).tolist()}')
"""
assert s.count(old) == 1
open('scratch/rig_probe.py', 'w').write(s.replace(old, new))
