"""Runs tools/blender/rig_mesh.py with hooks, and saves the mesh after each step of the seated bind
(Blender, background). It extends steps.py of docs/research/2026-10-26-fifth-bears/.

    Blender -b --factory-startup --python docs/research/2026-10-27-legs-armpit/probes/steps.py -- <config> <out.glb> <out dir>

Each step goes into <out dir>/<n>-<step>.npz with the points, the triangles, and the weights of the
thighs, the shins, the feet, and the hips. 00-raw.npz holds the long-legged source before the
leg flips and the rings, source-short.npy the source before the stretch of the limbs, and
origin.npy the source face of each face. mirror.py turns the right leg into a left leg for the
probes of the left leg.
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
    cols = {k: weights[:, bones.index(k)] for k in ('thigh_L', 'shin_L', 'hips', 'foot_L', 'thigh_R', 'shin_R', 'foot_R')}
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
    v0, t0, w0 = args[0], args[1], args[3]
    bones0 = ns['BONES']
    np.save(os.path.join(out_dir, 'source-short.npy'), np.asarray(args[8]))
    np.savez(os.path.join(out_dir, '00-raw.npz'), points=np.asarray(v0), tris=np.asarray(t0),
             **{k: w0[:, bones0.index(k)] for k in ('thigh_L', 'shin_L', 'hips', 'foot_L', 'thigh_R', 'shin_R', 'foot_R')})
    out = original_refine(*args, **kwargs)
    np.save(os.path.join(out_dir, 'origin.npy'), out[7])
    long_verts, tris, uvs, weights = out[0], out[1], out[2], out[3]
    state['tris'], state['weights'] = tris, weights
    save('source-long', long_verts)
    return out


ns['refine'] = refine
original_posed = ns['posed_heads']


def posed_heads(*args, **kwargs):
    out = original_posed(*args, **kwargs)
    state.setdefault('heads', []).append(out)
    keys = ('thigh_L', 'shin_L', 'foot_L', 'toes_L', 'hips', 'thigh_R', 'shin_R', 'foot_R')
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
