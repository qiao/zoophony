"""Runs tools/blender/rig_mesh.py with hooks, and saves the mesh after each step of the seated bind
(Blender, background).

    Blender -b --factory-startup --python docs/research/2026-10-26-fifth-bears/steps.py -- <config> <out.glb> <out dir>

Each step goes into <out dir>/<n>-<step>.npz with the points, the triangles, and the weights of the
thigh, the shin, and the hips of the left side.
"""
import os
import sys

import numpy as np

src = open('tools/blender/rig_mesh.py').read()
src = src[:src.rstrip().rfind('main()')]
ns = {'__name__': 'rig_probe'}
exec(compile(src, 'rig_mesh.py', 'exec'), ns)

argv = sys.argv[sys.argv.index('--') + 1:]
out_dir = argv[2]
sys.argv = sys.argv[:sys.argv.index('--') + 1] + argv[:2]
os.makedirs(out_dir, exist_ok=True)
state = {'n': 0, 'tris': None, 'weights': None}


def save(name, points):
    tris, weights = state['tris'], state['weights']
    if tris is None:
        return
    bones = ns['BONES']
    cols = {k: weights[:, bones.index(k)] for k in ('thigh_L', 'shin_L', 'hips', 'foot_L')}
    state['n'] += 1
    np.savez(os.path.join(out_dir, f"{state['n']:02d}-{name}.npz"), points=np.asarray(points),
             tris=tris, **cols)


def hook(name, index=None):
    original = ns[name]

    def run(*args, **kwargs):
        out = original(*args, **kwargs)
        points = out if index is None else out[index]
        save(name, points)
        return out
    ns[name] = run


original_refine = ns['refine']


def refine(*args, **kwargs):
    out = original_refine(*args, **kwargs)
    long_verts, tris, uvs, weights = out[0], out[1], out[2], out[3]
    state['tris'], state['weights'] = tris, weights
    save('source-long', long_verts)
    return out


ns['refine'] = refine
original_posed = ns['posed_heads']


def posed_heads(*args, **kwargs):
    out = original_posed(*args, **kwargs)
    state.setdefault('heads', []).append(out)
    keys = ('thigh_L', 'shin_L', 'foot_L', 'toes_L', 'hips')
    np.savez(os.path.join(out_dir, f"heads-{len(state['heads'])}.npz"),
             **{k: np.asarray(out[k]) for k in keys})
    return out


ns['posed_heads'] = posed_heads
hook('bind_skin')
hook('relax', 0)
hook('sit', 0)
hook('seat_lift', 0)
hook('crease_relax', 0)
if 'knee_relax' in ns:
    hook('knee_relax', 0)
ns['main']()
