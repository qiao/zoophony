"""Writes scratch/rig_debug.py: the rig script with the seat profile and the array dumps."""
s = open('tools/blender/rig_mesh.py').read()
old = """            f'seat top')
"""
new = """            f'seat top')
        side = np.where(np.isfinite(gaps), gaps, np.inf)
        for j, z in enumerate(zs):
            col = side[:, j]
            k = int(np.argmin(col))
            log(f'profile z {z:.3f}: min gap {col[k] * meters * 100:.2f} cm at x {xs[k]:.3f}')
        np.save(os.environ.get('DUMP', '/dev/null') + '-bind.npy', bind)
        np.save(os.environ.get('DUMP', '/dev/null') + '-weights.npy', weights)
        np.save(os.environ.get('DUMP', '/dev/null') + '-tris.npy', tris)
        np.save(os.environ.get('DUMP', '/dev/null') + '-src.npy', long_verts)
"""
assert s.count(old) == 1
s = s.replace(old, new)
old2 = """    bind = skin(weights, upright_matrices, long_verts)
    if 'tailCurl' in config['studio']:"""
new2 = """    bind = skin(weights, upright_matrices, long_verts)
    np.save(os.environ.get('DUMP', '/dev/null') + '-pre.npy', bind)
    np.save(os.environ.get('DUMP', '/dev/null') + '-joints.npy', np.array([
        long_heads['tail'], long_heads[TAIL_TIP], long_ends[TAIL_TIP], upright_heads['tail']]))
    if 'tailCurl' in config['studio']:"""
assert s.count(old2) == 1
open('scratch/rig_debug.py', 'w').write(s.replace(old2, new2))
