"""Writes a copy of tools/blender/rig_mesh.py that also logs the side view of the underside of the
haunch behind the hip joints for each z column: the gap above the seat top in cm and the x of the
lowest crossing (silhouette_gap()). The round found with it that the gap of the deeper haunch is
the round back of the haunch at the first column after `sit.end`. Usage, from the root of the
worktree:

    python3 docs/research/2026-10-16-cat-form/side_gaps.py scratch/rig_dbg.py
    blender -b --factory-startup --python scratch/rig_dbg.py -- <config.json> <out.glb>
"""
import sys

source = open('tools/blender/rig_mesh.py').read()
old = """    keep = zs >= zs[hit[0]] + end
    return float(side[keep & np.isfinite(side)].max(initial=0.0))"""
new = """    keep = zs >= zs[hit[0]] + end
    arg = np.where(np.isfinite(gaps), gaps, np.inf).argmin(axis=0)
    log('DBG side: ' + ' '.join(f'z{z:.3f}:{g * 163.9:.2f}@x{xs[a]:.3f}'
                                for z, g, a, k in zip(zs, side, arg, keep) if k and np.isfinite(g)))
    return float(side[keep & np.isfinite(side)].max(initial=0.0))"""
assert source.count(old) == 1
open(sys.argv[1], 'w').write(source.replace(old, new, 1))
