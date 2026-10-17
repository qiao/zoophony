"""Side view gap of the final bind with the tail: the lowest crossing of each vertical line over the
seat of all faces except the shins, the feet, and the arms, then the largest over z of the
smallest over x, behind the hip joints, with no end window and with the end of 0.0065 u."""
import sys, types
import numpy as np
for name in ('bpy', 'bmesh', 'mathutils'):
    m = types.ModuleType(name); m.Vector = object; sys.modules[name] = m
src = open('tools/blender/rig_mesh.py').read()
g = {'__name__': 'rig'}
exec(compile(src[:src.rindex('\nmain()')], 'rig_mesh.py', 'exec'), g)
B = list(g['BONES']) + ['tail_tip']
M = 163.9161
for name in sys.argv[1:]:
    P = f'scratch/variants/{name}'
    bind = np.load(P + '-bind.npy'); w = np.load(P + '-weights.npy'); tris = np.load(P + '-tris.npy')
    fixed = [B.index(n) for n in B if n.rsplit('_', 1)[0] in ('shin', 'foot', 'toes', 'upper_arm', 'forearm', 'forearm_twist', 'hand', 'fingers')]
    free = w[:, fixed].sum(1)
    seat = (np.abs(bind[:, 0]) <= 0.17) & (bind[:, 2] >= -0.087) & (bind[:, 2] <= 0.1)
    tail = w[:, [B.index('tail'), B.index('tail_tip')]].sum(1)
    top = bind[seat & (free <= 0.5) & (tail <= 0.5), 1].min()
    low = bind[:, 1] <= top + 0.4
    faces = tris[((free[tris] <= 0.5) & low[tris]).all(axis=1)]
    xs = np.arange(-0.17, 0.17 + 0.0025, 0.005); zs = np.arange(-0.087, 0.05 + 0.0025, 0.005)
    gaps = g['column_bottoms'](bind, faces, xs, zs) - top
    side = np.where(np.isfinite(gaps), gaps, np.inf).min(axis=0)
    fin = np.isfinite(side)
    print(f'{name}: seat top {top:.4f} u; side view gap with the tail, all z {side[fin].max() * M:.2f} cm, '
          f'from 1 cm in front of the back of the seat {side[fin & (zs >= -0.077)].max() * M:.2f} cm; '
          + ' '.join(f'{z:.3f}:{v * M:.1f}' for z, v in zip(zs[:8], side[:8])))
